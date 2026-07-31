import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, CloudUser, SyncStatus } from '../types';
import { getFirebaseServices, isFirebaseConfigured } from '../lib/firebase';
import {
  cloudDatasetExists,
  loadCloudState,
  saveCloudState,
  subscribeToCloudState,
} from '../lib/cloudStore';
import {
  archiveGuestAppState,
  loadGuestAppState,
  saveGuestAppState,
} from '../lib/storage';

interface UseCloudAccountOptions {
  state: AppState;
  setState: (state: AppState) => void;
}

function getCloudClientId(): string {
  const storageKey = 'training-os-cloud-client-id';
  try {
    // A tab/session-specific ID lets a second tab on the same device receive
    // updates instead of mistaking them for its own writes.
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem(storageKey, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

export function useCloudAccount({ state, setState }: UseCloudAccountOptions) {
  const [user, setUser] = useState<CloudUser | null>(null);
  const [status, setStatus] = useState<SyncStatus>(
    isFirebaseConfigured ? 'loading' : 'guest'
  );
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [needsInitialization, setNeedsInitialization] = useState(false);
  const cloudReady = useRef(false);
  const applyingCloud = useRef(false);
  const stateRef = useRef(state);
  const lastCloudState = useRef<AppState | null>(null);
  const lastSavedJSON = useRef('');
  const unsubscribeCloud = useRef<(() => void) | null>(null);
  const clientId = useRef(getCloudClientId());
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const updateOnlineStatus = () => {
      if (!navigator.onLine && user) setStatus('offline');
      if (navigator.onLine && user && cloudReady.current) setStatus('synced');
    };
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [user]);

  const installCloudSubscription = useCallback(async (uid: string) => {
    const unsubscribe = await subscribeToCloudState(
      uid,
      {
        clientId: clientId.current,
        getCurrentState: () => stateRef.current,
      },
      (nextState) => {
        const serialized = JSON.stringify(nextState);
        if (serialized === lastSavedJSON.current) return;
        applyingCloud.current = true;
        lastCloudState.current = nextState;
        lastSavedJSON.current = serialized;
        stateRef.current = nextState;
        setState(nextState);
        applyingCloud.current = false;
        setStatus(navigator.onLine ? 'synced' : 'offline');
        setLastSyncedAt(new Date().toISOString());
      },
      (syncError) => {
        setError(syncError.message);
        setStatus(navigator.onLine ? 'error' : 'offline');
      }
    );
    unsubscribeCloud.current?.();
    unsubscribeCloud.current = unsubscribe;
  }, [setState]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let active = true;
    let unsubscribeAuth: (() => void) | null = null;

    void getFirebaseServices().then(({ auth, authApi }) => {
      if (!active) return;
      unsubscribeAuth = authApi.onAuthStateChanged(auth, async (firebaseUser) => {
        unsubscribeCloud.current?.();
        cloudReady.current = false;
        lastCloudState.current = null;
        setNeedsInitialization(false);

        if (!firebaseUser) {
          const guestState = loadGuestAppState();
          setUser(null);
          stateRef.current = guestState;
          setState(guestState);
          setStatus('guest');
          return;
        }

        const cloudUser: CloudUser = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        };
        setUser(cloudUser);
        setStatus('loading');
        setError(null);
        archiveGuestAppState(stateRef.current);

        try {
          if (!(await cloudDatasetExists(firebaseUser.uid))) {
            setNeedsInitialization(true);
            setStatus('needs-initialization');
            return;
          }

          const cloudState = await loadCloudState(firebaseUser.uid);
          if (!cloudState) throw new Error('The cloud dataset could not be loaded.');
          applyingCloud.current = true;
          lastCloudState.current = cloudState;
          lastSavedJSON.current = JSON.stringify(cloudState);
          stateRef.current = cloudState;
          setState(cloudState);
          applyingCloud.current = false;
          cloudReady.current = true;
          setStatus(navigator.onLine ? 'synced' : 'offline');
          setLastSyncedAt(new Date().toISOString());

          await installCloudSubscription(firebaseUser.uid);
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : 'Cloud data could not be loaded.');
          setStatus(navigator.onLine ? 'error' : 'offline');
        }
      });
    }).catch((reason) => {
      if (!active) return;
      setError(reason instanceof Error ? reason.message : 'Firebase could not be loaded.');
      setStatus('error');
    });

    return () => {
      active = false;
      unsubscribeAuth?.();
      unsubscribeCloud.current?.();
    };
  }, [installCloudSubscription, setState]);

  useEffect(() => {
    if (!user) {
      saveGuestAppState(state);
      return;
    }
    if (!cloudReady.current || applyingCloud.current || needsInitialization) return;

    const serialized = JSON.stringify(state);
    if (serialized === lastSavedJSON.current) return;
    const timeout = window.setTimeout(() => {
      saveQueue.current = saveQueue.current.then(async () => {
        if (serialized === lastSavedJSON.current) return;
        setStatus(navigator.onLine ? 'saving' : 'offline');
        try {
          await saveCloudState(
            user.uid,
            state,
            lastCloudState.current ?? undefined,
            clientId.current
          );
          lastSavedJSON.current = serialized;
          lastCloudState.current = state;
          setStatus(navigator.onLine ? 'synced' : 'offline');
          setLastSyncedAt(new Date().toISOString());
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : 'Cloud save failed.');
          setStatus(navigator.onLine ? 'error' : 'offline');
        }
      });
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [needsInitialization, state, user]);

  const startGoogleSignIn = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setError('Firebase is not configured for this deployment.');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const { auth, authApi } = await getFirebaseServices();
      const provider = new authApi.GoogleAuthProvider();
      // Redirect auth relies on cross-origin storage hosted at firebaseapp.com.
      // Safari blocks that storage when this app is served from GitHub Pages.
      await authApi.signInWithPopup(auth, provider);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Google sign-in failed.');
      setStatus('error');
    }
  }, []);

  const signOutAccount = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    unsubscribeCloud.current?.();
    cloudReady.current = false;
    const { auth, authApi } = await getFirebaseServices();
    await authApi.signOut(auth);
  }, []);

  const initializeCloud = useCallback(
    async (useLocalData: boolean) => {
      if (!user) return;
      setStatus('saving');
      setError(null);
      try {
        const initialState = useLocalData ? stateRef.current : loadGuestAppState();
        const stateToSave = useLocalData
          ? initialState
          : {
              ...initialState,
              programs: [],
              activeProgramId: '',
              workoutTemplates: [],
              weeks: [],
              scheduledWorkouts: [],
              workoutExecutions: [],
              workoutDrafts: [],
              workoutChangeEvents: [],
              bodyweightEntries: [],
              activeEditorLeases: [],
              pushSubscriptions: [],
              progressionRecommendations: [],
              enduranceActivities: [],
              recoveryActivities: [],
              activeWorkoutId: null,
            };
        await saveCloudState(user.uid, stateToSave, undefined, clientId.current);
        lastSavedJSON.current = JSON.stringify(stateToSave);
        lastCloudState.current = stateToSave;
        stateRef.current = stateToSave;
        setState(stateToSave);
        cloudReady.current = true;
        setNeedsInitialization(false);
        setStatus('synced');
        setLastSyncedAt(new Date().toISOString());
        await installCloudSubscription(user.uid);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Cloud initialization failed.');
        setStatus('error');
      }
    },
    [installCloudSubscription, setState, user]
  );

  const retrySync = useCallback(async () => {
    if (!user) return;
    setStatus(cloudReady.current ? 'saving' : 'loading');
    setError(null);
    try {
      // A device that never completed its initial cloud load must download the
      // authoritative dataset. It must not upload its stale local state.
      if (!cloudReady.current) {
        const cloudState = await loadCloudState(user.uid);
        if (!cloudState) {
          setNeedsInitialization(true);
          setStatus('needs-initialization');
          return;
        }

        applyingCloud.current = true;
        lastSavedJSON.current = JSON.stringify(cloudState);
        lastCloudState.current = cloudState;
        stateRef.current = cloudState;
        setState(cloudState);
        applyingCloud.current = false;
        cloudReady.current = true;
        setStatus(navigator.onLine ? 'synced' : 'offline');
        setLastSyncedAt(new Date().toISOString());

        await installCloudSubscription(user.uid);
        return;
      }

      await saveCloudState(
        user.uid,
        stateRef.current,
        lastCloudState.current ?? undefined,
        clientId.current
      );
      lastSavedJSON.current = JSON.stringify(stateRef.current);
      lastCloudState.current = stateRef.current;
      setStatus('synced');
      setLastSyncedAt(new Date().toISOString());
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Cloud save failed.');
      setStatus(navigator.onLine ? 'error' : 'offline');
    }
  }, [installCloudSubscription, setState, user]);

  return {
    configured: isFirebaseConfigured,
    user,
    status,
    error,
    lastSyncedAt,
    needsInitialization,
    startGoogleSignIn,
    signOutAccount,
    initializeCloud,
    retrySync,
  };
}
