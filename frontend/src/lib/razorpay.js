const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let _loaded = false;
let _loading = null;

function loadScript() {
  if (_loaded) return Promise.resolve();
  if (_loading) return _loading;
  _loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      _loaded = true;
      resolve();
    };
    script.onerror = () => {
      _loaded = false;
      _loading = null;
      reject(new Error("Failed to load Razorpay SDK"));
    };
    document.body.appendChild(script);
  });
  return _loading;
}

export async function openRazorpayCheckout({
  keyId,
  orderId,
  amount,
  currency = "INR",
  name = "Voxa",
  description,
  prefill = {},
  onSuccess,
  onError,
}) {
  try {
    await loadScript();
  } catch {
    onError?.("Failed to load payment gateway. Please try again.");
    return;
  }

  const options = {
    key: keyId,
    amount,
    currency,
    name,
    description: description || `Voxa ${currency} ${typeof amount === "number" ? (amount / 100).toFixed(0) : "0"}`,
    order_id: orderId,
    prefill: {
      name: prefill.name || "",
      email: prefill.email || "",
      contact: prefill.contact || "",
    },
    theme: { color: "#22d3ee" },
    handler(response) {
      try {
        onSuccess?.(response);
      } catch (e) {
        console.error("Payment success handler failed:", e);
        onError?.("Payment verification failed. Please contact support.");
      }
    },
    modal: {
      ondismiss() {
        onError?.("Payment cancelled");
      },
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on("payment.failed", (response) => {
    onError?.(response.error?.description || "Payment failed");
  });
  rzp.open();
}
