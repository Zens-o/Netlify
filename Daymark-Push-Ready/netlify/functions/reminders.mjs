import * as webpush from "web-push";
import { store } from "./_shared.mjs";

export default async () => {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    console.error("Push reminders are missing VAPID environment variables.");
    return new Response(null, { status: 500 });
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const now = Date.now();
  let sentCount = 0;

  for await (const page of store.list({ prefix: "device:", paginate: true })) {
    for (const blob of page.blobs) {
      const record = await store.get(blob.key, { type: "json", consistency: "strong" });
      if (!record?.subscription || !Array.isArray(record.tasks)) continue;
      const sent = new Set(record.sent || []);
      let changed = false;
      for (const task of record.tasks) {
        if (task.done || sent.has(task.id) || !Number.isFinite(task.dueAt) || task.dueAt > now) continue;
        const delay = Math.max(0, now - task.dueAt);
        if (delay > 24 * 60 * 60 * 1000) { sent.add(task.id); changed = true; continue; }
        try {
          await webpush.sendNotification(record.subscription, JSON.stringify({
            title: "Daymark: time to begin",
            body: task.title,
            tag: `daymark-${task.id}`,
            url: "/",
          }), { TTL: 3600 });
          sent.add(task.id);
          sentCount++;
          changed = true;
        } catch (error) {
          if (error.statusCode === 404 || error.statusCode === 410) {
            await store.delete(blob.key);
            record.subscription = null;
            changed = false;
            break;
          }
          console.error("Push delivery failed; will retry next minute.", error.statusCode || error.message);
        }
      }
      if (changed && record.subscription) {
        await store.setJSON(blob.key, { ...record, sent: [...sent].slice(-500), updatedAt: new Date().toISOString() });
      }
    }
  }
  console.log(`Reminder check complete; sent ${sentCount} notification(s).`);
  return new Response(null, { status: 204 });
};

export const config = { schedule: "* * * * *" };
