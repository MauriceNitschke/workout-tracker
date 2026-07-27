import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { AppState, CloudUser, SyncStatus } from '../types';
import { auth, isFirebaseConfigured } from '../lib/firebase';
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

  useEffect(() => {
    if (!auth) return;
    void getRedirectResult(auth).catch((reason) => {
      setError(reason instanceof Error ? reason.message : 'Google sign-in failed.');
      setStatus('error');
    });

    return onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribeCloud.current?.();
      cloudReady.current = false;
      lastCloudState.current = null;
      setNeedsInitialization(false);

      if (!firebaseUser) {
        setUser(null);
        setState(loadGuestAppState());
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
        setState(cloudState);
        applyingCloud.current = false;
        cloudReady.current = true;
        setStatus(navigator.onLine ? 'synced' : 'offline');
        setLastSyncedAt(new Date().toISOString());

        unsubscribeCloud.current = subscribeToCloudState(
          firebaseUser.uid,
          (nextState) => {
            const serialized = JSON.stringify(nextState);
            if (serialized === lastSavedJSON.current) return;
            applyingCloud.current = true;
            lastCloudState.current = nextState;
            lastSavedJSON.current = serialized;
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
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Cloud data could not be loaded.');
        setStatus(navigator.onLine ? 'error' : 'offline');
      }
    });
  }, [setState]);

  useEffect(() => {
    if (!user) {
      saveGuestAppState(state);
      return;
    }
    if (!cloudReady.current || applyingCloud.current || needsInitialization) return;

    const serialized = JSON.stringify(state);
    if (serialized === lastSavedJSON.current) return;
    const timeout = window.setTimeout(async () => {
      setStatus(navigator.onLine ? 'saving' : 'offline');
      try {
        await saveCloudState(user.uid, state, lastCloudState.current ?? undefined);
        lastSavedJSON.current = serialized;
        lastCloudState.current = state;
        setStatus(navigator.onLine ? 'synced' : 'offline');
        setLastSyncedAt(new Date().toISOString());
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Cloud save failed.');
        setStatus(navigator.onLine ? 'error' : 'offline');
      }
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [needsInitialization, state, user]);

  const startGoogleSignIn = useCallback(async () => {
    if (!auth) {
      setError('Firebase is not configured for this deployment.');
      return;
    }
    setStatus('loading');
    setError(null);
    const provider = new GoogleAuthProvider();
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    try {
      if (standalone || mobile) await signInWithRedirect(auth, provider);
      else await signInWithPopup(auth, provider);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Google sign-in failed.');
      setStatus('error');
    }
  }, []);

  const signOutAccount = useCallback(async () => {
    if (!auth) return;
    unsubscribeCloud.current?.();
    cloudReady.current = false;
    await signOut(auth);
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
              enduranceActivities: [],
              recoveryActivities: [],
              activeWorkoutId: null,
            };
        await saveCloudState(user.uid, stateToSave);
        lastSavedJSON.current = JSON.stringify(stateToSave);
        lastCloudState.current = stateToSave;
        setState(stateToSave);
        cloudReady.current = true;
        setNeedsInitialization(false);
        setStatus('synced');
        setLastSyncedAt(new Date().toISOString());
        unsubscribeCloud.current = subscribeToCloudState(
          user.uid,
          (nextState) => {
            lastCloudState.current = nextState;
            lastSavedJSON.current = JSON.stringify(nextState);
            setState(nextState);
            setStatus(navigator.onLine ? 'synced' : 'offline');
          },
          (syncError) => {
            setError(syncError.message);
            setStatus('error');
          }
        );
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Cloud initialization failed.');
        setStatus('error');
      }
    },
    [setState, user]
  );

  const retrySync = useCallback(async () => {
    if (!user) return;
    setStatus('saving');
    try {
      await saveCloudState(user.uid, stateRef.current, lastCloudState.current ?? undefined);
      lastSavedJSON.current = JSON.stringify(stateRef.current);
      lastCloudState.current = stateRef.current;
      setStatus('synced');
      setLastSyncedAt(new Date().toISOString());
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Cloud save failed.');
      setStatus(navigator.onLine ? 'error' : 'offline');
    }
  }, [user]);

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
