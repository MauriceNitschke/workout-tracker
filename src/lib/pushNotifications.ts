import { PushSubscriptionRecord } from '../types';
import { getFirebaseServices } from './firebase';

function base64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function canUseWebPush(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function enablePushNotifications(): Promise<PushSubscriptionRecord> {
  if (!canUseWebPush()) throw new Error('Web Push is not supported on this device.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted.');

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) throw new Error('The Firebase Web Push certificate key is not configured.');

  const [{ app }, messagingApi, registration] = await Promise.all([
    getFirebaseServices(),
    import('firebase/messaging'),
    navigator.serviceWorker.ready,
  ]);
  if (!(await messagingApi.isSupported())) {
    throw new Error('Firebase messaging is not supported in this browser.');
  }

  const messaging = messagingApi.getMessaging(app);
  const fcmToken = await messagingApi.getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) throw new Error('The device push subscription could not be created.');

  const now = new Date().toISOString();
  return {
    id: `push-${fcmToken.slice(0, 24)}`,
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: {
      p256dh: base64Url(subscription.getKey('p256dh')),
      auth: base64Url(subscription.getKey('auth')),
    },
    fcmToken,
    deviceLabel: `${navigator.platform || 'Device'} · ${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Browser'}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    createdAt: now,
    updatedAt: now,
  };
}

export async function disablePushNotifications(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  await subscription?.unsubscribe();
}
