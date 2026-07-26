import React, { useState } from 'react';
import {
  Activity,
  Calendar,
  Flame,
  HeartPulse,
  Info,
  Layers,
  Sparkles,
  TrendingUp,
  X,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Dumbbell,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { AppState, ScheduledWorkout } from '../types';
import {
  calculateLifeInWeeksStats,
  getDayDetailData,
  getDaysInMonth,
  MONTH_NAMES,
  DayDetailData,
  DayDominantColor,
} from '../lib/weekUtils';

interface LifeInWeeksViewProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
}

export const LifeInWeeksView: React.FC<LifeInWeeksViewProps> = ({
  state,
}) => {
  const years = [2026, 2025, 2024, 2027];
  const [selectedYearFilter, setSelectedYearFilter] = useState<number | 'all'>('all');
  const [gridMode, setGridMode] = useState<'compact-grid' | 'horizontal-lines'>('compact-grid');
  const [selectedDayDetail, setSelectedDayDetail] = useState<DayDetailData | null>(null);

  const stats = calculateLifeInWeeksStats(state);

  // Helper for rendering day tile color
  const getDayTileClasses = (color: DayDominantColor, isToday: boolean, isSelected: boolean) => {
    let base =
      'w-4 h-4 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5 rounded-[4px] flex items-center justify-center text-[8px] font-mono font-bold transition-all duration-150 transform hover:scale-125 cursor-pointer relative shrink-0 ';

    if (isSelected) {
      base += 'ring-2 ring-sky-400 ring-offset-2 ring-offset-zinc-950 z-30 ';
    } else if (isToday) {
      base += 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-950 z-20 ';
    }

    switch (color) {
      case 'green':
        return base + 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-xs shadow-emerald-500/20';
      case 'yellow':
        return base + 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-xs shadow-amber-500/20';
      case 'red':
        return base + 'bg-rose-500 hover:bg-rose-400 text-zinc-950 shadow-xs shadow-rose-500/20';
      case 'blue':
        return base + 'bg-sky-500 hover:bg-sky-400 text-zinc-950 shadow-xs shadow-sky-500/20';
      case 'purple':
        return base + 'bg-purple-500 hover:bg-purple-400 text-zinc-950 shadow-xs shadow-purple-500/20';
      case 'gray':
        return base + 'bg-zinc-800/90 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-800';
      case 'future':
      default:
        return base + 'bg-zinc-950 text-zinc-700 border border-zinc-800/40 opacity-30 hover:opacity-75';
    }
  };

  const visibleYears =
    selectedYearFilter === 'all'
      ? years
      : years.filter((y) => y === selectedYearFilter);

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-7 space-y-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-zinc-400 text-xs font-mono uppercase tracking-wider mb-1.5">
              <span>LONG-TERM CONSISTENCY ENGINE</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">DAY-BY-DAY MONTHLY MATRIX</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 flex items-center space-x-2">
              <Flame className="w-7 h-7 text-emerald-400 inline shrink-0" />
              <span>Streak Tracker Training Log</span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Every tile represents one calendar day mapped to your scheduled and logged workouts. Click any day to inspect workout executions, planned sessions, and recovery logs.
            </p>

          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
              <button
                onClick={() => setGridMode('compact-grid')}
                className={`px-3 py-1.5 rounded-lg transition font-medium ${
                  gridMode === 'compact-grid'
                    ? 'bg-zinc-800 text-zinc-100 font-bold border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Calendar Cards
              </button>
              <button
                onClick={() => setGridMode('horizontal-lines')}
                className={`px-3 py-1.5 rounded-lg transition font-medium ${
                  gridMode === 'horizontal-lines'
                    ? 'bg-zinc-800 text-zinc-100 font-bold border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Line Rows
              </button>
            </div>

            <select
              value={selectedYearFilter}
              onChange={(e) =>
                setSelectedYearFilter(
                  e.target.value === 'all' ? 'all' : Number(e.target.value)
                )
              }
              className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-mono rounded-xl px-3.5 py-2.5 focus:outline-none hover:border-zinc-700 transition"
            >
              <option value="all">All Years (2024 - 2027)</option>
              <option value={2026}>2026 (Current)</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024 (Leap Year)</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3.5 space-y-1 hover:border-zinc-700 transition">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              COMPLETION RATE
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-lg font-bold font-mono text-emerald-400">
                {stats.completionRate}%
              </span>
            </div>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3.5 space-y-1 hover:border-zinc-700 transition">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              CURRENT STREAK
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-lg font-bold font-mono text-amber-400">
                {stats.streak} {stats.streak === 1 ? 'Week' : 'Weeks'}
              </span>
              <Flame className="w-3.5 h-3.5 text-amber-500" />
            </div>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3.5 space-y-1 hover:border-zinc-700 transition">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              2026 ACTIVE WEEKS
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-lg font-bold font-mono text-zinc-100">
                {stats.completedWeeksThisYear}
              </span>
              <span className="text-xs font-mono text-zinc-500">/ 52</span>
            </div>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3.5 space-y-1 hover:border-zinc-700 transition">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              STRENGTH SESSIONS
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-lg font-bold font-mono text-emerald-400">
                {stats.strengthSessions}
              </span>
            </div>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3.5 space-y-1 hover:border-zinc-700 transition">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              ENDURANCE SESSIONS
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-lg font-bold font-mono text-sky-400">
                {stats.enduranceSessions}
              </span>
            </div>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3.5 space-y-1 hover:border-zinc-700 transition">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              RECOVERY MODALITIES
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-lg font-bold font-mono text-purple-400">
                {stats.recoverySessions}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Color Priority Legend Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm">
        <div className="text-[11px] font-mono uppercase text-zinc-400 font-semibold mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Info className="w-3.5 h-3.5 text-zinc-500" />
            <span>DAY DOMINANT COLOR PRIORITY</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-normal">
            * Subtle gap after every Sunday indicates week boundaries
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-[3px] bg-emerald-500 shrink-0"></span>
            <span className="text-zinc-300">1. Strength Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-[3px] bg-amber-500 shrink-0"></span>
            <span className="text-zinc-300">2. Strength Partial</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-[3px] bg-rose-500 shrink-0"></span>
            <span className="text-zinc-300">3. Strength Skipped</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-[3px] bg-sky-500 shrink-0"></span>
            <span className="text-zinc-300">4. Endurance</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-[3px] bg-purple-500 shrink-0"></span>
            <span className="text-zinc-300">5. Recovery</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-[3px] bg-zinc-800 border border-zinc-700 shrink-0"></span>
            <span className="text-zinc-400">6. No Activity</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-[3px] bg-zinc-950 border border-zinc-800 opacity-40 shrink-0"></span>
            <span className="text-zinc-500">7. Future Day</span>
          </div>
        </div>
      </div>

      {/* Life in Weeks Matrix Grid - Day-by-Day Monthly Rows */}
      <div className="space-y-8">
        {visibleYears.map((year) => (
          <div
            key={year}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-7 space-y-6 shadow-xl"
          >
            {/* Year Heading Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-bold font-mono text-zinc-100">{year}</h2>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-lg bg-zinc-800/90 text-zinc-400 border border-zinc-700/80 font-medium">
                  {year === 2026 ? 'Current Year' : year < 2026 ? 'Past Year' : 'Future Year'}
                </span>
                {year === 2024 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    29 Days in Feb (Leap Year)
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-zinc-500">
                1 Row = 1 Month • 1 Tile = 1 Day
              </span>
            </div>

            {/* Monthly View Container */}
            {gridMode === 'compact-grid' ? (
              /* Compact Calendar-Style Grid (7 Columns per Month Card) */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {MONTH_NAMES.map((monthName, monthIdx) => {
                  const daysInMonth = getDaysInMonth(year, monthIdx);

                  return (
                    <div
                      key={monthName}
                      className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-3 hover:border-zinc-700 transition flex flex-col justify-between"
                    >
                      {/* Month Header */}
                      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                        <span className="text-xs font-mono font-bold text-zinc-200 uppercase tracking-wider">
                          {monthName}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {daysInMonth} Days
                        </span>
                      </div>

                      {/* Day of Week Header */}
                      <div className="grid grid-cols-7 text-center text-[9px] font-mono text-zinc-500 uppercase font-semibold">
                        <span>M</span>
                        <span>T</span>
                        <span>W</span>
                        <span>T</span>
                        <span>F</span>
                        <span>S</span>
                        <span>S</span>
                      </div>

                      {/* 7-Column Day Tiles Grid */}
                      <div className="grid grid-cols-7 gap-1.5 justify-items-center">
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
                          const detail = getDayDetailData(year, monthIdx, dayNum, state);
                          const isSelected = selectedDayDetail?.dateStr === detail.dateStr;

                          return (
                            <button
                              key={dayNum}
                              onClick={() => setSelectedDayDetail(detail)}
                              title={`${detail.dateStr} (${detail.dayNameFull})\nStatus: ${detail.statusLabel}`}
                              className={getDayTileClasses(
                                detail.dominantColor,
                                detail.isToday,
                                isSelected
                              )}
                            >
                              {detail.isToday ? '•' : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Line Rows View (Horizontal Month Rows) */
              <div className="space-y-2.5 overflow-x-auto pb-2">
                {MONTH_NAMES.map((monthName, monthIdx) => {
                  const daysInMonth = getDaysInMonth(year, monthIdx);

                  return (
                    <div
                      key={monthName}
                      className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] items-center gap-2 sm:gap-4 py-2 hover:bg-zinc-950/60 px-3 rounded-xl transition-colors"
                    >
                      {/* Month Label */}
                      <div className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider shrink-0">
                        {monthName}
                      </div>

                      {/* Day Dots Row with Sunday Week Gaps */}
                      <div className="flex items-center flex-nowrap py-1">
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
                          const detail = getDayDetailData(year, monthIdx, dayNum, state);
                          const isSelected = selectedDayDetail?.dateStr === detail.dateStr;

                          return (
                            <div
                              key={dayNum}
                              className={`flex items-center ${
                                detail.isSunday
                                  ? 'mr-3 sm:mr-4 border-r border-zinc-800/80 pr-1 sm:pr-1.5'
                                  : 'mr-1 sm:mr-1.5'
                              }`}
                            >
                              <button
                                onClick={() => setSelectedDayDetail(detail)}
                                title={`${detail.dateStr} (${detail.dayNameFull})\nStatus: ${detail.statusLabel}`}
                                className={getDayTileClasses(
                                  detail.dominantColor,
                                  detail.isToday,
                                  isSelected
                                )}
                              >
                                {detail.isToday ? '•' : ''}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        ))}
      </div>

      {/* Day Detail Modal */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono uppercase text-zinc-500 mb-1">
                  <span>{selectedDayDetail.dayNameFull}</span>
                  <span>•</span>
                  <span>DAY {selectedDayDetail.dayOfMonth} OF {MONTH_NAMES[selectedDayDetail.monthIndex].toUpperCase()}</span>
                  <span>•</span>
                  <span>{selectedDayDetail.year}</span>
                  {selectedDayDetail.isToday && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      TODAY
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-zinc-100">
                  {selectedDayDetail.dateStr} ({selectedDayDetail.dayNameFull})
                </h2>
              </div>

              <button
                onClick={() => setSelectedDayDetail(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dominant Status Badge */}
            <div className="flex items-center space-x-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800 font-mono text-xs">
              <span
                className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                  selectedDayDetail.dominantColor === 'green'
                    ? 'bg-emerald-500'
                    : selectedDayDetail.dominantColor === 'yellow'
                    ? 'bg-amber-500'
                    : selectedDayDetail.dominantColor === 'red'
                    ? 'bg-rose-500'
                    : selectedDayDetail.dominantColor === 'blue'
                    ? 'bg-sky-500'
                    : selectedDayDetail.dominantColor === 'purple'
                    ? 'bg-purple-500'
                    : 'bg-zinc-700'
                }`}
              ></span>
              <div className="space-y-0.5">
                <span className="text-zinc-400 block text-[10px] uppercase">
                  CLASSIFICATION
                </span>
                <span className="text-zinc-100 font-bold">
                  {selectedDayDetail.statusLabel}
                </span>
              </div>
            </div>

            {/* Strength Workouts Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase text-zinc-400 font-bold tracking-wider flex items-center space-x-2">
                <Dumbbell className="w-4 h-4 text-emerald-400" />
                <span>Strength Workouts ({selectedDayDetail.scheduledWorkouts.length})</span>
              </h3>

              {selectedDayDetail.scheduledWorkouts.length === 0 ? (
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs font-mono text-zinc-500">
                  No strength workouts scheduled or executed for this day.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayDetail.scheduledWorkouts.map((sw) => {
                    const exec = state.workoutExecutions.find(
                      (e) => e.scheduledWorkoutId === sw.id
                    );
                    return (
                      <div
                        key={sw.id}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-3 text-xs font-mono"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                sw.status === 'Completed'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : sw.status === 'Partial'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : sw.status === 'Skipped'
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                              }`}
                            >
                              {sw.status}
                            </span>
                            <h4 className="font-bold text-zinc-200">{sw.title}</h4>
                          </div>
                          {sw.date && <span className="text-zinc-500">{sw.date}</span>}
                        </div>

                        {/* Planned Exercises */}
                        <div className="space-y-1.5 pt-1">
                          {sw.plannedExercises.map((pe, pIdx) => {
                            const ex = state.exercises.find((e) => e.id === pe.exerciseId);
                            return (
                              <div
                                key={pIdx}
                                className="flex items-center justify-between text-[11px] text-zinc-400 bg-zinc-900/60 px-3 py-1.5 rounded border border-zinc-800/60"
                              >
                                <span>{ex?.name || 'Exercise'}</span>
                                <span className="text-zinc-500">
                                  {pe.plannedSets.length} sets ({pe.plannedSets[0]?.plannedReps} reps @ {pe.plannedSets[0]?.plannedWeight}kg)
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {exec && (
                          <div className="text-[11px] text-zinc-400 bg-zinc-900 p-2.5 rounded border border-zinc-800 space-y-1">
                            <div className="flex justify-between text-zinc-300">
                              <span>Executed Completion: <strong>{exec.completionPercentage}%</strong></span>
                              {exec.feeling && <span>Feeling: {exec.feeling}</span>}
                            </div>
                            {exec.notes && <p className="text-zinc-500 italic">"{exec.notes}"</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Endurance Activities Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase text-zinc-400 font-bold tracking-wider flex items-center space-x-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <span>Endurance Logs ({selectedDayDetail.enduranceActivities.length})</span>
              </h3>

              {selectedDayDetail.enduranceActivities.length === 0 ? (
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs font-mono text-zinc-500">
                  No endurance activities logged for this day.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayDetail.enduranceActivities.map((act) => (
                    <div
                      key={act.id}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-1 text-xs font-mono"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-200">{act.title}</span>
                        <span className="text-zinc-500">{act.date}</span>
                      </div>
                      <div className="text-zinc-400 text-[11px] flex space-x-4">
                        <span>Duration: {act.durationMinutes} min</span>
                        {act.distanceKm && <span>Distance: {act.distanceKm} km</span>}
                      </div>
                      {act.notes && (
                        <p className="text-zinc-500 text-[11px] italic">"{act.notes}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recovery Modalities Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase text-zinc-400 font-bold tracking-wider flex items-center space-x-2">
                <Flame className="w-4 h-4 text-purple-400" />
                <span>Recovery & Mobility Logs ({selectedDayDetail.recoveryActivities.length})</span>
              </h3>

              {selectedDayDetail.recoveryActivities.length === 0 ? (
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs font-mono text-zinc-500">
                  No recovery modalities logged for this day.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayDetail.recoveryActivities.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-1 text-xs font-mono"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px]">
                            {rec.type}
                          </span>
                          <span className="font-bold text-zinc-200">{rec.title}</span>
                        </div>
                        <span className="text-zinc-500">{rec.date}</span>
                      </div>
                      <div className="text-zinc-400 text-[11px]">
                        Duration: {rec.durationMinutes} min
                      </div>
                      {rec.notes && (
                        <p className="text-zinc-500 text-[11px] italic">"{rec.notes}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

