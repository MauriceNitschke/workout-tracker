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

  // Active workout check
  const activeWorkout = state.scheduledWorkouts.find(
    (sw) => sw.id === state.activeWorkoutId || sw.status === 'Started'
  );

  // Current active week
  const currentWeek = state.weeks.find((w) => w.status === 'In Progress') || state.weeks[0];

  const consistency = calculateConsistencyStats(state);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'planner', label: 'Weekly Plan', icon: Calendar },
    {
      id: 'workout',
      label: 'Workout Mode',
      icon: Play,
      badge: activeWorkout ? 'ACTIVE' : undefined,
    },
    { id: 'life-in-weeks', label: 'Life in Weeks', icon: LayoutGrid },
    { id: 'review', label: 'Review & Reports', icon: Activity },
    { id: 'exercises', label: 'Exercises & Templates', icon: Dumbbell },
    { id: 'recovery', label: 'Endurance & Recovery', icon: HeartPulse },
  ];

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-950 font-mono font-bold text-sm flex items-center justify-center tracking-tighter">
              OS
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm tracking-tight text-zinc-100">
                  TRAINING OPERATING SYSTEM
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Plan → Execute → Review → Improve
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
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

          {/* Controls & Actions */}
          <div className="flex items-center space-x-2">
            {activeWorkout && currentTab !== 'workout' && (
              <button
                onClick={() => setCurrentTab('workout')}
                className="flex items-center space-x-2 px-3 py-1.5 text-xs font-mono font-medium rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all animate-pulse"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>RESUME WORKOUT</span>
              </button>
            )}

            {/* Data Menu */}
            <div className="relative">
              <button
                onClick={() => setShowDataMenu(!showDataMenu)}
                className="px-2.5 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-100 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition"
              >
                Data Options
              </button>

              {showDataMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg bg-zinc-900 border border-zinc-800 shadow-2xl p-1.5 text-xs z-50">
                  <button
                    onClick={() => {
                      onExportData();
                      setShowDataMenu(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 rounded-md transition text-left"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Export Data (JSON)</span>
                  </button>

                  <label className="w-full flex items-center space-x-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 rounded-md transition cursor-pointer text-left">
                    <Upload className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Import Data</span>
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

                  <div className="border-t border-zinc-800 my-1"></div>

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
                    className="w-full flex items-center space-x-2 px-3 py-2 text-rose-400 hover:bg-rose-950/40 rounded-md transition text-left"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to Seed Data</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none pt-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-medium rounded-md transition whitespace-nowrap ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-zinc-100' : 'text-zinc-500'
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
  );
};
