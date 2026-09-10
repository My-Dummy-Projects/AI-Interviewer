"""Razorpay payment endpoints.

Handles the full payment lifecycle: fetching the gateway config, creating
orders, verifying payment signatures on the client, and consuming webhook
events. Subscription activation logic is shared between the client-side
verification path and the server-side webhook path to keep behavior in
sync regardless of which notification arrives first.
"""
import hashlib
import hmac
import json
import time
import traceback
from datetime import datetime, timezone, timedelta

import razorpay
import razorpay.errors
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from config import supabase, logger, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
from deps import get_current_user, normalize_user_id
from models import (
    CreateOrderRequest,
    CreateOrderResponse,
    VerifyPaymentRequest,
    PLAN_LIMITS,
    PLAN_RANK,
)
from rate_limit import limiter

api_router_payments = APIRouter(prefix="/api/payments")


def _get_razorpay_client():
    """Build an authenticated Razorpay client from env-configured keys."""
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise RuntimeError("Razorpay key or secret not configured")
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


def _activate_subscription(
    uid: str,
    plan_id: str,
    current_plan: str,
    payment_id: str = None,
    payment_order_id: str = None,
) -> None:
    """Activate or upgrade a user's subscription after a successful payment.

    Schema / limits are derived from the target plan. On an upgrade (the
    new plan outranks the current one) the user's used-interview count is
    preserved; on any other purchase it resets. A fresh 30-day billing
    period is started.
    """
    plan_config = PLAN_LIMITS.get(plan_id, PLAN_LIMITS["free"])
    interviews_allowed = plan_config["interviews_allowed"]
    new_rank = PLAN_RANK.get(plan_id, 0)
    old_rank = PLAN_RANK.get(current_plan, 0)

    sub_result = supabase.table("user_subscriptions").select("*").eq("user_id", uid).execute()
    current_sub = sub_result.data[0] if sub_result.data else {}
    interviews_used = current_sub.get("interviews_used", 0) if new_rank > old_rank else 0

    now = datetime.now(timezone.utc)
    period_end = now + timedelta(days=30)

    supabase.table("user_subscriptions").upsert(
        {
            "user_id": uid,
            "plan": plan_id,
            "interviews_allowed": interviews_allowed,
            "interviews_used": interviews_used,
            "status": "active",
            "razorpay_order_id": payment_order_id,
            "razorpay_payment_id": payment_id,
            "current_period_start": now.isoformat(),
            "current_period_end": period_end.isoformat(),
        },
        on_conflict="user_id",
    ).execute()

    logger.info(f"Subscription activated for user {uid}: plan={plan_id}, used={interviews_used}")


@api_router_payments.get("/config")
async def get_payment_config():
    """Return the public Razorpay key so the frontend can render checkout."""
    return {"keyId": RAZORPAY_KEY_ID, "currency": "INR"}


