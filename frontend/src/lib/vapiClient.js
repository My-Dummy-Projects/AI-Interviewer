/**
 * Vapi client singleton.
 *
 * The Vapi SDK connects one in-flight voice call at a time, so a single
 * cached instance (keyed by public key) is reused across interviews and
 * torn down when leaving the page.
 */
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
  } catch {
    // ignore
  }
  vapiInstance = null;
}