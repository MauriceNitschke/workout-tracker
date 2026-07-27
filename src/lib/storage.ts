import { AppState } from '../types';
import { getCleanSlateState, getInitialSeedState } from '../data/seedData';

const LEGACY_STORAGE_KEY = 'training_os_app_state_v1';
const GUEST_STORAGE_KEY = 'training_os_guest_state_v2';
const GUEST_ARCHIVE_KEY = 'training_os_guest_archive_v2';
const SCHEMA_VERSION = 2;

interface PersistedState {
  schemaVersion: number;
  updatedAt: string;
  data: AppState;
}

function hasArray(value: unknown, key: keyof AppState): boolean {
  return typeof value === 'object' && value !== null && Array.isArray((value as AppState)[key]);
}

export function isValidAppState(value: unknown): value is AppState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Partial<AppState>;
  return (
    hasArray(value, 'programs') &&
    hasArray(value, 'exercises') &&
    hasArray(value, 'workoutTemplates') &&
    hasArray(value, 'weeks') &&
    hasArray(value, 'scheduledWorkouts') &&
    hasArray(value, 'workoutExecutions') &&
    hasArray(value, 'enduranceActivities') &&
    hasArray(value, 'recoveryActivities') &&
    typeof state.activeProgramId === 'string' &&
    (typeof state.activeWorkoutId === 'string' || state.activeWorkoutId === null)
  );
}

function persist(key: string, state: AppState): void {
  const envelope: PersistedState = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    data: state,
  };
  localStorage.setItem(key, JSON.stringify(envelope));
}

function parsePersisted(raw: string | null): AppState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedState | AppState;
    const candidate =
      typeof parsed === 'object' && parsed !== null && 'data' in parsed ? parsed.data : parsed;
    return isValidAppState(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function loadGuestAppState(): AppState {
  const current = parsePersisted(localStorage.getItem(GUEST_STORAGE_KEY));
  if (current) return current;

  const legacy = parsePersisted(localStorage.getItem(LEGACY_STORAGE_KEY));
  if (legacy) {
    saveGuestAppState(legacy);
    return legacy;
  }

  const seed = getInitialSeedState();
  saveGuestAppState(seed);
  return seed;
}

export const loadAppState = loadGuestAppState;

export function saveGuestAppState(state: AppState): void {
  try {
    persist(GUEST_STORAGE_KEY, state);
  } catch (error) {
    console.error('Failed to save guest state:', error);
  }
}

export const saveAppState = saveGuestAppState;

export function archiveGuestAppState(state: AppState): void {
  try {
    persist(GUEST_ARCHIVE_KEY, state);
  } catch (error) {
    console.error('Failed to archive guest state:', error);
  }
}

export function resetAppStateToSeed(): AppState {
  const seed = getInitialSeedState();
  saveGuestAppState(seed);
  return seed;
}

export function clearAppStateToCleanSlate(): AppState {
  const clean = getCleanSlateState();
  saveGuestAppState(clean);
  return clean;
}

export function exportAppStateJSON(state: AppState): void {
  const backup = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: state,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `training_os_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function parseAppStateBackup(raw: string): AppState {
  const parsed = JSON.parse(raw) as PersistedState | AppState;
  const candidate =
    typeof parsed === 'object' && parsed !== null && 'data' in parsed ? parsed.data : parsed;
  if (!isValidAppState(candidate)) {
    throw new Error('This file is not a valid Training OS backup.');
  }
  return candidate;
}