@api_router_payments.post("/create-order", response_model=CreateOrderResponse)
@limiter.limit("10/minute")
async def create_order(request: Request, req: CreateOrderRequest, current_user=Depends(get_current_user)):
    """Create a Razorpay order for a paid plan and return checkout details."""
    try:
        if req.planId not in PLAN_LIMITS:
            raise HTTPException(status_code=400, detail=f"Invalid plan: {req.planId}")
        if req.planId == "free":
            raise HTTPException(status_code=400, detail="Cannot create order for free plan")

        plan_config = PLAN_LIMITS[req.planId]
        amount_in_paise = plan_config["price_inr"]

        uid = normalize_user_id(current_user.id)
        if not uid:
            raise HTTPException(status_code=400, detail="Invalid user ID")

        if not supabase:
            raise HTTPException(status_code=500, detail="Database not available")

        sub_result = supabase.table("user_subscriptions").select("*").eq("user_id", uid).execute()
        current_sub = sub_result.data[0] if sub_result.data else None
        current_plan = (current_sub or {}).get("plan", "free")

        allowed_statuses = {"active", "expired", "cancelled"}
        if current_plan == req.planId and (current_sub or {}).get("status") in allowed_statuses:
            if (current_sub or {}).get("status") == "active":
                raise HTTPException(status_code=400, detail=f"You are already on the {req.planId} plan.")

        client = _get_razorpay_client()

        user_id_suffix = current_user.id[-6:] if len(current_user.id) >= 6 else current_user.id
        order = client.order.create(
            {
                "amount": amount_in_paise,
                "currency": "INR",
                "receipt": f"{req.planId[:4]}_{user_id_suffix}_{int(time.time())}",
                "notes": {
                    "user_id": current_user.id or "",
                    "plan_id": req.planId,
                    "interviews_allowed": str(plan_config["interviews_allowed"]),
                    "current_plan": current_plan,
                },
            }
        )
        return CreateOrderResponse(
            orderId=order["id"],
            amount=amount_in_paise,
            currency="INR",
            keyId=RAZORPAY_KEY_ID,
            planId=req.planId,
            userEmail=getattr(current_user, "email", ""),
            userName=getattr(current_user, "name", ""),
        )
    except HTTPException:
        raise
    except razorpay.errors.BadRequestError as e:
        logger.error(f"Razorpay bad request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except razorpay.errors.GatewayError as e:
        logger.error(f"Razorpay gateway error: {e}")
        raise HTTPException(status_code=502, detail="Payment gateway error")
    except Exception as e:
        logger.error(f"Order creation failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to create order: {e}")


@api_router_payments.post("/verify-payment")
@limiter.limit("10/minute")
async def verify_payment(request: Request, req: VerifyPaymentRequest, current_user=Depends(get_current_user)):
    """Verify a client-side payment signature and activate the subscription."""
    if not RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Payment verification not configured")
    expected_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if expected_signature != req.razorpay_signature:
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    try:
        client = _get_razorpay_client()
        order = client.order.fetch(req.razorpay_order_id)
        notes = order.get("notes", {})
        plan_id = notes.get("plan_id", "free")
        current_plan = notes.get("current_plan", "free")

        # The order must be tied to the calling user.
        if notes.get("user_id") != current_user.id:
            raise HTTPException(status_code=403, detail="Order does not belong to this user")

        if plan_id not in PLAN_LIMITS:
            raise HTTPException(status_code=400, detail="Invalid plan in order")

        uid = normalize_user_id(current_user.id)
        _activate_subscription(
            uid,
            plan_id,
            current_plan,
            payment_id=req.razorpay_payment_id,
            payment_order_id=req.razorpay_order_id,
        )

        logger.info(f"Payment verified for user {current_user.id}: plan={plan_id}")
        return {"status": "success", "plan": plan_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payment verification failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {e}")


@api_router_payments.post("/webhook")
async def razorpay_webhook(request: Request):
    """Handle Razorpay server-side events (payment.captured, etc.)."""
    if not RAZORPAY_WEBHOOK_SECRET:
        logger.error("Razorpay webhook secret not configured — rejecting webhook")
        raise HTTPException(status_code=503, detail="Webhook not configured")

    body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")

    expected_signature = hmac.new(
        RAZORPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        event = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid payload")

    event_type = event.get("event")

    if event_type == "payment.captured":
        payload = event.get("payload", {}).get("payment", {}).get("entity", {})
        notes = payload.get("notes", {})
        user_id = notes.get("user_id")
        plan_id = notes.get("plan_id", "free")
        current_plan = notes.get("current_plan", "free")

        if not user_id:
            logger.warning("Webhook payment.captured missing user_id")
            return JSONResponse(content={"status": "ignored"})

        uid = normalize_user_id(user_id)
        _activate_subscription(
            uid,
            plan_id,
            current_plan,
            payment_id=payload.get("id"),
            payment_order_id=payload.get("order_id"),
        )

        logger.info(f"Webhook: subscription activated for user {user_id}: plan={plan_id}")

    elif event_type == "subscription.charged":
        payload = event.get("payload", {}).get("subscription", {}).get("entity", {})
        logger.info(f"Recurring subscription charge: {payload.get('id')}")

    return JSONResponse(content={"status": "ok"})