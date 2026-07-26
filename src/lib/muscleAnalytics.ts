import { AppState, ScheduledWorkout, WorkoutExecution } from '../types';

export interface MuscleVolumeWeekData {
  weekId: string;
  isoWeek: number;
  year: number;
  plannedSets: number;
  completedSets: number;
  completionPct: number;
}

export interface MuscleVolumeSummary {
  muscleGroup: string;
  currentWeekSets: number;
  currentWeekPlanned: number;
  completionPct: number;
  previousWeekSets: number;
  last4WeeksAvg: number;
  monthlySets: number; // Volume in current calendar month
  weeklyHistory: MuscleVolumeWeekData[]; // Sorted by week
}


export interface MuscleHeatmapRow {
  muscleGroup: string;
  weeks: {
    weekLabel: string;
    isoWeek: number;
    year: number;
    completedSets: number;
    plannedSets: number;
  }[];
}

// Major standardized muscle categories for crisp reporting
export const STANDARD_MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Quadriceps',
  'Hamstrings',
  'Glutes',
  'Biceps',
  'Triceps',
  'Abs / Core',
  'Calves',
];

/**
  Normalizes specific exercise muscle names (e.g. "Upper Chest", "Front Shoulders", "Lats")
  into standard reporting muscle groups.
 */
export function normalizeMuscleGroup(rawName: string): string {
  const lower = rawName.toLowerCase();
  if (lower.includes('chest')) return 'Chest';
  if (lower.includes('lat') || lower.includes('back')) return 'Back';
  if (lower.includes('shoulder') || lower.includes('deltoid')) return 'Shoulders';
  if (lower.includes('quad')) return 'Quadriceps';
  if (lower.includes('hamstring')) return 'Hamstrings';
  if (lower.includes('glute')) return 'Glutes';
  if (lower.includes('bicep')) return 'Biceps';
  if (lower.includes('tricep')) return 'Triceps';
  if (lower.includes('core') || lower.includes('abs') || lower.includes('abdominal')) return 'Abs / Core';
  if (lower.includes('calf') || lower.includes('calves')) return 'Calves';
  return rawName;
}

/**
 * Calculates volume analytics per muscle group across training weeks
 */
