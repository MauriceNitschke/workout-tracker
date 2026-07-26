import React, { useState, useEffect } from 'react';
import { AppState, WorkoutExecution } from './types';
import {
  exportAppStateJSON,
  loadAppState,
  resetAppStateToSeed,
  saveAppState,
} from './lib/storage';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { WeeklyPlanner } from './components/WeeklyPlanner';
import { WorkoutMode } from './components/WorkoutMode';
import { WeeklyReviewView } from './components/WeeklyReviewView';
import { ExerciseLibrary } from './components/ExerciseLibrary';
import { EnduranceRecoveryTracker } from './components/EnduranceRecoveryTracker';
import { LifeInWeeksView } from './components/LifeInWeeksView';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadAppState());
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Save to localStorage whenever state updates
  useEffect(() => {
    saveAppState(state);
  }, [state]);

  // Handle launching a workout in WorkoutMode
  const handleStartWorkout = (scheduledWorkoutId: string) => {
    // Update scheduled workout status to Started if it was Planned
    const updatedWorkouts = state.scheduledWorkouts.map((sw) =>
      sw.id === scheduledWorkoutId ? { ...sw, status: 'Started' as const } : sw
    );

    setState({
      ...state,
      scheduledWorkouts: updatedWorkouts,
      activeWorkoutId: scheduledWorkoutId,
    });

    setCurrentTab('workout');
  };

  // Handle completing a workout execution
  const handleFinishWorkout = (execution: WorkoutExecution) => {
    // 1. Mark scheduled workout as Completed
    const updatedWorkouts = state.scheduledWorkouts.map((sw) =>
      sw.id === execution.scheduledWorkoutId ? { ...sw, status: 'Completed' as const } : sw
    );

    // 2. Add or update execution in workoutExecutions list
    const existingExecIndex = state.workoutExecutions.findIndex(
      (e) => e.scheduledWorkoutId === execution.scheduledWorkoutId
    );

    let updatedExecutions = [...state.workoutExecutions];
    if (existingExecIndex >= 0) {
      updatedExecutions[existingExecIndex] = execution;
    } else {
      updatedExecutions.push(execution);
    }

    // 3. Update week status to Completed if all workouts in that week are complete
    const targetWorkout = state.scheduledWorkouts.find(
      (sw) => sw.id === execution.scheduledWorkoutId
    );
    let updatedWeeks = [...state.weeks];

    if (targetWorkout) {
      const workoutsInWeek = updatedWorkouts.filter((sw) => sw.weekId === targetWorkout.weekId);
      const allCompleted = workoutsInWeek.every((sw) => sw.status === 'Completed');

      if (allCompleted) {
        updatedWeeks = updatedWeeks.map((w) =>
          w.id === targetWorkout.weekId ? { ...w, status: 'Locked' as const } : w
        );
      }
    }

    setState({
      ...state,
      scheduledWorkouts: updatedWorkouts,
      workoutExecutions: updatedExecutions,
      weeks: updatedWeeks,
      activeWorkoutId: null,
    });

    // Return to dashboard after saving
    setCurrentTab('dashboard');
  };

  // Handle resetting to seed data
  const handleResetSeed = () => {
    const seed = resetAppStateToSeed();
    setState(seed);
  };

  // Handle importing custom JSON backup
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as AppState;
        if (parsed.weeks && parsed.exercises && parsed.scheduledWorkouts) {
          setState(parsed);
          saveAppState(parsed);
          alert('Data imported successfully!');
        } else {
          alert('Invalid JSON file structure.');
        }
      } catch (err) {
        alert('Failed to parse JSON backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-zinc-800 selection:text-zinc-100">
      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        state={state}
        onResetSeed={handleResetSeed}
        onExportData={() => exportAppStateJSON(state)}
        onImportData={handleImportData}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {currentTab === 'dashboard' && (
          <Dashboard
            state={state}
            onStartWorkout={handleStartWorkout}
            onNavigateTab={setCurrentTab}
          />
        )}

        {currentTab === 'planner' && (
          <WeeklyPlanner
            state={state}
            onUpdateState={setState}
            onStartWorkout={handleStartWorkout}
          />
        )}

        {currentTab === 'workout' && (
          <WorkoutMode
            state={state}
            scheduledWorkoutId={state.activeWorkoutId}
            onFinishWorkout={handleFinishWorkout}
            onCancelWorkout={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'life-in-weeks' && (
          <LifeInWeeksView state={state} onUpdateState={setState} />
        )}

        {currentTab === 'review' && <WeeklyReviewView state={state} />}

        {currentTab === 'exercises' && (
          <ExerciseLibrary state={state} onUpdateState={setState} />
        )}

        {currentTab === 'recovery' && (
          <EnduranceRecoveryTracker state={state} onUpdateState={setState} />
        )}
      </main>
    </div>
  );
}
