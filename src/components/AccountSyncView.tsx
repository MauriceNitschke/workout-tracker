import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Upload,
} from 'lucide-react';
import { AppState, CloudUser, SyncStatus } from '../types';

interface AccountSyncViewProps {
  state: AppState;
  configured: boolean;
  user: CloudUser | null;
  status: SyncStatus;
  error: string | null;
  lastSyncedAt: string | null;
  needsInitialization: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onInitializeCloud: (useLocalData: boolean) => void;
  onRetry: () => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const statusLabels: Record<SyncStatus, string> = {
  guest: 'Local guest mode',
  loading: 'Loading cloud data…',
  offline: 'Offline — changes are queued',
  saving: 'Saving to cloud…',
  synced: 'Cloud data is up to date',
  error: 'Sync needs attention',
  'needs-initialization': 'Choose how to initialize this account',
};

export const AccountSyncView: React.FC<AccountSyncViewProps> = ({
  state,
  configured,
  user,
  status,
  error,
  lastSyncedAt,
  needsInitialization,
  onSignIn,
  onSignOut,
  onInitializeCloud,
  onRetry,
  onExport,
  onImport,
}) => {
  const StatusIcon =
    status === 'synced'
      ? CheckCircle2
      : status === 'offline'
        ? CloudOff
        : status === 'error'
          ? AlertTriangle
          : Cloud;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
              Account & Sync
            </p>
            <h1 className="mt-1 text-2xl font-bold text-zinc-100">Your training, on every device</h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Once signed in, your private cloud dataset is the source of truth. This device keeps
              an offline cache for workouts without a connection.
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>
      </section>

      {!configured && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <h2 className="font-semibold text-amber-100">Cloud sync needs Firebase configuration</h2>
              <p className="mt-1 text-sm text-amber-200/70">
                Guest mode is fully available. Add the VITE_FIREBASE_* deployment variables to
                enable Google sign-in.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        {user ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 rounded-full border border-zinc-700"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                  <Cloud className="h-5 w-5 text-zinc-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-zinc-100">
                  {user.displayName || 'Google account'}
                </p>
                <p className="truncate text-sm text-zinc-400">{user.email}</p>
              </div>
              <button onClick={onSignOut} className="mobile-action secondary-action">
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <StatusIcon
                className={`h-5 w-5 shrink-0 ${
                  status === 'error'
                    ? 'text-rose-400'
                    : status === 'offline'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-200">{statusLabels[status]}</p>
                {lastSyncedAt && (
                  <p className="text-xs text-zinc-500">
                    Last synced {new Date(lastSyncedAt).toLocaleString()}
                  </p>
                )}
              </div>
              {(status === 'error' || status === 'offline') && (
                <button onClick={onRetry} className="touch-target rounded-xl text-zinc-300">
                  <RefreshCw className="h-4 w-4" />
                  <span className="sr-only">Retry synchronization</span>
                </button>
              )}
            </div>

            {error && <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800">
              <Smartphone className="h-6 w-6 text-zinc-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Currently stored on this device</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Sign in with Google to create a private cloud dataset and use it across devices.
              </p>
            </div>
            <button
              onClick={onSignIn}
              disabled={!configured || status === 'loading'}
              className="mx-auto flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              <LogIn className="h-5 w-5" />
              Continue with Google
            </button>
          </div>
        )}
      </section>

      {user && needsInitialization && (
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-emerald-100">Set up this cloud account</h2>
          <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">
            No Training OS data exists for this Google account. Import this device’s current
            dataset or start an empty training account.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button onClick={() => onInitializeCloud(true)} className="mobile-action primary-action">
              <Upload className="h-4 w-4" />
              <span>Import device data</span>
            </button>
            <button onClick={() => onInitializeCloud(false)} className="mobile-action secondary-action">
              <Cloud className="h-4 w-4" />
              <span>Start empty</span>
            </button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <h2 className="font-semibold text-zinc-100">Portable backup</h2>
        <p className="mt-1 text-sm text-zinc-400">
          JSON backups remain available independently from cloud synchronization.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button onClick={onExport} className="mobile-action secondary-action">
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Export JSON</span>
          </button>
          <label className="mobile-action secondary-action cursor-pointer">
            <Upload className="h-4 w-4 text-sky-400" />
            <span>Import JSON</span>
            <input type="file" accept=".json,application/json" onChange={onImport} className="hidden" />
          </label>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          {state.exercises.length} exercises · {state.scheduledWorkouts.length} workouts ·{' '}
          {state.workoutExecutions.length} completed sessions
        </p>
      </section>
    </div>
  );
};
