import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  List,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Trophy,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  AppState,
  ExerciseExecution,
  RIR,
  SetExecution,
  SetType,
  SkipReason,
  SyncStatus,
  WorkoutDraft,
  WorkoutFeeling,
  Exercise,
} from '../types';
import {
  bodyweightForCurrentWeek,
  createEditorLease,
  createBodyweightEntry,
  createWorkoutChange,
  finalizeWorkoutDraft,
  findTrainCandidate,
  isWorkingSet,
  totalLoadForSet,
  workoutDraftMetrics,
  getWorkoutDeviceId,
} from '../lib/adaptiveWorkout';
import { startRestTimer, type RestTimerState } from '../lib/restTimer';
import { RestTimerPanel } from './RestTimerPanel';
import { getCurrentISOWeekAndYear } from '../lib/weekUtils';

interface WorkoutModeProps {
  state: AppState;
  scheduledWorkoutId: string | null;
  syncStatus: SyncStatus;
  onUpdateState: (state: AppState) => void;
  onStartWorkout: (scheduledWorkoutId: string) => void;
  onMoveWorkoutToToday: (scheduledWorkoutId: string) => void;
  onNavigatePlan: () => void;
  onFinishWorkout: (execution: ReturnType<typeof finalizeWorkoutDraft>) => void;
  onCancelWorkout: () => void;
}

const SET_TYPE_LABELS: Record<SetType, string> = {
  working: 'Working',
  warmup: 'Warm-up',
  backoff: 'Back-off',
  drop: 'Drop',
  failure: 'Failure',
};

const SKIP_REASONS: Array<{ value: SkipReason; label: string }> = [
  { value: 'equipment', label: 'Equipment unavailable' },
  { value: 'pain', label: 'Pain / discomfort' },
  { value: 'time', label: 'Time' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'other', label: 'Other' },
];

function completedCount(exercise: ExerciseExecution): number {
  return exercise.setExecutions.filter((set) => set.completed).length;
}

