/** Household passcode gate. Active only when APP_PASSCODE is set. Edge/Node compatible. */
export const ACCESS_COOKIE = "vo_access";
export const ACCESS_MAX_AGE = 60 * 60 * 24 * 30;

export const passcodeEnabled = () => Boolean(process.env.APP_PASSCODE);

/** Cookie value = HMAC(passcode, label). Changing APP_PASSCODE invalidates every device. */
export async function accessToken(): Promise<string> {
  const secret = process.env.APP_PASSCODE ?? "";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("vote-oracle-access-v1"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
