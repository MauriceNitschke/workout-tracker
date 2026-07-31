import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getCleanSlateState } from '../data/seedData';
import { createWorkoutDraft } from '../lib/adaptiveWorkout';
import { WorkoutMode } from './WorkoutMode';

test('mobile workout logger renders the active set as the primary action', () => {
  const state = getCleanSlateState();
  const exercise = state.exercises[0];
  const workout = {
    id: 'workout',
    weekId: 'week',
    title: 'Fast Push',
    workoutNumber: 1,
    status: 'Started' as const,
    plannedExercises: [{
      id: 'planned-exercise',
      exerciseId: exercise.id,
      order: 1,
      plannedSets: [{ setNumber: 1, plannedReps: 8, plannedWeight: 60 }],
    }],
  };
  const activeState = { ...state, scheduledWorkouts: [workout], activeWorkoutId: workout.id };
  const draft = createWorkoutDraft(workout, activeState);
  const markup = renderToStaticMarkup(
    React.createElement(WorkoutMode, {
      state: { ...activeState, workoutDrafts: [draft] },
      scheduledWorkoutId: workout.id,
      syncStatus: 'guest',
      onUpdateState: () => undefined,
      onStartWorkout: () => undefined,
      onMoveWorkoutToToday: () => undefined,
      onNavigatePlan: () => undefined,
      onFinishWorkout: () => undefined,
      onCancelWorkout: () => undefined,
    })
  );
  assert.match(markup, /Fast Push/);
  assert.match(markup, /Complete set 1/i);
  assert.match(markup, /inputMode="numeric"|inputmode="numeric"/);
});
