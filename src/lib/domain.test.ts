import assert from 'node:assert/strict';
import test from 'node:test';
import { getCleanSlateState } from '../data/seedData';
import {
  applySchedulePreview,
  buildSchedulePreview,
  nextISOWeek,
} from './scheduling';
import { buildProgressionRecommendation } from './progression';
import { migrateAppState } from './storage';
import {
  addRestSeconds,
  getRestSecondsRemaining,
  pauseRestTimer,
  resumeRestTimer,
  startRestTimer,
} from './restTimer';
import { getNextWorkoutPosition } from './workoutFlow';
import {
  Exercise,
  ExerciseExecution,
  PlannedExercise,
  ScheduledWorkout,
  TrainingWeek,
  WeeklySchedulePattern,
  WorkoutExecution,
  WorkoutTemplate,
} from '../types';

test('schema migration preserves IDs and adds v3 collections and preferences', () => {
  const state = getCleanSlateState();
  const legacy = {
    ...state,
    weeklySchedulePatterns: undefined,
    progressionRecommendations: undefined,
    preferences: undefined,
  };
  const migrated = migrateAppState(legacy as never);
  assert.equal(migrated.exercises[0]?.id, state.exercises[0]?.id);
  assert.deepEqual(migrated.weeklySchedulePatterns, []);
  assert.deepEqual(migrated.progressionRecommendations, []);
  assert.equal(migrated.preferences.defaultRestSeconds, 120);
});

test('ISO week generation crosses the year boundary correctly', () => {
  const week: TrainingWeek = {
    id: 'week-2026-53',
    isoWeek: 53,
    year: 2026,
    status: 'Planning',
    programId: 'program',
    startDate: '2026-12-28',
  };
  const next = nextISOWeek(week);
  assert.equal(next.year, 2027);
  assert.equal(next.isoWeek, 1);
  assert.equal(next.startDate, '2027-01-04');
});

test('schedule preview detects duplicates and never regenerates them', () => {
  const state = getCleanSlateState();
  const template: WorkoutTemplate = {
    id: 'template',
    name: 'Push',
    description: '',
    plannedExercises: [],
  };
  const week: TrainingWeek = {
    id: 'week-2026-31',
    isoWeek: 31,
    year: 2026,
    status: 'Planning',
    programId: state.activeProgramId,
    startDate: '2026-07-27',
  };
  const pattern: WeeklySchedulePattern = {
    id: 'pattern',
    name: 'Three days',
    entries: [{
      id: 'monday',
      weekday: 1,
      workoutTemplateId: template.id,
      order: 1,
    }],
  };
  const base = {
    ...state,
    weeks: [week],
    workoutTemplates: [template],
    weeklySchedulePatterns: [pattern],
  };
  const firstPreview = buildSchedulePreview(base, pattern, week, 1);
  assert.equal(firstPreview.items[0].status, 'create');
  const generated = applySchedulePreview(base, pattern, firstPreview);
  const secondPreview = buildSchedulePreview(generated, pattern, week, 1);
  assert.equal(secondPreview.items[0].status, 'duplicate');
});

test('double progression adds weight and resets reps at the upper target', () => {
  const state = getCleanSlateState();
  const exercise: Exercise = {
    id: 'bench',
    name: 'Bench',
    description: '',
    primaryMuscles: ['Chest'],
    secondaryMuscles: [],
    equipment: 'Barbell',
    progressionStrategy: 'Double Progression',
    prMetric: 'estimated_1rm',
    category: 'Strength',
    repRangeMin: 8,
    repRangeMax: 10,
    weightIncrementKg: 2.5,
    targetRir: 2,
  };
  const plan: PlannedExercise = {
    id: 'planned-bench',
    exerciseId: exercise.id,
    order: 1,
    plannedSets: [1, 2, 3].map((setNumber) => ({
      setNumber,
      plannedReps: 10,
      plannedWeight: 80,
    })),
  };
  const workout: ScheduledWorkout = {
    id: 'workout',
    weekId: 'week',
    title: 'Push',
    workoutNumber: 1,
    status: 'Completed',
    plannedExercises: [plan],
  };
  const exerciseExecution: ExerciseExecution = {
    id: 'execution-bench',
    exerciseId: exercise.id,
    plannedExerciseId: plan.id,
    completedSets: 3,
    setExecutions: [1, 2, 3].map((setNumber) => ({
      id: `set-${setNumber}`,
      setNumber,
      reps: 10,
      weight: 80,
      completed: true,
      rir: 2,
    })),
  };
  const execution: WorkoutExecution = {
    id: 'execution',
    scheduledWorkoutId: workout.id,
    startedAt: '2026-07-27T10:00:00.000Z',
    completedAt: '2026-07-27T11:00:00.000Z',
    completionPercentage: 100,
    exerciseExecutions: [exerciseExecution],
  };
  const recommendation = buildProgressionRecommendation(
    exercise,
    plan,
    exerciseExecution,
    execution,
    workout,
    {
      ...state,
      exercises: [exercise],
      scheduledWorkouts: [workout],
      workoutExecutions: [],
    }
  );
  assert.equal(recommendation?.suggested.weight, 82.5);
  assert.equal(recommendation?.suggested.reps, 8);
});

test('rest timer uses absolute timestamps across pause, resume, and extension', () => {
  const timer = startRestTimer(120, 1_000);
  assert.equal(getRestSecondsRemaining(timer, 31_000), 90);
  const paused = pauseRestTimer(timer, 31_000);
  assert.equal(getRestSecondsRemaining(paused, 90_000), 90);
  const extended = addRestSeconds(paused, 30, 90_000);
  assert.equal(extended.pausedRemaining, 120);
  const resumed = resumeRestTimer(extended, 100_000);
  assert.equal(getRestSecondsRemaining(resumed, 130_000), 90);
});

test('superset flow alternates exercises before advancing the round', () => {
  const exercises: PlannedExercise[] = ['a', 'b'].map((exerciseId, index) => ({
    id: exerciseId,
    exerciseId,
    order: index + 1,
    blockId: 'superset-1',
    blockType: 'superset',
    plannedSets: [1, 2].map((setNumber) => ({
      setNumber,
      plannedReps: 8,
      plannedWeight: 20,
    })),
  }));
  assert.deepEqual(getNextWorkoutPosition(exercises, 0, 0), {
    exerciseIndex: 1,
    setIndex: 0,
  });
  assert.deepEqual(getNextWorkoutPosition(exercises, 1, 0), {
    exerciseIndex: 0,
    setIndex: 1,
  });
  assert.deepEqual(getNextWorkoutPosition(exercises, 1, 1), null);
});
