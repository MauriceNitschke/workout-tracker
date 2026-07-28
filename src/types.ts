/**
 * Domain Model for Personal Training Operating System
 * Core Philosophy: Plan -> Execute -> Review -> Improve -> Repeat
 */

export type WeekStatus = 'Planning' | 'Ready' | 'In Progress' | 'Completed' | 'Locked';

export type WorkoutStatus = 'Planned' | 'Started' | 'Completed' | 'Partial' | 'Skipped' | 'Rescheduled';

export type PRMetric = 'highest_weight' | 'estimated_1rm' | 'max_reps' | 'longest_duration';

export type ProgressionStrategy = 'Linear' | 'Double Progression' | 'Wave Loading' | 'Step Loading';
export type ExerciseBlockType = 'straight' | 'superset' | 'circuit';
export type RIR = 0 | 1 | 2 | 3 | 4 | 5;
export type RecommendationStatus = 'pending' | 'accepted' | 'modified' | 'dismissed';

export type ExerciseCategory = 'Strength' | 'Bodyweight' | 'Endurance' | 'Flexibility';

export type WorkoutFeeling = 'Great' | 'Good' | 'Average' | 'Tough' | 'Exhausted';

export type RecoveryType = 'Sauna' | 'Stretching' | 'Mobility' | 'Yoga' | 'Massage' | 'Other';

export type RouteId =
  | 'today'
  | 'plan'
  | 'train'
  | 'progress'
  | 'streaks'
  | 'exercises'
  | 'recovery'
  | 'account';

export type SyncStatus =
  | 'guest'
  | 'loading'
  | 'offline'
  | 'saving'
  | 'synced'
  | 'error'
  | 'needs-initialization';

export interface CloudUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface TrainingProgram {
  id: string;
  name: string;
  description: string;
  startDate: string; // ISO string YYYY-MM-DD
  endDate: string;   // ISO string YYYY-MM-DD
  active: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  defaultNotes?: string;
  progressionStrategy: ProgressionStrategy;
  prMetric: PRMetric;
  category: ExerciseCategory;
  defaultRestSeconds?: number;
  weightIncrementKg?: number;
  repRangeMin?: number;
  repRangeMax?: number;
  targetRir?: RIR;
  stepLoadingExposures?: number;
  deloadPercent?: number;
}

export interface PlannedSet {
  setNumber: number;
  plannedReps: number;
  plannedWeight: number; // in kg or lbs
  plannedDuration?: number; // in seconds
}

export interface PlannedExercise {
  id: string;
  exerciseId: string;
  plannedSets: PlannedSet[];
  plannedNotes?: string;
  order: number;
  restSeconds?: number;
  weightIncrementKg?: number;
  repRangeMin?: number;
  repRangeMax?: number;
  targetRir?: RIR;
  blockId?: string;
  blockType?: ExerciseBlockType;
}

export interface WorkoutTemplate {
  id: string;
  name: string; // e.g. "Push", "Pull", "Legs", "Upper", "Lower"
  description: string;
  plannedExercises: Omit<PlannedExercise, 'id'>[];
}

export interface ScheduledWorkout {
  id: string;
  weekId: string;
  title: string;
  workoutTemplateId?: string;
  workoutNumber: number; // e.g., 1, 2, 3 in the week
  date?: string; // YYYY-MM-DD
  notes?: string;
  status: WorkoutStatus;
  plannedExercises: PlannedExercise[];
  sourceSchedulePatternId?: string;
  sourceScheduleEntryId?: string;
  startTime?: string;
  durationMinutes?: number;
  timeZone?: string;
}

export interface SetExecution {
  id: string;
  setNumber: number;
  reps: number;
  weight: number;
  duration?: number;
  completed: boolean;
  notes?: string;
  rir?: RIR;
}

export interface ExerciseExecution {
  id: string;
  exerciseId: string;
  plannedExerciseId: string;
  completedSets: number;
  notes?: string;
  setExecutions: SetExecution[];
}

export interface WorkoutExecution {
  id: string;
  scheduledWorkoutId: string;
  startedAt: string; // ISO datetime
  completedAt?: string; // ISO datetime
  notes?: string;
  feeling?: WorkoutFeeling;
  completionPercentage: number;
  exerciseExecutions: ExerciseExecution[];
}

export interface TrainingWeek {
  id: string;
  isoWeek: number;
  year: number;
  status: WeekStatus;
  programId: string;
  notes?: string;
  startDate: string; // Monday of that week YYYY-MM-DD
}

export interface EnduranceActivity {
  id: string;
  weekId: string;
  date: string;
  title: string; // e.g. "Zone 2 Running", "Cycling Interval"
  durationMinutes: number;
  distanceKm?: number;
  notes?: string;
}

export interface RecoveryActivity {
  id: string;
  weekId: string;
  date: string;
  title: string;
  type: RecoveryType;
  durationMinutes: number;
  notes?: string;
}

export interface ProgressiveOverloadDraft {
  exerciseId: string;
  startWeekId: string;
  baseWeight: number;
  baseReps: number;
  baseSets: number;
  increments: {
    weekOffset: number; // 0, 1, 2, 3
    isoWeek: number;
    year: number;
    plannedSets: number;
    plannedReps: number;
    plannedWeight: number;
  }[];
}

export interface WeeklySchedulePatternEntry {
  id: string;
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  workoutTemplateId: string;
  title?: string;
  order: number;
}

export interface WeeklySchedulePattern {
  id: string;
  name: string;
  programId?: string;
  entries: WeeklySchedulePatternEntry[];
}

export interface ProgressionTarget {
  sets: number;
  reps: number;
  weight: number;
}

export interface ProgressionRecommendation {
  id: string;
  exerciseId: string;
  sourceWorkoutExecutionId: string;
  sourceScheduledWorkoutId: string;
  workoutTemplateId?: string;
  strategy: ProgressionStrategy;
  current: ProgressionTarget;
  suggested: ProgressionTarget;
  evidence: string;
  status: RecommendationStatus;
  createdAt: string;
  decidedAt?: string;
}

export interface AppPreferences {
  timerSound: boolean;
  timerVibration: boolean;
  defaultRestSeconds: number;
  preferredWeightIncrementKg: number;
  muscleWeeklyTargets: Record<string, { min: number; max: number }>;
}

export interface PersonalRecord {
  exerciseId: string;
  metric: PRMetric;
  value: number; // weight or reps or seconds
  formattedValue: string;
  date: string;
  workoutTitle: string;
  estimated1RM?: number;
}

export interface AppState {
  programs: TrainingProgram[];
  activeProgramId: string;
  exercises: Exercise[];
  workoutTemplates: WorkoutTemplate[];
  weeks: TrainingWeek[];
  scheduledWorkouts: ScheduledWorkout[];
  workoutExecutions: WorkoutExecution[];
  weeklySchedulePatterns: WeeklySchedulePattern[];
  progressionRecommendations: ProgressionRecommendation[];
  preferences: AppPreferences;
  enduranceActivities: EnduranceActivity[];
  recoveryActivities: RecoveryActivity[];
  activeWorkoutId: string | null; // Currently open in workout mode
}
