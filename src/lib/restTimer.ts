export interface RestTimerState {
  endsAt: number;
  durationSeconds: number;
  pausedRemaining?: number;
}

export const startRestTimer = (durationSeconds: number, now = Date.now()): RestTimerState => ({
  endsAt: now + durationSeconds * 1000,
  durationSeconds,
});

export const getRestSecondsRemaining = (timer: RestTimerState, now = Date.now()): number =>
  timer.pausedRemaining ?? Math.max(0, Math.ceil((timer.endsAt - now) / 1000));

export const pauseRestTimer = (timer: RestTimerState, now = Date.now()): RestTimerState => ({
  ...timer,
  pausedRemaining: getRestSecondsRemaining(timer, now),
});

export const resumeRestTimer = (timer: RestTimerState, now = Date.now()): RestTimerState => ({
  ...timer,
  endsAt: now + (timer.pausedRemaining ?? 0) * 1000,
  pausedRemaining: undefined,
});

export const addRestSeconds = (
  timer: RestTimerState,
  seconds: number,
  now = Date.now()
): RestTimerState => {
  const remaining = getRestSecondsRemaining(timer, now) + seconds;
  return {
    ...timer,
    endsAt: now + remaining * 1000,
    pausedRemaining: timer.pausedRemaining === undefined ? undefined : remaining,
  };
};
