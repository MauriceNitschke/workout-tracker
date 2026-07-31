import {
  AppState,
  BodyweightEntry,
  Exercise,
  ExerciseExecution,
  PlannedExercise,
  ScheduledWorkout,
  SetExecution,
  SetType,
  WorkoutChangeEvent,
  WorkoutDraft,
  WorkoutExecution,
} from '../types';
import { formatLocalDateISO, getCurrentISOWeekAndYear } from './weekUtils';

export const WORKING_SET_TYPES: SetType[] = ['working', 'backoff', 'drop', 'failure'];

export function getWorkoutDeviceId(): string {
  const key = 'training-os-workout-device-id';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(key, created);
    return created;
  } catch {
    return 'device-unavailable';
  }
}

export function createEditorLease(scheduledWorkoutId: string, deviceId = getWorkoutDeviceId()) {
  const now = new Date();
  return {
    id: `lease-${scheduledWorkoutId}`,
    scheduledWorkoutId,
    deviceId,
    acquiredAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 5 * 60_000).toISOString(),
  };
}

export function isWorkingSet(set: SetExecution): boolean {
  return set.completed && WORKING_SET_TYPES.includes(set.setType ?? 'working');
}

export function isPrEligibleSet(set: SetExecution): boolean {
  return set.completed && (set.setType ?? 'working') !== 'warmup';
}

export function totalLoadForSet(set: SetExecution, exercise?: Exercise): number {
  if (exercise?.bodyweightMode === 'bodyweight') {
    return Math.max(0, (set.bodyweightKg ?? 0) + set.weight);
  }
  return Math.max(0, set.weight);
}

export function volumeForSet(set: SetExecution, exercise?: Exercise): number {
  if (!isWorkingSet(set)) return 0;
  return totalLoadForSet(set, exercise) * Math.max(0, set.reps);
}

export function latestBodyweight(state: AppState): BodyweightEntry | undefined {
  return [...state.bodyweightEntries].sort(
    (a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)
  )[0];
}

export function bodyweightForCurrentWeek(state: AppState): BodyweightEntry | undefined {
  const { isoWeek, year } = getCurrentISOWeekAndYear();
  return [...state.bodyweightEntries]
    .filter((entry) => entry.isoWeek === isoWeek && entry.year === year)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? latestBodyweight(state);
}

export function createBodyweightEntry(weightKg: number, source: BodyweightEntry['source']): BodyweightEntry {
  const now = new Date();
  const { isoWeek, year } = getCurrentISOWeekAndYear();
  const timestamp = now.toISOString();
  return {
    id: `bw-${year}-${isoWeek}-${Date.now()}`,
    date: formatLocalDateISO(now),
    isoWeek,
    year,
    weightKg,
    createdAt: timestamp,
    updatedAt: timestamp,
    source,
  };
}

function executionFromPlannedExercise(
  exercise: PlannedExercise,
  bodyweightKg?: number
): ExerciseExecution {
  return {
    id: `ee-${exercise.id}`,
    exerciseId: exercise.exerciseId,
    plannedExerciseId: exercise.id,
    origin: 'planned',
    order: exercise.order,
    blockId: exercise.blockId,
    blockType: exercise.blockType,
    completedSets: 0,
    setExecutions: exercise.plannedSets.map((set) => ({
      id: `se-${exercise.id}-${set.setNumber}`,
      setNumber: set.setNumber,
      plannedSetNumber: set.setNumber,
      reps: set.plannedReps,
      weight: set.plannedWeight,
      duration: set.plannedDuration,
      completed: false,
      setType: 'working',
      origin: 'planned',
      bodyweightKg,
    })),
  };
}

