import type { DocumentData, Unsubscribe } from 'firebase/firestore';
import { AppState } from '../types';
import { getFirebaseServices } from './firebase';
import { migrateAppState, SCHEMA_VERSION } from './storage';

const COLLECTIONS = [
  'programs',
  'exercises',
  'workoutTemplates',
  'weeks',
  'scheduledWorkouts',
  'workoutExecutions',
  'workoutDrafts',
  'workoutChangeEvents',
  'bodyweightEntries',
  'activeEditorLeases',
  'pushSubscriptions',
  'weeklySchedulePatterns',
  'progressionRecommendations',
  'enduranceActivities',
  'recoveryActivities',
] as const;

type CollectionKey = (typeof COLLECTIONS)[number];

interface CloudMeta {
  schemaVersion: number;
  activeProgramId: string;
  activeWorkoutId: string | null;
  revision?: number;
  preferences?: AppState['preferences'];
  changedCollections?: CollectionKey[];
  lastWriterId?: string;
}

function validChangedCollections(value: unknown): CollectionKey[] {
  if (!Array.isArray(value)) return [...COLLECTIONS];
  const allowed = new Set<string>(COLLECTIONS);
  return value.filter(
    (key): key is CollectionKey => typeof key === 'string' && allowed.has(key)
  );
}

/**
 * Firestore rejects `undefined` anywhere in a document. App records use
 * optional properties, so omit those values recursively before writing while
 * preserving arrays, nulls, and all defined values.
 */
function withoutUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutUndefined);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nestedValue]) => nestedValue !== undefined)
        .map(([key, nestedValue]) => [key, withoutUndefined(nestedValue)])
    );
  }
  return value;
}

function recordsEqual(
  current: Array<{ id: string }>,
  previous?: Array<{ id: string }>
): boolean {
  if (!previous || current.length !== previous.length) return false;
  return JSON.stringify(current) === JSON.stringify(previous);
}

export async function cloudDatasetExists(uid: string): Promise<boolean> {
  const { db, firestoreApi } = await getFirebaseServices();
  return (
    await firestoreApi.getDoc(firestoreApi.doc(db, 'users', uid, 'meta', 'state'))
  ).exists();
}

async function loadCloudStateWithMeta(
  uid: string,
  meta: CloudMeta,
  baseState?: AppState,
  requestedCollections: CollectionKey[] = [...COLLECTIONS]
): Promise<AppState> {
  const { db, firestoreApi } = await getFirebaseServices();
  const entries = await Promise.all(
    requestedCollections.map(async (key) => {
      const snapshot = await firestoreApi.getDocs(
        firestoreApi.collection(db, 'users', uid, key)
      );
      return [key, snapshot.docs.map((item) => item.data().data ?? item.data())] as const;
    })
  );

  const records = Object.fromEntries(entries) as Partial<
    Record<CollectionKey, DocumentData[]>
  >;
  const baseCollections = baseState as unknown as Record<CollectionKey, DocumentData[]>;
  const valueFor = (key: CollectionKey): DocumentData[] =>
    records[key] ?? baseCollections?.[key] ?? [];

  return migrateAppState({
    ...(baseState ?? {}),
    programs: valueFor('programs'),
    activeProgramId: meta.activeProgramId,
    exercises: valueFor('exercises'),
    workoutTemplates: valueFor('workoutTemplates'),
    weeks: valueFor('weeks'),
    scheduledWorkouts: valueFor('scheduledWorkouts'),
    workoutExecutions: valueFor('workoutExecutions'),
    workoutDrafts: valueFor('workoutDrafts'),
    workoutChangeEvents: valueFor('workoutChangeEvents'),
    bodyweightEntries: valueFor('bodyweightEntries'),
    activeEditorLeases: valueFor('activeEditorLeases'),
    pushSubscriptions: valueFor('pushSubscriptions'),
    weeklySchedulePatterns: valueFor('weeklySchedulePatterns'),
    progressionRecommendations: valueFor('progressionRecommendations'),
    preferences: meta.preferences ?? baseState?.preferences,
    enduranceActivities: valueFor('enduranceActivities'),
    recoveryActivities: valueFor('recoveryActivities'),
    activeWorkoutId: meta.activeWorkoutId ?? null,
  } as AppState);
}

export async function loadCloudState(uid: string): Promise<AppState | null> {
  const { db, firestoreApi } = await getFirebaseServices();
  const metaSnapshot = await firestoreApi.getDoc(
    firestoreApi.doc(db, 'users', uid, 'meta', 'state')
  );
  if (!metaSnapshot.exists()) return null;
  return loadCloudStateWithMeta(uid, metaSnapshot.data() as CloudMeta);
}

