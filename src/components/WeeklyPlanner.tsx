import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Lock,
  Unlock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Copy,
  Calendar as CalendarIcon,
  CheckCircle,
  Move,
  ArrowUpRight,
  Play,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  Edit2,
  Layers,
} from 'lucide-react';
import {
  AppState,
  Exercise,
  PlannedExercise,
  PlannedSet,
  ScheduledWorkout,
  TrainingWeek,
  WeekStatus,
  WorkoutTemplate,
} from '../types';
import { generateProgressiveOverloadDraft } from '../lib/prCalculator';

interface WeeklyPlannerProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  onStartWorkout: (workoutId: string) => void;
}

export const WeeklyPlanner: React.FC<WeeklyPlannerProps> = ({
  state,
  onUpdateState,
  onStartWorkout,
}) => {
  // Currently selected week index or ID
  const [selectedWeekId, setSelectedWeekId] = useState<string>(
    state.weeks.find((w) => w.status === 'In Progress')?.id || state.weeks[0]?.id || ''
  );

  const selectedWeek = state.weeks.find((w) => w.id === selectedWeekId) || state.weeks[0];

  // Modals / Editors
  const [editingWorkout, setEditingWorkout] = useState<ScheduledWorkout | null>(null);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState('All');

  const [showOverloadModal, setShowOverloadModal] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

  // Progressive Overload Draft State
  const [overloadExerciseId, setOverloadExerciseId] = useState<string>(
    state.exercises[0]?.id || ''
  );
  const [overloadBaseWeight, setOverloadBaseWeight] = useState<number>(80);
  const [overloadBaseReps, setOverloadBaseReps] = useState<number>(8);
  const [overloadBaseSets, setOverloadBaseSets] = useState<number>(3);
  const [overloadMode, setOverloadMode] = useState<
    'Double Progression' | 'Linear Weight' | 'Rep Inflation'
  >('Double Progression');

  const scheduledWorkouts = selectedWeek
    ? state.scheduledWorkouts.filter((sw) => sw.weekId === selectedWeek.id)
    : [];

  const isLocked = selectedWeek?.status === 'Locked';

  // Week Status Changer
  const handleSetWeekStatus = (newStatus: WeekStatus) => {
    if (!selectedWeek) return;
    const updatedWeeks = state.weeks.map((w) =>
      w.id === selectedWeek.id ? { ...w, status: newStatus } : w
    );
    onUpdateState({ ...state, weeks: updatedWeeks });
  };

  // Add Scheduled Workout from Template
  const handleAddWorkoutFromTemplate = (tpl: WorkoutTemplate, targetWeekId?: string) => {
    const weekToUse = targetWeekId
      ? state.weeks.find((w) => w.id === targetWeekId) || selectedWeek
      : selectedWeek;

    if (!weekToUse || weekToUse.status === 'Locked') {
      alert(`Cannot schedule to ${weekToUse?.id ? `Week ${weekToUse.isoWeek}` : 'this week'} because it is locked.`);
      return;
    }

    const workoutsInTargetWeek = state.scheduledWorkouts.filter(
      (sw) => sw.weekId === weekToUse.id
    );
    const newWorkoutNumber = workoutsInTargetWeek.length + 1;

    const newScheduledWorkout: ScheduledWorkout = {
      id: `sw-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      weekId: weekToUse.id,
      title: `${tpl.name} - Session ${newWorkoutNumber}`,
      workoutTemplateId: tpl.id,
      workoutNumber: newWorkoutNumber,
      status: 'Planned',
      plannedExercises: tpl.plannedExercises.map((pe, idx) => ({
        id: `pe-${Date.now()}-${idx}`,
        exerciseId: pe.exerciseId,
        plannedSets: pe.plannedSets.map((ps) => ({ ...ps })),
        plannedNotes: pe.plannedNotes,
        order: pe.order,
      })),
    };

    onUpdateState({
      ...state,
      scheduledWorkouts: [...state.scheduledWorkouts, newScheduledWorkout],
    });

    // Automatically switch view to target week if added elsewhere
    if (weekToUse.id !== selectedWeek.id) {
      setSelectedWeekId(weekToUse.id);
    }
  };

  // Create a brand new Training Week
  const handleCreateNextWeek = () => {
    const lastWeek = state.weeks[state.weeks.length - 1];
    const newIsoWeek = lastWeek ? (lastWeek.isoWeek % 52) + 1 : 31;
    const newYear = lastWeek ? (lastWeek.isoWeek === 52 ? lastWeek.year + 1 : lastWeek.year) : 2026;

    const newWeekId = `week-${newYear}-${newIsoWeek}`;
    const newWeek: TrainingWeek = {
      id: newWeekId,
      isoWeek: newIsoWeek,
      year: newYear,
      status: 'Planning',
      programId: state.activeProgramId,
      startDate: new Date().toISOString().slice(0, 10),
      notes: `Week ${newIsoWeek} plan.`,
    };

    onUpdateState({
      ...state,
      weeks: [...state.weeks, newWeek],
    });
    setSelectedWeekId(newWeekId);
  };

  // Save Workout Edits
  const handleSaveWorkoutEdit = (updatedSw: ScheduledWorkout) => {
    const updatedWorkouts = state.scheduledWorkouts.map((sw) =>
      sw.id === updatedSw.id ? updatedSw : sw
    );
    onUpdateState({ ...state, scheduledWorkouts: updatedWorkouts });
    setEditingWorkout(null);
  };

  // Delete Workout
  const handleDeleteWorkout = (swId: string) => {
    if (isLocked) return;
    const filtered = state.scheduledWorkouts.filter((sw) => sw.id !== swId);
    onUpdateState({ ...state, scheduledWorkouts: filtered });
  };

  // Add Exercise to currently editing workout
  const handleAddExerciseToEditingWorkout = (exercise: Exercise) => {
    if (!editingWorkout) return;

    const newPe: PlannedExercise = {
      id: `pe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      exerciseId: exercise.id,
      plannedSets: [
        { setNumber: 1, plannedReps: 8, plannedWeight: 60 },
        { setNumber: 2, plannedReps: 8, plannedWeight: 60 },
        { setNumber: 3, plannedReps: 8, plannedWeight: 60 },
      ],
      plannedNotes: exercise.defaultNotes || '',
      order: editingWorkout.plannedExercises.length + 1,
    };

    setEditingWorkout({
      ...editingWorkout,
      plannedExercises: [...editingWorkout.plannedExercises, newPe],
    });

    setShowExercisePicker(false);
  };

  // Remove Exercise from editing workout
  const handleRemoveExerciseFromEditingWorkout = (peId: string) => {
    if (!editingWorkout) return;
    const updated = editingWorkout.plannedExercises
      .filter((pe) => pe.id !== peId)
      .map((pe, idx) => ({ ...pe, order: idx + 1 }));

    setEditingWorkout({
      ...editingWorkout,
      plannedExercises: updated,
    });
  };

  // Reorder Exercise in editing workout
  const handleReorderExercise = (index: number, direction: 'up' | 'down') => {
    if (!editingWorkout) return;
    const items = [...editingWorkout.plannedExercises];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= items.length) return;

    const [moved] = items.splice(index, 1);
    items.splice(targetIndex, 0, moved);

    const reordered = items.map((item, idx) => ({ ...item, order: idx + 1 }));
    setEditingWorkout({
      ...editingWorkout,
      plannedExercises: reordered,
    });
  };

  // Add Set to a planned exercise
  const handleAddSetToExercise = (peId: string) => {
    if (!editingWorkout) return;
    const updated = editingWorkout.plannedExercises.map((pe) => {
      if (pe.id !== peId) return pe;
      const lastSet = pe.plannedSets[pe.plannedSets.length - 1];
      const nextSetNumber = pe.plannedSets.length + 1;
      const newSet: PlannedSet = {
        setNumber: nextSetNumber,
        plannedReps: lastSet ? lastSet.plannedReps : 8,
        plannedWeight: lastSet ? lastSet.plannedWeight : 60,
      };
      return {
        ...pe,
        plannedSets: [...pe.plannedSets, newSet],
      };
    });

    setEditingWorkout({
      ...editingWorkout,
      plannedExercises: updated,
    });
  };

  // Remove Set from a planned exercise
  const handleRemoveSetFromExercise = (peId: string, setIndex: number) => {
    if (!editingWorkout) return;
    const updated = editingWorkout.plannedExercises.map((pe) => {
      if (pe.id !== peId) return pe;
      const newSets = pe.plannedSets
        .filter((_, idx) => idx !== setIndex)
        .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      return {
        ...pe,
        plannedSets: newSets,
      };
    });

    setEditingWorkout({
      ...editingWorkout,
      plannedExercises: updated,
    });
  };

  // Update Set details in a planned exercise
  const handleUpdateSetDetails = (
    peId: string,
    setIndex: number,
    field: 'plannedReps' | 'plannedWeight',
    val: number
  ) => {
    if (!editingWorkout) return;
    const updated = editingWorkout.plannedExercises.map((pe) => {
      if (pe.id !== peId) return pe;
      const newSets = pe.plannedSets.map((s, idx) => {
        if (idx !== setIndex) return s;
        return { ...s, [field]: val };
      });
      return {
        ...pe,
        plannedSets: newSets,
      };
    });

    setEditingWorkout({
      ...editingWorkout,
      plannedExercises: updated,
    });
  };

  // Apply Progressive Overload Draft to 4 Weeks
  const handleApplyOverloadDraft = () => {
    if (!selectedWeek) return;

    const draft = generateProgressiveOverloadDraft(
      overloadExerciseId,
      selectedWeek,
      state.weeks,
      overloadBaseWeight,
      overloadBaseReps,
      overloadBaseSets,
      overloadMode
    );

    // Apply draft increments to scheduled workouts in those 4 weeks
    const updatedWorkouts = [...state.scheduledWorkouts];

    draft.increments.forEach((inc) => {
      const targetWeek = state.weeks.find(
        (w) => w.isoWeek === inc.isoWeek && w.year === inc.year
      );
      if (!targetWeek || targetWeek.status === 'Locked') return;

      // Find workouts in that week containing the target exercise, or add to first workout
      const workoutsInTargetWeek = updatedWorkouts.filter((sw) => sw.weekId === targetWeek.id);

      workoutsInTargetWeek.forEach((sw) => {
        const peIdx = sw.plannedExercises.findIndex((pe) => pe.exerciseId === overloadExerciseId);
        if (peIdx >= 0) {
          // Replace planned sets with progressive target
          const newSets: PlannedSet[] = Array.from({ length: inc.plannedSets }, (_, i) => ({
            setNumber: i + 1,
            plannedReps: inc.plannedReps,
            plannedWeight: inc.plannedWeight,
          }));

          sw.plannedExercises[peIdx].plannedSets = newSets;
        }
      });
    });

    onUpdateState({ ...state, scheduledWorkouts: updatedWorkouts });
    setShowOverloadModal(false);
    alert('Progressive overload draft successfully applied to upcoming weeks!');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div>
          <div className="flex items-center space-x-2 text-zinc-400 text-xs font-mono uppercase tracking-wider mb-1">
            <span>WORKFLOW STAGE 1</span>
            <span>•</span>
            <span className="text-blue-400 font-semibold">DELIBERATE PLANNING</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Weekly Training Planner
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Plan planned values (sets, reps, weights) beforehand. Never overwrite original planned targets during execution.
          </p>
        </div>

        {/* Create Next Week Button */}
        <button
          onClick={handleCreateNextWeek}
          className="flex items-center space-x-2 px-4 py-2.5 text-xs font-mono font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-lg shadow-emerald-500/10 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>CREATE NEXT WEEK</span>
        </button>
      </div>

      {/* Week Selector & Locking Controls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Week Tabs & Select Dropdown */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 max-w-full">
            {state.weeks.map((w) => {
              const isSelected = w.id === selectedWeek?.id;
              return (
                <button
                  key={w.id}
                  onClick={() => setSelectedWeekId(w.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-mono text-xs font-semibold shrink-0 transition ${
                    isSelected
                      ? 'bg-emerald-500 text-zinc-950 shadow-md ring-2 ring-emerald-400/50'
                      : 'bg-zinc-950 text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60'
                  }`}
                >
                  <span>W{w.isoWeek}</span>
                  <span
                    className={`px-1.5 py-0.5 text-[9px] uppercase font-bold rounded ${
                      isSelected
                        ? 'bg-zinc-950/30 text-zinc-950'
                        : w.status === 'Locked'
                        ? 'bg-amber-500/20 text-amber-400'
                        : w.status === 'In Progress'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {w.status}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Quick Mobile Dropdown */}
            <select
              value={selectedWeek?.id}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="sm:hidden bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-mono font-bold rounded-xl px-2.5 py-1.5"
            >
              {state.weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  Week {w.isoWeek} ({w.status})
                </option>
              ))}
            </select>

            {/* Overload Generator Trigger */}
            <button
              onClick={() => setShowOverloadModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 transition shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>4-WEEK OVERLOAD DRAFT</span>
            </button>
          </div>
        </div>

        {/* Selected Week Info & Status Transition */}
        {selectedWeek && (
          <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-2 text-zinc-400">
              <span className="text-zinc-100 font-bold bg-zinc-800/80 px-2.5 py-1 rounded-lg">
                ISO Week {selectedWeek.isoWeek} ({selectedWeek.year})
              </span>
              <span className="text-zinc-400">Started: {selectedWeek.startDate}</span>
              {isLocked && (
                <span className="flex items-center space-x-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Locked</span>
                </span>
              )}
            </div>

            {/* Status Change Controls */}
            <div className="flex items-center space-x-2">
              <span className="text-zinc-500 font-medium">Status:</span>
              {isLocked ? (
                <button
                  onClick={() => setShowUnlockConfirm(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold flex items-center space-x-1 active:scale-95 transition"
                >
                  <Unlock className="w-3 h-3" />
                  <span>UNLOCK WEEK TO EDIT</span>
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  {(['Planning', 'Ready', 'In Progress', 'Completed', 'Locked'] as WeekStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => handleSetWeekStatus(st)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition active:scale-95 ${
                          selectedWeek.status === st
                            ? 'bg-emerald-500 text-zinc-950 shadow'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Unlock Week Confirmation Modal */}
      {showUnlockConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2 text-amber-400">
              <Lock className="w-5 h-5" />
              <h3 className="text-base font-bold text-zinc-100">Unlock Completed Week?</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This week is currently locked to preserve historical training integrity. Unlocking allows you to modify planned exercises and workouts.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowUnlockConfirm(false)}
                className="px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleSetWeekStatus('In Progress');
                  setShowUnlockConfirm(false);
                }}
                className="px-4 py-2 text-xs font-mono font-bold rounded-xl bg-amber-500 text-zinc-950 active:scale-95 transition"
              >
                Confirm Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout: Template Quick Add + Scheduled Workouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quick Template Importer */}
        <div className="space-y-4">
          <h2 className="text-sm font-mono uppercase text-zinc-400 font-semibold tracking-wider">
            WORKOUT TEMPLATES
          </h2>
          <p className="text-xs text-zinc-500">
            Click to add a standard template to Week {selectedWeek?.isoWeek} or select a target week below.
          </p>

          <div className="space-y-3">
            {state.workoutTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 space-y-3 transition"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-200">{tpl.name}</h3>
                  <button
                    disabled={isLocked}
                    onClick={() => handleAddWorkoutFromTemplate(tpl, selectedWeek?.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-zinc-950 text-xs font-mono font-bold transition active:scale-95 shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ADD TO W{selectedWeek?.isoWeek}</span>
                  </button>
                </div>
                <p className="text-xs text-zinc-400">{tpl.description}</p>
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[11px] font-mono">
                  <span className="text-zinc-500">
                    {tpl.plannedExercises.length} Exercises defined
                  </span>
                  {/* Target Week Picker per template */}
                  <div className="flex items-center space-x-1">
                    <span className="text-zinc-500 text-[10px]">Schedule to:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddWorkoutFromTemplate(tpl, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-[10px] rounded px-1.5 py-0.5"
                    >
                      <option value="">Choose week...</option>
                      {state.weeks.map((w) => (
                        <option key={w.id} value={w.id}>
                          Week {w.isoWeek} ({w.status})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Scheduled Workouts for Selected Week (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase text-zinc-400 font-semibold tracking-wider">
              SCHEDULED WORKOUTS (W{selectedWeek?.isoWeek})
            </h2>
            <span className="text-xs text-zinc-500 font-mono">
              {scheduledWorkouts.length} Workouts planned
            </span>
          </div>

          {scheduledWorkouts.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center space-y-3">
              <CalendarIcon className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-sm text-zinc-300 font-semibold">No Workouts Planned Yet</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Add a workout template from the left column to begin structuring your week.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledWorkouts.map((sw) => (
                <div
                  key={sw.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 hover:border-zinc-700 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-xs text-zinc-500 font-bold">
                        #{sw.workoutNumber}
                      </span>
                      <h3 className="text-base font-bold text-zinc-100">{sw.title}</h3>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded ${
                          sw.status === 'Completed'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {sw.status}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onStartWorkout(sw.id)}
                        className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-bold transition flex items-center space-x-1"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>LAUNCH</span>
                      </button>

                      {!isLocked && (
                        <>
                          <button
                            onClick={() => setEditingWorkout(sw)}
                            className="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteWorkout(sw.id)}
                            className="p-1.5 rounded bg-rose-950/40 text-rose-400 hover:bg-rose-900/50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Planned Exercises Table */}
                  <div className="space-y-2">
                    {sw.plannedExercises.length === 0 ? (
                      <p className="text-xs font-mono text-zinc-500 italic p-2">
                        No planned exercises yet.
                      </p>
                    ) : (
                      sw.plannedExercises.map((pe, peIdx) => {
                        const ex = state.exercises.find((e) => e.id === pe.exerciseId);
                        return (
                          <div
                            key={pe.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs font-mono"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-zinc-600 font-bold">{peIdx + 1}.</span>
                              <span className="text-zinc-200 font-semibold">
                                {ex?.name || 'Exercise'}
                              </span>
                            </div>

                            <div className="flex items-center space-x-4 text-zinc-400">
                              <span>
                                {pe.plannedSets.length} sets × {pe.plannedSets[0]?.plannedReps} reps @{' '}
                                <span className="text-emerald-400 font-bold">
                                  {pe.plannedSets[0]?.plannedWeight}kg
                                </span>
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {!isLocked && (
                      <button
                        onClick={() => {
                          setEditingWorkout(sw);
                          setShowExercisePicker(true);
                        }}
                        className="w-full py-2 rounded-lg border border-dashed border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-zinc-400 hover:text-emerald-400 text-xs font-mono font-medium transition flex items-center justify-center space-x-1.5 mt-2"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Add Exercise to {sw.title}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4-Week Progressive Overload Draft Modal */}
      {showOverloadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-2xl w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center space-x-2 text-purple-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-lg font-bold text-zinc-100">
                  4-Week Progressive Overload Draft
                </h3>
              </div>
              <button
                onClick={() => setShowOverloadModal(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Generate a 4-week progression preview (e.g. 3x8 @70kg → 3x9 → 3x10 → 3x8 @72.5kg). The draft can be reviewed and manually adjusted before applying.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-zinc-400 uppercase">Select Target Exercise</label>
                <select
                  value={overloadExerciseId}
                  onChange={(e) => setOverloadExerciseId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                >
                  {state.exercises.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 uppercase">Progression Strategy</label>
                <select
                  value={overloadMode}
                  onChange={(e) =>
                    setOverloadMode(
                      e.target.value as 'Double Progression' | 'Linear Weight' | 'Rep Inflation'
                    )
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                >
                  <option value="Double Progression">Double Progression (Reps then Weight)</option>
                  <option value="Linear Weight">Linear Weight (+2.5kg / week)</option>
                  <option value="Rep Inflation">Rep Inflation (+1 Rep / week)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 uppercase">Base Weight (kg)</label>
                <input
                  type="number"
                  value={overloadBaseWeight}
                  onChange={(e) => setOverloadBaseWeight(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 uppercase">Base Reps</label>
                <input
                  type="number"
                  value={overloadBaseReps}
                  onChange={(e) => setOverloadBaseReps(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                />
              </div>
            </div>

            {/* Live 4-Week Draft Preview */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-mono uppercase text-purple-400 font-bold block">
                4-Week Draft Progression Preview
              </span>

              {generateProgressiveOverloadDraft(
                overloadExerciseId,
                selectedWeek,
                state.weeks,
                overloadBaseWeight,
                overloadBaseReps,
                overloadBaseSets,
                overloadMode
              ).increments.map((inc) => (
                <div
                  key={inc.weekOffset}
                  className="flex items-center justify-between text-xs font-mono p-2 bg-zinc-900 rounded border border-zinc-800"
                >
                  <span className="text-zinc-400">
                    Week {inc.isoWeek} (Offset +{inc.weekOffset})
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {inc.plannedSets} sets × {inc.plannedReps} reps @ {inc.plannedWeight} kg
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowOverloadModal(false)}
                className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyOverloadDraft}
                className="px-5 py-2.5 text-xs font-mono font-bold rounded-lg bg-purple-500 hover:bg-purple-400 text-zinc-950 transition"
              >
                APPLY DRAFT TO UPCOMING WEEKS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Workout Modal */}
      {editingWorkout && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-zinc-900 border border-zinc-800 sm:rounded-2xl rounded-t-2xl p-4 sm:p-6 max-w-3xl w-full h-[92vh] sm:h-auto max-h-[92vh] overflow-y-auto space-y-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center space-x-2 text-emerald-400 font-mono">
                  <Dumbbell className="w-5 h-5" />
                  <h3 className="text-base sm:text-lg font-bold text-zinc-100">
                    Configure Planned Workout
                  </h3>
                </div>
                <button
                  onClick={() => setEditingWorkout(null)}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Workout Details (Title, Week, Date, Notes) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase font-bold text-[10px]">Workout Title</label>
                  <input
                    type="text"
                    value={editingWorkout.title}
                    onChange={(e) =>
                      setEditingWorkout({ ...editingWorkout, title: e.target.value })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase font-bold text-[10px]">Target Week</label>
                  <select
                    value={editingWorkout.weekId}
                    onChange={(e) =>
                      setEditingWorkout({ ...editingWorkout, weekId: e.target.value })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-emerald-400 focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    {state.weeks.map((w) => (
                      <option key={w.id} value={w.id}>
                        Week {w.isoWeek} ({w.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase font-bold text-[10px]">Scheduled Date</label>
                  <input
                    type="date"
                    value={editingWorkout.date || ''}
                    onChange={(e) =>
                      setEditingWorkout({ ...editingWorkout, date: e.target.value })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-emerald-400 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase font-bold text-[10px]">Session Notes / Focus</label>
                  <input
                    type="text"
                    placeholder="e.g. Focus on explosive concentric pace"
                    value={editingWorkout.notes || ''}
                    onChange={(e) =>
                      setEditingWorkout({ ...editingWorkout, notes: e.target.value })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>


              {/* Planned Exercises Header */}
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase text-zinc-300">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Planned Exercises ({editingWorkout.plannedExercises.length})</span>
                  </div>

                  <button
                    onClick={() => setShowExercisePicker(true)}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-bold transition active:scale-95 shadow"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ADD EXERCISE</span>
                  </button>
                </div>

                {editingWorkout.plannedExercises.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-zinc-950 border border-dashed border-zinc-800 text-center space-y-2">
                    <Dumbbell className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="text-xs font-mono text-zinc-400">
                      No exercises added to this planned workout yet.
                    </p>
                    <button
                      onClick={() => setShowExercisePicker(true)}
                      className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-mono font-bold transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Browse Catalog & Add</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {editingWorkout.plannedExercises.map((pe, peIdx) => {
                      const ex = state.exercises.find((e) => e.id === pe.exerciseId);
                      return (
                        <div
                          key={pe.id}
                          className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-inner"
                        >
                          {/* Exercise Title Bar */}
                          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                            <div className="flex items-center space-x-2.5">
                              <span className="text-xs font-mono font-bold text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">
                                #{peIdx + 1}
                              </span>
                              <h4 className="text-sm font-bold text-zinc-100">
                                {ex?.name || 'Exercise'}
                              </h4>
                              {ex?.category && (
                                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                                  {ex.category}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-1">
                              <button
                                disabled={peIdx === 0}
                                onClick={() => handleReorderExercise(peIdx, 'up')}
                                className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                disabled={peIdx === editingWorkout.plannedExercises.length - 1}
                                onClick={() => handleReorderExercise(peIdx, 'down')}
                                className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveExerciseFromEditingWorkout(pe.id)}
                                className="p-1.5 rounded-lg bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 transition ml-1"
                                title="Remove Exercise"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Sets Editor */}
                          <div className="space-y-2">
                            <div className="hidden sm:grid grid-cols-[50px_1fr_1fr_40px] gap-2 text-[10px] font-mono uppercase text-zinc-500 font-bold px-1">
                              <span>SET</span>
                              <span>PLANNED REPS</span>
                              <span>PLANNED WEIGHT (KG)</span>
                              <span></span>
                            </div>

                            {pe.plannedSets.map((s, sIdx) => (
                              <div
                                key={sIdx}
                                className="flex flex-col sm:grid sm:grid-cols-[50px_1fr_1fr_40px] gap-2 sm:items-center text-xs font-mono bg-zinc-900/80 sm:bg-transparent p-2 sm:p-0 rounded-xl border sm:border-none border-zinc-800"
                              >
                                <div className="flex items-center justify-between sm:justify-start">
                                  <span className="text-zinc-400 font-bold sm:px-1">
                                    Set #{s.setNumber}
                                  </span>
                                  <button
                                    onClick={() => handleRemoveSetFromExercise(pe.id, sIdx)}
                                    className="sm:hidden p-1 text-zinc-500 hover:text-rose-400"
                                    title="Delete Set"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                                  <div className="space-y-1">
                                    <span className="sm:hidden text-[10px] text-zinc-500 uppercase font-bold block">
                                      Planned Reps
                                    </span>
                                    <input
                                      type="number"
                                      value={s.plannedReps}
                                      onChange={(e) =>
                                        handleUpdateSetDetails(
                                          pe.id,
                                          sIdx,
                                          'plannedReps',
                                          Number(e.target.value)
                                        )
                                      }
                                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-100 text-center font-mono font-bold focus:border-emerald-500"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <span className="sm:hidden text-[10px] text-zinc-500 uppercase font-bold block">
                                      Weight (kg)
                                    </span>
                                    <input
                                      type="number"
                                      step="0.5"
                                      value={s.plannedWeight}
                                      onChange={(e) =>
                                        handleUpdateSetDetails(
                                          pe.id,
                                          sIdx,
                                          'plannedWeight',
                                          Number(e.target.value)
                                        )
                                      }
                                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-emerald-400 text-center font-mono font-bold focus:border-emerald-500"
                                    />
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleRemoveSetFromExercise(pe.id, sIdx)}
                                  className="hidden sm:flex p-1 rounded text-zinc-500 hover:text-rose-400 justify-center"
                                  title="Delete Set"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}

                            <button
                              onClick={() => handleAddSetToExercise(pe.id)}
                              className="mt-2 text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1.5 p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Planned Set</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800 mt-4">
              <button
                onClick={() => setEditingWorkout(null)}
                className="px-4 py-2.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveWorkoutEdit(editingWorkout)}
                className="px-6 py-3 text-xs font-mono font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-lg shadow-emerald-500/10 active:scale-95"
              >
                SAVE WORKOUT PLAN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Picker Modal */}
      {showExercisePicker && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-mono">
                <Dumbbell className="w-5 h-5" />
                <h3 className="text-base font-bold text-zinc-100">Select Exercise</h3>
              </div>
              <button
                onClick={() => setShowExercisePicker(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search exercise by name or muscle..."
                  value={exerciseSearchQuery}
                  onChange={(e) => setExerciseSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={selectedMuscleFilter}
                onChange={(e) => setSelectedMuscleFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none"
              >
                <option value="All">All Categories</option>
                <option value="Strength">Strength</option>
                <option value="Bodyweight">Bodyweight</option>
                <option value="Endurance">Endurance</option>
              </select>
            </div>

            {/* Exercise List */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {state.exercises
                .filter((e) => {
                  const matchesSearch =
                    e.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
                    e.primaryMuscles.some((m) =>
                      m.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
                    );
                  const matchesCategory =
                    selectedMuscleFilter === 'All' || e.category === selectedMuscleFilter;
                  return matchesSearch && matchesCategory;
                })
                .map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-zinc-100">{ex.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {ex.equipment}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-zinc-500">
                        Primary: {ex.primaryMuscles.join(', ')} • {ex.progressionStrategy}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddExerciseToEditingWorkout(ex)}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-mono font-bold transition shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>ADD</span>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
