import {
  AppState,
  ScheduledWorkout,
  TrainingWeek,
  WeeklySchedulePattern,
  WorkoutTemplate,
} from '../types';
import { formatDateISO, getMondayOfISOWeek } from './weekUtils';

export interface SchedulePreviewItem {
  id: string;
  week: TrainingWeek;
  date: string;
  patternEntryId: string;
  template: WorkoutTemplate;
  title: string;
  status: 'create' | 'duplicate' | 'locked' | 'conflict';
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function nextISOWeek(week: TrainingWeek): TrainingWeek {
  const monday = addDays(getMondayOfISOWeek(week.isoWeek, week.year), 7);
  const thursday = addDays(monday, 3);
  const year = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstMonday = addDays(firstThursday, -((firstThursday.getUTCDay() + 6) % 7));
  const isoWeek = Math.floor((monday.getTime() - firstMonday.getTime()) / 604800000) + 1;
  return {
    id: `week-${year}-${isoWeek}`,
    isoWeek,
    year,
    status: 'Planning',
    programId: week.programId,
    startDate: formatDateISO(monday),
    notes: `Week ${isoWeek} plan.`,
  };
}

export function buildSchedulePreview(
  state: AppState,
  pattern: WeeklySchedulePattern,
  startWeek: TrainingWeek,
  weekCount: number
): { weeks: TrainingWeek[]; items: SchedulePreviewItem[] } {
  const weeks: TrainingWeek[] = [];
  let cursor = startWeek;
  for (let index = 0; index < weekCount; index += 1) {
    const existing = state.weeks.find((week) =>
      week.isoWeek === cursor.isoWeek && week.year === cursor.year
    );
    weeks.push(existing ?? cursor);
    cursor = nextISOWeek(cursor);
  }
  const items = weeks.flatMap((week) =>
    pattern.entries.flatMap((entry) => {
      const template = state.workoutTemplates.find((item) => item.id === entry.workoutTemplateId);
      if (!template) return [];
      const date = formatDateISO(addDays(getMondayOfISOWeek(week.isoWeek, week.year), entry.weekday - 1));
      const duplicate = state.scheduledWorkouts.some((workout) =>
        workout.weekId === week.id &&
        workout.sourceSchedulePatternId === pattern.id &&
        workout.sourceScheduleEntryId === entry.id
      );
      const conflict = state.scheduledWorkouts.some((workout) => workout.date === date);
      return [{
        id: `${week.id}-${entry.id}`,
        week,
        date,
        patternEntryId: entry.id,
        template,
        title: entry.title?.trim() || template.name,
        status: week.status === 'Locked'
          ? 'locked' as const
          : duplicate
            ? 'duplicate' as const
            : conflict
              ? 'conflict' as const
              : 'create' as const,
      }];
    })
  );
  return { weeks, items };
}

export function applySchedulePreview(
  state: AppState,
  pattern: WeeklySchedulePattern,
  preview: ReturnType<typeof buildSchedulePreview>
): AppState {
  const missingWeeks = preview.weeks.filter((week) =>
    !state.weeks.some((existing) => existing.id === week.id)
  );
  const generatedPerWeek = new Map<string, number>();
  const scheduledWorkouts: ScheduledWorkout[] = preview.items
    .filter((item) => item.status === 'create' || item.status === 'conflict')
    .map((item, index) => {
      const generatedCount = generatedPerWeek.get(item.week.id) ?? 0;
      generatedPerWeek.set(item.week.id, generatedCount + 1);
      return {
        id: `sw-${Date.now()}-${index}-${item.patternEntryId}`,
        weekId: item.week.id,
        title: item.title,
        workoutTemplateId: item.template.id,
        workoutNumber:
          state.scheduledWorkouts.filter((workout) => workout.weekId === item.week.id).length +
          generatedCount + 1,
        date: item.date,
        status: 'Planned',
        sourceSchedulePatternId: pattern.id,
        sourceScheduleEntryId: item.patternEntryId,
        plannedExercises: item.template.plannedExercises.map((entry, entryIndex) => ({
          ...entry,
          id: `pe-${Date.now()}-${index}-${entryIndex}`,
          plannedSets: entry.plannedSets.map((set) => ({ ...set })),
        })),
      } satisfies ScheduledWorkout;
    });
  return {
    ...state,
    weeks: [...state.weeks, ...missingWeeks],
    scheduledWorkouts: [...state.scheduledWorkouts, ...scheduledWorkouts],
  };
}
