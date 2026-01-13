self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 如果已經有開啟的視窗，就聚焦在那上面
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      // 否則開啟新的 App 頁面（使用 SW 的作用域，通常是 /pomodoro/）
      if (clients.openWindow) {
        return clients.openWindow(self.registration.scope);
      }
    })
  );
});
