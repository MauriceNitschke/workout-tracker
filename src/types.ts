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
export type SetType = 'working' | 'warmup' | 'backoff' | 'drop' | 'failure';
export type SetOrigin = 'planned' | 'added';
export type ExerciseExecutionOrigin = 'planned' | 'added' | 'replacement';
export type SetMeasureMode =
  | 'weight_reps'
  | 'reps'
  | 'duration'
  | 'distance'
  | 'distance_duration';
export type BodyweightMode = 'none' | 'bodyweight';
export type SkipReason = 'equipment' | 'pain' | 'time' | 'fatigue' | 'other';
export type WorkoutChangeType =
  | 'set_added'
  | 'set_deleted'
  | 'set_retyped'
  | 'exercise_added'
  | 'exercise_replaced'
  | 'exercise_skipped'
  | 'exercise_reordered'
  | 'workout_reopened'
  | 'date_changed'
  | 'recommendation_accepted'
  | 'recommendation_modified'
  | 'recommendation_dismissed';

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
  measureMode?: SetMeasureMode;
  bodyweightMode?: BodyweightMode;
  defaultSetCount?: number;
  favorite?: boolean;
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
  reminderOverrides?: {
    morningEnabled?: boolean;
    preWorkoutMinutes?: number | null;
    missedWorkoutEnabled?: boolean;
  };
}

export interface SetExecution {
  id: string;
  setNumber: number;
  reps: number;
  weight: number;
  duration?: number;
  distanceKm?: number;
  completed: boolean;
  notes?: string;
  rir?: RIR;
  setType?: SetType;
  origin?: SetOrigin;
  plannedSetNumber?: number;
  bodyweightKg?: number;
  totalLoadKg?: number;
}

export interface ExerciseExecution {
  id: string;
  exerciseId: string;
  plannedExerciseId?: string;
  completedSets: number;
  notes?: string;
  setExecutions: SetExecution[];
  origin?: ExerciseExecutionOrigin;
  replacesPlannedExerciseId?: string;
  replacementReason?: SkipReason;
  skipped?: boolean;
  skipReason?: SkipReason;
  skipNote?: string;
  order?: number;
  blockId?: string;
  blockType?: ExerciseBlockType;
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
  planSnapshot?: PlannedExercise[];
  firstCompletedAt?: string;
  reopenedCount?: number;
  plannedWorkingSets?: number;
  completedPlannedWorkingSets?: number;
  extraWorkingSets?: number;
  plannedVolumeKg?: number;
  actualVolumeKg?: number;
  bodyweightKg?: number;
}

export interface WorkoutDraft {
  id: string;
  scheduledWorkoutId: string;
  startedAt: string;
  updatedAt: string;
  currentExerciseIndex: number;
  currentSetIndex: number;
  notes?: string;
  feeling?: WorkoutFeeling;
  exerciseExecutions: ExerciseExecution[];
  planSnapshot: PlannedExercise[];
  bodyweightKg?: number;
  firstCompletedAt?: string;
  reopenedCount: number;
  lastWriterId?: string;
}

export interface WorkoutChangeEvent {
  id: string;
  scheduledWorkoutId: string;
  workoutDraftId?: string;
  workoutExecutionId?: string;
  type: WorkoutChangeType;
  createdAt: string;
  exerciseExecutionId?: string;
  setExecutionId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface BodyweightEntry {
  id: string;
  date: string;
  isoWeek: number;
  year: number;
  weightKg: number;
  createdAt: string;
  updatedAt: string;
  source: 'manual' | 'weekly-prompt' | 'migration';
}

export interface ActiveEditorLease {
  id: string;
  scheduledWorkoutId: string;
  deviceId: string;
  acquiredAt: string;
  expiresAt: string;
}

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  fcmToken?: string;
  deviceLabel: string;
  timeZone: string;
  createdAt: string;
  updatedAt: string;
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
  notificationsEnabled: boolean;
  morningReminderEnabled: boolean;
  morningReminderTime: string;
  preWorkoutReminderMinutes: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  weeklyBodyweightReminderEnabled: boolean;
  weeklyBodyweightReminderDay: number;
  weeklyBodyweightReminderTime: string;
  missedWorkoutPromptEnabled: boolean;
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
  workoutDrafts: WorkoutDraft[];
  workoutChangeEvents: WorkoutChangeEvent[];
  bodyweightEntries: BodyweightEntry[];
  activeEditorLeases: ActiveEditorLease[];
  pushSubscriptions: PushSubscriptionRecord[];
  weeklySchedulePatterns: WeeklySchedulePattern[];
  progressionRecommendations: ProgressionRecommendation[];
  preferences: AppPreferences;
  enduranceActivities: EnduranceActivity[];
  recoveryActivities: RecoveryActivity[];
  activeWorkoutId: string | null; // Currently open in workout mode
}
