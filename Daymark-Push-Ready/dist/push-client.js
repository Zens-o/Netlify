(() => {
  const button = document.getElementById("enablepush");
  if (!button || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    if (button) button.title = "Push reminders are not supported in this browser";
    return;
  }

  const TOKEN_KEY = "daymark-push-device-v1";
  const TOKEN = localStorage.getItem(TOKEN_KEY) || crypto.randomUUID();
  const headers = { "content-type": "application/json", "x-daymark-device": TOKEN };
  let enabled = false;

  async function api(path, options = {}) {
    const response = await fetch(`/.netlify/functions/${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    let result = {};
    try { result = await response.json(); } catch {}
    if (!response.ok) throw new Error(result.error || `Reminder service returned ${response.status}.`);
    return result;
  }

  async function syncTasks() {
    if (!enabled || !Array.isArray(data?.tasks)) return;
    const tasks = data.tasks.filter(task => task.date && task.time).map(task => ({
      id: task.id,
      title: task.title,
      reminderAt: task.reminderAt || reminderIso(task.date, task.time),
      done: task.done,
    }));
    await api("push-tasks", { method: "PUT", body: JSON.stringify({ tasks }) });
  }

  async function enable() {
    if (!window.isSecureContext) { toast("Open Daymark over HTTPS to turn on push reminders."); return; }
    if (Notification.permission === "denied") { toast("Notifications are blocked in browser settings. Allow them for Daymark, then try again."); return; }
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") { toast("Allow notifications to receive scheduled reminders."); return; }
    const config = await api("push-config");
    if (!config.enabled || !config.publicKey) throw new Error("The push service is not configured on Netlify yet.");
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(config.publicKey) });
    localStorage.setItem(TOKEN_KEY, TOKEN);
    await api("push-subscribe", { method: "POST", body: JSON.stringify({ subscription }) });
    enabled = true;
    await syncTasks();
    button.textContent = "P";
    button.title = "Push reminders enabled — click to turn them off";
    toast("Push reminders enabled for scheduled priorities.");
  }

  async function disable() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
    await api("push-subscribe", { method: "DELETE" });
    localStorage.removeItem(TOKEN_KEY);
    enabled = false;
    button.textContent = "P";
    button.title = "Enable mobile reminders";
    toast("Push reminders turned off on this device.");
  }

  function decodeKey(key) {
    const padded = key + "=".repeat((4 - key.length % 4) % 4);
    const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  }

  button.onclick = async () => {
    button.disabled = true;
    try {
      if (localStorage.getItem(TOKEN_KEY)) await disable();
      else await enable();
    } catch (error) {
      toast(error.message || "Could not enable push reminders.");
    } finally { button.disabled = false; }
  };

  const saveLocal = save;
  save = function (...args) {
    const result = saveLocal.apply(this, args);
    if (enabled) syncTasks().catch(error => console.warn("Reminder sync failed:", error));
    return result;
  };

  navigator.serviceWorker.ready.then(async registration => {
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) { localStorage.removeItem(TOKEN_KEY); return; }
    if (!localStorage.getItem(TOKEN_KEY)) return;
    enabled = true;
    button.textContent = "P";
    button.title = "Push reminders enabled — click to turn them off";
    try {
      await api("push-subscribe", { method: "POST", body: JSON.stringify({ subscription }) });
      await syncTasks();
    } catch (error) { console.warn("Reminder sync failed:", error); }
  }).catch(() => {});
})();
