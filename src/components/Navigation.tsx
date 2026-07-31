import React, { useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronRight,
  Cloud,
  Download,
  Dumbbell,
  HeartPulse,
  Play,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { AppState, CloudUser, RouteId, SyncStatus } from '../types';
import { getCurrentISOWeekAndYear } from '../lib/weekUtils';

interface NavigationProps {
  currentRoute: RouteId;
  navigate: (route: RouteId) => void;
  state: AppState;
  user: CloudUser | null;
  syncStatus: SyncStatus;
  onResetSeed: () => void;
  onClearCleanSlate: () => void;
  onExportData: () => void;
  onImportData: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const primaryTabs = [
  { id: 'today' as const, label: 'Today', desktopLabel: 'Today', icon: BarChart3 },
  { id: 'plan' as const, label: 'Plan', desktopLabel: 'Plan', icon: Calendar },
  { id: 'train' as const, label: 'Train', desktopLabel: 'Train', icon: Play },
  { id: 'progress' as const, label: 'Progress', desktopLabel: 'Progress', icon: Activity },
];

const secondaryTabs = [
  {
    id: 'exercises' as const,
    label: 'Exercises & Templates',
    desc: 'Library, target muscles and progression',
    icon: Dumbbell,
  },
  {
    id: 'recovery' as const,
    label: 'Recovery & Endurance',
    desc: 'Cardio, sleep and recovery activities',
    icon: HeartPulse,
  },
  {
    id: 'account' as const,
    label: 'Account & Sync',
    desc: 'Google account, cloud status and backups',
    icon: Cloud,
  },
];

export const Navigation: React.FC<NavigationProps> = ({
  currentRoute,
  navigate,
  state,
  user,
  syncStatus,
  onResetSeed,
  onClearCleanSlate,
  onExportData,
  onImportData,
}) => {
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [confirmation, setConfirmation] = useState<'clear' | 'reset' | null>(null);
  const activeWorkout = state.scheduledWorkouts.find(
    (workout) => workout.id === state.activeWorkoutId || workout.status === 'Started'
  );
  const currentCalendarWeek = getCurrentISOWeekAndYear();
  const currentWeek =
    state.weeks.find(
      (week) =>
        week.isoWeek === currentCalendarWeek.isoWeek &&
        week.year === currentCalendarWeek.year
    ) ||
    state.weeks.find((week) => week.status === 'In Progress') ||
    state.weeks[0];
  const secondaryActive = secondaryTabs.some((tab) => tab.id === currentRoute);

  useEffect(() => {
    if (!showMore) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showMore]);

  const chooseRoute = (route: RouteId) => {
    navigate(route);
    setShowMore(false);
    setShowDataMenu(false);
  };

  const confirmAction = () => {
    if (confirmation === 'clear') onClearCleanSlate();
    if (confirmation === 'reset') onResetSeed();
    setConfirmation(null);
    setShowMore(false);
    setShowDataMenu(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 pt-[env(safe-area-inset-top,0px)] text-zinc-100 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between sm:h-16">
            <button
              onClick={() => chooseRoute('today')}
              className="flex min-h-11 items-center gap-2.5 rounded-xl text-left sm:gap-3"
              aria-label="Go to Today"
            >
              <img
                src="./icon-192.png"
                alt=""
                className="h-9 w-9 shrink-0 rounded-xl shadow-lg shadow-emerald-500/15"
              />
              <span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold tracking-tight sm:text-sm">
                    TRAINING OS
                  </span>
                  <span className="rounded border border-zinc-700/80 bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-emerald-400">
                    PWA
                  </span>
                </span>
                <span className="hidden font-mono text-[11px] text-zinc-400 sm:block">
                  Plan → Train → Progress
                </span>
              </span>
            </button>

            <div className="hidden items-center gap-6 border-x border-zinc-800 px-6 font-mono text-xs text-zinc-400 lg:flex">
              <span>
                WEEK:{' '}
                <strong className="text-zinc-200">
                  {currentWeek ? `W${currentWeek.isoWeek}` : 'N/A'}
                </strong>
              </span>
              <span className={syncStatus === 'synced' ? 'text-emerald-400' : 'text-zinc-400'}>
                {user ? (syncStatus === 'synced' ? 'CLOUD SYNCED' : syncStatus.toUpperCase()) : 'LOCAL'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {activeWorkout && currentRoute !== 'train' && (
                <button
                  onClick={() => chooseRoute('train')}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 font-mono text-[11px] font-semibold text-emerald-400"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>RESUME</span>
                </button>
              )}
              <button
                onClick={() => setShowDataMenu((open) => !open)}
                className="hidden min-h-11 rounded-xl border border-zinc-800 bg-zinc-900 px-3 font-mono text-xs font-bold text-zinc-300 sm:block"
                aria-expanded={showDataMenu}
              >
                Data
              </button>
              {showDataMenu && (
                <div className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+3.75rem)] z-50 w-64 space-y-1 rounded-2xl border border-zinc-800 bg-zinc-900 p-2 font-mono text-xs shadow-2xl">
                  <button onClick={onExportData} className="menu-row">
                    <Download className="h-4 w-4 text-emerald-400" /> Export backup
                  </button>
                  <label className="menu-row cursor-pointer">
                    <Upload className="h-4 w-4 text-sky-400" /> Import backup
                    <input type="file" accept=".json,application/json" onChange={onImportData} className="hidden" />
                  </label>
                  <button onClick={() => setConfirmation('clear')} className="menu-row text-amber-400">
                    <Trash2 className="h-4 w-4" /> Start clean
                  </button>
                  <button onClick={() => setConfirmation('reset')} className="menu-row">
                    <RotateCcw className="h-4 w-4" /> Restore sample data
                  </button>
                </div>
              )}
            </div>
          </div>

          <nav className="hidden gap-1 overflow-x-auto pb-2 pt-1 md:flex">
            {[...primaryTabs, ...secondaryTabs].map((tab) => {
              const Icon = tab.icon;
              const active = currentRoute === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => chooseRoute(tab.id)}
                  className={`flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3.5 text-xs font-medium ${
                    active
                      ? 'border border-zinc-700 bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  {'desktopLabel' in tab ? tab.desktopLabel : tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <nav className="mobile-dock md:hidden" aria-label="Primary navigation">
        <div className="mx-auto grid max-w-md grid-cols-5 items-center">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const active = currentRoute === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => chooseRoute(tab.id)}
                className={`dock-item ${active ? 'text-emerald-400' : 'text-zinc-400'}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {tab.id === 'train' && activeWorkout && (
                    <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-950" />
                  )}
                </span>
                <span className="mt-1 text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setShowMore(true)}
            className={`dock-item ${secondaryActive ? 'text-emerald-400' : 'text-zinc-400'}`}
            aria-expanded={showMore}
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span className="mt-1 text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {showMore && (
        <div className="mobile-sheet-layer md:hidden" role="dialog" aria-modal="true" aria-labelledby="more-title">
          <button className="absolute inset-0" onClick={() => setShowMore(false)} aria-label="Close menu" />
          <div className="mobile-sheet">
            <div className="mobile-sheet-header">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">Navigate</p>
                <h2 id="more-title" className="font-mono text-sm font-bold text-zinc-100">More</h2>
              </div>
              <button onClick={() => setShowMore(false)} className="touch-target rounded-full bg-zinc-800 text-zinc-300" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 px-4 py-4">
              {secondaryTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => chooseRoute(tab.id)} className="module-row">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-zinc-100">{tab.label}</span>
                      <span className="block text-xs leading-tight text-zinc-400">{tab.desc}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 px-4 py-4">
              <button onClick={onExportData} className="mobile-action secondary-action">
                <Download className="h-4 w-4 text-emerald-400" /> Export
              </button>
              <label className="mobile-action secondary-action cursor-pointer">
                <Upload className="h-4 w-4 text-sky-400" /> Import
                <input type="file" accept=".json,application/json" onChange={onImportData} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}

      {confirmation && (
        <div className="mobile-sheet-layer items-center justify-center p-4" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-zinc-100">
              {confirmation === 'clear' ? 'Start with a clean slate?' : 'Restore sample data?'}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              This changes the active {user ? 'cloud' : 'local'} dataset. Export a backup first if you may need it later.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmation(null)} className="mobile-action secondary-action">Cancel</button>
              <button onClick={confirmAction} className="mobile-action bg-amber-500 text-zinc-950">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
