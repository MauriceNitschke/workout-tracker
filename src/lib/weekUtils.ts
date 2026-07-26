import {
  AppState,
  EnduranceActivity,
  RecoveryActivity,
  ScheduledWorkout,
  TrainingWeek,
} from '../types';

export type WeekDominantColor =
  | 'green'   // Strength workouts completed as planned
  | 'yellow'  // Strength workouts planned but not fully completed
  | 'red'     // Strength workout skipped completely or 0 executed
  | 'blue'    // Endurance activity
  | 'purple'  // Recovery / Mobility activity
  | 'gray'    // No activities (Past week)
  | 'future'; // Future week

export type DayDominantColor =
  | 'green'   // Strength completed on this day
  | 'yellow'  // Strength partial/started/planned on this day
  | 'red'     // Strength skipped on this day
  | 'blue'    // Endurance activity on this day
  | 'purple'  // Recovery activity on this day
  | 'gray'    // No activity (past day)
  | 'future'; // Future day

export interface WeekDetailData {
  year: number;
  isoWeek: number;
  startDateStr: string; // YYYY-MM-DD (Monday)
  endDateStr: string;   // YYYY-MM-DD (Sunday)
  isFuture: boolean;
  isCurrentWeek: boolean;
  trainingWeek?: TrainingWeek;
  scheduledWorkouts: ScheduledWorkout[];
  enduranceActivities: EnduranceActivity[];
  recoveryActivities: RecoveryActivity[];
  dominantColor: WeekDominantColor;
  statusLabel: string;
}

export interface DayDetailData {
  dateStr: string;      // "YYYY-MM-DD"
  date: Date;
  year: number;
  monthIndex: number;   // 0 to 11
  dayOfMonth: number;   // 1 to 31
  dayOfWeek: number;    // 0 (Sun) to 6 (Sat)
  dayNameShort: string; // "Sun", "Mon", etc.
  dayNameFull: string;  // "Sunday", "Monday", etc.
  isSunday: boolean;
  isFuture: boolean;
  isToday: boolean;
  dominantColor: DayDominantColor;
  statusLabel: string;
  scheduledWorkouts: ScheduledWorkout[];
  enduranceActivities: EnduranceActivity[];
  recoveryActivities: RecoveryActivity[];
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Get exact number of days in a month (handles leap years e.g. 2024 Feb = 29 days)
 */
export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Get day detail data for a specific calendar date
 */
export function getDayDetailData(
  year: number,
  monthIndex: number, // 0..11
  dayOfMonth: number, // 1..31
  state: AppState
): DayDetailData {
  const monthNum = monthIndex + 1;
  const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;

  const dateObj = new Date(year, monthIndex, dayOfMonth);
  const dayOfWeek = dateObj.getDay(); // 0 = Sun
  const isSunday = dayOfWeek === 0;

  const currentWeekObj = state.weeks.find((w) => w.status === 'In Progress');
  const referenceToday = currentWeekObj ? '2026-07-26' : new Date().toISOString().slice(0, 10);

  const isToday = dateStr === referenceToday;
  const isFuture = dateStr > referenceToday;

  // Filter workouts for this date
  const scheduledWorkouts = state.scheduledWorkouts.filter((sw) => {
    if (sw.date === dateStr) return true;
    if (!sw.date) {
      const parentWeek = state.weeks.find((w) => w.id === sw.weekId);
      if (parentWeek && parentWeek.year === year) {
        const monday = getMondayOfISOWeek(parentWeek.isoWeek, year);
        const dayOffset = (dayOfWeek + 6) % 7;
        const workoutDate = new Date(monday);
        workoutDate.setUTCDate(monday.getUTCDate() + dayOffset);
        return formatDateISO(workoutDate) === dateStr;
      }
    }
    return false;
  });

  const enduranceActivities = state.enduranceActivities.filter(
    (ea) => ea.date === dateStr
  );

  const recoveryActivities = state.recoveryActivities.filter(
    (ra) => ra.date === dateStr
  );

  let dominantColor: DayDominantColor = 'gray';
  let statusLabel = 'Rest / No Activity';

  if (scheduledWorkouts.length > 0) {
    const hasCompleted = scheduledWorkouts.some((sw) => sw.status === 'Completed');
    const hasPartial = scheduledWorkouts.some(
      (sw) => sw.status === 'Partial' || sw.status === 'Started'
    );
    const hasSkipped = scheduledWorkouts.some((sw) => sw.status === 'Skipped');

    if (hasCompleted) {
      dominantColor = 'green';
      statusLabel = 'Strength Workout Completed';
    } else if (hasPartial) {
      dominantColor = 'yellow';
      statusLabel = 'Strength Workout Partial';
    } else if (hasSkipped) {
      dominantColor = 'red';
      statusLabel = 'Strength Workout Skipped';
    } else {
      dominantColor = 'yellow';
      statusLabel = 'Strength Workout Planned';
    }
  } else if (enduranceActivities.length > 0) {
    dominantColor = 'blue';
    statusLabel = 'Endurance Activity Logged';
  } else if (recoveryActivities.length > 0) {
    dominantColor = 'purple';
    statusLabel = 'Recovery & Mobility Logged';
  } else if (isFuture) {
    dominantColor = 'future';
    statusLabel = 'Future Day';
  } else {
    dominantColor = 'gray';
    statusLabel = 'Rest Day / No Activity';
  }

  return {
    dateStr,
    date: dateObj,
    year,
    monthIndex,
    dayOfMonth,
    dayOfWeek,
    dayNameShort: DAY_SHORT[dayOfWeek],
    dayNameFull: DAY_NAMES[dayOfWeek],
    isSunday,
    isFuture,
    isToday,
    dominantColor,
    statusLabel,
    scheduledWorkouts,
    enduranceActivities,
    recoveryActivities,
  };
}

/**
  Get Monday of ISO Week (Y, W)
 */
export function getMondayOfISOWeek(isoWeek: number, year: number): Date {
  const simple = new Date(Date.UTC(year, 0, 1 + (isoWeek - 1) * 7));
  const dow = simple.getUTCDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  } else {
    ISOweekStart.setUTCDate(simple.getUTCDate() + (8 - simple.getUTCDay()));
  }
  return ISOweekStart;
}

