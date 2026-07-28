import {
  AppState,
  Exercise,
  ExerciseExecution,
  PlannedExercise,
  ProgressionRecommendation,
  ProgressionTarget,
  ScheduledWorkout,
  WorkoutExecution,
} from '../types';

const roundToIncrement = (value: number, increment: number) =>
  Math.round(value / increment) * increment;

function targetFromPlan(plan: PlannedExercise): ProgressionTarget {
  const first = plan.plannedSets[0];
  return {
    sets: plan.plannedSets.length,
    reps: first?.plannedReps ?? 0,
    weight: first?.plannedWeight ?? 0,
  };
}

function failedExposure(execution: ExerciseExecution, plan: PlannedExercise): boolean {
  const completed = execution.setExecutions.filter((set) => set.completed);
  return completed.length < plan.plannedSets.length ||
    completed.some((set, index) => set.reps < (plan.plannedSets[index]?.plannedReps ?? 0));
}

export function buildProgressionRecommendation(
  exercise: Exercise,
  plan: PlannedExercise,
  execution: ExerciseExecution,
  workoutExecution: WorkoutExecution,
  workout: ScheduledWorkout,
  state: AppState
): ProgressionRecommendation | null {
  const completed = execution.setExecutions.filter((set) => set.completed);
  if (!plan.plannedSets.length || !completed.length) return null;

  const current = targetFromPlan(plan);
  const increment =
    plan.weightIncrementKg ?? exercise.weightIncrementKg ??
    state.preferences.preferredWeightIncrementKg;
  const repMin = plan.repRangeMin ?? exercise.repRangeMin ?? Math.max(1, current.reps);
  const repMax = plan.repRangeMax ?? exercise.repRangeMax ?? Math.max(repMin, current.reps);
  const rirValues = completed.flatMap((set) => set.rir === undefined ? [] : [set.rir]);
  const minRir = rirValues.length ? Math.min(...rirValues) : null;
  const targetRir = plan.targetRir ?? exercise.targetRir ?? 2;
  const achieved = !failedExposure(execution, plan);
  const comfortable = minRir === null || minRir >= targetRir;
  let suggested = { ...current };
  let evidence = achieved
    ? `${completed.length}/${plan.plannedSets.length} sets completed`
    : `${completed.length}/${plan.plannedSets.length} sets completed; hold the target`;

  if (achieved && comfortable) {
    if (exercise.progressionStrategy === 'Double Progression') {
      if (completed.every((set) => set.reps >= repMax)) {
        suggested = {
          ...current,
          reps: repMin,
          weight: roundToIncrement(current.weight + increment, increment),
        };
        evidence = `Upper target of ${repMax} reps reached${minRir === null ? '' : ` at ${minRir} RIR`}; add ${increment} kg and reset to ${repMin} reps`;
      } else {
        suggested.reps = Math.min(repMax, Math.max(...completed.map((set) => set.reps)) + 1);
        evidence = `All sets completed${minRir === null ? '' : ` at ${minRir} RIR`}; add one repetition`;
      }
    } else if (exercise.progressionStrategy === 'Step Loading') {
      const required = exercise.stepLoadingExposures ?? 3;
      const successful = state.workoutExecutions
        .filter((item) => item.completedAt && item.id !== workoutExecution.id)
        .slice(-Math.max(0, required - 1))
        .filter((item) => item.exerciseExecutions.some(
          (entry) => entry.exerciseId === exercise.id && entry.setExecutions.every((set) => set.completed)
        )).length + 1;
      if (successful >= required) {
        suggested.weight = roundToIncrement(current.weight + increment, increment);
        evidence = `${required} successful exposures completed; add ${increment} kg`;
      } else {
        evidence = `Successful exposure ${successful}/${required}; repeat the current target`;
      }
    } else if (exercise.progressionStrategy === 'Wave Loading') {
      const wave = [current.reps, Math.max(1, current.reps - 1), Math.max(1, current.reps - 2)];
      const exposureCount = state.workoutExecutions.filter((item) =>
        item.exerciseExecutions.some((entry) => entry.exerciseId === exercise.id)
      ).length;
      const nextIndex = (exposureCount + 1) % wave.length;
      suggested.reps = wave[nextIndex];
      if (nextIndex === 0) suggested.weight = roundToIncrement(current.weight + increment, increment);
      evidence = nextIndex === 0
        ? `Wave completed; add ${increment} kg and restart at ${suggested.reps} reps`
        : `Advance to the next wave target of ${suggested.reps} reps`;
    } else {
      suggested.weight = roundToIncrement(current.weight + increment, increment);
      evidence = `All prescribed work completed${minRir === null ? '' : ` at ${minRir} RIR`}; add ${increment} kg`;
    }
  }

  const recentFailures = state.workoutExecutions
    .filter((item) => item.id !== workoutExecution.id)
    .filter((item) => item.exerciseExecutions.some(
      (entry) => entry.exerciseId === exercise.id
    ))
    .slice(-1)
    .filter((item) => {
      const priorWorkout = state.scheduledWorkouts.find((sw) => sw.id === item.scheduledWorkoutId);
      const priorPlan = priorWorkout?.plannedExercises.find((entry) => entry.exerciseId === exercise.id);
      const priorExecution = item.exerciseExecutions.find((entry) => entry.exerciseId === exercise.id);
      return priorPlan && priorExecution && failedExposure(priorExecution, priorPlan);
    }).length;
  if (!achieved && recentFailures >= 1) {
    const deload = exercise.deloadPercent ?? 7.5;
    suggested.weight = roundToIncrement(current.weight * (1 - deload / 100), increment);
    evidence = `Two consecutive missed targets; consider a ${deload}% deload`;
  }

  return {
    id: `rec-${workoutExecution.id}-${exercise.id}`,
    exerciseId: exercise.id,
    sourceWorkoutExecutionId: workoutExecution.id,
    sourceScheduledWorkoutId: workout.id,
    workoutTemplateId: workout.workoutTemplateId,
    strategy: exercise.progressionStrategy,
    current,
    suggested,
    evidence,
    status: 'pending',
    createdAt: workoutExecution.completedAt ?? new Date().toISOString(),
  };
}

