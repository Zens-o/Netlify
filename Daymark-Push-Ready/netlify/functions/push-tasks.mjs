import { bodyJson, deviceKey, json, originAllowed, store } from "./_shared.mjs";

export default async (req) => {
  if (!originAllowed(req)) return json({ error: "Origin not allowed." }, 403);
  if (req.method !== "PUT") return json({ error: "Method not allowed." }, 405);
  const key = await deviceKey(req);
  if (!key) return json({ error: "Invalid device key." }, 401);

  try {
    const payload = await bodyJson(req, 128_000);
    if (!Array.isArray(payload.tasks) || payload.tasks.length > 300) return json({ error: "Invalid task list." }, 400);
    const tasks = payload.tasks.map(task => {
      const id = String(task.id ?? "").slice(0, 80);
      const title = String(task.title ?? "").trim().slice(0, 90);
      const dueAt = typeof task.reminderAt === "string" ? Date.parse(task.reminderAt) : NaN;
      if (!id || !title || !Number.isFinite(dueAt)) throw new Error("Each reminder needs a title and scheduled date/time.");
      return { id, title, dueAt, done: Boolean(task.done) };
    });
    const record = await store.get(key, { type: "json", consistency: "strong" });
    if (!record?.subscription) return json({ error: "Enable reminders on this device first." }, 409);
    const activeIds = new Set(tasks.map(task => task.id));
    await store.setJSON(key, {
      ...record,
      tasks,
      sent: (record.sent || []).filter(id => activeIds.has(id)).slice(-500),
      updatedAt: new Date().toISOString(),
    });
    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message || "Could not save reminders." }, 400);
  }
};
