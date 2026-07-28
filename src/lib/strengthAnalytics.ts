import { AppState, Exercise, ScheduledWorkout } from '../types';
import { calculateE1RM } from './prCalculator';

export type TimeFilter = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface ExerciseDataPoint {
  date: string;
  isoWeek: number;
  year: number;
  workoutTitle: string;
  maxWeight: number;
  estimated1RM: number;
  totalVolume: number;
  totalReps: number;
  completedSetsCount: number;
  averageRir?: number;
  bestSet: {
    weight: number;
    reps: number;
    e1rm: number;
  };
  notes?: string;
}

export interface ExpandedPRs {
  highestWeight?: { value: number; reps: number; date: string; workoutTitle: string };
  estimated1RM?: { value: number; weight: number; reps: number; date: string; workoutTitle: string };
  highestSetVolume?: { value: number; weight: number; reps: number; date: string; workoutTitle: string };
  maxReps?: { value: number; weight: number; date: string; workoutTitle: string };
  longestHold?: { value: number; weight: number; date: string; workoutTitle: string };
}

export interface ExerciseAnalyticsReport {
  exercise: Exercise;
  dataPoints: ExerciseDataPoint[];
  prs: ExpandedPRs;
  stats: {
    highestRecordedWeight: number;
    highestEstimated1RM: number;
    bestWorkingWeight: number; // Highest weight with >= 3 reps
    bestSetFormatted: string;
    totalVolumeAllTime: number;
    totalRepsAllTime: number;
    totalSetsAllTime: number;
    weeklyFrequencyAvg: number; // Avg times per active week
    averageRir?: number;
  };
  plannedVsActualHistory: {
    date: string;
    workoutTitle: string;
    plannedSetsCount: number;
    plannedTarget: string;
    actualCompletedSetsCount: number;
    actualLoggedSummary: string;
    notes?: string;
  }[];
}

/**
 * Filter cutoff date string generator
 */
function getCutoffDateStr(filter: TimeFilter, referenceDateStr: string = new Date().toISOString().slice(0, 10)): string {
  if (filter === 'ALL') return '1900-01-01';
  const ref = new Date(referenceDateStr);
  const cutoff = new Date(ref);

  switch (filter) {
    case '1M':
      cutoff.setMonth(cutoff.getMonth() - 1);
      break;
    case '3M':
      cutoff.setMonth(cutoff.getMonth() - 3);
      break;
    case '6M':
      cutoff.setMonth(cutoff.getMonth() - 6);
      break;
    case '1Y':
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      break;
  }

  return cutoff.toISOString().slice(0, 10);
}

/**
 * Computes deep strength progress analytics for a single exercise
 */
