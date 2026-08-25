import { getApps, initializeApp } from 'firebase/app';
import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics';
import { useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? '',
};

const analyticsEnv = (() => {
  const raw = String(import.meta.env.VITE_APP_ENV || 'local').toLowerCase();
  if (raw === 'production' || raw === 'prod') return 'prod';
  if (raw === 'development' || raw === 'dev') return 'dev';
  return raw.replace(/[^a-z0-9]/g, '').slice(0, 12) || 'local';
})();

let analytics: Analytics | null = null;
let ready: Promise<Analytics | null> | null = null;

function analyticsClient() {
  if (analytics) return Promise.resolve(analytics);
  if (ready) return ready;
  ready = (async () => {
    if (typeof window !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.appId && await isSupported()) {
      const app = getApps()[0] ?? initializeApp(firebaseConfig);
      analytics = getAnalytics(app);
      return analytics;
    }
    return null;
  })();
  return ready;
}

function namedEvent(event: string) {
  const action = event.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'click';
  const prefix = `start_app_${analyticsEnv}_`;
  return `${prefix}${action}`.slice(0, 40).replace(/_+$/, '');
}

export function trackPageView(path: string, title?: string) {
  void analyticsClient().then((client) => {
    client && logEvent(client, namedEvent('page_view'), {
      page_path: path,
      page_title: title ?? (typeof document !== 'undefined' ? document.title : path),
      page_location: typeof window !== 'undefined' ? window.location.href : path,
    });
  });
}

export function trackButton(name: string) {
  const button_name = name.replace(/\s+/g, ' ').trim().slice(0, 100);
  button_name && void analyticsClient().then((client) => {
    client && logEvent(client, namedEvent(button_name), { button_name });
  });
}

export function AnalyticsTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });
  useEffect(() => {
    trackPageView(`${pathname}${search}`);
  }, [pathname, search]);
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const el = (event.target as HTMLElement | null)?.closest('button, a.btn') as HTMLElement | null;
      if (el && el.getAttribute('aria-hidden') !== 'true') {
        const name = el.getAttribute('data-analytics') || el.getAttribute('aria-label') || el.textContent || '';
        trackButton(name);
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  return null;
}
