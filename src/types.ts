/**
 * Domain Model for Personal Training Operating System
 * Core Philosophy: Plan -> Execute -> Review -> Improve -> Repeat
 */

export type WeekStatus = 'Planning' | 'Ready' | 'In Progress' | 'Completed' | 'Locked';

export type WorkoutStatus = 'Planned' | 'Started' | 'Completed' | 'Partial' | 'Skipped' | 'Rescheduled';

export type PRMetric = 'highest_weight' | 'estimated_1rm' | 'max_reps' | 'longest_duration';

export type ProgressionStrategy = 'Linear' | 'Double Progression' | 'Wave Loading' | 'Step Loading';

export type ExerciseCategory = 'Strength' | 'Bodyweight' | 'Endurance' | 'Flexibility';

export type WorkoutFeeling = 'Great' | 'Good' | 'Average' | 'Tough' | 'Exhausted';

export type RecoveryType = 'Sauna' | 'Stretching' | 'Mobility' | 'Yoga' | 'Massage' | 'Other';

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
}

export interface SetExecution {
  id: string;
  setNumber: number;
  reps: number;
  weight: number;
  duration?: number;
  completed: boolean;
  notes?: string;
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
  enduranceActivities: EnduranceActivity[];
  recoveryActivities: RecoveryActivity[];
  activeWorkoutId: string | null; // Currently open in workout mode
}