export function createWorkoutDraft(
  workout: ScheduledWorkout,
  state: AppState,
  existing?: WorkoutExecution
): WorkoutDraft {
  const now = new Date().toISOString();
  const bodyweightKg = bodyweightForCurrentWeek(state)?.weightKg;
  const planSnapshot = workout.plannedExercises.map((exercise) => ({
    ...exercise,
    plannedSets: exercise.plannedSets.map((set) => ({ ...set })),
  }));
  const exerciseExecutions = existing
    ? existing.exerciseExecutions.map((exercise) => ({
        ...exercise,
        setExecutions: exercise.setExecutions.map((set) => ({ ...set })),
      }))
    : planSnapshot.map((exercise) => executionFromPlannedExercise(exercise, bodyweightKg));

  return {
    id: `draft-${workout.id}`,
    scheduledWorkoutId: workout.id,
    startedAt: existing?.startedAt ?? now,
    updatedAt: now,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    notes: existing?.notes ?? '',
    feeling: existing?.feeling ?? 'Good',
    exerciseExecutions,
    planSnapshot: existing?.planSnapshot ?? planSnapshot,
    bodyweightKg: existing?.bodyweightKg ?? bodyweightKg,
    firstCompletedAt: existing?.firstCompletedAt ?? existing?.completedAt,
    reopenedCount: (existing?.reopenedCount ?? 0) + (existing ? 1 : 0),
  };
}

export function plannedWorkingSetCount(draft: WorkoutDraft): number {
  return draft.planSnapshot.reduce((sum, exercise) => sum + exercise.plannedSets.length, 0);
}

export function workoutDraftMetrics(
  draft: WorkoutDraft,
  exercises: Exercise[]
): Pick<
  WorkoutExecution,
  | 'completionPercentage'
  | 'plannedWorkingSets'
  | 'completedPlannedWorkingSets'
  | 'extraWorkingSets'
  | 'plannedVolumeKg'
  | 'actualVolumeKg'
> {
  const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const plannedSets = plannedWorkingSetCount(draft);
  let completedPlanned = 0;
  let extra = 0;
  let actualVolumeKg = 0;

  for (const exerciseExecution of draft.exerciseExecutions) {
    const exercise = exerciseMap.get(exerciseExecution.exerciseId);
    for (const set of exerciseExecution.setExecutions) {
      if (!isWorkingSet(set)) continue;
      if ((set.origin ?? 'planned') === 'planned') completedPlanned += 1;
      else extra += 1;
      actualVolumeKg += volumeForSet(set, exercise);
    }
  }

  const plannedVolumeKg = draft.planSnapshot.reduce(
    (total, plannedExercise) => {
      const exercise = exerciseMap.get(plannedExercise.exerciseId);
      return total + plannedExercise.plannedSets.reduce((sum, set) => {
        const totalLoad = exercise?.bodyweightMode === 'bodyweight'
          ? (draft.bodyweightKg ?? 0) + set.plannedWeight
          : set.plannedWeight;
        return sum + totalLoad * set.plannedReps;
      }, 0);
    },
    0
  );

  return {
    completionPercentage: plannedSets
      ? Math.min(100, Math.round((completedPlanned / plannedSets) * 100))
      : 100,
    plannedWorkingSets: plannedSets,
    completedPlannedWorkingSets: completedPlanned,
    extraWorkingSets: extra,
    plannedVolumeKg,
    actualVolumeKg,
  };
}

export function finalizeWorkoutDraft(
  draft: WorkoutDraft,
  exercises: Exercise[]
): WorkoutExecution {
  const completedAt = new Date().toISOString();
  return {
    id: `exec-${draft.scheduledWorkoutId}`,
    scheduledWorkoutId: draft.scheduledWorkoutId,
    startedAt: draft.startedAt,
    completedAt,
    firstCompletedAt: draft.firstCompletedAt ?? completedAt,
    reopenedCount: draft.reopenedCount,
    notes: draft.notes,
    feeling: draft.feeling,
    exerciseExecutions: draft.exerciseExecutions,
    planSnapshot: draft.planSnapshot,
    bodyweightKg: draft.bodyweightKg,
    ...workoutDraftMetrics(draft, exercises),
  };
}