export const WorkoutMode: React.FC<WorkoutModeProps> = ({
  state,
  scheduledWorkoutId,
  syncStatus,
  onUpdateState,
  onStartWorkout,
  onMoveWorkoutToToday,
  onNavigatePlan,
  onFinishWorkout,
  onCancelWorkout,
}) => {
  const workout = state.scheduledWorkouts.find((item) => item.id === scheduledWorkoutId);
  const draft = state.workoutDrafts.find(
    (item) => item.scheduledWorkoutId === scheduledWorkoutId
  );
  const [loggedReps, setLoggedReps] = useState(0);
  const [loggedWeight, setLoggedWeight] = useState(0);
  const [loggedDuration, setLoggedDuration] = useState(0);
  const [loggedDistance, setLoggedDistance] = useState(0);
  const [restTimer, setRestTimer] = useState<RestTimerState | null>(null);
  const [lastCompleted, setLastCompleted] = useState<{
    exerciseIndex: number;
    setIndex: number;
  } | null>(null);
  const [lastDeleted, setLastDeleted] = useState<{
    exerciseIndex: number;
    setIndex: number;
    set: SetExecution;
  } | null>(null);
  const [showOverview, setShowOverview] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [replaceExerciseIndex, setReplaceExerciseIndex] = useState<number | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('All');
  const [exercisePlacement, setExercisePlacement] = useState<
    'after-current' | 'end' | 'current-block'
  >('after-current');
  const [addedExerciseSetCount, setAddedExerciseSetCount] = useState(3);
  const [replacementReason, setReplacementReason] = useState<SkipReason>('equipment');
  const [showSetTypePicker, setShowSetTypePicker] = useState(false);
  const [showSkipPicker, setShowSkipPicker] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [bodyweightInput, setBodyweightInput] = useState('');
  const [bodyweightPromptDismissed, setBodyweightPromptDismissed] = useState(false);
  const [quickCreateName, setQuickCreateName] = useState('');

  const currentExerciseExecution = draft?.exerciseExecutions[draft.currentExerciseIndex];
  const currentSetExecution =
    currentExerciseExecution?.setExecutions[draft?.currentSetIndex ?? 0];
  const currentExercise = state.exercises.find(
    (exercise) => exercise.id === currentExerciseExecution?.exerciseId
  );
  const currentPlan = draft?.planSnapshot.find(
    (exercise) => exercise.id === currentExerciseExecution?.plannedExerciseId
  );
  const currentPlannedSet = currentPlan?.plannedSets.find(
    (set) => set.setNumber === currentSetExecution?.plannedSetNumber
  );
  const currentBodyweight = bodyweightForCurrentWeek(state);
  const currentWeek = getCurrentISOWeekAndYear();
  const hasCurrentWeekBodyweight = state.bodyweightEntries.some(
    (entry) => entry.isoWeek === currentWeek.isoWeek && entry.year === currentWeek.year
  );
  const needsBodyweight =
    Boolean(draft) &&
    !hasCurrentWeekBodyweight &&
    draft!.exerciseExecutions.some((execution) =>
      state.exercises.find((exercise) => exercise.id === execution.exerciseId)
        ?.bodyweightMode === 'bodyweight'
    ) &&
    !bodyweightPromptDismissed;

  const previousComparableSet = useMemo(() => {
    if (!currentExerciseExecution) return undefined;
    return [...state.workoutExecutions]
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
      .flatMap((execution) => execution.exerciseExecutions)
      .filter((execution) => execution.exerciseId === currentExerciseExecution.exerciseId)
      .flatMap((execution) => execution.setExecutions)
      .find((set) => isWorkingSet(set));
  }, [currentExerciseExecution?.exerciseId, state.workoutExecutions]);

  const updateDraft = (
    updater: (current: WorkoutDraft) => WorkoutDraft,
    event?: ReturnType<typeof createWorkoutChange>
  ) => {
    if (!draft) return;
    const next = {
      ...updater(draft),
      updatedAt: new Date().toISOString(),
    };
    onUpdateState({
      ...state,
      workoutDrafts: state.workoutDrafts.map((item) => item.id === draft.id ? next : item),
      activeEditorLeases: [
        ...state.activeEditorLeases.filter(
          (lease) => lease.scheduledWorkoutId !== draft.scheduledWorkoutId
        ),
        createEditorLease(draft.scheduledWorkoutId),
      ],
      workoutChangeEvents: event
        ? [...state.workoutChangeEvents, event]
        : state.workoutChangeEvents,
    });
  };

  useEffect(() => {
    if (!currentSetExecution) return;
    setLoggedReps(currentSetExecution.reps);
    setLoggedWeight(currentSetExecution.weight);
    setLoggedDuration(currentSetExecution.duration ?? 0);
    setLoggedDistance(currentSetExecution.distanceKm ?? 0);
  }, [currentSetExecution?.id]);

  useEffect(() => {
    if (!draft) return;
    const key = `training-os-rest-${draft.scheduledWorkoutId}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) setRestTimer(JSON.parse(saved));
    } catch {
      setRestTimer(null);
    }
  }, [draft?.id]);

  useEffect(() => {
    if (!draft) return;
    const key = `training-os-rest-${draft.scheduledWorkoutId}`;
    if (restTimer) localStorage.setItem(key, JSON.stringify(restTimer));
    else localStorage.removeItem(key);
  }, [draft?.scheduledWorkoutId, restTimer]);

  useEffect(() => {
    if (!hasCurrentWeekBodyweight && currentBodyweight && !bodyweightInput) {
      setBodyweightInput(String(currentBodyweight.weightKg));
    }
  }, [bodyweightInput, currentBodyweight, hasCurrentWeekBodyweight]);

  useEffect(() => {
    if (!draft) return;
    const heartbeat = window.setTimeout(() => {
      updateDraft((current) => current);
    }, 120_000);
    return () => window.clearTimeout(heartbeat);
  }, [draft?.updatedAt]);

  if (!draft || !workout || !currentExerciseExecution || !currentSetExecution) {
    const candidate = findTrainCandidate(state);
    return (
      <div className="mx-auto max-w-xl space-y-4 pb-24">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
            Train
          </p>
          <h1 className="mt-1 text-2xl font-black text-zinc-100">Ready when you are</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Training OS always starts the next logical workout and keeps future weeks untouched.
          </p>
        </div>

        {candidate.workout ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <span className="font-mono text-[10px] uppercase text-zinc-500">
              {candidate.kind === 'extend'
                ? 'Today is complete'
                : candidate.kind === 'move'
                  ? 'Later this week'
                  : 'Next workout'}
            </span>
            <h2 className="mt-1 text-xl font-bold text-zinc-100">{candidate.workout.title}</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {candidate.workout.date ?? 'No date'} · {candidate.workout.plannedExercises.length} exercises
            </p>
            <button
              type="button"
              onClick={() => candidate.kind === 'move'
                ? onMoveWorkoutToToday(candidate.workout!.id)
                : onStartWorkout(candidate.workout!.id)}
              className="mobile-action mt-4 w-full justify-center bg-emerald-500 text-zinc-950"
            >
              {candidate.kind === 'extend'
                ? <><RefreshCcw className="h-4 w-4" /> Extend today’s workout</>
                : candidate.kind === 'move'
                  ? <><RefreshCcw className="h-4 w-4" /> Move to today and start</>
                  : <><Dumbbell className="h-4 w-4" /> Start workout</>}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 p-6 text-center">
            <Dumbbell className="mx-auto h-9 w-9 text-zinc-600" />
            <h2 className="mt-3 font-bold text-zinc-100">No workout remains this week</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Prepare a workout in Plan. Next week will not be changed automatically.
            </p>
            <button
              type="button"
              onClick={onNavigatePlan}
              className="mobile-action mt-4 bg-emerald-500 text-zinc-950"
            >
              Open Plan
            </button>
          </div>
        )}
      </div>
    );
  }

  const activeLease = state.activeEditorLeases.find(
    (lease) => lease.scheduledWorkoutId === draft.scheduledWorkoutId
  );
  const leaseConflict = activeLease &&
    activeLease.deviceId !== getWorkoutDeviceId() &&
    activeLease.expiresAt > new Date().toISOString();
  if (leaseConflict) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-amber-500/30 bg-zinc-900 p-5">
        <h1 className="text-xl font-bold text-zinc-100">Workout open on another device</h1>
        <p className="mt-2 text-sm text-zinc-400">
          To prevent two devices overwriting the same live set, this draft is temporarily protected.
        </p>
        <button
          type="button"
          onClick={() => onUpdateState({
            ...state,
            activeEditorLeases: [
              ...state.activeEditorLeases.filter(
                (lease) => lease.scheduledWorkoutId !== draft.scheduledWorkoutId
              ),
              createEditorLease(draft.scheduledWorkoutId),
            ],
          })}
          className="mobile-action mt-4 bg-amber-400 text-zinc-950"
        >
          Take over on this device
        </button>
      </div>
    );
  }

  const setPosition = (exerciseIndex: number, setIndex: number) => {
    updateDraft((current) => ({
      ...current,
      currentExerciseIndex: exerciseIndex,
      currentSetIndex: setIndex,
    }));
  };

  const saveCurrentInput = (
    patch: Pick<SetExecution, 'reps'> | Pick<SetExecution, 'weight'> |
      Pick<SetExecution, 'duration'> | Pick<SetExecution, 'distanceKm'>
  ) => {
    updateDraft((current) => ({
      ...current,
      exerciseExecutions: current.exerciseExecutions.map((exercise, exerciseIndex) =>
        exerciseIndex !== current.currentExerciseIndex
          ? exercise
          : {
              ...exercise,
              setExecutions: exercise.setExecutions.map((set, setIndex) =>
                setIndex === current.currentSetIndex ? { ...set, ...patch } : set
              ),
            }
      ),
    }));
  };

  const saveBodyweight = () => {
    const weightKg = Number(bodyweightInput);
    if (!Number.isFinite(weightKg) || weightKg <= 0) return;
    const entry = createBodyweightEntry(weightKg, 'weekly-prompt');
    onUpdateState({
      ...state,
      bodyweightEntries: [...state.bodyweightEntries, entry],
      workoutDrafts: state.workoutDrafts.map((item) =>
        item.id !== draft.id
          ? item
          : {
              ...item,
              bodyweightKg: weightKg,
              exerciseExecutions: item.exerciseExecutions.map((execution) => ({
                ...execution,
                setExecutions: execution.setExecutions.map((set) => ({
                  ...set,
                  bodyweightKg: weightKg,
                })),
              })),
            }
      ),
    });
    setBodyweightPromptDismissed(true);
  };

  const addSet = (exerciseIndex = draft.currentExerciseIndex) => {
    const execution = draft.exerciseExecutions[exerciseIndex];
    if (!execution) return;
    const last = [...execution.setExecutions].reverse().find((set) => set.completed)
      ?? execution.setExecutions.at(-1)
      ?? previousComparableSet;
    const newSet: SetExecution = {
      id: `se-added-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      setNumber: execution.setExecutions.length + 1,
      reps: last?.reps ?? currentPlannedSet?.plannedReps ?? 8,
      weight: last?.weight ?? currentPlannedSet?.plannedWeight ?? 0,
      duration: last?.duration,
      distanceKm: last?.distanceKm,
      completed: false,
      setType: 'working',
      origin: 'added',
      bodyweightKg: draft.bodyweightKg,
    };
    const event = createWorkoutChange(draft, 'set_added', {
      exerciseExecutionId: execution.id,
      setExecutionId: newSet.id,
      metadata: { setNumber: newSet.setNumber },
    });
    updateDraft((current) => ({
      ...current,
      currentExerciseIndex: exerciseIndex,
      currentSetIndex: newSet.setNumber - 1,
      exerciseExecutions: current.exerciseExecutions.map((item, index) =>
        index === exerciseIndex
          ? { ...item, setExecutions: [...item.setExecutions, newSet] }
          : item
      ),
    }), event);
    setShowOverview(false);
  };

  const deleteCurrentSet = () => {
    if ((currentSetExecution.origin ?? 'planned') !== 'added') return;
    setLastDeleted({
      exerciseIndex: draft.currentExerciseIndex,
      setIndex: draft.currentSetIndex,
      set: currentSetExecution,
    });
    const event = createWorkoutChange(draft, 'set_deleted', {
      exerciseExecutionId: currentExerciseExecution.id,
      setExecutionId: currentSetExecution.id,
    });
    updateDraft((current) => {
      const updated = current.exerciseExecutions.map((exercise, exerciseIndex) => {
        if (exerciseIndex !== current.currentExerciseIndex) return exercise;
        const sets = exercise.setExecutions
          .filter((set) => set.id !== currentSetExecution.id)
          .map((set, index) => ({ ...set, setNumber: index + 1 }));
        return { ...exercise, completedSets: completedCount({ ...exercise, setExecutions: sets }), setExecutions: sets };
      });
      return {
        ...current,
        exerciseExecutions: updated,
        currentSetIndex: Math.max(0, current.currentSetIndex - 1),
      };
    }, event);
  };

  const undoDeletedSet = () => {
    if (!lastDeleted) return;
    updateDraft((current) => ({
      ...current,
      currentExerciseIndex: lastDeleted.exerciseIndex,
      currentSetIndex: lastDeleted.setIndex,
      exerciseExecutions: current.exerciseExecutions.map((exercise, index) => {
        if (index !== lastDeleted.exerciseIndex) return exercise;
        const sets = [...exercise.setExecutions];
        sets.splice(lastDeleted.setIndex, 0, lastDeleted.set);
        return {
          ...exercise,
          setExecutions: sets.map((set, setIndex) => ({ ...set, setNumber: setIndex + 1 })),
        };
      }),
    }));
    setLastDeleted(null);
  };

  const changeSetType = (setType: SetType) => {
    const event = createWorkoutChange(draft, 'set_retyped', {
      exerciseExecutionId: currentExerciseExecution.id,
      setExecutionId: currentSetExecution.id,
      metadata: { from: currentSetExecution.setType ?? 'working', to: setType },
    });
    updateDraft((current) => ({
      ...current,
      exerciseExecutions: current.exerciseExecutions.map((exercise, exerciseIndex) =>
        exerciseIndex !== current.currentExerciseIndex
          ? exercise
          : {
              ...exercise,
              setExecutions: exercise.setExecutions.map((set, setIndex) =>
                setIndex === current.currentSetIndex ? { ...set, setType } : set
              ),
            }
      ),
    }), event);
    setShowSetTypePicker(false);
  };

  const nextIncompletePosition = (nextDraft: WorkoutDraft) => {
    const startExercise = nextDraft.currentExerciseIndex;
    const startSet = nextDraft.currentSetIndex;
    for (let offset = 1; offset <= nextDraft.exerciseExecutions.length; offset += 1) {
      const exerciseIndex = (startExercise + offset - (offset === 1 ? 1 : 0))
        % nextDraft.exerciseExecutions.length;
      const execution = nextDraft.exerciseExecutions[exerciseIndex];
      const from = exerciseIndex === startExercise ? startSet + 1 : 0;
      const setIndex = execution.setExecutions.findIndex(
        (set, index) => index >= from && !set.completed
      );
      if (setIndex >= 0) return { exerciseIndex, setIndex };
    }
    return null;
  };

  const completeSet = () => {
    if (currentSetExecution.completed) return;
    if (![loggedReps, loggedWeight, loggedDuration, loggedDistance].every(Number.isFinite)) return;
    const totalLoadKg = currentExercise?.bodyweightMode === 'bodyweight'
      ? (draft.bodyweightKg ?? 0) + loggedWeight
      : loggedWeight;
    let updatedDraft: WorkoutDraft = {
      ...draft,
      exerciseExecutions: draft.exerciseExecutions.map((exercise, exerciseIndex) => {
        if (exerciseIndex !== draft.currentExerciseIndex) return exercise;
        const sets = exercise.setExecutions.map((set, setIndex) =>
          setIndex === draft.currentSetIndex
            ? {
                ...set,
                reps: loggedReps,
                weight: loggedWeight,
                duration: loggedDuration || undefined,
                distanceKm: loggedDistance || undefined,
                bodyweightKg: draft.bodyweightKg,
                totalLoadKg,
                completed: true,
              }
            : set
        );
        return { ...exercise, completedSets: sets.filter((set) => set.completed).length, setExecutions: sets };
      }),
    };
    const next = nextIncompletePosition(updatedDraft);
    if (next) updatedDraft = { ...updatedDraft, ...{
      currentExerciseIndex: next.exerciseIndex,
      currentSetIndex: next.setIndex,
    }};
    updateDraft(() => updatedDraft);
    setLastCompleted({ exerciseIndex: draft.currentExerciseIndex, setIndex: draft.currentSetIndex });
    const restSeconds =
      currentPlan?.restSeconds ??
      currentExercise?.defaultRestSeconds ??
      (currentExercise?.category === 'Endurance' || currentExercise?.category === 'Flexibility'
        ? 60
        : state.preferences.defaultRestSeconds);
    if (restSeconds > 0) setRestTimer(startRestTimer(restSeconds));
    if (!next) setIsFinished(true);
  };

  const setLastRir = (rir: RIR) => {
    if (!lastCompleted) return;
    updateDraft((current) => ({
      ...current,
      exerciseExecutions: current.exerciseExecutions.map((exercise, exerciseIndex) =>
        exerciseIndex !== lastCompleted.exerciseIndex
          ? exercise
          : {
              ...exercise,
              setExecutions: exercise.setExecutions.map((set, setIndex) =>
                setIndex === lastCompleted.setIndex ? { ...set, rir } : set
              ),
            }
      ),
    }));
  };

  const undoLastSet = () => {
    if (!lastCompleted) return;
    updateDraft((current) => ({
      ...current,
      currentExerciseIndex: lastCompleted.exerciseIndex,
      currentSetIndex: lastCompleted.setIndex,
      exerciseExecutions: current.exerciseExecutions.map((exercise, exerciseIndex) => {
        if (exerciseIndex !== lastCompleted.exerciseIndex) return exercise;
        const sets = exercise.setExecutions.map((set, setIndex) =>
          setIndex === lastCompleted.setIndex
            ? { ...set, completed: false, rir: undefined }
            : set
        );
        return { ...exercise, completedSets: sets.filter((set) => set.completed).length, setExecutions: sets };
      }),
    }));
    setRestTimer(null);
    setLastCompleted(null);
  };

  const addExercise = (exerciseId: string, createdExercise?: Exercise) => {
    const exercise = createdExercise ?? state.exercises.find((item) => item.id === exerciseId);
    if (!exercise) return;
    const historical = [...state.workoutExecutions]
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
      .flatMap((execution) => execution.exerciseExecutions)
      .find((entry) => entry.exerciseId === exerciseId);
    const sourceSets = historical?.setExecutions.filter(isWorkingSet);
    const setCount = Math.max(
      1,
      addedExerciseSetCount || sourceSets?.length || exercise.defaultSetCount || 3
    );
    const isReplacement = replaceExerciseIndex !== null;
    const currentBlock = draft.exerciseExecutions[draft.currentExerciseIndex];
    const lastCurrentBlockIndex = currentBlock?.blockId
      ? draft.exerciseExecutions.reduce(
          (latest, entry, index) => entry.blockId === currentBlock.blockId ? index : latest,
          draft.currentExerciseIndex
        )
      : draft.currentExerciseIndex;
    const targetIndex = replaceExerciseIndex ?? (
      exercisePlacement === 'end'
        ? draft.exerciseExecutions.length
        : exercisePlacement === 'current-block'
          ? lastCurrentBlockIndex + 1
          : draft.currentExerciseIndex + 1
    );
    const execution: ExerciseExecution = {
      id: `ee-added-${Date.now()}-${exerciseId}`,
      exerciseId,
      origin: isReplacement ? 'replacement' : 'added',
      replacesPlannedExerciseId: isReplacement
        ? draft.exerciseExecutions[replaceExerciseIndex!]?.plannedExerciseId
        : undefined,
      replacementReason: isReplacement ? replacementReason : undefined,
      order: targetIndex + 1,
      blockId: !isReplacement && exercisePlacement === 'current-block'
        ? currentBlock?.blockId
        : undefined,
      blockType: !isReplacement && exercisePlacement === 'current-block'
        ? currentBlock?.blockType
        : undefined,
      completedSets: 0,
      setExecutions: Array.from({ length: setCount }, (_, index) => {
        const source = sourceSets?.[index] ?? sourceSets?.at(-1);
        return {
          id: `se-added-${Date.now()}-${index}`,
          setNumber: index + 1,
          reps: source?.reps ?? exercise.repRangeMin ?? 8,
          weight: source?.weight ?? 0,
          duration: source?.duration,
          distanceKm: source?.distanceKm,
          completed: false,
          setType: 'working',
          origin: 'added',
          bodyweightKg: draft.bodyweightKg,
        };
      }),
    };
    const event = createWorkoutChange(draft, isReplacement ? 'exercise_replaced' : 'exercise_added', {
      exerciseExecutionId: execution.id,
      metadata: {
        exerciseId,
        replacedExerciseId: isReplacement
          ? draft.exerciseExecutions[replaceExerciseIndex!]?.exerciseId ?? ''
          : '',
      },
    });
    const nextDraft = ((current: WorkoutDraft) => {
      const entries = [...current.exerciseExecutions];
      if (isReplacement) {
        entries[replaceExerciseIndex!] = {
          ...entries[replaceExerciseIndex!],
          skipped: true,
          skipReason: replacementReason,
        };
        entries.splice(replaceExerciseIndex! + 1, 0, execution);
      } else {
        entries.splice(targetIndex, 0, execution);
      }
      return {
        ...current,
        exerciseExecutions: entries.map((entry, index) => ({ ...entry, order: index + 1 })),
        currentExerciseIndex: isReplacement ? replaceExerciseIndex! + 1 : targetIndex,
        currentSetIndex: 0,
        updatedAt: new Date().toISOString(),
      };
    })(draft);
    onUpdateState({
      ...state,
      exercises: createdExercise ? [...state.exercises, createdExercise] : state.exercises,
      workoutDrafts: state.workoutDrafts.map((item) => item.id === draft.id ? nextDraft : item),
      workoutChangeEvents: [...state.workoutChangeEvents, event],
      activeEditorLeases: [
        ...state.activeEditorLeases.filter(
          (lease) => lease.scheduledWorkoutId !== draft.scheduledWorkoutId
        ),
        createEditorLease(draft.scheduledWorkoutId),
      ],
    });
    setShowExercisePicker(false);
    setShowOverview(false);
    setReplaceExerciseIndex(null);
    setExerciseSearch('');
    setQuickCreateName('');
    setExercisePlacement('after-current');
    setAddedExerciseSetCount(3);
    setReplacementReason('equipment');
  };

  const quickCreateExercise = () => {
    const name = quickCreateName.trim();
    if (!name) return;
    const exercise: Exercise = {
      id: `ex-custom-${Date.now()}`,
      name,
      description: 'Created during a workout',
      primaryMuscles: [],
      secondaryMuscles: [],
      equipment: 'Other',
      progressionStrategy: 'Linear',
      prMetric: 'highest_weight',
      category: 'Strength',
      defaultSetCount: 3,
      defaultRestSeconds: state.preferences.defaultRestSeconds,
      weightIncrementKg: state.preferences.preferredWeightIncrementKg,
      measureMode: 'weight_reps',
      bodyweightMode: 'none',
    };
    addExercise(exercise.id, exercise);
  };

  const skipExercise = (reason: SkipReason) => {
    const event = createWorkoutChange(draft, 'exercise_skipped', {
      exerciseExecutionId: currentExerciseExecution.id,
      metadata: { reason },
    });
    updateDraft((current) => ({
      ...current,
      exerciseExecutions: current.exerciseExecutions.map((exercise, index) =>
        index === current.currentExerciseIndex
          ? { ...exercise, skipped: true, skipReason: reason }
          : exercise
      ),
    }), event);
    setShowSkipPicker(false);
    const nextIndex = Math.min(
      draft.exerciseExecutions.length - 1,
      draft.currentExerciseIndex + 1
    );
    setPosition(nextIndex, 0);
  };

  const moveExercise = (exerciseIndex: number, direction: -1 | 1) => {
    const target = exerciseIndex + direction;
    if (target < 0 || target >= draft.exerciseExecutions.length) return;
    const event = createWorkoutChange(draft, 'exercise_reordered', {
      exerciseExecutionId: draft.exerciseExecutions[exerciseIndex].id,
      metadata: { from: exerciseIndex, to: target },
    });
    updateDraft((current) => {
      const entries = [...current.exerciseExecutions];
      const [moved] = entries.splice(exerciseIndex, 1);
      entries.splice(target, 0, moved);
      return {
        ...current,
        currentExerciseIndex:
          current.currentExerciseIndex === exerciseIndex ? target : current.currentExerciseIndex,
        exerciseExecutions: entries.map((entry, index) => ({ ...entry, order: index + 1 })),
      };
    }, event);
  };

  const saveWorkout = () => {
    onFinishWorkout(finalizeWorkoutDraft(draft, state.exercises));
    setRestTimer(null);
  };

  const metrics = workoutDraftMetrics(draft, state.exercises);
  const filteredExercises = state.exercises
    .filter((exercise) =>
      (equipmentFilter === 'All' || exercise.equipment === equipmentFilter) &&
      (
        exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
        exercise.primaryMuscles.some((muscle) =>
          muscle.toLowerCase().includes(exerciseSearch.toLowerCase())
        )
      )
    )
    .sort((a, b) => {
      const recentIds = new Set(
        state.workoutExecutions.slice(-5).flatMap((execution) =>
          execution.exerciseExecutions.map((entry) => entry.exerciseId)
        )
      );
      if (recentIds.has(a.id) !== recentIds.has(b.id)) return recentIds.has(a.id) ? -1 : 1;
      if (Boolean(a.favorite) !== Boolean(b.favorite)) return a.favorite ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  const measureMode = currentExercise?.measureMode ?? 'weight_reps';
  const showReps = ['weight_reps', 'reps'].includes(measureMode);
  const showWeight = measureMode === 'weight_reps';
  const showDuration = ['duration', 'distance_duration'].includes(measureMode);
  const showDistance = ['distance', 'distance_duration'].includes(measureMode);

  return (
    <div className="mx-auto max-w-3xl space-y-3 pb-24 sm:pb-10">
      <header className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-extrabold text-zinc-100 sm:text-xl">
              {workout.title}
            </h1>
            <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] ${
              syncStatus === 'synced'
                ? 'bg-emerald-500/10 text-emerald-400'
                : syncStatus === 'error'
                  ? 'bg-rose-500/10 text-rose-400'
                  : 'bg-zinc-800 text-zinc-400'
            }`}>
              {syncStatus === 'guest' ? 'SAVED LOCAL' : syncStatus.toUpperCase()}
            </span>
          </div>
          <p className="font-mono text-[10px] text-zinc-500">
            {metrics.completedPlannedWorkingSets}/{metrics.plannedWorkingSets} planned
            {metrics.extraWorkingSets ? ` · +${metrics.extraWorkingSets} extra` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowOverview(true)}
            className="mobile-icon-button"
            aria-label="Workout overview"
          >
            <List className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setReplaceExerciseIndex(null);
              setShowExercisePicker(true);
            }}
            className="mobile-icon-button text-emerald-400"
            aria-label="Add exercise"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onCancelWorkout}
            className="mobile-icon-button"
            aria-label="Leave workout"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {needsBodyweight && (
        <section className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-4">
          <h2 className="font-bold text-sky-100">Bodyweight for this week</h2>
          <p className="mt-1 text-xs text-sky-200/70">
            Used as a fixed snapshot for bodyweight exercises. You can keep the previous value.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              min="1"
              step="0.1"
              value={bodyweightInput}
              onChange={(event) => setBodyweightInput(event.target.value)}
              placeholder="kg"
              className="min-w-0 flex-1 rounded-xl border border-sky-500/30 bg-zinc-950 px-3 text-lg text-zinc-100"
              aria-label="Current bodyweight in kilograms"
            />
            <button type="button" onClick={saveBodyweight} className="mobile-action bg-sky-400 text-sky-950">
              Save
            </button>
            <button
              type="button"
              onClick={() => setBodyweightPromptDismissed(true)}
              className="mobile-action secondary-action"
            >
              Later
            </button>
          </div>
        </section>
      )}

      {isFinished ? (
        <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7">
          <div className="text-center">
            <Trophy className="mx-auto h-10 w-10 text-emerald-400" />
            <h2 className="mt-2 text-2xl font-black text-zinc-100">Review workout</h2>
            <p className="mt-1 text-xs text-zinc-500">
              The template stays unchanged. Deviations will appear next time you plan.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-zinc-950 p-3">
              <strong className="block text-lg text-zinc-100">{metrics.completionPercentage}%</strong>
              <span className="text-[10px] text-zinc-500">plan completed</span>
            </div>
            <div className="rounded-xl bg-zinc-950 p-3">
              <strong className="block text-lg text-emerald-400">+{metrics.extraWorkingSets}</strong>
              <span className="text-[10px] text-zinc-500">extra sets</span>
            </div>
            <div className="rounded-xl bg-zinc-950 p-3">
              <strong className="block text-lg text-purple-300">
                {Math.round(metrics.actualVolumeKg ?? 0).toLocaleString()}
              </strong>
              <span className="text-[10px] text-zinc-500">actual kg</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-zinc-400">Session feeling</label>
            <div className="mt-2 grid grid-cols-5 gap-1">
              {(['Great', 'Good', 'Average', 'Tough', 'Exhausted'] as WorkoutFeeling[]).map((feeling) => (
                <button
                  type="button"
                  key={feeling}
                  onClick={() => updateDraft((current) => ({ ...current, feeling }))}
                  className={`min-h-11 rounded-lg border px-1 text-[10px] ${
                    draft.feeling === feeling
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                  }`}
                >
                  {feeling}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={draft.notes ?? ''}
            onChange={(event) => updateDraft((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Workout notes"
            rows={3}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100"
          />
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <button type="button" onClick={() => setIsFinished(false)} className="mobile-action secondary-action justify-center">
              Resume
            </button>
            <button type="button" onClick={saveWorkout} className="mobile-action justify-center bg-emerald-500 text-zinc-950">
              Save workout
            </button>
          </div>
        </section>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-1">
            <button
              type="button"
              disabled={draft.currentExerciseIndex === 0}
              onClick={() => setPosition(draft.currentExerciseIndex - 1, 0)}
              className="mobile-icon-button disabled:opacity-30"
              aria-label="Previous exercise"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setShowOverview(true)} className="min-h-11 text-center font-mono text-xs">
              <span className="font-bold text-emerald-400">
                EXERCISE {draft.currentExerciseIndex + 1} OF {draft.exerciseExecutions.length}
              </span>
              <span className="block text-[9px] text-zinc-500">
                {currentExerciseExecution.origin ?? 'planned'}
              </span>
            </button>
            <button
              type="button"
              disabled={draft.currentExerciseIndex === draft.exerciseExecutions.length - 1}
              onClick={() => setPosition(draft.currentExerciseIndex + 1, 0)}
              className="mobile-icon-button disabled:opacity-30"
              aria-label="Next exercise"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {restTimer && (
            <RestTimerPanel
              timer={restTimer}
              selectedRir={lastCompleted
                ? draft.exerciseExecutions[lastCompleted.exerciseIndex]
                    ?.setExecutions[lastCompleted.setIndex]?.rir
                : undefined}
              showRir={Boolean(lastCompleted)}
              soundEnabled={state.preferences.timerSound}
              vibrationEnabled={state.preferences.timerVibration}
              onChange={setRestTimer}
              onSelectRir={setLastRir}
              onUndo={undoLastSet}
            />
          )}

          <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-black text-zinc-100">{currentExercise?.name}</h2>
                <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
                  {currentExercise?.primaryMuscles.join(', ')}
                  {currentExercise?.bodyweightMode === 'bodyweight' && draft.bodyweightKg
                    ? ` · ${draft.bodyweightKg} kg bodyweight`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => addSet()}
                className="mobile-action shrink-0 bg-emerald-500/15 text-emerald-300"
              >
                <Plus className="h-4 w-4" /> Set
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1" data-no-swipe>
              {currentExerciseExecution.setExecutions.map((set, index) => (
                <button
                  type="button"
                  key={set.id}
                  onClick={() => setPosition(draft.currentExerciseIndex, index)}
                  className={`min-h-12 min-w-[64px] rounded-xl border px-2 font-mono text-xs ${
                    index === draft.currentSetIndex
                      ? 'border-emerald-500 bg-zinc-800 text-zinc-100 ring-1 ring-emerald-500'
                      : set.completed
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                  }`}
                >
                  <span className="block text-[9px] uppercase">
                    {set.setType === 'warmup' ? 'W' : set.setNumber}
                  </span>
                  <strong>{set.completed ? '✓' : `${set.reps}×${set.weight}`}</strong>
                </button>
              ))}
            </div>

            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowSetTypePicker(true)}
                  className="min-h-11 rounded-xl border border-zinc-800 bg-zinc-900 px-3 font-mono text-xs text-zinc-300"
                >
                  {SET_TYPE_LABELS[currentSetExecution.setType ?? 'working']} set
                </button>
                {(currentSetExecution.origin ?? 'planned') === 'added' && (
                  <button
                    type="button"
                    onClick={deleteCurrentSet}
                    className="mobile-icon-button text-rose-400"
                    aria-label="Delete added set"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {(currentPlannedSet || previousComparableSet) && (
                <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                  <div className="rounded-lg bg-zinc-900 p-2 text-zinc-400">
                    <span className="block text-zinc-600">PLANNED</span>
                    {currentPlannedSet
                      ? `${currentPlannedSet.plannedReps} × ${currentPlannedSet.plannedWeight} kg`
                      : 'Added set'}
                  </div>
                  <div className="rounded-lg bg-zinc-900 p-2 text-zinc-400">
                    <span className="block text-zinc-600">PREVIOUS</span>
                    {previousComparableSet
                      ? `${previousComparableSet.reps} × ${previousComparableSet.weight} kg`
                      : 'No history'}
                  </div>
                </div>
              )}

              <div className={`grid gap-3 ${[showReps, showWeight, showDuration, showDistance].filter(Boolean).length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {showReps && (
                  <label className="space-y-1 text-center">
                    <span className="font-mono text-[10px] uppercase text-zinc-500">Reps</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={loggedReps}
                      onChange={(event) => {
                        const value = Math.max(0, Number(event.target.value));
                        setLoggedReps(value);
                        saveCurrentInput({ reps: value });
                      }}
                      className="h-14 w-full rounded-xl border border-zinc-800 bg-zinc-900 text-center text-3xl font-black text-emerald-400"
                    />
                  </label>
                )}
                {showWeight && (
                  <label className="space-y-1 text-center">
                    <span className="font-mono text-[10px] uppercase text-zinc-500">
                      {currentExercise?.bodyweightMode === 'bodyweight' ? 'Added load kg' : 'Weight kg'}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.5"
                      value={loggedWeight}
                      onChange={(event) => {
                        const value = Math.max(0, Number(event.target.value));
                        setLoggedWeight(value);
                        saveCurrentInput({ weight: value });
                      }}
                      className="h-14 w-full rounded-xl border border-zinc-800 bg-zinc-900 text-center text-3xl font-black text-zinc-100"
                    />
                  </label>
                )}
                {showDuration && (
                  <label className="space-y-1 text-center">
                    <span className="font-mono text-[10px] uppercase text-zinc-500">Seconds</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={loggedDuration}
                      onChange={(event) => {
                        const value = Math.max(0, Number(event.target.value));
                        setLoggedDuration(value);
                        saveCurrentInput({ duration: value });
                      }}
                      className="h-14 w-full rounded-xl border border-zinc-800 bg-zinc-900 text-center text-3xl font-black text-sky-300"
                    />
                  </label>
                )}
                {showDistance && (
                  <label className="space-y-1 text-center">
                    <span className="font-mono text-[10px] uppercase text-zinc-500">Distance km</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      value={loggedDistance}
                      onChange={(event) => {
                        const value = Math.max(0, Number(event.target.value));
                        setLoggedDistance(value);
                        saveCurrentInput({ distanceKm: value });
                      }}
                      className="h-14 w-full rounded-xl border border-zinc-800 bg-zinc-900 text-center text-3xl font-black text-sky-300"
                    />
                  </label>
                )}
              </div>

              {currentExercise?.bodyweightMode === 'bodyweight' && draft.bodyweightKg && (
                <p className="text-center font-mono text-[10px] text-zinc-500">
                  Total system load: {totalLoadForSet(
                    { ...currentSetExecution, weight: loggedWeight, bodyweightKg: draft.bodyweightKg },
                    currentExercise
                  ).toFixed(1)} kg
                </p>
              )}

              <button
                type="button"
                onClick={completeSet}
                disabled={currentSetExecution.completed}
                className="sticky bottom-[calc(var(--mobile-dock-height)+0.5rem)] z-20 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 font-mono text-sm font-black text-zinc-950 shadow-xl disabled:bg-zinc-700 disabled:text-zinc-400 sm:static"
              >
                <Check className="h-5 w-5" />
                Complete set {currentSetExecution.setNumber}
              </button>
            </div>
          </section>
        </>
      )}

      {!isFinished && (
        <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
          <button
            type="button"
            onClick={() => setShowSkipPicker(true)}
            className="min-h-11 text-xs text-zinc-500"
          >
            Skip exercise
          </button>
          <button
            type="button"
            onClick={() => setIsFinished(true)}
            className="min-h-11 text-xs font-semibold text-emerald-400"
          >
            Finish workout →
          </button>
        </div>
      )}

      {lastDeleted && (
        <div className="fixed bottom-[calc(var(--mobile-dock-height)+0.75rem)] left-3 right-3 z-40 flex min-h-12 items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900 px-3 shadow-2xl sm:left-auto sm:right-5 sm:w-80">
          <span className="text-xs text-zinc-300">Added set deleted</span>
          <button type="button" onClick={undoDeletedSet} className="min-h-11 px-3 text-xs font-bold text-emerald-400">
            Undo
          </button>
        </div>
      )}

      {showSetTypePicker && (
        <div className="mobile-sheet-layer items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Choose set type">
          <button className="absolute inset-0" onClick={() => setShowSetTypePicker(false)} aria-label="Close set type picker" />
          <div className="mobile-sheet relative z-10 w-full max-w-sm p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-zinc-100">Set type</h2>
              <button type="button" className="mobile-icon-button" onClick={() => setShowSetTypePicker(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(SET_TYPE_LABELS) as SetType[]).map((setType) => (
                <button
                  type="button"
                  key={setType}
                  onClick={() => changeSetType(setType)}
                  className={`min-h-12 rounded-xl border px-3 text-sm ${
                    currentSetExecution.setType === setType
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-300'
                  }`}
                >
                  {SET_TYPE_LABELS[setType]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showOverview && (
        <div className="mobile-sheet-layer items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="workout-overview-title">
          <button className="absolute inset-0" onClick={() => setShowOverview(false)} aria-label="Close workout overview" />
          <div className="mobile-sheet relative z-10 max-h-[88dvh] w-full max-w-lg overflow-y-auto p-4">
            <div className="sticky top-0 z-10 flex items-center justify-between bg-zinc-900 pb-3">
              <div>
                <p className="font-mono text-[10px] uppercase text-emerald-400">Workout</p>
                <h2 id="workout-overview-title" className="font-bold text-zinc-100">Exercise overview</h2>
              </div>
              <button type="button" className="mobile-icon-button" onClick={() => setShowOverview(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              {draft.exerciseExecutions.map((execution, exerciseIndex) => {
                const exercise = state.exercises.find((item) => item.id === execution.exerciseId);
                return (
                  <div key={execution.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPosition(exerciseIndex, 0);
                        setShowOverview(false);
                      }}
                      className="min-h-11 w-full text-left"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <strong className={execution.skipped ? 'text-zinc-600 line-through' : 'text-zinc-100'}>
                          {exercise?.name}
                        </strong>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {execution.completedSets}/{execution.setExecutions.length}
                        </span>
                      </span>
                      <span className="font-mono text-[9px] uppercase text-zinc-600">
                        {execution.origin ?? 'planned'}{execution.skipped ? ` · skipped: ${execution.skipReason}` : ''}
                      </span>
                    </button>
                    <div className="mt-2 flex gap-2 border-t border-zinc-900 pt-2">
                      <button
                        type="button"
                        disabled={exerciseIndex === 0}
                        onClick={() => moveExercise(exerciseIndex, -1)}
                        className="mobile-icon-button border border-zinc-800 disabled:opacity-30"
                        aria-label={`Move ${exercise?.name ?? 'exercise'} up`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={exerciseIndex === draft.exerciseExecutions.length - 1}
                        onClick={() => moveExercise(exerciseIndex, 1)}
                        className="mobile-icon-button border border-zinc-800 disabled:opacity-30"
                        aria-label={`Move ${exercise?.name ?? 'exercise'} down`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => addSet(exerciseIndex)} className="mobile-action secondary-action flex-1 justify-center">
                        <Plus className="h-4 w-4" /> Set
                      </button>
                      {(execution.origin ?? 'planned') === 'planned' && !execution.skipped && (
                        <button
                          type="button"
                          onClick={() => {
                            setReplaceExerciseIndex(exerciseIndex);
                            setShowExercisePicker(true);
                          }}
                          className="mobile-action secondary-action flex-1 justify-center"
                        >
                          Replace
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setReplaceExerciseIndex(null);
                setShowExercisePicker(true);
              }}
              className="mobile-action sticky bottom-0 mt-3 w-full justify-center bg-emerald-500 text-zinc-950"
            >
              <Plus className="h-4 w-4" /> Add exercise
            </button>
          </div>
        </div>
      )}

      {showExercisePicker && (
        <div className="mobile-sheet-layer items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="exercise-picker-title">
          <button className="absolute inset-0" onClick={() => setShowExercisePicker(false)} aria-label="Close exercise picker" />
          <div className="mobile-sheet relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase text-emerald-400">
                  {replaceExerciseIndex === null ? 'Add' : 'Replace'}
                </p>
                <h2 id="exercise-picker-title" className="font-bold text-zinc-100">Choose exercise</h2>
              </div>
              <button type="button" className="mobile-icon-button" onClick={() => setShowExercisePicker(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mt-3 flex min-h-12 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3">
              <Search className="h-4 w-4 text-zinc-500" />
              <input
                value={exerciseSearch}
                onChange={(event) => setExerciseSearch(event.target.value)}
                placeholder="Exercise or muscle"
                className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none"
                autoFocus
              />
            </label>
            <select
              value={equipmentFilter}
              onChange={(event) => setEquipmentFilter(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-300"
              aria-label="Filter exercises by equipment"
            >
              <option>All</option>
              {Array.from(new Set(state.exercises.map((exercise) => exercise.equipment)))
                .sort()
                .map((equipment) => <option key={equipment}>{equipment}</option>)}
            </select>
            {replaceExerciseIndex === null && (
              <div className="mt-2 flex gap-2" data-no-swipe>
                <div className="grid min-w-0 flex-1 grid-cols-3 gap-1">
                  {([
                    ['after-current', 'After current'],
                    ['end', 'At end'],
                    ['current-block', 'In block'],
                  ] as const).map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      disabled={value === 'current-block' && !currentExerciseExecution.blockId}
                      onClick={() => setExercisePlacement(value)}
                      className={`min-h-11 rounded-lg border px-1 text-[10px] ${
                        exercisePlacement === value
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                      } disabled:opacity-30`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="w-16 text-center font-mono text-[9px] uppercase text-zinc-500">
                  Sets
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="20"
                    value={addedExerciseSetCount}
                    onChange={(event) => setAddedExerciseSetCount(
                      Math.min(20, Math.max(1, Number(event.target.value)))
                    )}
                    className="mt-0.5 min-h-9 w-full rounded-lg border border-zinc-800 bg-zinc-950 text-center text-sm text-zinc-200"
                  />
                </label>
              </div>
            )}
            {replaceExerciseIndex !== null && (
              <select
                value={replacementReason}
                onChange={(event) => setReplacementReason(event.target.value as SkipReason)}
                className="mt-2 min-h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-300"
                aria-label="Reason for replacing exercise"
              >
                {SKIP_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>{reason.label}</option>
                ))}
              </select>
            )}
            <div className="mt-3 flex-1 space-y-1 overflow-y-auto">
              {filteredExercises.map((exercise) => (
                <button
                  type="button"
                  key={exercise.id}
                  onClick={() => addExercise(exercise.id)}
                  className="flex min-h-14 w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-left"
                >
                  <span>
                    <strong className="block text-sm text-zinc-100">{exercise.name}</strong>
                    <span className="text-[10px] text-zinc-500">
                      {exercise.primaryMuscles.join(', ')} · {exercise.equipment}
                    </span>
                  </span>
                  <Plus className="h-4 w-4 text-emerald-400" />
                </button>
              ))}
            </div>
            <div className="mt-3 border-t border-zinc-800 pt-3">
              <label className="block font-mono text-[10px] uppercase text-zinc-500">
                Quick-create exercise
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  value={quickCreateName}
                  onChange={(event) => setQuickCreateName(event.target.value)}
                  placeholder="New exercise name"
                  className="min-h-12 min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
                  aria-label="New exercise name"
                />
                <button
                  type="button"
                  onClick={quickCreateExercise}
                  disabled={!quickCreateName.trim()}
                  className="mobile-action bg-emerald-500 text-zinc-950 disabled:opacity-40"
                >
                  Create
                </button>
              </div>
              <p className="mt-1 text-[10px] text-zinc-600">
                Strength defaults are used; details can be refined later.
              </p>
            </div>
          </div>
        </div>
      )}

      {showSkipPicker && (
        <div className="mobile-sheet-layer items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Skip exercise">
          <button className="absolute inset-0" onClick={() => setShowSkipPicker(false)} aria-label="Close skip reasons" />
          <div className="mobile-sheet relative z-10 w-full max-w-sm p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-zinc-100">Why skip this exercise?</h2>
              <button type="button" className="mobile-icon-button" onClick={() => setShowSkipPicker(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {SKIP_REASONS.map((reason) => (
                <button
                  type="button"
                  key={reason.value}
                  onClick={() => skipExercise(reason.value)}
                  className="min-h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-left text-sm text-zinc-200"
                >
                  {reason.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
