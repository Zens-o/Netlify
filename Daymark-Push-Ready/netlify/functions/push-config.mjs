import { json, originAllowed } from "./_shared.mjs";

export default async (req) => {
  if (req.method !== "GET") return json({ error: "Method not allowed." }, 405);
  if (!originAllowed(req)) return json({ error: "Origin not allowed." }, 403);
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) return json({ enabled: false }, 503);
  return json({ enabled: true, publicKey });
};
