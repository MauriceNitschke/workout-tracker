import React, { useState } from 'react';
import {
  X,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  Activity,
  Dumbbell,
  Clock,
  FileText,
  Filter,
  BarChart3,
  Edit2,
} from 'lucide-react';
import { AppState, Exercise } from '../types';
import { getExerciseAnalyticsReport, TimeFilter } from '../lib/strengthAnalytics';
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

interface ExerciseDetailModalProps {
  exerciseId: string;
  state: AppState;
  onClose: () => void;
  onEditExercise?: (exercise: Exercise) => void;
}

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  exerciseId,
  state,
  onClose,
  onEditExercise,
}) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [activeTab, setActiveTab] = useState<'analytics' | 'history' | 'prs'>('analytics');

  const report = getExerciseAnalyticsReport(exerciseId, state, timeFilter);

  if (!report) return null;

  const { exercise, dataPoints, prs, stats, plannedVsActualHistory } = report;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header Bar */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono uppercase text-zinc-500 mb-1">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold">
                {exercise.category}
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">{exercise.equipment}</span>
              <span>•</span>
              <span>{exercise.progressionStrategy}</span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 flex items-center space-x-3">
              <span>{exercise.name}</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">{exercise.description}</p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onEditExercise && (
              <button
                onClick={() => {
                  onClose();
                  onEditExercise(exercise);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition border border-zinc-700"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Exercise</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-navigation & Time Filters */}
        <div className="px-5 sm:px-6 pt-3 pb-3 border-b border-zinc-800/80 bg-zinc-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg transition font-medium ${
                activeTab === 'analytics'
                  ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Overview & Charts
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg transition font-medium ${
                activeTab === 'history'
                  ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Planned vs Actual ({plannedVsActualHistory.length})
            </button>
            <button
              onClick={() => setActiveTab('prs')}
              className={`px-3 py-1.5 rounded-lg transition font-medium ${
                activeTab === 'prs'
                  ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Personal Records
            </button>
          </div>

          {/* Time Filter Controls */}
          <div className="flex items-center space-x-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-[11px] font-mono">
            {(['1M', '3M', '6M', '1Y', 'ALL'] as TimeFilter[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf)}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  timeFilter === tf
                    ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'analytics' && (
            <>
              {/* Top Stats Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                    ESTIMATED 1RM
                  </span>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {stats.highestEstimated1RM > 0 ? `~${stats.highestEstimated1RM} kg` : 'N/A'}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">Peak strength output</span>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                    BEST WORKING WEIGHT
                  </span>
                  <div className="text-xl font-bold font-mono text-zinc-100">
                    {stats.bestWorkingWeight > 0 ? `${stats.bestWorkingWeight} kg` : 'N/A'}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">Highest weight (≥3 reps)</span>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                    TOTAL VOLUME
                  </span>
                  <div className="text-xl font-bold font-mono text-purple-400">
                    {stats.totalVolumeAllTime.toLocaleString()} <span className="text-xs text-zinc-500">kg</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">{stats.totalSetsAllTime} completed sets</span>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                    WEEKLY FREQUENCY
                  </span>
                  <div className="text-xl font-bold font-mono text-sky-400">
                    {stats.weeklyFrequencyAvg} <span className="text-xs text-zinc-500">/ week</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">Active training pace</span>
                </div>
              </div>

              {/* Muscle Targets */}
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-2 text-xs font-mono">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-zinc-500 uppercase">PRIMARY MUSCLES:</span>
                    <div className="flex flex-wrap gap-1">
                      {exercise.primaryMuscles.map((m) => (
                        <span key={m} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {exercise.secondaryMuscles.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-zinc-500 uppercase">SECONDARY:</span>
                      <div className="flex flex-wrap gap-1">
                        {exercise.secondaryMuscles.map((m) => (
                          <span key={m} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Chart 1: Estimated 1RM & Weight Progression */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2 font-mono">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span>Estimated 1RM & Max Weight Progression</span>
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Calculated using Epley formula across logged workout sessions.
                    </p>
                  </div>
                </div>

                <div className="h-60 w-full">
                  {dataPoints.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono italic">
                      No workout history recorded for this exercise in the selected timeframe.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dataPoints}>
                        <defs>
                          <linearGradient id="colorE1RM" x1="0" y1="0" x2="0" y2="1">
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
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorE1RM)"
                        />
                        <Line
                          type="monotone"
                          dataKey="maxWeight"
                          name="Top Weight (kg)"
                          stroke="#a855f7"
                          strokeWidth={2}
                          dot={{ fill: '#a855f7' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Chart 2: Total Session Tonnage / Volume */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2 font-mono">
                      <BarChart3 className="w-4 h-4 text-purple-400" />
                      <span>Total Work Volume (Tonnage) Trend</span>
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Sum of completed set weight × reps per workout session.
                    </p>
                  </div>
                </div>

                <div className="h-52 w-full">
                  {dataPoints.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono italic">
                      No volume history recorded in selected timeframe.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dataPoints}>
                        <defs>
                          <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
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
                          dataKey="totalVolume"
                          name="Session Volume (kg)"
                          stroke="#a855f7"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorVol)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'prs' && (
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase text-zinc-400 font-bold tracking-wider flex items-center space-x-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Personal Record Breakdown ({exercise.name})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                    <span className="uppercase font-bold text-emerald-400">HIGHEST WEIGHT LOADED</span>
                    <Award className="w-4 h-4 text-emerald-400" />
                  </div>
                  {prs.highestWeight ? (
                    <div>
                      <div className="text-2xl font-bold font-mono text-zinc-100">
                        {prs.highestWeight.value} kg
                      </div>
                      <p className="text-xs font-mono text-zinc-500 mt-1">
                        Completed for {prs.highestWeight.reps} reps on {prs.highestWeight.date} ({prs.highestWeight.workoutTitle})
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs font-mono text-zinc-600 italic">No record logged</span>
                  )}
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                    <span className="uppercase font-bold text-purple-400">HIGHEST ESTIMATED 1RM</span>
                    <Award className="w-4 h-4 text-purple-400" />
                  </div>
                  {prs.estimated1RM ? (
                    <div>
                      <div className="text-2xl font-bold font-mono text-zinc-100">
                        ~{prs.estimated1RM.value} kg
                      </div>
                      <p className="text-xs font-mono text-zinc-500 mt-1">
                        Based on {prs.estimated1RM.weight}kg × {prs.estimated1RM.reps} reps on {prs.estimated1RM.date}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs font-mono text-zinc-600 italic">No record logged</span>
                  )}
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                    <span className="uppercase font-bold text-sky-400">HIGHEST SINGLE-SET VOLUME</span>
                    <Award className="w-4 h-4 text-sky-400" />
                  </div>
                  {prs.highestSetVolume ? (
                    <div>
                      <div className="text-2xl font-bold font-mono text-zinc-100">
                        {prs.highestSetVolume.value} kg
                      </div>
                      <p className="text-xs font-mono text-zinc-500 mt-1">
                        {prs.highestSetVolume.weight}kg × {prs.highestSetVolume.reps} reps on {prs.highestSetVolume.date}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs font-mono text-zinc-600 italic">No record logged</span>
                  )}
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                    <span className="uppercase font-bold text-amber-400">MOST REPETITIONS IN A SET</span>
                    <Award className="w-4 h-4 text-amber-400" />
                  </div>
                  {prs.maxReps ? (
                    <div>
                      <div className="text-2xl font-bold font-mono text-zinc-100">
                        {prs.maxReps.value} reps
                      </div>
                      <p className="text-xs font-mono text-zinc-500 mt-1">
                        Loaded @ {prs.maxReps.weight}kg on {prs.maxReps.date}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs font-mono text-zinc-600 italic">No record logged</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase text-zinc-400 font-bold tracking-wider flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Planned vs Actual History Log ({plannedVsActualHistory.length})</span>
              </h3>

              {plannedVsActualHistory.length === 0 ? (
                <div className="p-8 rounded-xl bg-zinc-950 border border-zinc-800 text-center text-xs font-mono text-zinc-500">
                  No historical execution records found for this exercise.
                </div>
              ) : (
                <div className="space-y-3">
                  {plannedVsActualHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-zinc-950 border border-zinc-800/90 rounded-xl p-4 space-y-2 text-xs font-mono"
                    >
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-zinc-200 font-bold">{item.workoutTitle}</span>
                          <span className="text-zinc-500">•</span>
                          <span className="text-emerald-400">{item.date}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">
                          {item.actualCompletedSetsCount} sets executed
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase block">PLANNED TARGET:</span>
                          <span className="text-zinc-300 font-medium">{item.plannedTarget}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase block">ACTUAL LOGGED:</span>
                          <span className="text-emerald-400 font-bold">{item.actualLoggedSummary}</span>
                        </div>
                      </div>

                      {item.notes && (
                        <p className="text-zinc-400 italic bg-zinc-900 p-2 rounded border border-zinc-800 mt-2">
                          Notes: "{item.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
