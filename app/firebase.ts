import { getApps, initializeApp } from 'firebase/app';
import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? '',
};

let analytics: Analytics | null = null;
let ready: Promise<Analytics | null> | null = null;

function analyticsClient() {
  if (analytics) return Promise.resolve(analytics);
  if (ready) return ready;
  ready = (async () => {
    if (typeof window === 'undefined' || !firebaseConfig.apiKey || !firebaseConfig.appId) return null;
    if (!(await isSupported())) return null;
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    return analytics;
  })();
  return ready;
}

export function trackPageView(path: string, title?: string) {
  void analyticsClient().then((client) => {
    client && logEvent(client, 'page_view', {
      page_path: path,
      page_title: title ?? (typeof document !== 'undefined' ? document.title : path),
      page_location: typeof window !== 'undefined' ? window.location.href : path,
    });
  });
}

export function trackButton(name: string) {
  const button_name = name.replace(/\s+/g, ' ').trim().slice(0, 100);
  button_name && void analyticsClient().then((client) => {
    client && logEvent(client, 'button_click', { button_name });
  });
}
