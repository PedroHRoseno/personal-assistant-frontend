export type NotificationPermissionState = NotificationPermission | "unsupported";

export function isNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

type LocalNotificationOptions = {
  body?: string;
  tag?: string;
  url?: string;
};

export async function showLocalNotification(title: string, options: LocalNotificationOptions = {}) {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== "granted") return false;

  const payload = {
    body: options.body,
    tag: options.tag,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    data: { url: options.url ?? "/" },
  };

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, payload);
    return true;
  }

  new Notification(title, payload);
  return true;
}

export async function notifyViaServiceWorker(
  title: string,
  options: LocalNotificationOptions = {},
) {
  if (!("serviceWorker" in navigator)) {
    return showLocalNotification(title, options);
  }

  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active ?? registration.waiting ?? registration.installing;
  if (!worker) {
    return showLocalNotification(title, options);
  }

  worker.postMessage({
    type: "SHOW_NOTIFICATION",
    title,
    body: options.body,
    tag: options.tag,
    url: options.url,
  });
  return true;
}