export function createWorkoutChange(
  draft: WorkoutDraft,
  type: WorkoutChangeEvent['type'],
  details: Partial<WorkoutChangeEvent> = {}
): WorkoutChangeEvent {
  return {
    id: `change-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    scheduledWorkoutId: draft.scheduledWorkoutId,
    workoutDraftId: draft.id,
    type,
    createdAt: new Date().toISOString(),
    ...details,
  };
}

export function findTrainCandidate(state: AppState, today = formatLocalDateISO(new Date())) {
  const activeDraft = state.workoutDrafts.find(
    (draft) => draft.scheduledWorkoutId === state.activeWorkoutId
  ) ?? state.workoutDrafts[0];
  if (activeDraft) {
    return {
      kind: 'resume' as const,
      workout: state.scheduledWorkouts.find(
        (workout) => workout.id === activeDraft.scheduledWorkoutId
      ),
    };
  }

  const todayWorkouts = state.scheduledWorkouts
    .filter((workout) => workout.date === today)
    .sort((a, b) => {
      if (a.status === 'Started' && b.status !== 'Started') return -1;
      if (b.status === 'Started' && a.status !== 'Started') return 1;
      return a.workoutNumber - b.workoutNumber;
    });
  const unfinishedToday = todayWorkouts.find(
    (workout) => !['Completed', 'Skipped'].includes(workout.status)
  );
  if (unfinishedToday) return { kind: 'today' as const, workout: unfinishedToday };

  const completedToday = todayWorkouts.find((workout) => workout.status === 'Completed');
  if (completedToday) return { kind: 'extend' as const, workout: completedToday };

  const current = getCurrentISOWeekAndYear();
  const currentWeekIds = new Set(
    state.weeks
      .filter((week) => week.isoWeek === current.isoWeek && week.year === current.year)
      .map((week) => week.id)
  );
  const laterThisWeek = state.scheduledWorkouts
    .filter(
      (workout) =>
        currentWeekIds.has(workout.weekId) &&
        Boolean(workout.date) &&
        workout.date! > today &&
        !['Completed', 'Skipped'].includes(workout.status)
    )
    .sort((a, b) => a.date!.localeCompare(b.date!))[0];
  if (laterThisWeek) return { kind: 'move' as const, workout: laterThisWeek };

  return { kind: 'plan' as const, workout: undefined };
}

export interface ExerciseDeviationSummary {
  exerciseId: string;
  exposures: number;
  averageWorkingSets: number;
  averageExtraSets: number;
  replacementCount: number;
  skipCount: number;
  latestSummary: string;
}

export function getExerciseDeviationSummary(
  state: AppState,
  exerciseId: string,
  limit = 4
): ExerciseDeviationSummary | null {
  const entries = [...state.workoutExecutions]
    .filter((execution) =>
      execution.exerciseExecutions.some((entry) => entry.exerciseId === exerciseId)
    )
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .slice(0, limit)
    .flatMap((execution) =>
      execution.exerciseExecutions.filter((entry) => entry.exerciseId === exerciseId)
    );
  if (!entries.length) return null;
  const workingSets = entries.map(
    (entry) => entry.setExecutions.filter(isWorkingSet).length
  );
  const extraSets = entries.map(
    (entry) =>
      entry.setExecutions.filter(
        (set) => isWorkingSet(set) && (set.origin ?? 'planned') === 'added'
      ).length
  );
  const latest = entries[0].setExecutions.filter(isWorkingSet);
  const best = latest.reduce<SetExecution | null>(
    (current, set) => !current || totalLoadForSet(set) > totalLoadForSet(current) ? set : current,
    null
  );
  return {
    exerciseId,
    exposures: entries.length,
    averageWorkingSets:
      Math.round((workingSets.reduce((sum, value) => sum + value, 0) / entries.length) * 10) / 10,
    averageExtraSets:
      Math.round((extraSets.reduce((sum, value) => sum + value, 0) / entries.length) * 10) / 10,
    replacementCount: entries.filter((entry) => entry.origin === 'replacement').length,
    skipCount: entries.filter((entry) => entry.skipped).length,
    latestSummary: best
      ? `${latest.length} working sets · best ${best.reps} × ${best.weight} kg`
      : 'No completed working sets',
  };
}