export function calculateMuscleVolumeAnalytics(state: AppState): {
  summaries: MuscleVolumeSummary[];
  heatmapRows: MuscleHeatmapRow[];
  allWeeks: { weekId: string; isoWeek: number; year: number; label: string }[];
} {
  // 1. Gather all weeks (excluding future planning weeks without workouts if needed)
  const sortedWeeks = [...state.weeks].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.isoWeek - b.isoWeek;
  });

  const weekLookup = new Map<string, { weekId: string; isoWeek: number; year: number; label: string }>();
  sortedWeeks.forEach((w) => {
    weekLookup.set(w.id, {
      weekId: w.id,
      isoWeek: w.isoWeek,
      year: w.year,
      label: `W${w.isoWeek}`,
    });
  });

  // Collect all unique muscle groups from exercise library + standard groups
  const muscleGroupsSet = new Set<string>(STANDARD_MUSCLE_GROUPS);
  state.exercises.forEach((ex) => {
    ex.primaryMuscles.forEach((m) => muscleGroupsSet.add(normalizeMuscleGroup(m)));
  });
  const muscleGroups = Array.from(muscleGroupsSet);

  // Pre-index workouts by week
  const workoutsByWeek = new Map<string, ScheduledWorkout[]>();
  state.scheduledWorkouts.forEach((sw) => {
    const list = workoutsByWeek.get(sw.weekId) || [];
    list.push(sw);
    workoutsByWeek.set(sw.weekId, list);
  });

  // Pre-index executions by scheduled workout ID
  const executionByWorkoutId = new Map<string, WorkoutExecution>();
  state.workoutExecutions.forEach((exec) => {
    executionByWorkoutId.set(exec.scheduledWorkoutId, exec);
  });

  // Exercise map
  const exerciseMap = new Map<string, (typeof state.exercises)[0]>();
  state.exercises.forEach((ex) => exerciseMap.set(ex.id, ex));

  // Determine current week vs previous week
  const currentWeek = state.weeks.find((w) => w.status === 'In Progress') || sortedWeeks[sortedWeeks.length - 1];
  const currentWeekIndex = sortedWeeks.findIndex((w) => w.id === currentWeek?.id);
  const previousWeek = currentWeekIndex > 0 ? sortedWeeks[currentWeekIndex - 1] : null;

  // Last 4 weeks for average calculation
  const last4Weeks = sortedWeeks.slice(Math.max(0, currentWeekIndex - 3), currentWeekIndex + 1);

  // Calculate per muscle group
  const summaries: MuscleVolumeSummary[] = [];
  const heatmapRows: MuscleHeatmapRow[] = [];

  muscleGroups.forEach((muscle) => {
    const weeklyHistory: MuscleVolumeWeekData[] = [];
    const heatmapWeeks: MuscleHeatmapRow['weeks'] = [];

    sortedWeeks.forEach((week) => {
      let plannedSets = 0;
      let completedSets = 0;

      const sws = workoutsByWeek.get(week.id) || [];
      sws.forEach((sw) => {
        // Planned sets for this muscle
        sw.plannedExercises.forEach((pe) => {
          const ex = exerciseMap.get(pe.exerciseId);
          if (!ex) return;
          const matches =
            ex.primaryMuscles.some((m) => normalizeMuscleGroup(m) === muscle) ||
            ex.secondaryMuscles.some((m) => normalizeMuscleGroup(m) === muscle);
          if (matches) {
            plannedSets += pe.plannedSets.length;
          }
        });

        // Completed sets for this muscle
        const exec = executionByWorkoutId.get(sw.id);
        if (exec) {
          exec.exerciseExecutions.forEach((ee) => {
            const ex = exerciseMap.get(ee.exerciseId);
            if (!ex) return;
            const matches =
              ex.primaryMuscles.some((m) => normalizeMuscleGroup(m) === muscle) ||
              ex.secondaryMuscles.some((m) => normalizeMuscleGroup(m) === muscle);
            if (matches) {
              const completedInEx = ee.setExecutions.filter((se) => se.completed).length;
              completedSets += completedInEx;
            }
          });
        }
      });

      const pct = plannedSets > 0 ? Math.round((completedSets / plannedSets) * 100) : 100;

      weeklyHistory.push({
        weekId: week.id,
        isoWeek: week.isoWeek,
        year: week.year,
        plannedSets,
        completedSets,
        completionPct: pct,
      });

      heatmapWeeks.push({
        weekLabel: `W${week.isoWeek}`,
        isoWeek: week.isoWeek,
        year: week.year,
        completedSets,
        plannedSets,
      });
    });

    // Current week data
    const curWeekData = weeklyHistory.find((w) => w.weekId === currentWeek?.id);
    const prevWeekData = previousWeek ? weeklyHistory.find((w) => w.weekId === previousWeek.id) : null;

    // 4 week average
    const last4Data = weeklyHistory.filter((w) => last4Weeks.some((lw) => lw.id === w.weekId));
    const avg4Sets =
      last4Data.length > 0
        ? Math.round((last4Data.reduce((acc, curr) => acc + curr.completedSets, 0) / last4Data.length) * 10) / 10
        : 0;

    // Monthly sets (sum of completed sets in last 4 weeks)
    const monthlySets = last4Data.reduce((acc, curr) => acc + curr.completedSets, 0);

    const curPlanned = curWeekData ? curWeekData.plannedSets : 0;
    const curCompleted = curWeekData ? curWeekData.completedSets : 0;
    const completionPct = curPlanned > 0 ? Math.round((curCompleted / curPlanned) * 100) : (curCompleted > 0 ? 100 : 0);

    summaries.push({
      muscleGroup: muscle,
      currentWeekSets: curCompleted,
      currentWeekPlanned: curPlanned,
      completionPct,
      previousWeekSets: prevWeekData ? prevWeekData.completedSets : 0,
      last4WeeksAvg: avg4Sets,
      monthlySets,
      weeklyHistory,
    });


    heatmapRows.push({
      muscleGroup: muscle,
      weeks: heatmapWeeks,
    });
  });

  return {
    summaries,
    heatmapRows,
    allWeeks: sortedWeeks.map((w) => ({
      weekId: w.id,
      isoWeek: w.isoWeek,
      year: w.year,
      label: `W${w.isoWeek}`,
    })),
  };
}
