import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  Clock,
  Pause,
  TimerReset,
  Undo2,
  X,
} from 'lucide-react';
import { RIR } from '../types';
import {
  addRestSeconds,
  getRestSecondsRemaining,
  pauseRestTimer,
  resumeRestTimer,
  startRestTimer,
  type RestTimerState,
} from '../lib/restTimer';

interface RestTimerPanelProps {
  timer: RestTimerState;
  selectedRir?: RIR;
  showRir: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  onChange: (timer: RestTimerState | null) => void;
  onSelectRir: (rir: RIR) => void;
  onUndo: () => void;
}

/**
 * The ticking clock lives in this small component so the complete workout
 * logger does not rerender every second during a rest period.
 */
export const RestTimerPanel = React.memo(function RestTimerPanel({
  timer,
  selectedRir,
  showRir,
  soundEnabled,
  vibrationEnabled,
  onChange,
  onSelectRir,
  onUndo,
}: RestTimerPanelProps) {
  const [now, setNow] = useState(Date.now());
  const notifiedTimer = useRef<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    if (timer.pausedRemaining !== undefined) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timer.endsAt, timer.pausedRemaining]);

  const remaining = getRestSecondsRemaining(timer, now);

  useEffect(() => {
    if (
      remaining !== 0 ||
      timer.pausedRemaining !== undefined ||
      notifiedTimer.current === timer.endsAt
    ) {
      return;
    }
    notifiedTimer.current = timer.endsAt;

    if (soundEnabled) {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (AudioContextClass) {
          const context = new AudioContextClass();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.value = 880;
          gain.gain.value = 0.08;
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.22);
        }
      } catch {
        // The visible timer remains the reliable fallback.
      }
    }
    if (vibrationEnabled && 'vibrate' in navigator) navigator.vibrate([150, 80, 150]);
  }, [remaining, soundEnabled, timer.endsAt, timer.pausedRemaining, vibrationEnabled]);

  return (
    <div
      className={`rounded-2xl border p-3 ${
        remaining > 0
          ? 'border-sky-500/30 bg-sky-500/10'
          : 'border-emerald-500/40 bg-emerald-500/10'
      }`}
      role="timer"
      aria-live={remaining === 0 ? 'assertive' : 'off'}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-sky-400" />
          <div>
            <div className="font-mono text-xl font-black text-zinc-100">
              {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
            </div>
            <div className="text-[9px] uppercase text-zinc-500">
              {remaining ? 'Resting' : 'Ready for the next set'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              onChange(
                timer.pausedRemaining === undefined
                  ? pauseRestTimer(timer)
                  : resumeRestTimer(timer)
              )
            }
            className="touch-target rounded-xl bg-zinc-950/60 text-zinc-200"
            aria-label={timer.pausedRemaining === undefined ? 'Pause timer' : 'Resume timer'}
          >
            {timer.pausedRemaining === undefined ? (
              <Pause className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onChange(addRestSeconds(timer, 30))}
            className="touch-target rounded-xl bg-zinc-950/60 font-mono text-xs text-zinc-200"
            aria-label="Add 30 seconds"
          >
            +30
          </button>
          <button
            type="button"
            onClick={() => onChange(startRestTimer(timer.durationSeconds))}
            className="touch-target rounded-xl bg-zinc-950/60 text-zinc-200"
            aria-label="Restart timer"
          >
            <TimerReset className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="touch-target rounded-xl bg-zinc-950/60 text-zinc-400"
            aria-label="Skip rest timer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {showRir && (
        <div className="mt-3 flex items-center gap-1 overflow-x-auto border-t border-zinc-700/50 pt-2">
          <span className="mr-1 shrink-0 font-mono text-[9px] uppercase text-zinc-500">
            Optional RIR
          </span>
          {([0, 1, 2, 3, 4, 5] as RIR[]).map((rir) => (
            <button
              type="button"
              key={rir}
              onClick={() => onSelectRir(rir)}
              className={`h-9 min-w-9 rounded-lg border font-mono text-xs font-bold ${
                selectedRir === rir
                  ? 'border-emerald-500 bg-emerald-500 text-zinc-950'
                  : 'border-zinc-700 bg-zinc-950 text-zinc-300'
              }`}
            >
              {rir}
            </button>
          ))}
          <button
            type="button"
            onClick={onUndo}
            className="ml-auto flex h-9 items-center gap-1 rounded-lg px-2 text-xs text-amber-300"
          >
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </button>
        </div>
      )}
    </div>
  );
});
