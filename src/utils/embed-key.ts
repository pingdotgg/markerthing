// Secret key for a creator's OBS embed URL, so only they can see their live
// topic. It is an HMAC of the username, so there is nothing to store.
export const getEmbedKey = async (username: string) => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(process.env.CLERK_SECRET_KEY!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`embed:${username.toLowerCase()}`)
  );

  return Array.from(new Uint8Array(signature).slice(0, 16), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
