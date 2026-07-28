import { PlannedExercise } from '../types';

export interface WorkoutPosition {
  exerciseIndex: number;
  setIndex: number;
}

export function getNextWorkoutPosition(
  exercises: PlannedExercise[],
  exerciseIndex: number,
  setIndex: number
): WorkoutPosition | null {
  const current = exercises[exerciseIndex];
  if (!current) return null;
  if (current.blockId && current.blockType && current.blockType !== 'straight') {
    const groupIndexes = exercises
      .map((entry, index) => entry.blockId === current.blockId ? index : -1)
      .filter((index) => index >= 0);
    const groupPosition = groupIndexes.indexOf(exerciseIndex);
    const nextInGroup = groupIndexes.slice(groupPosition + 1).find(
      (index) => exercises[index].plannedSets[setIndex]
    );
    if (nextInGroup !== undefined) return { exerciseIndex: nextInGroup, setIndex };
    const nextRound = setIndex + 1;
    const firstInNextRound = groupIndexes.find(
      (index) => exercises[index].plannedSets[nextRound]
    );
    if (firstInNextRound !== undefined) {
      return { exerciseIndex: firstInNextRound, setIndex: nextRound };
    }
    const nextExercise = Math.max(...groupIndexes) + 1;
    return nextExercise < exercises.length ? { exerciseIndex: nextExercise, setIndex: 0 } : null;
  }
  if (setIndex < current.plannedSets.length - 1) {
    return { exerciseIndex, setIndex: setIndex + 1 };
  }
  return exerciseIndex < exercises.length - 1
    ? { exerciseIndex: exerciseIndex + 1, setIndex: 0 }
    : null;
}
