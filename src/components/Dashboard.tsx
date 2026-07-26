import React from 'react';
import {
  Activity,
  ArrowRight,
  Award,
  BarChart2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Play,
  ShieldCheck,
  Lock,
  TrendingUp,
} from 'lucide-react';
import { AppState, ScheduledWorkout, TrainingWeek } from '../types';
import {
  calculateConsistencyStats,
  calculateExecutionVolume,
  calculatePersonalRecords,
  calculatePlannedVolume,
} from '../lib/prCalculator';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface DashboardProps {
  state: AppState;
  onStartWorkout: (scheduledWorkoutId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  state,
  onStartWorkout,
  onNavigateTab,
}) => {
  const consistency = calculateConsistencyStats(state);
  const prs = calculatePersonalRecords(state);

  // Current Week (In Progress or current)
  const currentWeek =
    state.weeks.find((w) => w.status === 'In Progress') ||
    state.weeks.find((w) => w.status === 'Ready') ||
    state.weeks[state.weeks.length - 1];

  const currentWorkouts = currentWeek
    ? state.scheduledWorkouts.filter((sw) => sw.weekId === currentWeek.id)
    : [];

  // Weekly Volume Data for Recharts
  const weeklyVolumeData = state.weeks
    .filter((w) => w.status !== 'Planning')
    .map((w) => {
      const workoutsInWeek = state.scheduledWorkouts.filter((sw) => sw.weekId === w.id);
      let totalVolume = 0;

      workoutsInWeek.forEach((sw) => {
        const exec = state.workoutExecutions.find((e) => e.scheduledWorkoutId === sw.id);
        if (exec) {
          totalVolume += calculateExecutionVolume(exec);
        } else if (sw.status === 'Completed') {
          totalVolume += calculatePlannedVolume(sw);
        }
      });

      return {
        weekLabel: `W${w.isoWeek}`,
        volumeKg: totalVolume,
        status: w.status,
      };
    });

  // Recent PRs list
  const prEntries = Object.values(prs);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6">
        <div>
          <div className="flex items-center space-x-2 text-zinc-400 text-xs font-mono uppercase tracking-wider mb-1">
            <span>ACTIVE PROGRAM</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold truncate">
              {state.programs[0]?.name || 'Summer Hypertrophy 2026'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
            Training Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
            Focus on execution and consistency. Every workout is planned in advance, executed with precision, and manually progressed.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => onNavigateTab('planner')}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 text-xs font-mono font-medium rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 transition"
          >
            <Calendar className="w-4 h-4 text-zinc-400" />
            <span>PLAN NEXT WEEK</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Consistency (Primary KPI) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-mono text-zinc-400 uppercase tracking-wider truncate">
              CONSISTENCY
            </span>
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-zinc-100 font-mono">
              {consistency.percentage}%
            </span>
            <span className="text-[10px] sm:text-xs text-zinc-400 truncate">completion</span>
          </div>
          <div className="mt-2 text-[10px] sm:text-xs text-zinc-400 flex items-center justify-between font-mono">
            <span>Done: {consistency.totalCompleted}</span>
            <span>Plan: {consistency.totalPlanned}</span>
          </div>
          <div className="mt-2 w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${consistency.percentage}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 2: Active Week */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-mono text-zinc-400 uppercase tracking-wider truncate">
              CURRENT WEEK
            </span>
            <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-zinc-100 font-mono">
              W{currentWeek?.isoWeek || 'N/A'}
            </span>
          </div>
          <div className="mt-2 flex items-center space-x-1.5">
            <span
              className={`px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono uppercase font-semibold rounded border ${
                currentWeek?.status === 'Locked'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : currentWeek?.status === 'In Progress'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              }`}
            >
              {currentWeek?.status}
            </span>
            {currentWeek?.status === 'Locked' && (
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            )}
          </div>
        </div>

        {/* KPI 3: Personal Records */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-mono text-zinc-400 uppercase tracking-wider truncate">
              PRs TRACKED
            </span>
            <Award className="w-4 h-4 text-purple-400 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-zinc-100 font-mono">
              {prEntries.length}
            </span>
            <span className="text-[10px] sm:text-xs text-zinc-400">PRs</span>
          </div>
          <p className="mt-2 text-[10px] sm:text-xs text-zinc-400 truncate">
            Top: {prEntries[0] ? prEntries[0].formattedValue : 'None'}
          </p>
        </div>

        {/* KPI 4: Workout Mode Action */}
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-mono text-zinc-400 uppercase tracking-wider">
              QUICK EXECUTION
            </span>
            <Dumbbell className="w-4 h-4 text-emerald-400" />
          </div>
          <button
            onClick={() => {
              const pending = currentWorkouts.find((sw) => sw.status !== 'Completed');
              if (pending) {
                onStartWorkout(pending.id);
              } else {
                onNavigateTab('planner');
              }
            }}
            className="w-full mt-3 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-bold transition shadow-lg shadow-emerald-500/10 active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="truncate">
              {currentWorkouts.some((sw) => sw.status === 'Started')
                ? 'CONTINUE WORKOUT'
                : 'START TODAY\'S WORKOUT'}
            </span>
          </button>
        </div>
      </div>


      {/* Main Grid: Current Week Schedule + Volume Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Scheduled Workouts for Current Week (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center space-x-2">
                <span>Current Week Schedule</span>
                <span className="text-xs font-mono font-normal text-zinc-400">
                  (ISO Week {currentWeek?.isoWeek})
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Execute planned sessions with minimal friction.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('planner')}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center space-x-1 font-mono"
            >
              <span>Manage Week Plan</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {currentWorkouts.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-xs font-mono">
                No workouts scheduled for this week.
              </div>
            ) : (
              currentWorkouts.map((sw) => {
                const isCompleted = sw.status === 'Completed';
                const isStarted = sw.status === 'Started';

                return (
                  <div
                    key={sw.id}
                    className={`bg-zinc-900 border rounded-xl p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isCompleted
                        ? 'border-zinc-800/80 bg-zinc-900/50'
                        : isStarted
                        ? 'border-emerald-500/50 bg-emerald-950/10 shadow-lg shadow-emerald-500/5'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-xs text-zinc-500">
                          #{sw.workoutNumber}
                        </span>
                        <h3 className="text-base font-semibold text-zinc-100">
                          {sw.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono uppercase font-medium rounded ${
                            isCompleted
                              ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              : isStarted
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {sw.status}
                        </span>
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-zinc-400 pt-1">
                        <span>
                          {sw.plannedExercises.length} Planned Exercises
                        </span>
                        {sw.date && <span>• Date: {sw.date}</span>}
                      </div>

                      {/* Exercise chips */}
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {sw.plannedExercises.map((pe) => {
                          const ex = state.exercises.find((e) => e.id === pe.exerciseId);
                          const totalSets = pe.plannedSets.length;
                          const avgWeight = pe.plannedSets[0]?.plannedWeight || 0;
                          return (
                            <span
                              key={pe.id}
                              className="px-2 py-1 bg-zinc-950 border border-zinc-800 text-zinc-300 rounded text-[11px] font-mono"
                            >
                              {ex ? ex.name : 'Exercise'}: {totalSets}x{pe.plannedSets[0]?.plannedReps} @{avgWeight}kg
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center space-x-2">
                      {!isCompleted ? (
                        <button
                          onClick={() => onStartWorkout(sw.id)}
                          className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-bold transition shadow-md"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{isStarted ? 'RESUME' : 'START WORKOUT'}</span>
                        </button>
                      ) : (
                        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>COMPLETED</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Volume Progression Chart & PR Showcase */}
        <div className="space-y-6">
          {/* Chart Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200 tracking-tight flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-emerald-400" />
                <span>Weekly Tonnage Trend (kg)</span>
              </h3>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyVolumeData}>
                  <defs>
                    <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="weekLabel"
                    stroke="#52525b"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: '#27272a',
                      fontSize: '12px',
                      color: '#f4f4f5',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value} kg`, 'Total Volume']}
                  />
                  <Area
                    type="monotone"
                    dataKey="volumeKg"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#volumeGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono text-center">
              Total tonnage lifted per training week (Sets x Reps x Weight)
            </p>
          </div>

          {/* Personal Records Highlight Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200 tracking-tight flex items-center space-x-2">
                <Award className="w-4 h-4 text-purple-400" />
                <span>Top Personal Records</span>
              </h3>
              <button
                onClick={() => onNavigateTab('review')}
                className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200"
              >
                View All
              </button>
            </div>

            <div className="space-y-2.5">
              {prEntries.slice(0, 4).map((pr) => {
                const ex = state.exercises.find((e) => e.id === pr.exerciseId);
                return (
                  <div
                    key={pr.exerciseId}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-zinc-200">
                        {ex?.name || 'Exercise'}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        {pr.date} • {pr.workoutTitle}
                      </p>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-emerald-400 font-bold">
                        {pr.formattedValue}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
