import React, { useState } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  FileText,
  Flame,
  Lock,
  TrendingUp,
  Layers,
  Grid3X3,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { AppState, TrainingWeek } from '../types';
import {
  calculateE1RM,
  calculateExecutionVolume,
  calculatePersonalRecords,
  calculatePlannedVolume,
} from '../lib/prCalculator';
import {
  calculateMuscleVolumeAnalytics,
  MuscleVolumeSummary,
} from '../lib/muscleAnalytics';
import {
  getExerciseAnalyticsReport,
  TimeFilter,
} from '../lib/strengthAnalytics';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { ExerciseDetailModal } from './ExerciseDetailModal';

interface WeeklyReviewViewProps {
  state: AppState;
}

export const WeeklyReviewView: React.FC<WeeklyReviewViewProps> = ({ state }) => {
  const [activeSection, setActiveSection] = useState<'review' | 'muscle-volume' | 'strength-progress'>('review');

  // Selected week for review
  const [selectedWeekId, setSelectedWeekId] = useState<string>(
    state.weeks.find((w) => w.status === 'Locked')?.id || state.weeks[0]?.id || ''
  );

  // Selected exercise for strength progress chart
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    state.exercises[0]?.id || ''
  );

  // Time filter for strength progress
  const [strengthTimeFilter, setStrengthTimeFilter] = useState<TimeFilter>('ALL');

  // Modal for exercise detail
  const [activeDetailExerciseId, setActiveDetailExerciseId] = useState<string | null>(null);

  const selectedWeek = state.weeks.find((w) => w.id === selectedWeekId) || state.weeks[0];

  const workoutsInWeek = selectedWeek
    ? state.scheduledWorkouts.filter((sw) => sw.weekId === selectedWeek.id)
    : [];

  // Workouts review summary
  let totalPlannedVolume = 0;
  let totalExecutedVolume = 0;
  let completedWorkoutsCount = 0;

  workoutsInWeek.forEach((sw) => {
    totalPlannedVolume += calculatePlannedVolume(sw);
    const exec = state.workoutExecutions.find((e) => e.scheduledWorkoutId === sw.id);
    if (exec) {
      totalExecutedVolume += calculateExecutionVolume(exec);
      if (sw.status === 'Completed') completedWorkoutsCount++;
    }
  });

  const volumeCompletionPct =
    totalPlannedVolume > 0
      ? Math.round((totalExecutedVolume / totalPlannedVolume) * 100)
      : 100;

  // Muscle volume analytics calculation
  const muscleAnalytics = calculateMuscleVolumeAnalytics(state);

  // Strength progress report calculation for selected exercise
  const strengthReport = getExerciseAnalyticsReport(
    selectedExerciseId,
    state,
    strengthTimeFilter
  );

  // Helper for heatmap cell color based on completed set volume
  const getHeatmapColorClass = (completedSets: number) => {
    if (completedSets === 0) return 'bg-zinc-950 border-zinc-800 text-zinc-600';
    if (completedSets <= 5) return 'bg-emerald-950/80 border-emerald-800/60 text-emerald-400 font-semibold';
    if (completedSets <= 12) return 'bg-emerald-900 border-emerald-700 text-emerald-300 font-bold';
    if (completedSets <= 18) return 'bg-emerald-600 border-emerald-500 text-zinc-950 font-bold';
    return 'bg-emerald-400 border-emerald-300 text-zinc-950 font-extrabold';
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-7 space-y-4 shadow-xl">
        <div className="flex items-center space-x-2 text-zinc-400 text-xs font-mono uppercase tracking-wider mb-1">
          <span>WORKFLOW STAGE 3</span>
          <span>•</span>
          <span className="text-purple-400 font-semibold">ANALYTICS & PROGRESS REPORTING</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
          Training Performance & Volume Analytics
        </h1>
        <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
          Objective facts before recommendations: analyze planned vs actual work, muscle volume distribution trends, and exercise 1RM progress.
        </p>

        {/* Section Tabs */}
        <div className="flex items-center space-x-2 pt-3 border-t border-zinc-800/80 overflow-x-auto max-w-full pb-1">
          <button
            onClick={() => setActiveSection('review')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition shrink-0 ${
              activeSection === 'review'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Planned vs Actual</span>
          </button>

          <button
            onClick={() => setActiveSection('muscle-volume')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition shrink-0 ${
              activeSection === 'muscle-volume'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Muscle Heatmap</span>
          </button>

          <button
            onClick={() => setActiveSection('strength-progress')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition shrink-0 ${
              activeSection === 'strength-progress'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <span>Strength Progress</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: WEEKLY PLANNED VS ACTUAL REVIEW */}
      {activeSection === 'review' && (
        <div className="space-y-6">
          {/* Week Selector */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400 uppercase font-bold shrink-0">Select Week:</span>
              <select
                value={selectedWeek?.id}
                onChange={(e) => setSelectedWeekId(e.target.value)}
                className="sm:hidden bg-zinc-950 border border-zinc-800 text-emerald-400 text-xs font-mono font-bold rounded-xl px-3 py-2 focus:outline-none"
              >
                {state.weeks.map((w) => (
                  <option key={w.id} value={w.id}>
                    Week {w.isoWeek} ({w.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden sm:flex items-center space-x-2 overflow-x-auto max-w-full pb-1">
              {state.weeks.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWeekId(w.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition shrink-0 ${
                    selectedWeek?.id === w.id
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm font-bold'
                      : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  W{w.isoWeek} ({w.status})
                </button>
              ))}
            </div>
          </div>


          {/* Review Metrics Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">
                WORKOUT COMPLETION
              </span>
              <div className="mt-2 text-3xl font-mono font-bold text-zinc-100">
                {completedWorkoutsCount} / {workoutsInWeek.length}
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-1">Completed planned workouts</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">PLANNED VOLUME</span>
              <div className="mt-2 text-3xl font-mono font-bold text-zinc-100">
                {totalPlannedVolume.toLocaleString()} <span className="text-xs font-normal text-zinc-500">kg</span>
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-1">Target tonnage planned</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">ACTUAL VOLUME</span>
              <div className="mt-2 text-3xl font-mono font-bold text-emerald-400">
                {totalExecutedVolume.toLocaleString()} <span className="text-xs font-normal text-zinc-500">kg</span>
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-1">
                {volumeCompletionPct}% volume realized
              </p>
            </div>
          </div>

          {/* Planned vs Actual Breakdown for Workouts in Week */}
          <div className="space-y-4">
            <h2 className="text-xs font-mono uppercase text-zinc-400 font-bold tracking-wider">
              WORKOUT-BY-WORKOUT BREAKDOWN (W{selectedWeek?.isoWeek})
            </h2>

            {workoutsInWeek.map((sw) => {
              const exec = state.workoutExecutions.find((e) => e.scheduledWorkoutId === sw.id);

              return (
                <div
                  key={sw.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-base font-bold text-zinc-100">{sw.title}</h3>
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-mono uppercase rounded-lg border font-bold ${
                          sw.status === 'Completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {sw.status}
                      </span>
                    </div>
                    {exec && (
                      <span className="text-xs font-mono text-zinc-400">
                        Feeling: <strong className="text-emerald-400">{exec.feeling}</strong>
                      </span>
                    )}
                  </div>

                  {/* Side-by-side comparison table */}
                  <div className="space-y-2">
                    {sw.plannedExercises.map((pe) => {
                      const ex = state.exercises.find((e) => e.id === pe.exerciseId);
                      const ee = exec?.exerciseExecutions.find(
                        (item) => item.plannedExerciseId === pe.id
                      );

                      return (
                        <div
                          key={pe.id}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono"
                        >
                          {/* Left: Planned */}
                          <div>
                            <button
                              onClick={() => ex && setActiveDetailExerciseId(ex.id)}
                              className="text-zinc-400 hover:text-emerald-400 uppercase font-bold block mb-1 text-left flex items-center space-x-1"
                            >
                              <span>PLANNED: {ex?.name}</span>
                              <ExternalLink className="w-3 h-3 text-zinc-500" />
                            </button>
                            <div className="text-zinc-200">
                              {pe.plannedSets.length} sets × {pe.plannedSets[0]?.plannedReps} reps @{' '}
                              <span className="text-emerald-400 font-bold">{pe.plannedSets[0]?.plannedWeight}kg</span>
                            </div>
                          </div>

                          {/* Right: Actual Executed */}
                          <div>
                            <span className="text-zinc-500 uppercase block mb-1">
                              ACTUAL LOGGED:
                            </span>
                            {ee ? (
                              <div className="text-zinc-200 flex flex-wrap gap-1.5">
                                {ee.setExecutions.map((se) => (
                                  <span
                                    key={se.id}
                                    className={`inline-block px-2 py-0.5 rounded-lg border ${
                                      se.completed
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                    }`}
                                  >
                                    Set {se.setNumber}: {se.reps} reps @ {se.weight}kg
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-zinc-600 font-mono italic">Not executed yet</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {exec?.notes && (
                    <p className="text-xs text-zinc-400 font-mono italic bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      Notes: "{exec.notes}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: MUSCLE VOLUME ANALYTICS & HEATMAP */}
      {activeSection === 'muscle-volume' && (
        <div className="space-y-8">
          {/* Section Summary Header */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center space-x-2 font-mono">
              <Layers className="w-5 h-5 text-purple-400" />
              <span>Direct Muscle Group Volume (Weekly & Monthly Sets)</span>
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Calculates direct sets completed per muscle group. Compare current week targets against previous week, 4-week averages, and monthly set distribution.
            </p>
          </div>

          {/* Muscle Volume Breakdown Table / Cards */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-mono uppercase text-zinc-400 font-bold tracking-wider">
              MUSCLE GROUP COMPARISON MATRIX
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[10px]">
                    <th className="pb-3 font-bold">MUSCLE GROUP</th>
                    <th className="pb-3 font-bold">CURRENT WEEK (COMP / PLAN)</th>
                    <th className="pb-3 font-bold">COMPLETION %</th>
                    <th className="pb-3 font-bold">PREVIOUS WEEK</th>
                    <th className="pb-3 font-bold">LAST 4W AVG</th>
                    <th className="pb-3 font-bold">MONTHLY TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {muscleAnalytics.summaries.map((s) => {
                    const pctColor =
                      s.completionPct >= 100
                        ? 'text-emerald-400 font-bold'
                        : s.completionPct >= 75
                        ? 'text-amber-400'
                        : 'text-rose-400';

                    return (
                      <tr key={s.muscleGroup} className="hover:bg-zinc-950/50 transition">
                        <td className="py-3 font-bold text-zinc-100">{s.muscleGroup}</td>
                        <td className="py-3 text-zinc-200">
                          <span className="text-emerald-400 font-bold">{s.currentWeekSets}</span> /{' '}
                          <span className="text-zinc-400">{s.currentWeekPlanned}</span> sets
                        </td>
                        <td className={`py-3 ${pctColor}`}>{s.completionPct}%</td>
                        <td className="py-3 text-zinc-300">{s.previousWeekSets} sets</td>
                        <td className="py-3 text-zinc-300">{s.last4WeeksAvg} sets/wk</td>
                        <td className="py-3 text-purple-400 font-bold">{s.monthlySets} sets</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Heatmap: Rows = Muscle Groups, Columns = Weeks */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center space-x-2 font-mono">
                  <Grid3X3 className="w-4 h-4 text-emerald-400" />
                  <span>Weekly Muscle Volume Heatmap</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Visual intensity represents completed sets per week. Identify undertrained, balanced, or overemphasized muscle groups at a glance.
                </p>
              </div>

              {/* Legend Bar */}
              <div className="flex items-center space-x-2 text-[10px] font-mono text-zinc-400">
                <span>0</span>
                <span className="w-3 h-3 rounded bg-zinc-950 border border-zinc-800"></span>
                <span className="w-3 h-3 rounded bg-emerald-950/80 border border-emerald-800/60"></span>
                <span className="w-3 h-3 rounded bg-emerald-900 border border-emerald-700"></span>
                <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-500"></span>
                <span className="w-3 h-3 rounded bg-emerald-400 border border-emerald-300"></span>
                <span>20+ sets</span>
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase">
                    <th className="p-2.5 font-bold min-w-[120px] bg-zinc-900 sticky left-0 z-10">
                      MUSCLE
                    </th>
                    {muscleAnalytics.allWeeks.map((w) => (
                      <th key={w.weekId} className="p-2.5 text-center min-w-[50px]">
                        {w.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {muscleAnalytics.heatmapRows.map((row) => (
                    <tr key={row.muscleGroup} className="hover:bg-zinc-950/30 transition">
                      <td className="p-2.5 font-bold text-zinc-200 bg-zinc-900 sticky left-0 z-10 border-r border-zinc-800/80">
                        {row.muscleGroup}
                      </td>
                      {row.weeks.map((w, idx) => (
                        <td key={idx} className="p-1.5 text-center">
                          <div
                            title={`${row.muscleGroup} ${w.weekLabel}: ${w.completedSets} / ${w.plannedSets} completed sets`}
                            className={`w-9 h-9 mx-auto rounded-lg border flex items-center justify-center text-xs transition transform hover:scale-110 cursor-pointer ${getHeatmapColorClass(
                              w.completedSets
                            )}`}
                          >
                            {w.completedSets}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: STRENGTH PROGRESS ANALYTICS */}
      {activeSection === 'strength-progress' && (
        <div className="space-y-8">
          {/* Header & Exercise Selector Controls */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-zinc-100 flex items-center space-x-2 font-mono">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span>Exercise Strength & Volume Progression</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Track estimated 1RM, highest weight, and tonnage volume trends per exercise over customizable timeframes.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Exercise Dropdown Selector */}
                <select
                  value={selectedExerciseId}
                  onChange={(e) => setSelectedExerciseId(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono font-bold rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                >
                  {state.exercises.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.category})
                    </option>
                  ))}
                </select>

                {/* Open Exercise Detail Page Button */}
                <button
                  onClick={() => setActiveDetailExerciseId(selectedExerciseId)}
                  className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-bold transition shadow-lg shadow-emerald-500/10"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Exercise Home Page</span>
                </button>
              </div>
            </div>

        {/* Time Filter Tabs */}
        <div className="flex items-center space-x-2 pt-2 text-xs font-mono overflow-x-auto pb-1 max-w-full">
          <span className="text-zinc-500 uppercase mr-1 font-bold shrink-0 text-[10px]">TIMEFRAME:</span>
          {(['1M', '3M', '6M', '1Y', 'ALL'] as TimeFilter[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setStrengthTimeFilter(tf)}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 active:scale-95 ${
                strengthTimeFilter === tf
                  ? 'bg-emerald-500 text-zinc-950 font-extrabold shadow-md'
                  : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {tf === '1M'
                ? '1 Month'
                : tf === '3M'
                ? '3 Months'
                : tf === '6M'
                ? '6 Months'
                : tf === '1Y'
                ? '1 Year'
                : 'All Time'}
            </button>
          ))}
        </div>
          </div>

          {strengthReport && (
            <div className="space-y-6">
              {/* Exercise Key Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
                    HIGHEST RECORDED WEIGHT
                  </span>
                  <div className="mt-2 text-3xl font-mono font-bold text-zinc-100">
                    {strengthReport.stats.highestRecordedWeight > 0
                      ? `${strengthReport.stats.highestRecordedWeight} kg`
                      : 'N/A'}
                  </div>
                  <span className="text-xs text-zinc-500 font-mono mt-1 block">Peak barbell load</span>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
                    BEST ESTIMATED 1RM
                  </span>
                  <div className="mt-2 text-3xl font-mono font-bold text-emerald-400">
                    {strengthReport.stats.highestEstimated1RM > 0
                      ? `~${strengthReport.stats.highestEstimated1RM} kg`
                      : 'N/A'}
                  </div>
                  <span className="text-xs text-zinc-500 font-mono mt-1 block">Epley formula projection</span>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
                    TOTAL CUMULATIVE VOLUME
                  </span>
                  <div className="mt-2 text-3xl font-mono font-bold text-purple-400">
                    {strengthReport.stats.totalVolumeAllTime.toLocaleString()}{' '}
                    <span className="text-xs text-zinc-500">kg</span>
                  </div>
                  <span className="text-xs text-zinc-500 font-mono mt-1 block">
                    {strengthReport.stats.totalRepsAllTime} total reps
                  </span>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider block">
                    BEST COMPLETED SET
                  </span>
                  <div className="mt-2 text-sm font-mono font-bold text-sky-400 leading-tight">
                    {strengthReport.stats.bestSetFormatted}
                  </div>
                  <span className="text-xs text-zinc-500 font-mono mt-1 block">Top set performance</span>
                </div>
              </div>

              {/* Strength Progress Chart */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-zinc-100 flex items-center space-x-2 font-mono">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Estimated 1RM & Weight Load Trajectory ({strengthReport.exercise.name})</span>
                  </h3>
                </div>

                <div className="h-72 w-full">
                  {strengthReport.dataPoints.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono italic">
                      No workouts logged for this exercise within the selected timeframe ({strengthTimeFilter}).
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={strengthReport.dataPoints}>
                        <defs>
                          <linearGradient id="colorE1RM2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="date" stroke="#52525b" fontSize={11} />
                        <YAxis stroke="#52525b" fontSize={11} unit="kg" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            borderColor: '#27272a',
                            fontSize: '12px',
                            color: '#f4f4f5',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="estimated1RM"
                          name="Estimated 1RM (kg)"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorE1RM2)"
                        />
                        <Line
                          type="monotone"
                          dataKey="maxWeight"
                          name="Max Weight (kg)"
                          stroke="#a855f7"
                          strokeWidth={2}
                          dot={{ fill: '#a855f7' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Exercise Detail Modal Triggered from anywhere */}
      {activeDetailExerciseId && (
        <ExerciseDetailModal
          exerciseId={activeDetailExerciseId}
          state={state}
          onClose={() => setActiveDetailExerciseId(null)}
        />
      )}
    </div>
  );
};

