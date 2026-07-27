import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { AppState } from '../types';
import { db } from './firebase';

const SCHEMA_VERSION = 2;
const COLLECTIONS = [
  'programs',
  'exercises',
  'workoutTemplates',
  'weeks',
  'scheduledWorkouts',
  'workoutExecutions',
  'enduranceActivities',
  'recoveryActivities',
] as const;

type CollectionKey = (typeof COLLECTIONS)[number];

interface CloudMeta {
  schemaVersion: number;
  activeProgramId: string;
  activeWorkoutId: string | null;
  revision?: number;
}

function requireDb() {
  if (!db) throw new Error('Firebase is not configured.');
  return db;
}

function userDoc(uid: string, ...segments: string[]) {
  return doc(requireDb(), 'users', uid, ...segments);
}

export async function cloudDatasetExists(uid: string): Promise<boolean> {
  return (await getDoc(userDoc(uid, 'meta', 'state'))).exists();
}

export async function loadCloudState(uid: string): Promise<AppState | null> {
  const metaSnapshot = await getDoc(userDoc(uid, 'meta', 'state'));
  if (!metaSnapshot.exists()) return null;
  const meta = metaSnapshot.data() as CloudMeta;

  const entries = await Promise.all(
    COLLECTIONS.map(async (key) => {
      const snapshot = await getDocs(collection(requireDb(), 'users', uid, key));
      return [key, snapshot.docs.map((item) => item.data().data ?? item.data())] as const;
    })
  );

  const records = Object.fromEntries(entries) as Record<CollectionKey, DocumentData[]>;
  return {
    programs: records.programs as AppState['programs'],
    activeProgramId: meta.activeProgramId,
    exercises: records.exercises as AppState['exercises'],
    workoutTemplates: records.workoutTemplates as AppState['workoutTemplates'],
    weeks: records.weeks as AppState['weeks'],
    scheduledWorkouts: records.scheduledWorkouts as AppState['scheduledWorkouts'],
    workoutExecutions: records.workoutExecutions as AppState['workoutExecutions'],
    enduranceActivities: records.enduranceActivities as AppState['enduranceActivities'],
    recoveryActivities: records.recoveryActivities as AppState['recoveryActivities'],
    activeWorkoutId: meta.activeWorkoutId ?? null,
  };
}

async function synchronizeCollection(
  uid: string,
  key: CollectionKey,
  records: Array<{ id: string }>,
  previousRecords?: Array<{ id: string }>
): Promise<void> {
  const database = requireDb();
  const reference = collection(database, 'users', uid, key);
  const incomingIds = new Set(records.map((record) => record.id));
  const previousById = new Map((previousRecords ?? []).map((record) => [record.id, record]));
  const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

  for (const record of records) {
    const previous = previousById.get(record.id);
    if (previous && JSON.stringify(previous) === JSON.stringify(record)) continue;
    operations.push((batch) =>
      batch.set(doc(reference, record.id), {
        data: record,
        schemaVersion: SCHEMA_VERSION,
        updatedAt: serverTimestamp(),
      })
    );
  }

  for (const previous of previousRecords ?? []) {
    if (!incomingIds.has(previous.id)) {
      operations.push((batch) => batch.delete(doc(reference, previous.id)));
    }
  }

  for (let index = 0; index < operations.length; index += 400) {
    const batch = writeBatch(database);
    operations.slice(index, index + 400).forEach((operation) => operation(batch));
    await batch.commit();
  }
}

export async function saveCloudState(
  uid: string,
  state: AppState,
  previousState?: AppState
): Promise<void> {
  await Promise.all(
    COLLECTIONS.map((key) =>
      synchronizeCollection(
        uid,
        key,
        state[key] as Array<{ id: string }>,
        previousState?.[key] as Array<{ id: string }> | undefined
      )
    )
  );

  const metaReference = userDoc(uid, 'meta', 'state');
  const previous = await getDoc(metaReference);
  await setDoc(metaReference, {
    schemaVersion: SCHEMA_VERSION,
    activeProgramId: state.activeProgramId,
    activeWorkoutId: state.activeWorkoutId,
    revision: increment(1),
    updatedAt: serverTimestamp(),
    initializedAt: previous.data()?.initializedAt ?? serverTimestamp(),
  });
}

export function subscribeToCloudState(
  uid: string,
  onState: (state: AppState) => void,
  onError: (error: Error) => void
): Unsubscribe {
  let latestRevision = -1;
  return onSnapshot(
    userDoc(uid, 'meta', 'state'),
    async (snapshot) => {
      if (!snapshot.exists()) return;
      const revision = Number(snapshot.data().revision ?? 0);
      if (revision === latestRevision) return;
      latestRevision = revision;
      try {
        const state = await loadCloudState(uid);
        if (state) onState(state);
      } catch (error) {
        onError(error instanceof Error ? error : new Error('Unable to load cloud data.'));
      }
    },
    (error) => onError(error)
  );
}

export async function deleteCloudDataset(uid: string): Promise<void> {
  for (const key of COLLECTIONS) {
    const snapshot = await getDocs(collection(requireDb(), 'users', uid, key));
    await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
  }
  await deleteDoc(userDoc(uid, 'meta', 'state'));
}
