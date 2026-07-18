import razorpay
import razorpay.errors
import hmac
import hashlib
import json
import traceback
import time
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from config import supabase, logger, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
from deps import get_current_user, normalize_user_id
from models import CreateOrderRequest, CreateOrderResponse, VerifyPaymentRequest, PLAN_LIMITS, PLAN_RANK

api_router_payments = APIRouter(prefix="/api/payments")


def _get_razorpay_client():
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise RuntimeError("Razorpay key or secret not configured")
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


@api_router_payments.get("/config")
async def get_payment_config():
    return {"keyId": RAZORPAY_KEY_ID, "currency": "INR"}


@api_router_payments.post("/create-order", response_model=CreateOrderResponse)
async def create_order(req: CreateOrderRequest, current_user=Depends(get_current_user)):
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

        if current_plan == req.planId and (current_sub or {}).get("status") == "active":
            raise HTTPException(status_code=400, detail=f"You are already on the {req.planId} plan.")

        client = _get_razorpay_client()
        order = client.order.create({
            "amount": amount_in_paise,
            "currency": "INR",
            "receipt": f"{req.planId[:4]}_{current_user.id[-6:]}_{int(time.time())}",
            "notes": {
                "user_id": current_user.id,
                "plan_id": req.planId,
                "interviews_allowed": str(plan_config["interviews_allowed"]),
                "current_plan": current_plan,
            },
        })
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
async def verify_payment(req: VerifyPaymentRequest, current_user=Depends(get_current_user)):
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

        if notes.get("user_id") != current_user.id:
            raise HTTPException(status_code=403, detail="Order does not belong to this user")

        if plan_id not in PLAN_LIMITS:
            raise HTTPException(status_code=400, detail="Invalid plan in order")

        plan_config = PLAN_LIMITS[plan_id]
        interviews_allowed = plan_config["interviews_allowed"]
        new_rank = PLAN_RANK.get(plan_id, 0)
        old_rank = PLAN_RANK.get(current_plan, 0)

        # Fetch current subscription
        uid = normalize_user_id(current_user.id)
        sub_result = supabase.table("user_subscriptions").select("*").eq("user_id", uid).execute()
        current_sub = sub_result.data[0] if sub_result.data else {}

        now = datetime.now(timezone.utc)
        period_end = now + timedelta(days=30)

        if new_rank > old_rank:
            # Upgrade: apply new limits immediately, preserve used count
            interviews_used = current_sub.get("interviews_used", 0)
            logger.info(f"Upgrade: user {current_user.id} from {current_plan} to {plan_id}, preserving {interviews_used} used")
        else:
            # Same plan or downgrade via new purchase: reset
            interviews_used = 0
            logger.info(f"New subscription: user {current_user.id} plan {plan_id}, resetting used count")

        supabase.table("user_subscriptions").update({
            "plan": plan_id,
            "interviews_allowed": interviews_allowed,
            "interviews_used": interviews_used,
            "status": "active",
            "razorpay_order_id": req.razorpay_order_id,
            "razorpay_payment_id": req.razorpay_payment_id,
            "current_period_start": now.isoformat(),
            "current_period_end": period_end.isoformat(),
        }).eq("user_id", uid).execute()

        logger.info(f"Payment verified for user {current_user.id}: plan={plan_id}, used={interviews_used}")
        return {"status": "success", "plan": plan_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payment verification failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {e}")


@api_router_payments.post("/webhook")
async def razorpay_webhook(request: Request):
    if not RAZORPAY_WEBHOOK_SECRET:
        logger.warning("Razorpay webhook secret not configured, skipping verification")
        return JSONResponse(content={"status": "ignored"}, status_code=200)

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

        plan_config = PLAN_LIMITS.get(plan_id, PLAN_LIMITS["free"])
        interviews_allowed = plan_config["interviews_allowed"]
        new_rank = PLAN_RANK.get(plan_id, 0)
        old_rank = PLAN_RANK.get(current_plan, 0)

        uid = normalize_user_id(user_id)
        sub_result = supabase.table("user_subscriptions").select("*").eq("user_id", uid).execute()
        current_sub = sub_result.data[0] if sub_result.data else {}
        interviews_used = current_sub.get("interviews_used", 0) if new_rank > old_rank else 0

        now = datetime.now(timezone.utc)
        period_end = now + timedelta(days=30)

        supabase.table("user_subscriptions").update({
            "plan": plan_id,
            "interviews_allowed": interviews_allowed,
            "interviews_used": interviews_used,
            "status": "active",
            "razorpay_order_id": payload.get("order_id"),
            "razorpay_payment_id": payload.get("id"),
            "current_period_start": now.isoformat(),
            "current_period_end": period_end.isoformat(),
        }).eq("user_id", uid).execute()

        logger.info(f"Webhook: subscription activated for user {user_id}: plan={plan_id}")

    elif event_type == "subscription.charged":
        payload = event.get("payload", {}).get("subscription", {}).get("entity", {})
        logger.info(f"Recurring subscription charge: {payload.get('id')}")

    return JSONResponse(content={"status": "ok"})