/**
 * Format Date to YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Get current ISO week and year based on today's date or reference date
 */
export function getCurrentISOWeekAndYear(): { isoWeek: number; year: number } {
  // Reference date matching app seed state (July 2026) or system date
  const now = new Date();
  // Standard ISO week calculation
  const target = new Date(now.valueOf());
  const dayNr = (now.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const isoWeek = 1 + Math.round((firstThursday - target.valueOf()) / 604800000);
  return { isoWeek, year: target.getFullYear() };
}

/**
 * Computes week status and activities for a specific Year & ISO Week
 */
export function getWeekDetailData(
  year: number,
  isoWeek: number,
  state: AppState
): WeekDetailData {
  // Current app week reference (or system date)
  // In seed data, current week is year 2026, week 30
  const currentWeekObj = state.weeks.find((w) => w.status === 'In Progress');
  const currentYear = currentWeekObj ? currentWeekObj.year : 2026;
  const currentISO = currentWeekObj ? currentWeekObj.isoWeek : 30;

  const isCurrentWeek = year === currentYear && isoWeek === currentISO;
  const isFuture =
    year > currentYear || (year === currentYear && isoWeek > currentISO);

  const monday = getMondayOfISOWeek(isoWeek, year);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const startDateStr = formatDateISO(monday);
  const endDateStr = formatDateISO(sunday);

  // Find TrainingWeek from state
  const trainingWeek = state.weeks.find(
    (w) => w.year === year && w.isoWeek === isoWeek
  );

  // Scheduled workouts matching weekId or date range
  let scheduledWorkouts: ScheduledWorkout[] = [];
  if (trainingWeek) {
    scheduledWorkouts = state.scheduledWorkouts.filter(
      (sw) => sw.weekId === trainingWeek.id
    );
  } else {
    // Check by workout dates
    scheduledWorkouts = state.scheduledWorkouts.filter((sw) => {
      if (!sw.date) return false;
      return sw.date >= startDateStr && sw.date <= endDateStr;
    });
  }

  // Endurance activities
  let enduranceActivities: EnduranceActivity[] = [];
  if (trainingWeek) {
    enduranceActivities = state.enduranceActivities.filter(
      (ea) => ea.weekId === trainingWeek.id
    );
  } else {
    enduranceActivities = state.enduranceActivities.filter(
      (ea) => ea.date >= startDateStr && ea.date <= endDateStr
    );
  }

  // Recovery activities
  let recoveryActivities: RecoveryActivity[] = [];
  if (trainingWeek) {
    recoveryActivities = state.recoveryActivities.filter(
      (ra) => ra.weekId === trainingWeek.id
    );
  } else {
    recoveryActivities = state.recoveryActivities.filter(
      (ra) => ra.date >= startDateStr && ra.date <= endDateStr
    );
  }

  // Determine dominant color priority
  // Priority: 1. Strength, 2. Endurance, 3. Recovery, 4. No activities, 5. Future
  let dominantColor: WeekDominantColor = 'gray';
  let statusLabel = 'No Activities';

  if (isFuture && scheduledWorkouts.length === 0 && enduranceActivities.length === 0 && recoveryActivities.length === 0) {
    dominantColor = 'future';
    statusLabel = 'Future Week';
  } else if (scheduledWorkouts.length > 0) {
    const completedCount = scheduledWorkouts.filter(
      (sw) => sw.status === 'Completed'
    ).length;
    const skippedCount = scheduledWorkouts.filter(
      (sw) => sw.status === 'Skipped'
    ).length;
    const partialCount = scheduledWorkouts.filter(
      (sw) => sw.status === 'Partial'
    ).length;
    const startedCount = scheduledWorkouts.filter(
      (sw) => sw.status === 'Started'
    ).length;

    if (completedCount === scheduledWorkouts.length && completedCount > 0) {
      dominantColor = 'green';
      statusLabel = 'Strength Completed as Planned';
    } else if (completedCount > 0 || partialCount > 0 || startedCount > 0) {
      dominantColor = 'yellow';
      statusLabel = 'Strength Partially Completed';
    } else if (skippedCount === scheduledWorkouts.length || (scheduledWorkouts.length > 0 && completedCount === 0)) {
      dominantColor = 'red';
      statusLabel = 'Strength Skipped / Unexecuted';
    } else {
      dominantColor = 'yellow';
      statusLabel = 'Strength Planned';
    }
  } else if (enduranceActivities.length > 0) {
    dominantColor = 'blue';
    statusLabel = 'Endurance Session Logged';
  } else if (recoveryActivities.length > 0) {
    dominantColor = 'purple';
    statusLabel = 'Recovery & Mobility Logged';
  } else if (isFuture) {
    dominantColor = 'future';
    statusLabel = 'Future Week';
  } else {
    dominantColor = 'gray';
    statusLabel = 'No Activities';
  }

  return {
    year,
    isoWeek,
    startDateStr,
    endDateStr,
    isFuture,
    isCurrentWeek,
    trainingWeek,
    scheduledWorkouts,
    enduranceActivities,
    recoveryActivities,
    dominantColor,
    statusLabel,
  };
}

/**
 * Calculate header metrics for Life in Weeks
 */
export function calculateLifeInWeeksStats(state: AppState) {
  const currentWeekObj = state.weeks.find((w) => w.status === 'In Progress');
  const currentYear = currentWeekObj ? currentWeekObj.year : 2026;
  const currentISO = currentWeekObj ? currentWeekObj.isoWeek : 30;

  let totalPlannedStrength = 0;
  let totalCompletedStrength = 0;
  let completedWeeksThisYearCount = 0;
  let totalEnduranceSessions = state.enduranceActivities.length;
  let totalRecoverySessions = state.recoveryActivities.length;

  // Track weeks in current year that have at least 1 completed workout or activity
  const weeksWithActivityThisYear = new Set<number>();

  // Evaluate all past & current weeks up to currentISO in currentYear
  for (let w = 1; w <= currentISO; w++) {
    const detail = getWeekDetailData(currentYear, w, state);
    if (detail.dominantColor === 'green' || detail.dominantColor === 'yellow' || detail.dominantColor === 'blue' || detail.dominantColor === 'purple') {
      weeksWithActivityThisYear.add(w);
    }
  }
  completedWeeksThisYearCount = weeksWithActivityThisYear.size;

  // Total completed strength workouts
  totalCompletedStrength = state.scheduledWorkouts.filter(
    (sw) => sw.status === 'Completed'
  ).length;

  totalPlannedStrength = state.scheduledWorkouts.filter((sw) => {
    const parentWeek = state.weeks.find((w) => w.id === sw.weekId);
    if (!parentWeek) return true;
    return (
      parentWeek.year < currentYear ||
      (parentWeek.year === currentYear && parentWeek.isoWeek <= currentISO)
    );
  }).length;

  const completionRate =
    totalPlannedStrength > 0
      ? Math.round((totalCompletedStrength / totalPlannedStrength) * 100)
      : 100;

  // Calculate current streak (consecutive past weeks with completed activity ending at currentISO)
  let streak = 0;
  let checkWeek = currentISO;
  let checkYear = currentYear;

  while (true) {
    const detail = getWeekDetailData(checkYear, checkWeek, state);
    const hasActivity =
      detail.dominantColor === 'green' ||
      detail.dominantColor === 'yellow' ||
      detail.dominantColor === 'blue' ||
      detail.dominantColor === 'purple';

    if (hasActivity) {
      streak++;
      checkWeek--;
      if (checkWeek < 1) {
        checkWeek = 52;
        checkYear--;
      }
    } else {
      break;
    }

    if (streak > 200) break; // safety guard
  }

  return {
    completionRate,
    streak,
    completedWeeksThisYear: completedWeeksThisYearCount,
    strengthSessions: totalCompletedStrength,
    enduranceSessions: totalEnduranceSessions,
    recoverySessions: totalRecoverySessions,
  };
}
