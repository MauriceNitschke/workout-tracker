import React, { useState } from 'react';
import {
  Plus,
  Dumbbell,
  Search,
  SlidersHorizontal,
  Award,
  Layers,
  Check,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import {
  AppState,
  Exercise,
  ExerciseCategory,
  PRMetric,
  ProgressionStrategy,
  WorkoutTemplate,
} from '../types';
import { ExerciseDetailModal } from './ExerciseDetailModal';

interface ExerciseLibraryProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
}

export const ExerciseLibrary: React.FC<ExerciseLibraryProps> = ({
  state,
  onUpdateState,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'exercises' | 'templates'>('exercises');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState('All');

  // Exercise Creation Modal State
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExDesc, setNewExDesc] = useState('');
  const [newExPrimary, setNewExPrimary] = useState('Chest');
  const [newExSecondary, setNewExSecondary] = useState('Triceps');
  const [newExEquipment, setNewExEquipment] = useState('Barbell');
  const [newExMetric, setNewExMetric] = useState<PRMetric>('estimated_1rm');
  const [newExCategory, setNewExCategory] = useState<ExerciseCategory>('Strength');
  const [newExStrategy, setNewExStrategy] = useState<ProgressionStrategy>('Double Progression');
  const [newExDefaultNotes, setNewExDefaultNotes] = useState('');

  // Exercise Editing Modal State
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editExName, setEditExName] = useState('');
  const [editExDesc, setEditExDesc] = useState('');
  const [editExPrimary, setEditExPrimary] = useState('');
  const [editExSecondary, setEditExSecondary] = useState('');
  const [editExEquipment, setEditExEquipment] = useState('');
  const [editExMetric, setEditExMetric] = useState<PRMetric>('estimated_1rm');
  const [editExCategory, setEditExCategory] = useState<ExerciseCategory>('Strength');
  const [editExStrategy, setEditExStrategy] = useState<ProgressionStrategy>('Double Progression');
  const [editExDefaultNotes, setEditExDefaultNotes] = useState('');

  // Template Editing State
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [showAddTemplateExercisePicker, setShowAddTemplateExercisePicker] = useState(false);
  const [templateExerciseSearchQuery, setTemplateExerciseSearchQuery] = useState('');
  const [detailExerciseId, setDetailExerciseId] = useState<string | null>(null);

  // Handle Create New Template
  const handleCreateNewTemplate = () => {
    const newTpl: WorkoutTemplate = {
      id: `tpl-${Date.now()}`,
      name: 'New Workout Template',
      description: 'Custom training session structure.',
      plannedExercises: [],
    };
    setEditingTemplate(newTpl);
  };

  // Handle Save Template
  const handleSaveTemplate = () => {
    if (!editingTemplate || !editingTemplate.name.trim()) return;

    const exists = state.workoutTemplates.some((t) => t.id === editingTemplate.id);
    let updatedTemplates: WorkoutTemplate[];

    if (exists) {
      updatedTemplates = state.workoutTemplates.map((t) =>
        t.id === editingTemplate.id ? editingTemplate : t
      );
    } else {
      updatedTemplates = [...state.workoutTemplates, editingTemplate];
    }

    onUpdateState({
      ...state,
      workoutTemplates: updatedTemplates,
    });

    setEditingTemplate(null);
  };

  // Handle Delete Template
  const handleDeleteTemplate = (tplId: string) => {
    if (confirm('Are you sure you want to delete this workout template?')) {
      const filtered = state.workoutTemplates.filter((t) => t.id !== tplId);
      onUpdateState({
        ...state,
        workoutTemplates: filtered,
      });
      if (editingTemplate?.id === tplId) {
        setEditingTemplate(null);
      }
    }
  };

  // Add exercise to template draft
  const handleAddExerciseToTemplate = (ex: Exercise) => {
    if (!editingTemplate) return;

    const newPe = {
      id: `tpe-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      exerciseId: ex.id,
      order: editingTemplate.plannedExercises.length + 1,
      plannedSets: [
        { setNumber: 1, plannedReps: 8, plannedWeight: 60 },
        { setNumber: 2, plannedReps: 8, plannedWeight: 60 },
        { setNumber: 3, plannedReps: 8, plannedWeight: 60 },
      ],
      plannedNotes: ex.defaultNotes || '',
    };

    setEditingTemplate({
      ...editingTemplate,
      plannedExercises: [...editingTemplate.plannedExercises, newPe],
    });

    setShowAddTemplateExercisePicker(false);
  };

  // Remove exercise from template draft
  const handleRemoveExerciseFromTemplate = (peId: string) => {
    if (!editingTemplate) return;
    const filtered = editingTemplate.plannedExercises
      .filter((pe) => pe.id !== peId)
      .map((pe, idx) => ({ ...pe, order: idx + 1 }));

    setEditingTemplate({
      ...editingTemplate,
      plannedExercises: filtered,
    });
  };

  // Filter exercises
  const filteredExercises = state.exercises.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.primaryMuscles.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMuscle =
      selectedMuscleFilter === 'All' || e.primaryMuscles.includes(selectedMuscleFilter);

    return matchesSearch && matchesMuscle;
  });

  // Collect unique muscles for filter
  const allMuscles = Array.from(
    new Set(state.exercises.flatMap((e) => [...e.primaryMuscles, ...e.secondaryMuscles]))
  );

  // Handle Add New Exercise
  const handleSaveExercise = () => {
    if (!newExName.trim()) return;

    const newEx: Exercise = {
      id: `ex-custom-${Date.now()}`,
      name: newExName.trim(),
      description: newExDesc || 'Custom defined exercise.',
      primaryMuscles: newExPrimary.split(',').map((m) => m.trim()).filter(Boolean),
      secondaryMuscles: newExSecondary.split(',').map((m) => m.trim()).filter(Boolean),
      equipment: newExEquipment,
      progressionStrategy: newExStrategy,
      prMetric: newExMetric,
      category: newExCategory,
      defaultNotes: newExDefaultNotes || undefined,
    };

    onUpdateState({
      ...state,
      exercises: [newEx, ...state.exercises],
    });

    setNewExName('');
    setNewExDesc('');
    setNewExDefaultNotes('');
    setShowAddExerciseModal(false);
  };

  // Open Edit Exercise Modal
  const handleStartEdit = (e: Exercise) => {
    setEditingExercise(e);
    setEditExName(e.name);
    setEditExDesc(e.description);
    setEditExPrimary(e.primaryMuscles.join(', '));
    setEditExSecondary(e.secondaryMuscles.join(', '));
    setEditExEquipment(e.equipment);
    setEditExMetric(e.prMetric);
    setEditExCategory(e.category);
    setEditExStrategy(e.progressionStrategy);
    setEditExDefaultNotes(e.defaultNotes || '');
  };

  // Handle Save Edited Exercise
  const handleSaveEdit = () => {
    if (!editingExercise || !editExName.trim()) return;

    const updatedExercise: Exercise = {
      ...editingExercise,
      name: editExName.trim(),
      description: editExDesc || 'Defined exercise.',
      primaryMuscles: editExPrimary.split(',').map((m) => m.trim()).filter(Boolean),
      secondaryMuscles: editExSecondary.split(',').map((m) => m.trim()).filter(Boolean),
      equipment: editExEquipment,
      progressionStrategy: editExStrategy,
      prMetric: editExMetric,
      category: editExCategory,
      defaultNotes: editExDefaultNotes || undefined,
    };

    const updatedExercises = state.exercises.map((ex) =>
      ex.id === editingExercise.id ? updatedExercise : ex
    );

    onUpdateState({
      ...state,
      exercises: updatedExercises,
    });

    setEditingExercise(null);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div>
          <div className="flex items-center space-x-2 text-zinc-400 text-xs font-mono uppercase tracking-wider mb-1">
            <span>DOMAIN MODEL ENGINE</span>
            <span>•</span>
            <span className="text-purple-400 font-semibold">EXERCISES & TEMPLATES</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Exercise Catalog & Workout Templates
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configure reusable exercise definitions, primary muscles, progression strategies, and PR metrics.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowAddExerciseModal(true)}
            className="flex items-center space-x-2 px-3 sm:px-4 py-2.5 text-xs font-mono font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">NEW EXERCISE</span>
            <span className="sm:hidden">EXERCISE</span>
          </button>
          <button
            onClick={handleCreateNewTemplate}
            className="flex items-center space-x-2 px-3 sm:px-4 py-2.5 text-xs font-mono font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition shadow-lg shadow-emerald-500/10 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">NEW TEMPLATE</span>
            <span className="sm:hidden">TEMPLATE</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center space-x-3 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveSubTab('exercises')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-mono font-medium rounded-lg transition ${
            activeSubTab === 'exercises'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span>Exercise Definitions ({state.exercises.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('templates')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-mono font-medium rounded-lg transition ${
            activeSubTab === 'templates'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Workout Templates ({state.workoutTemplates.length})</span>
        </button>
      </div>

      {/* Exercises SubTab View */}
      {activeSubTab === 'exercises' && (
        <div className="space-y-6">
          {/* Search & Muscle Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search exercise by name or muscle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <select
              value={selectedMuscleFilter}
              onChange={(e) => setSelectedMuscleFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono rounded-lg p-2.5 focus:outline-none"
            >
              <option value="All">All Muscles</option>
              {allMuscles.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Exercise Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExercises.map((e) => (
              <div
                key={e.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3 flex flex-col justify-between hover:border-zinc-700 transition relative group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {e.category}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-zinc-500">
                        PR Metric: <strong className="text-purple-400">{e.prMetric}</strong>
                      </span>
                      <button
                        onClick={() => handleStartEdit(e)}
                        className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                        title="Edit Exercise Definition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3
                    onClick={() => setDetailExerciseId(e.id)}
                    className="text-base font-bold text-zinc-100 hover:text-emerald-400 cursor-pointer transition flex items-center justify-between"
                  >
                    <span>{e.name}</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-normal bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Analytics →
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{e.description}</p>
                  {e.defaultNotes && (
                    <p className="text-[11px] font-mono text-zinc-500 bg-zinc-950 p-2 rounded border border-zinc-800/80 italic">
                      Note: "{e.defaultNotes}"
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-800/80 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Primary: {e.primaryMuscles.join(', ')}</span>
                    <span>Eq: {e.equipment}</span>
                  </div>
                  {e.secondaryMuscles.length > 0 && (
                    <div className="text-[11px] text-zinc-500">
                      Secondary: {e.secondaryMuscles.join(', ')}
                    </div>
                  )}
                  <div className="text-[11px] text-zinc-500 flex justify-between">
                    <span>Strategy: {e.progressionStrategy}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Templates SubTab View */}
      {activeSubTab === 'templates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.workoutTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between hover:border-zinc-700 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-zinc-100">{tpl.name}</h3>
                      <p className="text-xs text-zinc-400 mt-1">{tpl.description}</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setEditingTemplate(tpl)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 transition"
                        title="Edit Template"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(tpl.id)}
                        className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 transition"
                        title="Delete Template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">
                      Planned Exercises ({tpl.plannedExercises.length})
                    </span>
                    {tpl.plannedExercises.length === 0 ? (
                      <p className="text-xs font-mono text-zinc-600 italic">No exercises added yet.</p>
                    ) : (
                      tpl.plannedExercises.map((pe, idx) => {
                        const ex = state.exercises.find((e) => e.id === pe.exerciseId);
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs font-mono flex items-center justify-between"
                          >
                            <span className="text-zinc-200 font-medium">{ex?.name || 'Exercise'}</span>
                            <span className="text-emerald-400 font-bold text-[11px]">
                              {pe.plannedSets.length} sets
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setEditingTemplate(tpl)}
                  className="w-full mt-2 py-2 text-xs font-mono font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 transition flex items-center justify-center space-x-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Configure Template</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-zinc-900 border border-zinc-800 sm:rounded-2xl rounded-t-2xl p-4 sm:p-6 max-w-2xl w-full h-[90vh] sm:h-auto max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center space-x-2 text-emerald-400 font-mono">
                  <Layers className="w-5 h-5" />
                  <h3 className="text-base sm:text-lg font-bold text-zinc-100">
                    Edit Workout Template
                  </h3>
                </div>
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Template Name & Description */}
              <div className="space-y-3 text-xs font-mono">
                <div>
                  <label className="text-zinc-400 uppercase font-bold text-[10px] block mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, name: e.target.value })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-bold focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 uppercase font-bold text-[10px] block mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.description}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, description: e.target.value })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-300 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Planned Exercises Header */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-zinc-300">
                    Template Exercises ({editingTemplate.plannedExercises.length})
                  </span>
                  <button
                    onClick={() => setShowAddTemplateExercisePicker(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-bold transition active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ADD EXERCISE</span>
                  </button>
                </div>

                {editingTemplate.plannedExercises.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-zinc-950 border border-dashed border-zinc-800 text-center space-y-2">
                    <p className="text-xs font-mono text-zinc-500">
                      No exercises in this template yet.
                    </p>
                    <button
                      onClick={() => setShowAddTemplateExercisePicker(true)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-zinc-800 text-emerald-400 text-xs font-mono font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Exercise</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editingTemplate.plannedExercises.map((pe, peIdx) => {
                      const ex = state.exercises.find((e) => e.id === pe.exerciseId);
                      return (
                        <div
                          key={pe.id}
                          className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2 text-xs font-mono"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-zinc-500 font-bold bg-zinc-900 px-2 py-0.5 rounded">
                                #{peIdx + 1}
                              </span>
                              <span className="font-bold text-zinc-100">{ex?.name || 'Exercise'}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveExerciseFromTemplate(pe.id)}
                              className="p-1 rounded text-rose-400 hover:bg-rose-950/40"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-[11px] text-zinc-400 flex items-center justify-between bg-zinc-900/60 p-2 rounded-xl">
                            <span>Default Sets: {pe.plannedSets.length}</span>
                            <span className="text-emerald-400 font-bold">
                              {pe.plannedSets[0]?.plannedReps || 8} reps @ {pe.plannedSets[0]?.plannedWeight || 60} kg
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800 mt-4">
              <button
                onClick={() => handleDeleteTemplate(editingTemplate.id)}
                className="px-3 py-2 text-xs font-mono font-bold text-rose-400 hover:bg-rose-950/30 rounded-xl transition"
              >
                Delete Template
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="px-5 py-2.5 text-xs font-mono font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition active:scale-95 shadow-lg shadow-emerald-500/10"
                >
                  SAVE TEMPLATE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Exercise to Template Modal Overlay */}
      {showAddTemplateExercisePicker && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 max-w-lg w-full max-h-[80vh] flex flex-col justify-between space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-100 font-mono">
                Select Exercise for Template
              </h3>
              <button
                onClick={() => setShowAddTemplateExercisePicker(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search exercises..."
                value={templateExerciseSearchQuery}
                onChange={(e) => setTemplateExerciseSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 font-mono focus:outline-none"
              />
            </div>

            <div className="overflow-y-auto space-y-2 max-h-[50vh] pr-1">
              {state.exercises
                .filter((ex) =>
                  ex.name.toLowerCase().includes(templateExerciseSearchQuery.toLowerCase())
                )
                .map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => handleAddExerciseToTemplate(ex)}
                    className="w-full text-left p-3 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800/80 flex items-center justify-between text-xs font-mono transition group"
                  >
                    <div>
                      <div className="font-bold text-zinc-200 group-hover:text-emerald-400">
                        {ex.name}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {ex.primaryMuscles.join(', ')} • {ex.equipment}
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Add New Exercise Modal */}
      {showAddExerciseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100">Add Custom Exercise</h3>
              <button
                onClick={() => setShowAddExerciseModal(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-zinc-400 uppercase block mb-1">Exercise Name</label>
                <input
                  type="text"
                  placeholder="e.g. Incline Cable Flye"
                  value={newExName}
                  onChange={(e) => setNewExName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 uppercase block mb-1">Description / Cues</label>
                <textarea
                  placeholder="Focus on chest stretch..."
                  value={newExDesc}
                  onChange={(e) => setNewExDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 uppercase block mb-1">Primary Muscles</label>
                  <input
                    type="text"
                    value={newExPrimary}
                    placeholder="e.g. Chest, Triceps"
                    onChange={(e) => setNewExPrimary(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 uppercase block mb-1">Secondary Muscles</label>
                  <input
                    type="text"
                    value={newExSecondary}
                    placeholder="e.g. Front Delts"
                    onChange={(e) => setNewExSecondary(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 uppercase block mb-1">Equipment</label>
                  <input
                    type="text"
                    value={newExEquipment}
                    onChange={(e) => setNewExEquipment(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 uppercase block mb-1">Category</label>
                  <select
                    value={newExCategory}
                    onChange={(e) => setNewExCategory(e.target.value as ExerciseCategory)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  >
                    <option value="Strength">Strength</option>
                    <option value="Bodyweight">Bodyweight</option>
                    <option value="Endurance">Endurance</option>
                    <option value="Flexibility">Flexibility</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 uppercase block mb-1">PR Metric</label>
                  <select
                    value={newExMetric}
                    onChange={(e) => setNewExMetric(e.target.value as PRMetric)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  >
                    <option value="estimated_1rm">Estimated 1RM</option>
                    <option value="highest_weight">Highest Weight</option>
                    <option value="max_reps">Max Reps</option>
                    <option value="longest_duration">Longest Duration</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 uppercase block mb-1">Progression Strategy</label>
                  <select
                    value={newExStrategy}
                    onChange={(e) => setNewExStrategy(e.target.value as ProgressionStrategy)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  >
                    <option value="Double Progression">Double Progression</option>
                    <option value="Linear">Linear</option>
                    <option value="Wave Loading">Wave Loading</option>
                    <option value="Step Loading">Step Loading</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 uppercase block mb-1">Default Notes / Form Cues</label>
                <input
                  type="text"
                  placeholder="e.g. Pause at top, 3s eccentric"
                  value={newExDefaultNotes}
                  onChange={(e) => setNewExDefaultNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowAddExerciseModal(false)}
                className="px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExercise}
                className="px-4 py-2 text-xs font-mono font-bold rounded-lg bg-emerald-500 text-zinc-950"
              >
                SAVE EXERCISE DEFINITION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Exercise Modal */}
      {editingExercise && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-purple-400" />
                <h3 className="text-base font-bold text-zinc-100">
                  Edit Exercise: {editingExercise.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingExercise(null)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-zinc-400 uppercase block mb-1">Exercise Name</label>
                <input
                  type="text"
                  value={editExName}
                  onChange={(e) => setEditExName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 uppercase block mb-1">Description / Cues</label>
                <textarea
                  rows={3}
                  value={editExDesc}
                  onChange={(e) => setEditExDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 uppercase block mb-1">Primary Muscles</label>
                  <input
                    type="text"
                    value={editExPrimary}
                    onChange={(e) => setEditExPrimary(e.target.value)}
                    placeholder="Chest, Triceps"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 uppercase block mb-1">Secondary Muscles</label>
                  <input
                    type="text"
                    value={editExSecondary}
                    onChange={(e) => setEditExSecondary(e.target.value)}
                    placeholder="Front Delts"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 uppercase block mb-1">Equipment</label>
                  <input
                    type="text"
                    value={editExEquipment}
                    onChange={(e) => setEditExEquipment(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 uppercase block mb-1">Category</label>
                  <select
                    value={editExCategory}
                    onChange={(e) => setEditExCategory(e.target.value as ExerciseCategory)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  >
                    <option value="Strength">Strength</option>
                    <option value="Bodyweight">Bodyweight</option>
                    <option value="Endurance">Endurance</option>
                    <option value="Flexibility">Flexibility</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 uppercase block mb-1">PR Metric</label>
                  <select
                    value={editExMetric}
                    onChange={(e) => setEditExMetric(e.target.value as PRMetric)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  >
                    <option value="estimated_1rm">Estimated 1RM</option>
                    <option value="highest_weight">Highest Weight</option>
                    <option value="max_reps">Max Reps</option>
                    <option value="longest_duration">Longest Duration</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 uppercase block mb-1">Progression Strategy</label>
                  <select
                    value={editExStrategy}
                    onChange={(e) => setEditExStrategy(e.target.value as ProgressionStrategy)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                  >
                    <option value="Double Progression">Double Progression</option>
                    <option value="Linear">Linear</option>
                    <option value="Wave Loading">Wave Loading</option>
                    <option value="Step Loading">Step Loading</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 uppercase block mb-1">Default Notes / Form Cues</label>
                <input
                  type="text"
                  value={editExDefaultNotes}
                  onChange={(e) => setEditExDefaultNotes(e.target.value)}
                  placeholder="e.g. Pause at top, 3s eccentric"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setEditingExercise(null)}
                className="px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-xs font-mono font-bold rounded-lg bg-purple-500 text-zinc-950 hover:bg-purple-400 transition"
              >
                UPDATE EXERCISE DEFINITION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Detail Modal */}
      {detailExerciseId && (
        <ExerciseDetailModal
          exerciseId={detailExerciseId}
          state={state}
          onClose={() => setDetailExerciseId(null)}
          onEditExercise={(ex) => handleStartEdit(ex)}
        />
      )}
    </div>
  );
};

