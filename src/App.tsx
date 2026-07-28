import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, RouteId, WorkoutExecution } from './types';
import {
  clearAppStateToCleanSlate,
  exportAppStateJSON,
  loadGuestAppState,
  parseAppStateBackup,
  resetAppStateToSeed,
} from './lib/storage';
import {
  navigateToRoute,
  PRIMARY_ROUTES,
  routeFromHash,
  routeFromLegacyId,
} from './lib/routes';
import { useCloudAccount } from './hooks/useCloudAccount';
import { createWorkoutRecommendations } from './lib/progression';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { Toast, ToastMessage } from './components/Toast';

const WeeklyPlanner = React.lazy(() =>
  import('./components/WeeklyPlanner').then((module) => ({ default: module.WeeklyPlanner }))
);
const WorkoutMode = React.lazy(() =>
  import('./components/WorkoutMode').then((module) => ({ default: module.WorkoutMode }))
);
const WeeklyReviewView = React.lazy(() =>
  import('./components/WeeklyReviewView').then((module) => ({
    default: module.WeeklyReviewView,
  }))
);
const ExerciseLibrary = React.lazy(() =>
  import('./components/ExerciseLibrary').then((module) => ({ default: module.ExerciseLibrary }))
);
const EnduranceRecoveryTracker = React.lazy(() =>
  import('./components/EnduranceRecoveryTracker').then((module) => ({
    default: module.EnduranceRecoveryTracker,
  }))
);
const LifeInWeeksView = React.lazy(() =>
  import('./components/LifeInWeeksView').then((module) => ({
    default: module.LifeInWeeksView,
  }))
);
const AccountSyncView = React.lazy(() =>
  import('./components/AccountSyncView').then((module) => ({
    default: module.AccountSyncView,
  }))
);