export function getExerciseAnalyticsReport(
  exerciseId: string,
  state: AppState,
  timeFilter: TimeFilter = 'ALL'
): ExerciseAnalyticsReport | null {
  const exercise = state.exercises.find((e) => e.id === exerciseId);
  if (!exercise) return null;

  const cutoffDateStr = getCutoffDateStr(timeFilter);

  // Index scheduled workouts
  const workoutMap = new Map<string, ScheduledWorkout>();
  state.scheduledWorkouts.forEach((sw) => workoutMap.set(sw.id, sw));

  // Index weeks
  const weekMap = new Map<string, (typeof state.weeks)[0]>();
  state.weeks.forEach((w) => weekMap.set(w.id, w));

  const dataPointsMap = new Map<string, ExerciseDataPoint>();
  const prs: ExpandedPRs = {};

  let totalVolumeAllTime = 0;
  let totalRepsAllTime = 0;
  let totalSetsAllTime = 0;
  let highestRecordedWeight = 0;
  let highestEstimated1RM = 0;
  let bestWorkingWeight = 0;
  let bestSetObj = { weight: 0, reps: 0, e1rm: 0 };
  let totalRir = 0;
  let rirCount = 0;

  const plannedVsActualHistory: ExerciseAnalyticsReport['plannedVsActualHistory'] = [];

  // Sort executions by timestamp / week
  const sortedExecutions = [...state.workoutExecutions].sort((a, b) => {
    return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
  });

  // Track active weeks where this exercise was performed
  const activeWeeksSet = new Set<string>();

  sortedExecutions.forEach((exec) => {
    const sw = workoutMap.get(exec.scheduledWorkoutId);
    if (!sw) return;

    const parentWeek = weekMap.get(sw.weekId);
    const dateStr = sw.date || (exec.startedAt ? exec.startedAt.slice(0, 10) : '2026-06-01');

    if (dateStr < cutoffDateStr) return; // Time filter

    const workoutTitle = sw.title;

    exec.exerciseExecutions.forEach((ee) => {
      if (ee.exerciseId !== exerciseId) return;

      if (parentWeek) activeWeeksSet.add(parentWeek.id);

      let dayMaxWeight = 0;
      let dayMaxE1RM = 0;
      let dayTotalVolume = 0;
      let dayTotalReps = 0;
      let dayCompletedSets = 0;
      let dayRir = 0;
      let dayRirCount = 0;
      let dayBestSet = { weight: 0, reps: 0, e1rm: 0 };

      ee.setExecutions.forEach((se) => {
        if (!se.completed) return;

        dayCompletedSets++;
        totalSetsAllTime++;
        dayTotalReps += se.reps;
        totalRepsAllTime += se.reps;
        if (se.rir !== undefined) {
          totalRir += se.rir;
          rirCount += 1;
          dayRir += se.rir;
          dayRirCount += 1;
        }

        const setVolume = se.weight * se.reps;
        dayTotalVolume += setVolume;
        totalVolumeAllTime += setVolume;

        const e1rm = calculateE1RM(se.weight, se.reps);

        if (se.weight > dayMaxWeight) dayMaxWeight = se.weight;
        if (e1rm > dayMaxE1RM) dayMaxE1RM = e1rm;

        if (e1rm > dayBestSet.e1rm) {
          dayBestSet = { weight: se.weight, reps: se.reps, e1rm };
        }

        // Global PR tracking
        if (se.weight > highestRecordedWeight) {
          highestRecordedWeight = se.weight;
        }
        if (e1rm > highestEstimated1RM) {
          highestEstimated1RM = e1rm;
        }
        if (se.reps >= 3 && se.weight > bestWorkingWeight) {
          bestWorkingWeight = se.weight;
        }
        if (e1rm > bestSetObj.e1rm) {
          bestSetObj = { weight: se.weight, reps: se.reps, e1rm };
        }

        // Expanded PR definitions
        // 1. Highest Weight
        if (!prs.highestWeight || se.weight > prs.highestWeight.value) {
          prs.highestWeight = {
            value: se.weight,
            reps: se.reps,
            date: dateStr,
            workoutTitle,
          };
        }

        // 2. Estimated 1RM
        if (!prs.estimated1RM || e1rm > prs.estimated1RM.value) {
          prs.estimated1RM = {
            value: e1rm,
            weight: se.weight,
            reps: se.reps,
            date: dateStr,
            workoutTitle,
          };
        }

        // 3. Highest Single Set Volume
        if (!prs.highestSetVolume || setVolume > prs.highestSetVolume.value) {
          prs.highestSetVolume = {
            value: setVolume,
            weight: se.weight,
            reps: se.reps,
            date: dateStr,
            workoutTitle,
          };
        }

        // 4. Max Reps
        if (!prs.maxReps || se.reps > prs.maxReps.value) {
          prs.maxReps = {
            value: se.reps,
            weight: se.weight,
            date: dateStr,
            workoutTitle,
          };
        }

        // 5. Longest Hold Duration
        if (se.duration && (!prs.longestHold || se.duration > prs.longestHold.value)) {
          prs.longestHold = {
            value: se.duration,
            weight: se.weight,
            date: dateStr,
            workoutTitle,
          };
        }
      });

      if (dayCompletedSets > 0) {
        dataPointsMap.set(dateStr + '-' + exec.id, {
          date: dateStr,
          isoWeek: parentWeek ? parentWeek.isoWeek : 0,
          year: parentWeek ? parentWeek.year : 2026,
          workoutTitle,
          maxWeight: dayMaxWeight,
          estimated1RM: dayMaxE1RM,
          totalVolume: dayTotalVolume,
          totalReps: dayTotalReps,
          completedSetsCount: dayCompletedSets,
          averageRir: dayRirCount ? Math.round(dayRir / dayRirCount * 10) / 10 : undefined,
          bestSet: dayBestSet,
          notes: ee.notes || exec.notes,
        });
      }

      // Planned vs Actual History item
      const pe = sw.plannedExercises.find((p) => p.id === ee.plannedExerciseId);
      const plannedSetsCount = pe ? pe.plannedSets.length : 0;
      const plannedTarget = pe && pe.plannedSets.length > 0
        ? `${pe.plannedSets.length} sets × ${pe.plannedSets[0].plannedReps} reps @ ${pe.plannedSets[0].plannedWeight}kg`
        : 'N/A';

      const actualSummary = `${dayCompletedSets} sets completed (${dayBestSet.weight}kg × ${dayBestSet.reps})`;

      plannedVsActualHistory.push({
        date: dateStr,
        workoutTitle,
        plannedSetsCount,
        plannedTarget,
        actualCompletedSetsCount: dayCompletedSets,
        actualLoggedSummary: actualSummary,
        notes: ee.notes,
      });
    });
  });

  const dataPoints = Array.from(dataPointsMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const activeWeeksCount = activeWeeksSet.size || 1;
  const weeklyFrequencyAvg = Math.round((dataPoints.length / activeWeeksCount) * 10) / 10;

  const bestSetFormatted =
    bestSetObj.e1rm > 0
      ? `${bestSetObj.weight} kg × ${bestSetObj.reps} reps (~${bestSetObj.e1rm}kg E1RM)`
      : 'None recorded';

  return {
    exercise,
    dataPoints,
    prs,
    stats: {
      highestRecordedWeight,
      highestEstimated1RM,
      bestWorkingWeight,
      bestSetFormatted,
      totalVolumeAllTime,
      totalRepsAllTime,
      totalSetsAllTime,
      weeklyFrequencyAvg,
      averageRir: rirCount ? Math.round(totalRir / rirCount * 10) / 10 : undefined,
    },
    plannedVsActualHistory: plannedVsActualHistory.reverse(), // most recent first
  };
}
