import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onSchedule } from 'firebase-functions/v2/scheduler';

initializeApp();

interface Preferences {
  notificationsEnabled?: boolean;
  morningReminderEnabled?: boolean;
  morningReminderTime?: string;
  preWorkoutReminderMinutes?: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  weeklyBodyweightReminderEnabled?: boolean;
  weeklyBodyweightReminderDay?: number;
  weeklyBodyweightReminderTime?: string;
  missedWorkoutPromptEnabled?: boolean;
}

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    time: `${value('hour')}:${value('minute')}`,
    weekday: value('weekday'),
  };
}

function withinFiveMinutes(current: string, target?: string): boolean {
  if (!target) return false;
  const minutes = (value: string) => {
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
  };
  const difference = minutes(current) - minutes(target);
  return difference >= 0 && difference < 5;
}

function minuteOfDay(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function inQuietHours(current: string, start?: string, end?: string): boolean {
  if (!start || !end) return false;
  const now = minuteOfDay(current);
  const from = minuteOfDay(start);
  const to = minuteOfDay(end);
  return from < to ? now >= from && now < to : now >= from || now < to;
}

async function sendOnce(
  uid: string,
  token: string,
  key: string,
  title: string,
  body: string,
  route: string
) {
  const db = getFirestore();
  const receipt = db.doc(`users/${uid}/notificationReceipts/${key}`);
  if ((await receipt.get()).exists) return;
  await getMessaging().send({
    token,
    notification: { title, body },
    webpush: { fcmOptions: { link: route } },
    data: { route, tag: key },
  });
  await receipt.set({ sentAt: Timestamp.now() });
}

export const dispatchTrainingReminders = onSchedule(
  { schedule: 'every 5 minutes', timeZone: 'UTC', region: 'europe-west1' },
  async () => {
    const db = getFirestore();
    const subscriptions = await db.collectionGroup('pushSubscriptions').get();
    const now = new Date();

    await Promise.all(subscriptions.docs.map(async (subscriptionDoc) => {
      const token = subscriptionDoc.get('data.fcmToken') as string | undefined;
      const timeZone = (subscriptionDoc.get('data.timeZone') as string | undefined) ?? 'UTC';
      if (!token) return;
      const uid = subscriptionDoc.ref.parent.parent?.id;
      if (!uid) return;

      const meta = await db.doc(`users/${uid}/meta/state`).get();
      const preferences = (meta.get('preferences') ?? {}) as Preferences;
      if (!preferences.notificationsEnabled) return;
      const local = localParts(now, timeZone);
      if (inQuietHours(local.time, preferences.quietHoursStart, preferences.quietHoursEnd)) return;
      const workouts = await db.collection(`users/${uid}/scheduledWorkouts`)
        .where('data.date', '==', local.date)
        .get();

      if (withinFiveMinutes(local.time, preferences.morningReminderTime)) {
        const morningWorkouts = workouts.docs.filter((workout) => {
          const override = workout.get('data.reminderOverrides.morningEnabled') as boolean | undefined;
          return override ?? preferences.morningReminderEnabled;
        });
        if (morningWorkouts.length) {
          await sendOnce(
            uid,
            token,
            `morning-${local.date}-${subscriptionDoc.id}`,
            'Training today',
            morningWorkouts.length === 1
              ? 'Your planned workout is ready.'
              : `${morningWorkouts.length} workouts are planned today.`,
            '#/today'
          );
        }
      }

      for (const workout of workouts.docs) {
        const data = workout.get('data') as {
          id: string;
          title: string;
          startTime?: string;
          status?: string;
          reminderOverrides?: { preWorkoutMinutes?: number | null; missedWorkoutEnabled?: boolean };
        };
        const lead = data.reminderOverrides?.preWorkoutMinutes ??
          preferences.preWorkoutReminderMinutes ?? 60;
        if (data.startTime && lead !== null) {
          const target = minuteOfDay(data.startTime) - lead;
          if (minuteOfDay(local.time) >= target && minuteOfDay(local.time) < target + 5) {
            await sendOnce(
              uid,
              token,
              `pre-${local.date}-${workout.id}-${subscriptionDoc.id}`,
              `${data.title} starts soon`,
              `Planned start is ${data.startTime}.`,
              '#/train'
            );
          }
        }
        const missedEnabled = data.reminderOverrides?.missedWorkoutEnabled ??
          preferences.missedWorkoutPromptEnabled;
        if (
          missedEnabled &&
          data.status !== 'Completed' &&
          withinFiveMinutes(local.time, '20:00')
        ) {
          await sendOnce(
            uid,
            token,
            `missed-${local.date}-${workout.id}-${subscriptionDoc.id}`,
            'Workout still open',
            `Reschedule or complete ${data.title}.`,
            '#/today'
          );
        }
      }

      if (
        preferences.weeklyBodyweightReminderEnabled &&
        local.weekday === 'Mon' &&
        withinFiveMinutes(local.time, preferences.weeklyBodyweightReminderTime)
      ) {
        await sendOnce(
          uid,
          token,
          `bodyweight-${local.date}-${subscriptionDoc.id}`,
          'Weekly bodyweight',
          'Add this week’s bodyweight snapshot before training.',
          '#/account'
        );
      }
    }));
  }
);
