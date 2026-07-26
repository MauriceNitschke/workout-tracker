import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Calendar,
  Dumbbell,
  Play,
  RotateCcw,
  Sparkles,
  HeartPulse,
  Download,
  Upload,
  ChevronRight,
  Lock,
  LayoutGrid,
  MoreHorizontal,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { AppState } from '../types';
import { calculateConsistencyStats } from '../lib/prCalculator';

interface NavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  state: AppState;
  onResetSeed: () => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  setCurrentTab,
  state,
  onResetSeed,
  onExportData,
  onImportData,
}) => {
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [showMoreMobileSheet, setShowMoreMobileSheet] = useState(false);

  // Active workout check
  const activeWorkout = state.scheduledWorkouts.find(
    (sw) => sw.id === state.activeWorkoutId || sw.status === 'Started'
  );

  // Current active week
  const currentWeek = state.weeks.find((w) => w.status === 'In Progress') || state.weeks[0];

  const consistency = calculateConsistencyStats(state);

  const primaryTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'planner', label: 'Plan', icon: Calendar },
    {
      id: 'workout',
      label: 'Workout',
      icon: Play,
      badge: activeWorkout ? 'ACTIVE' : undefined,
    },
    { id: 'review', label: 'Review', icon: Activity },
  ];

  const secondaryTabs = [
    {
      id: 'life-in-weeks',
      label: 'Life in Weeks Grid',
      desc: 'Visual lifetime week map & workout logs',
      icon: LayoutGrid,
    },
    {
      id: 'exercises',
      label: 'Exercise Library & Templates',
      desc: 'Custom exercises, target muscles & progression',
      icon: Dumbbell,
    },
    {
      id: 'recovery',
      label: 'Endurance & Recovery',
      desc: 'HRV, Resting HR, Sleep & Zone 2 Cardio',
      icon: HeartPulse,
    },
  ];

  const allTabs = [
    ...primaryTabs,
    ...secondaryTabs.map((t) => ({ id: t.id, label: t.label, icon: t.icon, badge: undefined })),
  ];

  return (
    <>
      {/* Top Header Bar with iOS Safe Area Padding */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 text-zinc-100 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo / Title */}
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-zinc-950 font-mono font-bold text-sm flex items-center justify-center tracking-tighter shadow-sm shadow-emerald-500/20">
                OS
              </div>
              <div>
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <span className="font-bold text-xs sm:text-sm tracking-tight text-zinc-100">
                    TRAINING OS
                  </span>
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-zinc-700/80">
                    PWA
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 hidden sm:block">
                  Plan → Execute → Review → Overload
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar (Desktop) */}
            <div className="hidden lg:flex items-center space-x-6 text-xs text-zinc-400 font-mono border-l border-r border-zinc-800 px-6 py-1">
              <div className="flex items-center space-x-2">
                <span className="text-zinc-500">WEEK:</span>
                <span className="text-zinc-200 font-semibold">
                  {currentWeek ? `W${currentWeek.isoWeek} (${currentWeek.status})` : 'N/A'}
                </span>
                {currentWeek?.status === 'Locked' && (
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-500">CONSISTENCY:</span>
                <span className="text-emerald-400 font-semibold">
                  {consistency.percentage}% ({consistency.totalCompleted}/{consistency.totalPlanned})
                </span>
              </div>
            </div>

            {/* Top Right Controls & Resume Button */}
            <div className="flex items-center space-x-2">
              {activeWorkout && currentTab !== 'workout' && (
                <button
                  onClick={() => setCurrentTab('workout')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-[11px] font-mono font-semibold rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all animate-pulse"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>RESUME</span>
                </button>
              )}

              {/* Data Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowDataMenu(!showDataMenu)}
                  className="px-2.5 py-1.5 text-xs font-mono text-zinc-300 hover:text-zinc-100 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition"
                >
                  Data
                </button>

                {showDataMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-2 text-xs z-50">
                    <button
                      onClick={() => {
                        onExportData();
                        setShowDataMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg transition text-left font-medium"
                    >
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>Export Backup (JSON)</span>
                    </button>

                    <label className="w-full flex items-center space-x-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg transition cursor-pointer text-left font-medium">
                      <Upload className="w-4 h-4 text-sky-400" />
                      <span>Import Backup</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                          onImportData(e);
                          setShowDataMenu(false);
                        }}
                        className="hidden"
                      />
                    </label>

                    <div className="border-t border-zinc-800 my-1.5"></div>

                    <button
                      onClick={() => {
                        if (
                          confirm(
                            'Reset state to default 6-month seed data? This will overwrite local changes.'
                          )
                        ) {
                          onResetSeed();
                        }
                        setShowDataMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-rose-400 hover:bg-rose-950/40 rounded-lg transition text-left font-medium"
                    >
                      <RotateCcw className="w-4 h-4 text-rose-400" />
                      <span>Reset Seed Data</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Tab Strip */}
          <nav className="hidden md:flex space-x-1 overflow-x-auto pb-2 scrollbar-none pt-1">
            {allTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                    isActive
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                  />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-emerald-500 text-zinc-950">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Fixed Bottom Dock Navigation (iPhone 16 Pro Ergonomics) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-2xl border-t border-zinc-800/80 pb-[calc(env(safe-area-inset-bottom,0px)+0.35rem)] pt-2 px-2 shadow-2xl">
        <div className="grid grid-cols-5 items-center max-w-md mx-auto">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            const isWorkoutActive = tab.id === 'workout' && activeWorkout;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setCurrentTab(tab.id);
                  setShowMoreMobileSheet(false);
                }}
                className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition active:scale-95 ${
                  isActive ? 'text-emerald-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? 'text-emerald-400' : 'text-zinc-400'
                    }`}
                  />
                  {isWorkoutActive && (
                    <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 font-medium tracking-tight">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute -bottom-1 w-1 h-1 bg-emerald-400 rounded-full"></span>
                )}
              </button>
            );
          })}

          {/* More Tab Trigger Button */}
          <button
            onClick={() => setShowMoreMobileSheet(true)}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition active:scale-95 ${
              secondaryTabs.some((t) => t.id === currentTab)
                ? 'text-emerald-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium tracking-tight">More</span>
            {secondaryTabs.some((t) => t.id === currentTab) && (
              <span className="absolute -bottom-1 w-1 h-1 bg-emerald-400 rounded-full"></span>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile "More" Drawer Sheet Overlay */}
      {showMoreMobileSheet && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end animate-fadeIn">
          <div
            className="fixed inset-0"
            onClick={() => setShowMoreMobileSheet(false)}
          ></div>
          <div className="relative bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-100">Additional System Modules</h3>
              </div>
              <button
                onClick={() => setShowMoreMobileSheet(false)}
                className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="space-y-2">
              {secondaryTabs.map((st) => {
                const Icon = st.icon;
                const isActive = currentTab === st.id;

                return (
                  <button
                    key={st.id}
                    onClick={() => {
                      setCurrentTab(st.id);
                      setShowMoreMobileSheet(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition active:scale-[0.98] ${
                      isActive
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-zinc-100'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`p-2.5 rounded-xl ${
                          isActive
                            ? 'bg-emerald-500 text-zinc-950 font-bold'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-100">{st.label}</div>
                        <div className="text-[11px] text-zinc-400 leading-tight">{st.desc}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </button>
                );
              })}
            </div>

            {/* Backup & Tools Quick Bar inside Sheet */}
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
              <button
                onClick={() => {
                  onExportData();
                  setShowMoreMobileSheet(false);
                }}
                className="flex items-center space-x-2 text-xs font-mono text-zinc-300 bg-zinc-950 px-3.5 py-2.5 rounded-xl border border-zinc-800 active:scale-95 transition"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Export JSON</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Reset to initial 6-month seed data?')) {
                    onResetSeed();
                    setShowMoreMobileSheet(false);
                  }
                }}
                className="flex items-center space-x-2 text-xs font-mono text-rose-400 bg-zinc-950 px-3.5 py-2.5 rounded-xl border border-zinc-800 active:scale-95 transition"
              >
                <RotateCcw className="w-4 h-4 text-rose-400" />
                <span>Reset Seed</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