async function synchronizeCollection(
  uid: string,
  key: CollectionKey,
  records: Array<{ id: string }>,
  previousRecords?: Array<{ id: string }>
): Promise<void> {
  const { db, firestoreApi } = await getFirebaseServices();
  const reference = firestoreApi.collection(db, 'users', uid, key);
  const incomingIds = new Set(records.map((record) => record.id));
  const previousById = new Map((previousRecords ?? []).map((record) => [record.id, record]));
  const operations: Array<(batch: ReturnType<typeof firestoreApi.writeBatch>) => void> = [];

  for (const record of records) {
    const previous = previousById.get(record.id);
    if (previous && JSON.stringify(previous) === JSON.stringify(record)) continue;
    operations.push((batch) =>
      batch.set(firestoreApi.doc(reference, record.id), {
        data: withoutUndefined(record),
        schemaVersion: SCHEMA_VERSION,
        updatedAt: firestoreApi.serverTimestamp(),
      })
    );
  }

  for (const previous of previousRecords ?? []) {
    if (!incomingIds.has(previous.id)) {
      operations.push((batch) => batch.delete(firestoreApi.doc(reference, previous.id)));
    }
  }

  for (let index = 0; index < operations.length; index += 400) {
    const batch = firestoreApi.writeBatch(db);
    operations.slice(index, index + 400).forEach((operation) => operation(batch));
    await batch.commit();
  }
}

export async function saveCloudState(
  uid: string,
  state: AppState,
  previousState?: AppState,
  clientId = ''
): Promise<void> {
  const collections = state as unknown as Record<CollectionKey, Array<{ id: string }>>;
  const previousCollections = previousState as unknown as
    Record<CollectionKey, Array<{ id: string }>> | undefined;
  const changedCollections = COLLECTIONS.filter(
    (key) =>
      !recordsEqual(
        collections[key],
        previousCollections?.[key]
      )
  );

  await Promise.all(
    changedCollections.map((key) =>
      synchronizeCollection(
        uid,
        key,
        collections[key],
        previousCollections?.[key]
      )
    )
  );

  const { db, firestoreApi } = await getFirebaseServices();
  const metaReference = firestoreApi.doc(db, 'users', uid, 'meta', 'state');
  const metadata: Record<string, unknown> = {
    schemaVersion: SCHEMA_VERSION,
    activeProgramId: state.activeProgramId,
    activeWorkoutId: state.activeWorkoutId,
    preferences: withoutUndefined(state.preferences),
    revision: firestoreApi.increment(1),
    changedCollections,
    lastWriterId: clientId,
    updatedAt: firestoreApi.serverTimestamp(),
  };
  if (!previousState) metadata.initializedAt = firestoreApi.serverTimestamp();
  await firestoreApi.setDoc(metaReference, metadata, { merge: true });
}

interface CloudSubscriptionOptions {
  clientId: string;
  getCurrentState: () => AppState;
}

export async function subscribeToCloudState(
  uid: string,
  options: CloudSubscriptionOptions,
  onState: (state: AppState) => void,
  onError: (error: Error) => void
): Promise<Unsubscribe> {
  const { db, firestoreApi } = await getFirebaseServices();
  let latestRevision = -1;

  return firestoreApi.onSnapshot(
    firestoreApi.doc(db, 'users', uid, 'meta', 'state'),
    async (snapshot) => {
      if (!snapshot.exists() || snapshot.metadata.hasPendingWrites) return;
      const meta = snapshot.data() as CloudMeta;
      const revision = Number(meta.revision ?? 0);
      if (revision === latestRevision) return;

      // The caller has already loaded or initialized the current dataset before
      // subscribing. Treat the first snapshot as the baseline.
      if (latestRevision === -1) {
        latestRevision = revision;
        return;
      }
      latestRevision = revision;

      // Firestore reports committed local writes to this listener too. They are
      // already represented in React state and must not trigger a cloud reload.
      if (meta.lastWriterId && meta.lastWriterId === options.clientId) return;

      try {
        const changedCollections = validChangedCollections(meta.changedCollections);
        const state = await loadCloudStateWithMeta(
          uid,
          meta,
          options.getCurrentState(),
          changedCollections
        );
        onState(state);
      } catch (error) {
        onError(error instanceof Error ? error : new Error('Unable to load cloud data.'));
      }
    },
    (error) => onError(error)
  );
}

export async function deleteCloudDataset(uid: string): Promise<void> {
  const { db, firestoreApi } = await getFirebaseServices();
  for (const key of COLLECTIONS) {
    const snapshot = await firestoreApi.getDocs(
      firestoreApi.collection(db, 'users', uid, key)
    );
    await Promise.all(snapshot.docs.map((item) => firestoreApi.deleteDoc(item.ref)));
  }
  await firestoreApi.deleteDoc(firestoreApi.doc(db, 'users', uid, 'meta', 'state'));
}
