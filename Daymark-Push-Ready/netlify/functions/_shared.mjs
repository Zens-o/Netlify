import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";

export const store = getStore({ name: "daymark-push-devices", region: "us-east-2" });

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export function originAllowed(req) {
  const origin = req.headers.get("origin");
  return !origin || origin === new URL(req.url).origin;
}

export async function deviceKey(req) {
  const token = req.headers.get("x-daymark-device") || "";
  if (!/^[a-f0-9-]{36}$/i.test(token)) return null;
  return `device:${createHash("sha256").update(token).digest("hex")}`;
}

export function validSubscription(subscription) {
  if (!subscription || typeof subscription !== "object" || typeof subscription.endpoint !== "string") return false;
  try {
    const url = new URL(subscription.endpoint);
    const host = url.hostname.toLowerCase();
    const allowed = ["fcm.googleapis.com", "push.services.mozilla.com", "web.push.apple.com", "push.apple.com", "notify.windows.com"];
    if (url.protocol !== "https:" || !allowed.some(domain => host === domain || host.endsWith(`.${domain}`))) return false;
  } catch { return false; }
  return typeof subscription.keys?.p256dh === "string" && typeof subscription.keys?.auth === "string";
}

export async function bodyJson(req, maxBytes = 128_000) {
  const raw = await req.text();
  if (raw.length > maxBytes) throw new Error("Request is too large.");
  return JSON.parse(raw);
}
