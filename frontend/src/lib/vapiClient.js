import Vapi from "@vapi-ai/web";

let vapiInstance = null;

export function getVapi(publicKey) {
  if (!publicKey) return null;
  if (vapiInstance && vapiInstance._publicKey === publicKey) return vapiInstance;
  vapiInstance = new Vapi(publicKey);
  vapiInstance._publicKey = publicKey;
  return vapiInstance;
}

export function resetVapi() {
  try {
    if (vapiInstance) vapiInstance.stop();
  } catch (e) {
    // ignore
  }
  vapiInstance = null;
}
