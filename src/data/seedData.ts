import {
  AppState,
  TrainingProgram,
  WorkoutTemplate,
  TrainingWeek,
  ScheduledWorkout,
  WorkoutExecution,
  EnduranceActivity,
  RecoveryActivity,
} from '../types';
import { DEFAULT_EXERCISES } from './exercises';

export function getInitialSeedState(): AppState {
  const program: TrainingProgram = {
    id: 'prog-summer-2026',
    name: 'Hypertrophy & Strength OS 2026',
    description: 'A 6-month structured Push-Pull-Legs manual progressive overload program.',
    startDate: '2026-06-01',
    endDate: '2026-11-30',
    active: true,
  };

  // Reusable Templates
  const templates: WorkoutTemplate[] = [
    {
      id: 'tpl-push',
      name: 'Push Focus',
      description: 'Chest, Shoulders & Triceps emphasis.',
      plannedExercises: [
        {
          exerciseId: 'ex-bench-press',
          plannedSets: [
            { setNumber: 1, plannedReps: 8, plannedWeight: 80 },
            { setNumber: 2, plannedReps: 8, plannedWeight: 80 },
            { setNumber: 3, plannedReps: 8, plannedWeight: 80 },
          ],
          plannedNotes: 'Focus on explosive concentric phase.',
          order: 1,
        },
        {
          exerciseId: 'ex-incline-db-press',
          plannedSets: [
            { setNumber: 1, plannedReps: 10, plannedWeight: 28 },
            { setNumber: 2, plannedReps: 10, plannedWeight: 28 },
            { setNumber: 3, plannedReps: 10, plannedWeight: 28 },
          ],
          order: 2,
        },
        {
          exerciseId: 'ex-overhead-press',
          plannedSets: [
            { setNumber: 1, plannedReps: 8, plannedWeight: 50 },
            { setNumber: 2, plannedReps: 8, plannedWeight: 50 },
            { setNumber: 3, plannedReps: 8, plannedWeight: 50 },
          ],
          order: 3,
        },
        {
          exerciseId: 'ex-lateral-raise',
          plannedSets: [
            { setNumber: 1, plannedReps: 12, plannedWeight: 12 },
            { setNumber: 2, plannedReps: 12, plannedWeight: 12 },
            { setNumber: 3, plannedReps: 15, plannedWeight: 12 },
          ],
          order: 4,
        },
      ],
    },
    {
      id: 'tpl-pull',
      name: 'Pull Focus',
      description: 'Lats, Upper Back & Biceps.',
      plannedExercises: [
        {
          exerciseId: 'ex-pullup',
          plannedSets: [
            { setNumber: 1, plannedReps: 10, plannedWeight: 0 },
            { setNumber: 2, plannedReps: 10, plannedWeight: 0 },
            { setNumber: 3, plannedReps: 8, plannedWeight: 0 },
          ],
          order: 1,
        },
        {
          exerciseId: 'ex-barbell-row',
          plannedSets: [
            { setNumber: 1, plannedReps: 8, plannedWeight: 75 },
            { setNumber: 2, plannedReps: 8, plannedWeight: 75 },
            { setNumber: 3, plannedReps: 8, plannedWeight: 75 },
          ],
          order: 2,
        },
        {
          exerciseId: 'ex-lat-pulldown',
          plannedSets: [
            { setNumber: 1, plannedReps: 10, plannedWeight: 65 },
            { setNumber: 2, plannedReps: 10, plannedWeight: 65 },
            { setNumber: 3, plannedReps: 10, plannedWeight: 65 },
          ],
          order: 3,
        },
        {
          exerciseId: 'ex-incline-db-curl',
          plannedSets: [
            { setNumber: 1, plannedReps: 12, plannedWeight: 14 },
            { setNumber: 2, plannedReps: 12, plannedWeight: 14 },
            { setNumber: 3, plannedReps: 10, plannedWeight: 14 },
          ],
          order: 4,
        },
      ],
    },
    {
      id: 'tpl-legs',
      name: 'Legs & Core',
      description: 'Quads, Hamstrings, Glutes & Abs.',
      plannedExercises: [
        {
          exerciseId: 'ex-barbell-squat',
          plannedSets: [
            { setNumber: 1, plannedReps: 6, plannedWeight: 110 },
            { setNumber: 2, plannedReps: 6, plannedWeight: 110 },
            { setNumber: 3, plannedReps: 6, plannedWeight: 110 },
          ],
          order: 1,
        },
        {
          exerciseId: 'ex-romanian-deadlift',
          plannedSets: [
            { setNumber: 1, plannedReps: 8, plannedWeight: 90 },
            { setNumber: 2, plannedReps: 8, plannedWeight: 90 },
            { setNumber: 3, plannedReps: 8, plannedWeight: 90 },
          ],
          order: 2,
        },
        {
          exerciseId: 'ex-plank',
          plannedSets: [
            { setNumber: 1, plannedReps: 1, plannedWeight: 10, plannedDuration: 60 },
            { setNumber: 2, plannedReps: 1, plannedWeight: 10, plannedDuration: 60 },
            { setNumber: 3, plannedReps: 1, plannedWeight: 10, plannedDuration: 60 },
          ],
          order: 3,
        },
      ],
    },
  ];

  // ISO Weeks for 2026:
  // Week 28 (July 6-12), Week 29 (July 13-19), Week 30 (July 20-26 - Current), Week 31 (July 27 - Aug 2), Week 32 (Aug 3-9)
  const weeks: TrainingWeek[] = [
    {
      id: 'week-2026-28',
      isoWeek: 28,
      year: 2026,
      status: 'Locked',
      programId: program.id,
      notes: 'Solid baseline week. Barbell Bench press felt crisp.',
      startDate: '2026-07-06',
    },
    {
      id: 'week-2026-29',
      isoWeek: 29,
      year: 2026,
      status: 'Locked',
      programId: program.id,
      notes: 'Added +2.5kg to Squats. Recovery was on point.',
      startDate: '2026-07-13',
    },
    {
      id: 'week-2026-30',
      isoWeek: 30,
      year: 2026,
      status: 'In Progress',
      programId: program.id,
      notes: 'Current week. Push and Pull workouts completed.',
      startDate: '2026-07-20',
    },
    {
      id: 'week-2026-31',
      isoWeek: 31,
      year: 2026,
      status: 'Ready',
      programId: program.id,
      notes: 'Planned upcoming week. Target: Bench Press 3x8 @82.5kg.',
      startDate: '2026-07-27',
    },
    {
      id: 'week-2026-32',
      isoWeek: 32,
      year: 2026,
      status: 'Planning',
      programId: program.id,
      notes: 'Deliberate progression draft.',
      startDate: '2026-08-03',
    },
  ];

  // Scheduled Workouts across weeks
  const scheduledWorkouts: ScheduledWorkout[] = [
    // --- Week 28 (Locked, 100% Completed) ---
    {
      id: 'sw-w28-1',
      weekId: 'week-2026-28',
      title: 'Push - Session 1',
      workoutTemplateId: 'tpl-push',
      workoutNumber: 1,
      date: '2026-07-06',
      status: 'Completed',
      notes: 'Baseline testing for July.',
      plannedExercises: [
        {
          id: 'pe-w28-1-1',
          exerciseId: 'ex-bench-press',
          order: 1,
          plannedSets: [
            { setNumber: 1, plannedReps: 8, plannedWeight: 77.5 },
            { setNumber: 2, plannedReps: 8, plannedWeight: 77.5 },
            { setNumber: 3, plannedReps: 8, plannedWeight: 77.5 },
          ],
        },
        {
          id: 'pe-w28-1-2',
          exerciseId: 'ex-incline-db-press',
          order: 2,
          plannedSets: [
            { setNumber: 1, plannedReps: 10, plannedWeight: 26 },
            { setNumber: 2, plannedReps: 10, plannedWeight: 26 },
            { setNumber: 3, plannedReps: 10, plannedWeight: 26 },
          ],
        },
      ],
    },
    {
      id: 'sw-w28-2',
      weekId: 'week-2026-28',
      title: 'Pull - Session 1',
      workoutTemplateId: 'tpl-pull',
      workoutNumber: 2,
      date: '2026-07-08',
      status: 'Completed',
      notes: 'Strong back pump.',
      plannedExercises: [
        {
          id: 'pe-w28-2-1',
          exerciseId: 'ex-pullup',
          order: 1,
          plannedSets: [
            { setNumber: 1, plannedReps: 10, plannedWeight: 0 },
            { setNumber: 2, plannedReps: 9, plannedWeight: 0 },
            { setNumber: 3, plannedReps: 8, plannedWeight: 0 },
          ],
        },
        {
          id: 'pe-w28-2-2',
          exerciseId: 'ex-barbell-row',
          order: 2,
          plannedSets: [
            { setNumber: 1, plannedReps: 8, plannedWeight: 72.5 },
            { setNumber: 2, plannedReps: 8, plannedWeight: 72.5 },
            { setNumber: 3, plannedReps: 8, plannedWeight: 72.5 },
          ],
        },
      ],
    },
    {
      id: 'sw-w28-3',
      weekId: 'week-2026-28',
      title: 'Legs - Session 1',
      workoutTemplateId: 'tpl-legs',
      workoutNumber: 3,
      date: '2026-07-10',
      status: 'Completed',
      plannedExercises: [
        {
          id: 'pe-w28-3-1',
          exerciseId: 'ex-barbell-squat',
          order: 1,
          plannedSets: [
            { setNumber: 1, plannedReps: 6, plannedWeight: 105 },
            { setNumber: 2, plannedReps: 6, plannedWeight: 105 },
            { setNumber: 3, plannedReps: 6, plannedWeight: 105 },
          ],
        },
      ],
    },

    // --- Week 29 (Locked, 100% Completed) ---
    {
      id: 'sw-w29-1',
      weekId: 'week-2026-29',
      title: 'Push - Session 2',
      workoutTemplateId: 'tpl-push',
      workoutNumber: 1,
      date: '2026-07-13',
      status: 'Completed',
      plannedExercises: [
        {
          id: 'pe-w29-1-1',
          exerciseId: 'ex-bench-press',
          order: 1,
          plannedSets: [
            { setNumber: 1, plannedReps: 8, plannedWeight: 80 },
            { setNumber: 2, plannedReps: 8, plannedWeight: 80 },
            { setNumber: 3, plannedReps: 8, plannedWeight: 80 },
          ],
        },
      ],
    },
    {
      id: 'sw-w29-2',
      weekId: 'week-2026-29',
      title: 'Pull - Session 2',
      workoutTemplateId: 'tpl-pull',
      workoutNumber: 2,
      date: '2026-07-15',
      status: 'Completed',
      plannedExercises: [
        {
          id: 'pe-w29-2-1',
          exerciseId: 'ex-barbell-row',
          order: 1,
          plannedSets: [
            { setNumber: 1, plannedReps: 8, plannedWeight: 75 },
            { setNumber: 2, plannedReps: 8, plannedWeight: 75 },
            { setNumber: 3, plannedReps: 8, plannedWeight: 75 },
          ],
        },
      ],
    },
    {
      id: 'sw-w29-3',
      weekId: 'week-2026-29',
      title: 'Legs - Session 2',
      workoutTemplateId: 'tpl-legs',
      workoutNumber: 3,
      date: '2026-07-17',
      status: 'Completed',
      plannedExercises: [
        {
          id: 'pe-w29-3-1',
          exerciseId: 'ex-barbell-squat',
          order: 1,
          plannedSets: [
            { setNumber: 1, plannedReps: 6, plannedWeight: 107.5 },
            { setNumber: 2, plannedReps: 6, plannedWeight: 107.5 },
            { setNumber: 3, plannedReps: 6, plannedWeight: 107.5 },
          ],
        },
      ],
    },

    // --- Week 30 (Current Week, In Progress) ---
    {
      id: 'sw-w30-1',
      weekId: 'week-2026-30',
      title: 'Push - Heavy Focus',
      workoutTemplateId: 'tpl-push',
      workoutNumber: 1,
      date: '2026-07-21',
      status: 'Completed',
      plannedExercises: [
        {
          id: 'pe-w30-1-1',
          exerciseId: 'ex-bench-press',
          order: 1,
          plannedSets: [
            { setNumber: 1, plannedReps: 8, plannedWeight: 82.5 },
            { setNumber: 2, plannedReps: 8, plannedWeight: 82.5 },
            { setNumber: 3, plannedReps: 8, plannedWeight: 82.5 },
          ],
        },
        {
          id: 'pe-w30-1-2',
          exerciseId: 'ex-overhead-press',
          order: 2,
          plannedSets: [
            { setNumber: 1, plannedReps: 8, plannedWeight: 52.5 },
            { setNumber: 2, plannedReps: 8, plannedWeight: 52.5 },
            { setNumber: 3, plannedReps: 8, plannedWeight: 52.5 },
          ],
        },
      ],
    },
    {
      id: 'sw-w30-2',
      weekId: 'week-2026-30',
      title: 'Pull - Hypertrophy',
      workoutTemplateId: 'tpl-pull',
      workoutNumber: 2,
      date: '2026-07-23',
      status: 'Completed',
      plannedExercises: [
        {
          id: 'pe-w30-2-1',
          exerciseId: 'ex-pullup',
          order: 1,
          plannedSets: [
            { setNumber: 1, plannedReps: 10, plannedWeight: 0 },
            { setNumber: 2, plannedReps: 10, plannedWeight: 0 },
            { setNumber: 3, plannedReps: 10, plannedWeight: 0 },
          ],
        },
        {
          id: 'pe-w30-2-2',
          exerciseId: 'ex-barbell-row',
          order: 2,
          plannedSets: [
            { setNumber: 1, plannedReps: 8, plannedWeight: 77.5 },
            { setNumber: 2, plannedReps: 8, plannedWeight: 77.5 },
            { setNumber: 3, plannedReps: 8, plannedWeight: 77.5 },
          ],
        },
      ],
    },
    {
      id: 'sw-w30-3',
      weekId: 'week-2026-30',
      title: 'Legs & Core Overload',
      workoutTemplateId: 'tpl-legs',
      workoutNumber: 3,
      date: '2026-07-26',
      status: 'Planned',
      plannedExercises: [
        {
          id: 'pe-w30-3-1',
          exerciseId: 'ex-barbell-squat',
          order: 1,
          plannedSets: [
            { setNumber: 1, plannedReps: 6, plannedWeight: 110 },
            { setNumber: 2, plannedReps: 6, plannedWeight: 110 },
            { setNumber: 3, plannedReps: 6, plannedWeight: 110 },
          ],
        },
        {
          id: 'pe-w30-3-2',
          exerciseId: 'ex-romanian-deadlift',
          order: 2,
          plannedSets: [
            { setNumber: 1, plannedReps: 8, plannedWeight: 95 },
            { setNumber: 2, plannedReps: 8, plannedWeight: 95 },
            { setNumber: 3, plannedReps: 8, plannedWeight: 95 },
          ],
        },
      ],
    },

    // --- Week 31 (Upcoming, Ready) ---
    {
      id: 'sw-w31-1',
      weekId: 'week-2026-31',
      title: 'Push - Progressive Target',
      workoutTemplateId: 'tpl-push',
      workoutNumber: 1,
      status: 'Planned',
      plannedExercises: [
        {
          id: 'pe-w31-1-1',
          exerciseId: 'ex-bench-press',
          order: 1,
          plannedSets: [
            { setNumber: 1, plannedReps: 8, plannedWeight: 85 },
            { setNumber: 2, plannedReps: 8, plannedWeight: 85 },
            { setNumber: 3, plannedReps: 8, plannedWeight: 85 },
          ],
        },
      ],
    },
  ];

  // Executions (Actuals stored completely separate from Planned!)
  const workoutExecutions: WorkoutExecution[] = [
    {
      id: 'exec-w28-1',
      scheduledWorkoutId: 'sw-w28-1',
      startedAt: '2026-07-06T17:00:00.000Z',
      completedAt: '2026-07-06T18:10:00.000Z',
      feeling: 'Great',
      notes: 'Felt very smooth. Bar path was stable.',
      completionPercentage: 100,
      exerciseExecutions: [
        {
          id: 'ee-w28-1-1',
          exerciseId: 'ex-bench-press',
          plannedExerciseId: 'pe-w28-1-1',
          completedSets: 3,
          setExecutions: [
            { id: 'se-1', setNumber: 1, reps: 8, weight: 77.5, completed: true },
            { id: 'se-2', setNumber: 2, reps: 8, weight: 77.5, completed: true },
            { id: 'se-3', setNumber: 3, reps: 8, weight: 77.5, completed: true },
          ],
        },
        {
          id: 'ee-w28-1-2',
          exerciseId: 'ex-incline-db-press',
          plannedExerciseId: 'pe-w28-1-2',
          completedSets: 3,
          setExecutions: [
            { id: 'se-4', setNumber: 1, reps: 10, weight: 26, completed: true },
            { id: 'se-5', setNumber: 2, reps: 10, weight: 26, completed: true },
            { id: 'se-6', setNumber: 3, reps: 10, weight: 26, completed: true },
          ],
        },
      ],
    },
    {
      id: 'exec-w29-1',
      scheduledWorkoutId: 'sw-w29-1',
      startedAt: '2026-07-13T17:15:00.000Z',
      completedAt: '2026-07-13T18:20:00.000Z',
      feeling: 'Good',
      completionPercentage: 100,
      exerciseExecutions: [
        {
          id: 'ee-w29-1-1',
          exerciseId: 'ex-bench-press',
          plannedExerciseId: 'pe-w29-1-1',
          completedSets: 3,
          setExecutions: [
            { id: 'se-7', setNumber: 1, reps: 8, weight: 80, completed: true },
            { id: 'se-8', setNumber: 2, reps: 8, weight: 80, completed: true },
            { id: 'se-9', setNumber: 3, reps: 8, weight: 80, completed: true },
          ],
        },
      ],
    },
    {
      id: 'exec-w30-1',
      scheduledWorkoutId: 'sw-w30-1',
      startedAt: '2026-07-21T17:00:00.000Z',
      completedAt: '2026-07-21T18:15:00.000Z',
      feeling: 'Great',
      notes: 'Hit new PR on Bench Press: 8 reps @ 82.5kg! Estimated 1RM ~104.5kg',
      completionPercentage: 100,
      exerciseExecutions: [
        {
          id: 'ee-w30-1-1',
          exerciseId: 'ex-bench-press',
          plannedExerciseId: 'pe-w30-1-1',
          completedSets: 3,
          setExecutions: [
            { id: 'se-10', setNumber: 1, reps: 8, weight: 82.5, completed: true },
            { id: 'se-11', setNumber: 2, reps: 8, weight: 82.5, completed: true },
            { id: 'se-12', setNumber: 3, reps: 8, weight: 82.5, completed: true },
          ],
        },
        {
          id: 'ee-w30-1-2',
          exerciseId: 'ex-overhead-press',
          plannedExerciseId: 'pe-w30-1-2',
          completedSets: 3,
          setExecutions: [
            { id: 'se-13', setNumber: 1, reps: 8, weight: 52.5, completed: true },
            { id: 'se-14', setNumber: 2, reps: 8, weight: 52.5, completed: true },
            { id: 'se-15', setNumber: 3, reps: 7, weight: 52.5, completed: true }, // 1 rep under planned - preserved!
          ],
        },
      ],
    },
    {
      id: 'exec-w30-2',
      scheduledWorkoutId: 'sw-w30-2',
      startedAt: '2026-07-23T17:30:00.000Z',
      completedAt: '2026-07-23T18:40:00.000Z',
      feeling: 'Good',
      completionPercentage: 100,
      exerciseExecutions: [
        {
          id: 'ee-w30-2-1',
          exerciseId: 'ex-pullup',
          plannedExerciseId: 'pe-w30-2-1',
          completedSets: 3,
          setExecutions: [
            { id: 'se-16', setNumber: 1, reps: 10, weight: 0, completed: true },
            { id: 'se-17', setNumber: 2, reps: 10, weight: 0, completed: true },
            { id: 'se-18', setNumber: 3, reps: 10, weight: 0, completed: true },
          ],
        },
      ],
    },
  ];

  const enduranceActivities: EnduranceActivity[] = [
    {
      id: 'end-1',
      weekId: 'week-2026-29',
      date: '2026-07-16',
      title: 'Zone 2 Base Run',
      durationMinutes: 35,
      distanceKm: 5.2,
      notes: 'Nasal breathing only. Average HR 138 bpm.',
    },
    {
      id: 'end-2',
      weekId: 'week-2026-30',
      date: '2026-07-22',
      title: 'Interval Rowing',
      durationMinutes: 20,
      distanceKm: 4.0,
      notes: '500m work / 1 min rest x 6 rounds.',
    },
  ];

  const recoveryActivities: RecoveryActivity[] = [
    {
      id: 'rec-1',
      weekId: 'week-2026-29',
      date: '2026-07-18',
      title: 'Post-Leg Sauna Session',
      type: 'Sauna',
      durationMinutes: 25,
      notes: 'Hydrated with electrolytes before and after.',
    },
    {
      id: 'rec-2',
      weekId: 'week-2026-30',
      date: '2026-07-24',
      title: 'Hip Mobility & Hamstring Stretch',
      type: 'Mobility',
      durationMinutes: 20,
      notes: '90/90 hip switches and band stretches.',
    },
  ];

  return {
    programs: [program],
    activeProgramId: program.id,
    exercises: DEFAULT_EXERCISES,
    workoutTemplates: templates,
    weeks,
    scheduledWorkouts,
    workoutExecutions,
    enduranceActivities,
    recoveryActivities,
    activeWorkoutId: null,
  };
}

export function getCleanSlateState(): AppState {
  const seed = getInitialSeedState();
  return {
    ...seed,
    scheduledWorkouts: [],
    workoutExecutions: [],
    enduranceActivities: [],
    recoveryActivities: [],
    activeWorkoutId: null,
  };
}

