export const NOTIFY_EVENT = "autowallet:notifications";

export function pingNotifications() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NOTIFY_EVENT));
}
