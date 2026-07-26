import { AppState } from '../types';
import { getInitialSeedState, getCleanSlateState } from '../data/seedData';

const STORAGE_KEY = 'training_os_app_state_v1';

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = getInitialSeedState();
      saveAppState(seed);
      return seed;
    }
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.weeks || !parsed.exercises || !parsed.scheduledWorkouts) {
      const seed = getInitialSeedState();
      saveAppState(seed);
      return seed;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load state from localStorage, falling back to seed:', err);
    const seed = getInitialSeedState();
    saveAppState(seed);
    return seed;
  }
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save app state:', err);
  }
}

export function resetAppStateToSeed(): AppState {
  const seed = getInitialSeedState();
  saveAppState(seed);
  return seed;
}

export function clearAppStateToCleanSlate(): AppState {
  const clean = getCleanSlateState();
  saveAppState(clean);
  return clean;
}


export function exportAppStateJSON(state: AppState): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `training_os_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
