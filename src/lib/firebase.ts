import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  authApi: typeof import('firebase/auth');
  firestoreApi: typeof import('firebase/firestore');
}

let servicesPromise: Promise<FirebaseServices> | null = null;

/**
 * Firebase is intentionally loaded after the first UI render. Authentication
 * and Firestore used to make every guest and signed-out visit download the
 * complete Firebase SDK before the dashboard could appear.
 */
export function getFirebaseServices(): Promise<FirebaseServices> {
  if (!isFirebaseConfigured) {
    return Promise.reject(new Error('Firebase is not configured.'));
  }
  if (servicesPromise) return servicesPromise;

  servicesPromise = Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]).then(([appApi, authApi, firestoreApi]) => {
    const app = appApi.getApps()[0] ?? appApi.initializeApp(firebaseConfig);
    const auth = authApi.getAuth(app);
    let db: Firestore;

    try {
      db = firestoreApi.initializeFirestore(app, {
        localCache: firestoreApi.persistentLocalCache({
          tabManager: firestoreApi.persistentMultipleTabManager(),
        }),
      });
    } catch {
      // HMR or another tab may already have initialized this app instance.
      db = firestoreApi.getFirestore(app);
    }

    return { app, auth, db, authApi, firestoreApi };
  });

  return servicesPromise;
}