export function createWorkoutRecommendations(
  execution: WorkoutExecution,
  state: AppState
): ProgressionRecommendation[] {
  const workout = state.scheduledWorkouts.find((item) => item.id === execution.scheduledWorkoutId);
  if (!workout) return [];
  return execution.exerciseExecutions.flatMap((entry) => {
    const plan = workout.plannedExercises.find((item) => item.id === entry.plannedExerciseId);
    const exercise = state.exercises.find((item) => item.id === entry.exerciseId);
    if (!plan || !exercise) return [];
    const recommendation = buildProgressionRecommendation(
      exercise, plan, entry, execution, workout, state
    );
    return recommendation ? [recommendation] : [];
  });
}

export function applyRecommendation(
  state: AppState,
  recommendationId: string,
  target?: ProgressionTarget
): AppState {
  const recommendation = state.progressionRecommendations.find((item) => item.id === recommendationId);
  if (!recommendation) return state;
  const next = target ?? recommendation.suggested;
  const updateExercises = <T extends { exerciseId: string; plannedSets: Array<{ setNumber: number; plannedReps: number; plannedWeight: number }> }>(
    entries: T[]
  ) => entries.map((entry) => entry.exerciseId !== recommendation.exerciseId ? entry : {
    ...entry,
    plannedSets: Array.from({ length: next.sets }, (_, index) => ({
      ...(entry.plannedSets[index] ?? entry.plannedSets.at(-1) ?? { setNumber: index + 1 }),
      setNumber: index + 1,
      plannedReps: next.reps,
      plannedWeight: next.weight,
    })),
  });
  const decidedAt = new Date().toISOString();
  return {
    ...state,
    workoutTemplates: state.workoutTemplates.map((template) =>
      template.id === recommendation.workoutTemplateId
        ? { ...template, plannedExercises: updateExercises(template.plannedExercises) }
        : template
    ),
    scheduledWorkouts: state.scheduledWorkouts.map((workout) =>
      workout.status === 'Planned' &&
      workout.workoutTemplateId === recommendation.workoutTemplateId
        ? { ...workout, plannedExercises: updateExercises(workout.plannedExercises) }
        : workout
    ),
    progressionRecommendations: state.progressionRecommendations.map((item) =>
      item.id === recommendationId
        ? {
            ...item,
            suggested: next,
            status: target ? 'modified' : 'accepted',
            decidedAt,
          }
        : item
    ),
  };
}
