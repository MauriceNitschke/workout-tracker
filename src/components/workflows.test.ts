import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getCleanSlateState } from '../data/seedData';
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
  const markup = renderToStaticMarkup(
    React.createElement(WorkoutMode, {
      state: { ...state, scheduledWorkouts: [workout], activeWorkoutId: workout.id },
      scheduledWorkoutId: workout.id,
      onFinishWorkout: () => undefined,
      onCancelWorkout: () => undefined,
    })
  );
  assert.match(markup, /Fast Push/);
  assert.match(markup, /COMPLETE SET #1/);
  assert.match(markup, /inputMode="numeric"|inputmode="numeric"/);
});
