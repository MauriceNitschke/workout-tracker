import React, { useState, useEffect } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import {
  AppState,
  Exercise,
  ExerciseExecution,
  PlannedExercise,
  ScheduledWorkout,
  SetExecution,
  WorkoutExecution,
  WorkoutFeeling,
} from '../types';
import { calculateE1RM } from '../lib/prCalculator';

interface WorkoutModeProps {
  state: AppState;
  scheduledWorkoutId: string | null;
  onFinishWorkout: (execution: WorkoutExecution) => void;
  onCancelWorkout: () => void;
}

export const WorkoutMode: React.FC<WorkoutModeProps> = ({
  state,
  scheduledWorkoutId,
  onFinishWorkout,
  onCancelWorkout,
}) => {
  // Find scheduled workout
  const workout = state.scheduledWorkouts.find((sw) => sw.id === scheduledWorkoutId);

  // If no active workout selected, pick the first pending/started workout
  const activeWorkout: ScheduledWorkout | undefined =
    workout ||
    state.scheduledWorkouts.find((sw) => sw.status === 'Started') ||
    state.scheduledWorkouts.find((sw) => sw.status === 'Planned');

  // Navigation state within the workout
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);

  // Execution tracking state (local until saved)
  const [exerciseExecutions, setExerciseExecutions] = useState<ExerciseExecution[]>([]);
  const [startedAt] = useState<string>(new Date().toISOString());
  const [notes, setNotes] = useState('');
  const [feeling, setFeeling] = useState<WorkoutFeeling>('Good');
  const [isFinished, setIsFinished] = useState(false);

  // Live input values for the active set
  const [loggedReps, setLoggedReps] = useState<number>(0);
  const [loggedWeight, setLoggedWeight] = useState<number>(0);

  // Initialize executions from planned exercises when activeWorkout changes
  useEffect(() => {
    if (!activeWorkout) return;

    // Check if an existing execution exists in state
    const existingExec = state.workoutExecutions.find(
      (e) => e.scheduledWorkoutId === activeWorkout.id
    );

    if (existingExec) {
      setExerciseExecutions(existingExec.exerciseExecutions);
      setNotes(existingExec.notes || '');
      if (existingExec.feeling) setFeeling(existingExec.feeling);
    } else {
      // Build fresh execution structure from planned exercises
      const freshExecutions: ExerciseExecution[] = activeWorkout.plannedExercises.map((pe) => {
        const sets: SetExecution[] = pe.plannedSets.map((ps) => ({
          id: `se-${pe.id}-${ps.setNumber}`,
          setNumber: ps.setNumber,
          reps: ps.plannedReps,
          weight: ps.plannedWeight,
          duration: ps.plannedDuration,
          completed: false,
        }));

        return {
          id: `ee-${pe.id}`,
          exerciseId: pe.exerciseId,
          plannedExerciseId: pe.id,
          completedSets: 0,
          setExecutions: sets,
        };
      });

      setExerciseExecutions(freshExecutions);
    }
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
  }, [activeWorkout?.id]);

  // Sync active set inputs with planned / logged values
  const currentPlannedExercise: PlannedExercise | undefined =
    activeWorkout?.plannedExercises[currentExerciseIndex];

  const currentExerciseDef: Exercise | undefined = state.exercises.find(
    (e) => e.id === currentPlannedExercise?.exerciseId
  );

  const currentExec: ExerciseExecution | undefined =
    exerciseExecutions[currentExerciseIndex];

  const currentSetExec: SetExecution | undefined =
    currentExec?.setExecutions[currentSetIndex];

  useEffect(() => {
    if (currentSetExec) {
      setLoggedReps(currentSetExec.reps);
      setLoggedWeight(currentSetExec.weight);
    } else if (currentPlannedExercise?.plannedSets[currentSetIndex]) {
      const ps = currentPlannedExercise.plannedSets[currentSetIndex];
      setLoggedReps(ps.plannedReps);
      setLoggedWeight(ps.plannedWeight);
    }
  }, [currentExerciseIndex, currentSetIndex, exerciseExecutions]);

  if (!activeWorkout || !currentPlannedExercise) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center space-y-4">
        <Dumbbell className="w-12 h-12 text-zinc-600 mx-auto" />
        <h2 className="text-lg font-semibold text-zinc-200">No Active Workout Selected</h2>
        <p className="text-xs text-zinc-400">
          Select a planned workout from the Weekly Plan or Dashboard to enter Workout Mode.
        </p>
        <button
          onClick={onCancelWorkout}
          className="px-4 py-2 text-xs font-mono rounded-lg bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Handle set completion
  const handleCompleteSet = () => {
    if (!currentExec || !currentSetExec) return;

    // Update current set as completed with logged values
    const updatedExecutions = exerciseExecutions.map((ee, exIdx) => {
      if (exIdx !== currentExerciseIndex) return ee;

      const updatedSets = ee.setExecutions.map((se, sIdx) => {
        if (sIdx !== currentSetIndex) return se;
        return {
          ...se,
          reps: loggedReps,
          weight: loggedWeight,
          completed: true,
        };
      });

      const completedCount = updatedSets.filter((s) => s.completed).length;

      return {
        ...ee,
        completedSets: completedCount,
        setExecutions: updatedSets,
      };
    });

    setExerciseExecutions(updatedExecutions);

    // Auto-advance logic:
    // 1. Next set in current exercise
    if (currentSetIndex < currentPlannedExercise.plannedSets.length - 1) {
      setCurrentSetIndex(currentSetIndex + 1);
    } else {
      // 2. All sets in this exercise completed -> move to next exercise
      if (currentExerciseIndex < activeWorkout.plannedExercises.length - 1) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
        setCurrentSetIndex(0);
      } else {
        // 3. All exercises completed -> trigger Workout Finish Review
        setIsFinished(true);
      }
    }
  };

  // Toggle set completion directly by clicking set pill
  const handleToggleSetDirect = (exIdx: number, setIdx: number) => {
    const updatedExecutions = exerciseExecutions.map((ee, i) => {
      if (i !== exIdx) return ee;
      const updatedSets = ee.setExecutions.map((se, j) => {
        if (j !== setIdx) return se;
        return {
          ...se,
          completed: !se.completed,
        };
      });
      return {
        ...ee,
        completedSets: updatedSets.filter((s) => s.completed).length,
        setExecutions: updatedSets,
      };
    });
    setExerciseExecutions(updatedExecutions);
  };

  // Final submit handler
  const handleSaveWorkout = () => {
    const totalSetsPlanned = activeWorkout.plannedExercises.reduce(
      (sum, pe) => sum + pe.plannedSets.length,
      0
    );

    let totalCompleted = 0;
    exerciseExecutions.forEach((ee) => {
      ee.setExecutions.forEach((se) => {
        if (se.completed) totalCompleted++;
      });
    });

    const completionPercentage =
      totalSetsPlanned > 0 ? Math.round((totalCompleted / totalSetsPlanned) * 100) : 100;

    const finalExecution: WorkoutExecution = {
      id: `exec-${activeWorkout.id}`,
      scheduledWorkoutId: activeWorkout.id,
      startedAt,
      completedAt: new Date().toISOString(),
      notes,
      feeling,
      completionPercentage,
      exerciseExecutions,
    };

    onFinishWorkout(finalExecution);
  };

  // Calculated stats for current set preview
  const plannedSet = currentPlannedExercise.plannedSets[currentSetIndex];
  const e1rm = calculateE1RM(loggedWeight, loggedReps);

  return (
    <div className="min-h-[85vh] flex flex-col justify-between max-w-3xl mx-auto py-2">
      {/* Top Bar: Title & Exit */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
            DISTRACTION-FREE WORKOUT MODE
          </span>
          <h1 className="text-xl font-extrabold text-zinc-100 tracking-tight">
            {activeWorkout.title}
          </h1>
        </div>

        <button
          onClick={onCancelWorkout}
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg transition"
          title="Exit Workout Mode"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Finished Summary View */}
      {isFinished ? (
        <div className="my-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">Workout Completed!</h2>
            <p className="text-xs text-zinc-400 font-mono">
              All planned exercises logged. Review performance before saving.
            </p>
          </div>

          {/* Feeling Rating */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-zinc-400">
              How did this session feel?
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(['Great', 'Good', 'Average', 'Tough', 'Exhausted'] as WorkoutFeeling[]).map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setFeeling(f)}
                    className={`py-2 px-1 text-xs font-mono rounded-lg border transition text-center ${
                      feeling === f
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {f}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Workout Notes */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-zinc-400">
              Session Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bar path was solid on bench press. Energy high."
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="pt-4 flex items-center space-x-3">
            <button
              onClick={() => setIsFinished(false)}
              className="w-1/3 py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-mono text-xs font-medium"
            >
              Resume Logging
            </button>
            <button
              onClick={handleSaveWorkout}
              className="w-2/3 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-bold text-sm transition shadow-lg shadow-emerald-500/20"
            >
              SAVE WORKOUT & RECORD PRs
            </button>
          </div>
        </div>
      ) : (
        /* Active Focus View */
        <div className="my-auto space-y-8 py-4">
          {/* Exercise Stepper & Selector */}
          <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-2 rounded-xl">
            <button
              disabled={currentExerciseIndex === 0}
              onClick={() => {
                setCurrentExerciseIndex(currentExerciseIndex - 1);
                setCurrentSetIndex(0);
              }}
              className="p-2 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center font-mono text-xs">
              <span className="text-emerald-400 font-bold">
                EXERCISE {currentExerciseIndex + 1} OF {activeWorkout.plannedExercises.length}
              </span>
            </div>

            <button
              disabled={currentExerciseIndex === activeWorkout.plannedExercises.length - 1}
              onClick={() => {
                setCurrentExerciseIndex(currentExerciseIndex + 1);
                setCurrentSetIndex(0);
              }}
              className="p-2 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Current Exercise Focus Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                  {currentExerciseDef?.primaryMuscles.join(', ')} • {currentExerciseDef?.equipment}
                </span>
                <span className="text-xs font-mono text-zinc-500">
                  Target: {currentPlannedExercise.plannedSets.length} sets
                </span>
              </div>
              <h2 className="text-3xl font-black text-zinc-100 tracking-tight mt-1">
                {currentExerciseDef?.name || 'Exercise'}
              </h2>
              {currentPlannedExercise.plannedNotes && (
                <p className="text-xs text-amber-400/90 font-mono mt-2 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                  Note: {currentPlannedExercise.plannedNotes}
                </p>
              )}
            </div>

            {/* Set Selector Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              {currentPlannedExercise.plannedSets.map((ps, idx) => {
                const isCompleted = currentExec?.setExecutions[idx]?.completed;
                const isSelected = idx === currentSetIndex;

                return (
                  <button
                    key={ps.setNumber}
                    onClick={() => setCurrentSetIndex(idx)}
                    className={`flex-1 min-w-[70px] py-2.5 px-3 rounded-xl border font-mono text-xs text-center transition ${
                      isSelected
                        ? 'bg-zinc-800 border-zinc-600 text-zinc-100 ring-2 ring-emerald-500/50'
                        : isCompleted
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <div className="text-[10px] uppercase text-zinc-500">SET {ps.setNumber}</div>
                    <div className="font-bold">
                      {isCompleted ? '✓' : `${ps.plannedReps}x${ps.plannedWeight}k`}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Massive Interactive Set Logger */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 border-b border-zinc-900 pb-3">
                <span>SET #{currentSetIndex + 1} LOGGING</span>
                <span>PLANNED: {plannedSet?.plannedReps} reps @ {plannedSet?.plannedWeight} kg</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Reps Input */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-zinc-400 uppercase block text-center">
                    REPS COMPLETED
                  </label>
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={() => setLoggedReps(Math.max(1, loggedReps - 1))}
                      className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xl font-bold active:scale-90 transition hover:bg-zinc-800"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={loggedReps}
                      onChange={(e) => setLoggedReps(Number(e.target.value))}
                      className="w-24 text-center text-4xl font-black font-mono bg-zinc-900 border border-zinc-800 rounded-xl py-2 text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => setLoggedReps(loggedReps + 1)}
                      className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xl font-bold active:scale-90 transition hover:bg-zinc-800"
                    >
                      +
                    </button>
                  </div>
                  {/* Quick Reps Increment Chips */}
                  <div className="flex items-center justify-center space-x-1.5 pt-1">
                    {[-2, -1, +1, +2].map((delta) => (
                      <button
                        key={`rep-${delta}`}
                        type="button"
                        onClick={() => setLoggedReps(Math.max(1, loggedReps + delta))}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono font-medium text-zinc-300 active:scale-95 transition"
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weight Input */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-zinc-400 uppercase block text-center">
                    WEIGHT (KG)
                  </label>
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={() => setLoggedWeight(Math.max(0, loggedWeight - 2.5))}
                      className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xl font-bold active:scale-90 transition hover:bg-zinc-800"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="0.5"
                      value={loggedWeight}
                      onChange={(e) => setLoggedWeight(Number(e.target.value))}
                      className="w-24 text-center text-4xl font-black font-mono bg-zinc-900 border border-zinc-800 rounded-xl py-2 text-zinc-100 focus:outline-none focus:border-zinc-600"
                    />
                    <button
                      onClick={() => setLoggedWeight(loggedWeight + 2.5)}
                      className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xl font-bold active:scale-90 transition hover:bg-zinc-800"
                    >
                      +
                    </button>
                  </div>
                  {/* Quick Weight Increment Chips */}
                  <div className="flex items-center justify-center space-x-1.5 pt-1 flex-wrap gap-y-1">
                    {[-5, -2.5, -1, +1, +2.5, +5].map((delta) => (
                      <button
                        key={`w-${delta}`}
                        type="button"
                        onClick={() => setLoggedWeight(Math.max(0, loggedWeight + delta))}
                        className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono font-medium text-zinc-300 active:scale-95 transition"
                      >
                        {delta > 0 ? `+${delta}` : delta}kg
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Estimated 1RM Preview */}
              {e1rm > 0 && (
                <div className="text-center text-xs font-mono text-zinc-500">
                  Estimated 1RM for this set: <span className="text-purple-400 font-bold">~{e1rm} kg</span>
                </div>
              )}

              {/* MASSIVE COMPLETE SET BUTTON */}
              <button
                onClick={handleCompleteSet}
                className="w-full py-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-black text-lg tracking-wider transition-all transform active:scale-[0.98] shadow-xl shadow-emerald-500/20 flex items-center justify-center space-x-3"
              >
                <Check className="w-6 h-6 stroke-[3]" />
                <span>COMPLETE SET #{currentSetIndex + 1}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar Controls */}
      <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-500">
        <div className="flex items-center space-x-2">
          <span>Started at: {new Date(startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <button
          onClick={() => setIsFinished(true)}
          className="text-emerald-400 hover:underline"
        >
          Finish Workout Early →
        </button>
      </div>
    </div>
  );
};
