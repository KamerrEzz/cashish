/* Minimal service worker for Web Push subscription registration. */
self.addEventListener("push", (event) => {
  let title = "Cashish";
  let body = "Tienes un aviso";
  try {
    const data = event.data ? event.data.json() : null;
    if (data?.title) title = data.title;
    if (data?.body) body = data.body;
  } catch {
    const text = event.data ? event.data.text() : "";
    if (text) body = text;
  }
  event.waitUntil(self.registration.showNotification(title, { body }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/app/reminders"));
});
