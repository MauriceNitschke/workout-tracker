import {
  AppState,
  Exercise,
  PersonalRecord,
  PRMetric,
  ProgressiveOverloadDraft,
  ScheduledWorkout,
  TrainingWeek,
  WorkoutExecution,
} from '../types';

/**
 * Calculates Estimated 1RM using Epley formula
 */
export function calculateE1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round((weight * (1 + reps / 30)) * 10) / 10;
}

/**
 * Computes Personal Records (PRs) for all exercises based on execution logs
 */
export function calculatePersonalRecords(state: AppState): Record<string, PersonalRecord> {
  const prs: Record<string, PersonalRecord> = {};

  // Build workout lookup
  const workoutMap = new Map<string, ScheduledWorkout>();
  state.scheduledWorkouts.forEach((sw) => workoutMap.set(sw.id, sw));
  const exerciseMap = new Map(state.exercises.map((exercise) => [exercise.id, exercise]));

  state.workoutExecutions.forEach((exec) => {
    const sw = workoutMap.get(exec.scheduledWorkoutId);
    const workoutTitle = sw ? sw.title : 'Workout';
    const date = exec.completedAt ? exec.completedAt.slice(0, 10) : 'Recorded';

    exec.exerciseExecutions.forEach((ee) => {
      const exercise = exerciseMap.get(ee.exerciseId);
      if (!exercise) return;

      const metric = exercise.prMetric || 'highest_weight';
      let currentBest = prs[exercise.id];

      ee.setExecutions.forEach((se) => {
        if (!se.completed) return;

        let val = 0;
        let formatted = '';
        let e1rm = 0;

        if (metric === 'highest_weight') {
          val = se.weight;
          formatted = `${se.weight} kg (${se.reps} reps)`;
          e1rm = calculateE1RM(se.weight, se.reps);
        } else if (metric === 'estimated_1rm') {
          e1rm = calculateE1RM(se.weight, se.reps);
          val = e1rm;
          formatted = `~${e1rm} kg (E1RM: ${se.weight}kg x ${se.reps})`;
        } else if (metric === 'max_reps') {
          val = se.reps;
          formatted = `${se.reps} reps @ ${se.weight} kg`;
          e1rm = calculateE1RM(se.weight, se.reps);
        } else if (metric === 'longest_duration') {
          val = se.duration || 0;
          formatted = `${val}s @ ${se.weight} kg`;
          e1rm = 0;
        }

        if (val > 0 && (!currentBest || val > currentBest.value)) {
          prs[exercise.id] = {
            exerciseId: exercise.id,
            metric,
            value: val,
            formattedValue: formatted,
            date,
            workoutTitle,
            estimated1RM: e1rm > 0 ? e1rm : undefined,
          };
          currentBest = prs[exercise.id];
        }
      });
    });
  });

  return prs;
}

/**
 * Computes consistency stats: Completed Planned Workouts / Total Planned Workouts
 */
export function calculateConsistencyStats(state: AppState) {
  // We only count weeks that are past or in progress (not Future Planning)
  const relevantWeeks = state.weeks.filter((w) => w.status !== 'Planning');
  const weekIds = new Set(relevantWeeks.map((w) => w.id));

  const relevantWorkouts = state.scheduledWorkouts.filter((sw) => weekIds.has(sw.weekId));
  const totalPlanned = relevantWorkouts.length;
  const totalCompleted = relevantWorkouts.filter((sw) => sw.status === 'Completed').length;
  const totalSkipped = relevantWorkouts.filter((sw) => sw.status === 'Skipped').length;
  const totalPartial = relevantWorkouts.filter((sw) => sw.status === 'Partial').length;

  const percentage = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 100;

  return {
    totalPlanned,
    totalCompleted,
    totalSkipped,
    totalPartial,
    percentage,
  };
}

/**
 * Calculates volume (kg * reps) for a workout execution
 */
export function calculateExecutionVolume(execution: WorkoutExecution): number {
  let volume = 0;
  execution.exerciseExecutions.forEach((ee) => {
    ee.setExecutions.forEach((se) => {
      if (se.completed) {
        volume += se.weight * se.reps;
      }
    });
  });
  return volume;
}

/**
 * Calculates planned total volume (kg * reps) for a scheduled workout
 */
export function calculatePlannedVolume(workout: ScheduledWorkout): number {
  let volume = 0;
  workout.plannedExercises.forEach((pe) => {
    pe.plannedSets.forEach((ps) => {
      volume += ps.plannedWeight * ps.plannedReps;
    });
  });
  return volume;
}

/**
 * Generates a 4-week Progressive Overload Draft
 * User can adjust values manually before applying.
 * Example pattern:
 * Week 0: 3x8 @ 70kg
 * Week 1: 3x9 @ 70kg
 * Week 2: 3x10 @ 70kg
 * Week 3: 3x8 @ 72.5kg
 */
export function generateProgressiveOverloadDraft(
  exerciseId: string,
  startWeek: TrainingWeek,
  allWeeks: TrainingWeek[],
  baseWeight: number,
  baseReps: number,
  baseSets: number,
  mode: 'Double Progression' | 'Linear Weight' | 'Rep Inflation' = 'Double Progression'
): ProgressiveOverloadDraft {
  // Sort weeks chronologically
  const sortedWeeks = [...allWeeks].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.isoWeek - b.isoWeek;
  });

  const startIndex = sortedWeeks.findIndex((w) => w.id === startWeek.id);
  const selectedFourWeeks = sortedWeeks.slice(startIndex >= 0 ? startIndex : 0, (startIndex >= 0 ? startIndex : 0) + 4);

  const increments = selectedFourWeeks.map((w, idx) => {
    let pSets = baseSets;
    let pReps = baseReps;
    let pWeight = baseWeight;

    if (mode === 'Double Progression') {
      // Step reps up by 1 each week, then drop reps and bump weight on week 3
      if (idx === 0) {
        // Base week
      } else if (idx === 1) {
        pReps = baseReps + 1;
      } else if (idx === 2) {
        pReps = baseReps + 2;
      } else if (idx === 3) {
        pReps = baseReps;
        pWeight = baseWeight + 2.5;
      }
    } else if (mode === 'Linear Weight') {
      // Add +2.5kg every week
      pWeight = baseWeight + idx * 2.5;
    } else if (mode === 'Rep Inflation') {
      // Add +1 rep every week
      pReps = baseReps + idx;
    }

    return {
      weekOffset: idx,
      isoWeek: w.isoWeek,
      year: w.year,
      plannedSets: pSets,
      plannedReps: pReps,
      plannedWeight: Math.round(pWeight * 10) / 10,
    };
  });

  return {
    exerciseId,
    startWeekId: startWeek.id,
    baseWeight,
    baseReps,
    baseSets,
    increments,
  };
}
