import React, { useState } from 'react';
import {
  HeartPulse,
  Plus,
  Flame,
  Activity,
  Calendar,
  Clock,
  Trash2,
} from 'lucide-react';
import {
  AppState,
  EnduranceActivity,
  RecoveryActivity,
  RecoveryType,
} from '../types';

interface EnduranceRecoveryTrackerProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
}

export const EnduranceRecoveryTracker: React.FC<EnduranceRecoveryTrackerProps> = ({
  state,
  onUpdateState,
}) => {
  const currentWeek = state.weeks.find((w) => w.status === 'In Progress') || state.weeks[0];

  // Forms State
  const [showEnduranceModal, setShowEnduranceModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // Endurance Form
  const [endTitle, setEndTitle] = useState('Zone 2 Base Run');
  const [endDuration, setEndDuration] = useState(30);
  const [endDistance, setEndDistance] = useState(5.0);
  const [endNotes, setEndNotes] = useState('');

  // Recovery Form
  const [recTitle, setRecTitle] = useState('Sauna Session');
  const [recType, setRecType] = useState<RecoveryType>('Sauna');
  const [recDuration, setRecDuration] = useState(20);
  const [recNotes, setRecNotes] = useState('');

  // Save Endurance Activity
  const handleSaveEndurance = () => {
    if (!currentWeek) return;

    const newEndurance: EnduranceActivity = {
      id: `end-${Date.now()}`,
      weekId: currentWeek.id,
      date: new Date().toISOString().slice(0, 10),
      title: endTitle,
      durationMinutes: Number(endDuration),
      distanceKm: Number(endDistance) || undefined,
      notes: endNotes,
    };

    onUpdateState({
      ...state,
      enduranceActivities: [newEndurance, ...state.enduranceActivities],
    });

    setShowEnduranceModal(false);
  };

  // Save Recovery Activity
  const handleSaveRecovery = () => {
    if (!currentWeek) return;

    const newRecovery: RecoveryActivity = {
      id: `rec-${Date.now()}`,
      weekId: currentWeek.id,
      date: new Date().toISOString().slice(0, 10),
      title: recTitle,
      type: recType,
      durationMinutes: Number(recDuration),
      notes: recNotes,
    };

    onUpdateState({
      ...state,
      recoveryActivities: [newRecovery, ...state.recoveryActivities],
    });

    setShowRecoveryModal(false);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div>
          <div className="flex items-center space-x-2 text-zinc-400 text-xs font-mono uppercase tracking-wider mb-1">
            <span>COMPLEMENTARY LOGS</span>
            <span>•</span>
            <span className="text-red-400 font-semibold">CARDIO & RECOVERY</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Endurance & Recovery Activity Logs
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Track aerobic base work, mobility sessions, sauna, and stretching alongside strength weeks.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowEnduranceModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2 text-xs font-mono font-bold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700"
          >
            <Activity className="w-4 h-4 text-rose-400" />
            <span>LOG ENDURANCE</span>
          </button>

          <button
            onClick={() => setShowRecoveryModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2 text-xs font-mono font-bold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700"
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>LOG RECOVERY</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Endurance Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase text-zinc-400 font-semibold tracking-wider flex items-center space-x-2">
              <Activity className="w-4 h-4 text-rose-400" />
              <span>Endurance Activities ({state.enduranceActivities.length})</span>
            </h2>
          </div>

          <div className="space-y-3">
            {state.enduranceActivities.map((act) => (
              <div
                key={act.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2 text-xs font-mono"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-100">{act.title}</h3>
                  <span className="text-zinc-500">{act.date}</span>
                </div>
                <div className="flex items-center space-x-4 text-zinc-400">
                  <span>Duration: {act.durationMinutes} min</span>
                  {act.distanceKm && <span>Distance: {act.distanceKm} km</span>}
                </div>
                {act.notes && (
                  <p className="text-zinc-500 text-[11px] italic bg-zinc-950 p-2 rounded">
                    "{act.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recovery Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase text-zinc-400 font-semibold tracking-wider flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Recovery Modalities ({state.recoveryActivities.length})</span>
            </h2>
          </div>

          <div className="space-y-3">
            {state.recoveryActivities.map((rec) => (
              <div
                key={rec.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2 text-xs font-mono"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                      {rec.type}
                    </span>
                    <h3 className="text-sm font-bold text-zinc-100">{rec.title}</h3>
                  </div>
                  <span className="text-zinc-500">{rec.date}</span>
                </div>
                <div className="text-zinc-400">Duration: {rec.durationMinutes} minutes</div>
                {rec.notes && (
                  <p className="text-zinc-500 text-[11px] italic bg-zinc-950 p-2 rounded">
                    "{rec.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Endurance Modal */}
      {showEnduranceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-zinc-100">Log Endurance Activity</h3>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-zinc-400 uppercase block mb-1">Title</label>
                <input
                  type="text"
                  value={endTitle}
                  onChange={(e) => setEndTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 uppercase block mb-1">Duration (Min)</label>
                  <input
                    type="number"
                    value={endDuration}
                    onChange={(e) => setEndDuration(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 uppercase block mb-1">Distance (Km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={endDistance}
                    onChange={(e) => setEndDistance(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 uppercase block mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Nasal breathing, avg HR 135 bpm"
                  value={endNotes}
                  onChange={(e) => setEndNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowEnduranceModal(false)}
                className="px-3 py-1.5 text-xs font-mono text-zinc-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEndurance}
                className="px-4 py-2 text-xs font-mono font-bold bg-rose-500 text-zinc-950 rounded-lg"
              >
                LOG ACTIVITY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-zinc-100">Log Recovery Activity</h3>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-zinc-400 uppercase block mb-1">Title</label>
                <input
                  type="text"
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 uppercase block mb-1">Modality Type</label>
                  <select
                    value={recType}
                    onChange={(e) => setRecType(e.target.value as RecoveryType)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  >
                    <option value="Sauna">Sauna</option>
                    <option value="Stretching">Stretching</option>
                    <option value="Mobility">Mobility</option>
                    <option value="Yoga">Yoga</option>
                    <option value="Massage">Massage</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 uppercase block mb-1">Duration (Min)</label>
                  <input
                    type="number"
                    value={recDuration}
                    onChange={(e) => setRecDuration(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 uppercase block mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Post-leg session recovery"
                  value={recNotes}
                  onChange={(e) => setRecNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowRecoveryModal(false)}
                className="px-3 py-1.5 text-xs font-mono text-zinc-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRecovery}
                className="px-4 py-2 text-xs font-mono font-bold bg-amber-500 text-zinc-950 rounded-lg"
              >
                LOG RECOVERY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