const SWIPE_IGNORE_SELECTOR =
  'input, textarea, select, button, a, [role="dialog"], [role="application"], [data-no-swipe], .recharts-wrapper, .overflow-x-auto';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadGuestAppState());
  const [currentRoute, setCurrentRoute] = useState<RouteId>(() => routeFromHash());
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null);
  const touchStart = useRef<{ x: number; y: number; target: EventTarget | null } | null>(null);
  const cloud = useCloudAccount({ state, setState });

  const showToast = useCallback((message: string, tone: ToastMessage['tone'] = 'success') => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  useEffect(() => {
    if (!window.location.hash) navigateToRoute('today', true);
    const updateRoute = () => {
      setCurrentRoute(routeFromHash());
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);

  useEffect(() => {
    const handleNotification = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; tone: ToastMessage['tone'] }>).detail;
      showToast(detail.message, detail.tone);
    };
    window.addEventListener('training-os-notification', handleNotification);
    return () => window.removeEventListener('training-os-notification', handleNotification);
  }, [showToast]);

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      setUpdateWorker((event as CustomEvent<{ worker: ServiceWorker }>).detail.worker);
    };
    const reload = () => window.location.reload();
    window.addEventListener('training-os-update', handleUpdate);
    navigator.serviceWorker?.addEventListener('controllerchange', reload);
    return () => {
      window.removeEventListener('training-os-update', handleUpdate);
      navigator.serviceWorker?.removeEventListener('controllerchange', reload);
    };
  }, []);

  const navigate = useCallback((route: RouteId) => navigateToRoute(route), []);
  const navigateLegacy = useCallback((id: string) => navigate(routeFromLegacyId(id)), [navigate]);

  const handleStartWorkout = (scheduledWorkoutId: string) => {
    setState((current) => ({
      ...current,
      scheduledWorkouts: current.scheduledWorkouts.map((workout) =>
        workout.id === scheduledWorkoutId ? { ...workout, status: 'Started' as const } : workout
      ),
      activeWorkoutId: scheduledWorkoutId,
    }));
    navigate('train');
  };

  const handleFinishWorkout = (execution: WorkoutExecution) => {
    const recommendations = createWorkoutRecommendations(execution, state);
    setState((current) => {
      const scheduledWorkouts = current.scheduledWorkouts.map((workout) =>
        workout.id === execution.scheduledWorkoutId
          ? {
              ...workout,
              status: execution.completionPercentage >= 100
                ? 'Completed' as const
                : 'Partial' as const,
            }
          : workout
      );
      const existingIndex = current.workoutExecutions.findIndex(
        (item) => item.scheduledWorkoutId === execution.scheduledWorkoutId
      );
      const workoutExecutions = [...current.workoutExecutions];
      if (existingIndex >= 0) workoutExecutions[existingIndex] = execution;
      else workoutExecutions.push(execution);

      const targetWorkout = current.scheduledWorkouts.find(
        (workout) => workout.id === execution.scheduledWorkoutId
      );
      const weeks = targetWorkout
        ? current.weeks.map((week) => {
            if (week.id !== targetWorkout.weekId) return week;
            const allCompleted = scheduledWorkouts
              .filter((workout) => workout.weekId === targetWorkout.weekId)
              .every((workout) => workout.status === 'Completed');
            return allCompleted ? { ...week, status: 'Locked' as const } : week;
          })
        : current.weeks;

      return {
        ...current,
        scheduledWorkouts,
        workoutExecutions,
        progressionRecommendations: [
          ...current.progressionRecommendations.filter(
            (item) => item.sourceWorkoutExecutionId !== execution.id
          ),
          ...recommendations,
        ],
        weeks,
        activeWorkoutId: null,
      };
    });
    navigate(recommendations.length ? 'progress' : 'today');
    showToast(
      recommendations.length
        ? `Workout saved. ${recommendations.length} progression suggestion${recommendations.length === 1 ? '' : 's'} ready.`
        : 'Workout saved.'
    );
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = parseAppStateBackup(String(reader.result));
        setState(imported);
        showToast(
          cloud.user
            ? 'Backup imported and queued for cloud synchronization.'
            : 'Backup imported successfully.'
        );
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Backup import failed.', 'error');
      }
    };
    reader.onerror = () => showToast('The backup file could not be read.', 'error');
    reader.readAsText(file);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1) return;
    touchStart.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
      target: event.target,
    };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || event.changedTouches.length !== 1) return;
    if (currentRoute === 'train' && state.activeWorkoutId) return;
    if (start.target instanceof Element && start.target.closest(SWIPE_IGNORE_SELECTOR)) return;

    const deltaX = event.changedTouches[0].clientX - start.x;
    const deltaY = event.changedTouches[0].clientY - start.y;
    if (Math.abs(deltaX) < 64 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) return;
    const index = PRIMARY_ROUTES.indexOf(currentRoute);
    if (index < 0) return;
    const nextIndex = deltaX < 0 ? index + 1 : index - 1;
    const nextRoute = PRIMARY_ROUTES[nextIndex];
    if (nextRoute) navigate(nextRoute);
  };

  return (
    <div className="app-shell bg-zinc-950 font-sans text-zinc-100 antialiased selection:bg-zinc-800 selection:text-zinc-100">
      <Navigation
        currentRoute={currentRoute}
        navigate={navigate}
        state={state}
        user={cloud.user}
        syncStatus={cloud.status}
        onResetSeed={() => {
          setState(resetAppStateToSeed());
          showToast('Sample data restored.');
        }}
        onClearCleanSlate={() => {
          setState(clearAppStateToCleanSlate());
          showToast('Clean slate created.');
        }}
        onExportData={() => exportAppStateJSON(state)}
        onImportData={handleImportData}
      />

      <main
        className="page-content mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <React.Suspense
          fallback={
            <div className="flex min-h-56 items-center justify-center text-sm text-zinc-500">
              Loading module…
            </div>
          }
        >
          {currentRoute === 'today' && (
            <Dashboard
              state={state}
              onStartWorkout={handleStartWorkout}
              onNavigateTab={navigateLegacy}
            />
          )}
          {currentRoute === 'plan' && (
            <WeeklyPlanner
              state={state}
              onUpdateState={setState}
              onStartWorkout={handleStartWorkout}
            />
          )}
          {currentRoute === 'train' && (
            <WorkoutMode
              state={state}
              scheduledWorkoutId={state.activeWorkoutId}
              onFinishWorkout={handleFinishWorkout}
              onCancelWorkout={() => navigate('today')}
            />
          )}
          {currentRoute === 'progress' && (
            <WeeklyReviewView state={state} onUpdateState={setState} />
          )}
          {currentRoute === 'streaks' && (
            <LifeInWeeksView state={state} onUpdateState={setState} />
          )}
          {currentRoute === 'exercises' && (
            <ExerciseLibrary state={state} onUpdateState={setState} />
          )}
          {currentRoute === 'recovery' && (
            <EnduranceRecoveryTracker state={state} onUpdateState={setState} />
          )}
          {currentRoute === 'account' && (
            <AccountSyncView
              state={state}
              configured={cloud.configured}
              user={cloud.user}
              status={cloud.status}
              error={cloud.error}
              lastSyncedAt={cloud.lastSyncedAt}
              needsInitialization={cloud.needsInitialization}
              onSignIn={cloud.startGoogleSignIn}
              onSignOut={cloud.signOutAccount}
              onInitializeCloud={cloud.initializeCloud}
              onRetry={cloud.retrySync}
              onExport={() => exportAppStateJSON(state)}
              onImport={handleImportData}
            />
          )}
        </React.Suspense>
      </main>

      {state.activeWorkoutId && currentRoute !== 'train' && (
        <button
          onClick={() => navigate('train')}
          className="active-workout-pill md:hidden"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block font-mono text-[10px] font-bold text-emerald-100">
                ACTIVE SESSION
              </span>
              <span className="block truncate text-xs text-emerald-300/80">
                {state.scheduledWorkouts.find((workout) => workout.id === state.activeWorkoutId)
                  ?.title || 'Workout'}
              </span>
            </span>
          </span>
          <span className="shrink-0 rounded-xl bg-emerald-500 px-3 py-2 font-mono text-xs font-bold text-zinc-950">
            Resume
          </span>
        </button>
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      {updateWorker && (
        <div className="fixed bottom-[calc(var(--mobile-dock-height)+0.75rem)] left-3 right-3 z-[70] mx-auto max-w-md rounded-2xl border border-sky-500/30 bg-sky-950 p-4 shadow-2xl md:bottom-5">
          <p className="text-sm font-semibold text-sky-100">A Training OS update is ready.</p>
          <p className="mt-1 text-xs text-sky-200/70">
            {state.activeWorkoutId
              ? 'Finish or leave the active workout before updating.'
              : 'Apply it now to refresh the offline app.'}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              disabled={Boolean(state.activeWorkoutId)}
              onClick={() => updateWorker.postMessage({ type: 'SKIP_WAITING' })}
              className="mobile-action bg-sky-400 text-sky-950 disabled:opacity-40"
            >
              Update now
            </button>
            <button onClick={() => setUpdateWorker(null)} className="mobile-action secondary-action">
              Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
