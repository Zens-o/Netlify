import { bodyJson, deviceKey, json, originAllowed, store, validSubscription } from "./_shared.mjs";

export default async (req) => {
  if (!originAllowed(req)) return json({ error: "Origin not allowed." }, 403);
  const key = await deviceKey(req);
  if (!key) return json({ error: "Invalid device key." }, 401);

  if (req.method === "DELETE") {
    await store.delete(key);
    return json({ ok: true });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const { subscription } = await bodyJson(req, 12_000);
    if (!validSubscription(subscription)) return json({ error: "Invalid push subscription." }, 400);
    const previous = await store.get(key, { type: "json", consistency: "strong" });
    await store.setJSON(key, {
      subscription,
      tasks: previous?.tasks || [],
      sent: previous?.sent || [],
      updatedAt: new Date().toISOString(),
    });
    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message || "Could not save subscription." }, 400);
  }
};
