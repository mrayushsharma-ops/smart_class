import React, { useEffect, useState, useCallback } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Circle,
  Plus,
  RotateCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import type { FlashcardItem, StudyMaterialItem } from '../types';

export const RevisionCenter: React.FC<{ refreshSignal: number }> = ({
  refreshSignal,
}) => {
  const [subTab, setSubTab] = useState<'materials' | 'flashcards' | 'saved'>('materials');
  const [materials, setMaterials] = useState<StudyMaterialItem[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [subjectFilter, setSubjectFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterialItem | null>(null);

  // Flashcard flip + creation state
  const [flippedIds, setFlippedIds] = useState<Set<number>>(new Set());
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardSubject, setCardSubject] = useState('Physics');
  const [cardTopic, setCardTopic] = useState('');
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [savingCard, setSavingCard] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [matRes, cardRes] = await Promise.all([
        apiRequest<{ materials: StudyMaterialItem[] }>('/revision/materials'),
        apiRequest<{ flashcards: FlashcardItem[] }>('/flashcards'),
      ]);
      setMaterials(matRes.materials);
      setFlashcards(cardRes.flashcards);
    } catch (err: any) {
      setError(err?.message || 'Unable to load revision center.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshSignal]);

  const updateMaterialProgress = async (
    materialId: number,
    patch: { isSaved?: boolean; isCompleted?: boolean; markViewed?: boolean }
  ) => {
    try {
      await apiRequest(`/revision/materials/${materialId}/progress`, {
        method: 'POST',
        body: JSON.stringify(patch),
      });
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === materialId
            ? {
                ...m,
                isSaved: patch.isSaved ?? m.isSaved,
                isCompleted: patch.isCompleted ?? m.isCompleted,
                lastViewedAt: new Date().toISOString(),
              }
            : m
        )
      );
      if (selectedMaterial?.id === materialId) {
        setSelectedMaterial((prev) =>
          prev
            ? {
                ...prev,
                isSaved: patch.isSaved ?? prev.isSaved,
                isCompleted: patch.isCompleted ?? prev.isCompleted,
              }
            : null
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to update revision progress.');
    }
  };

  const openMaterialReader = (mat: StudyMaterialItem) => {
    setSelectedMaterial(mat);
    updateMaterialProgress(mat.id, { markViewed: true });
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cardFront.trim().length < 3 || cardBack.trim().length < 3 || cardTopic.trim().length < 2) {
      return;
    }
    setSavingCard(true);
    try {
      const res = await apiRequest<{ flashcard: FlashcardItem }>('/flashcards', {
        method: 'POST',
        body: JSON.stringify({
          subject: cardSubject,
          topic: cardTopic.trim(),
          front: cardFront.trim(),
          back: cardBack.trim(),
        }),
      });
      setFlashcards((prev) => [res.flashcard, ...prev]);
      setCardTopic('');
      setCardFront('');
      setCardBack('');
      setShowCardModal(false);
    } catch (err: any) {
      setError(err?.message || 'Unable to save flashcard.');
    } finally {
      setSavingCard(false);
    }
  };

  const toggleMastered = async (card: FlashcardItem) => {
    try {
      const res = await apiRequest<{ flashcard: FlashcardItem }>(
        `/flashcards/${card.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ mastered: !card.mastered }),
        }
      );
      setFlashcards((prev) =>
        prev.map((c) => (c.id === card.id ? res.flashcard : c))
      );
    } catch (err: any) {
      setError(err?.message || 'Unable to update flashcard.');
    }
  };

  const deleteCard = async (id: number) => {
    try {
      await apiRequest(`/flashcards/${id}`, { method: 'DELETE' });
      setFlashcards((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Unable to delete flashcard.');
    }
  };

  const subjects = Array.from(new Set(materials.map((m) => m.subject))).sort();
  const completedCount = materials.filter((m) => m.isCompleted).length;
  const completionPct =
    materials.length > 0
      ? Math.round((completedCount / materials.length) * 100)
      : 0;
  const masteredCards = flashcards.filter((c) => c.mastered).length;

  const filteredMaterials = materials.filter((m) => {
    if (subTab === 'saved' && !m.isSaved && !m.isCompleted && !m.lastViewedAt) {
      return false;
    }
    if (subjectFilter !== 'All' && m.subject !== subjectFilter) return false;
    if (typeFilter !== 'all' && m.materialType !== typeFilter) return false;
    if (search.trim()) {
      const hay = `${m.title} ${m.chapter} ${m.summary} ${m.subject}`.toLowerCase();
      if (!hay.includes(search.trim().toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Structured Study Hub · Active Recall & Summaries
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Smart Revision Center
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800">
            {[
              { id: 'materials', label: `Notes & Guides (${materials.length})` },
              { id: 'flashcards', label: `Flashcards (${flashcards.length})` },
              { id: 'saved', label: 'Saved & Recent' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSubTab(item.id as any)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  subTab === item.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCardModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Flashcard
          </button>
        </div>
      </div>

      {/* Progress Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Topics Completed</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
              {completionPct}%
            </span>
          </div>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1.5">
            {completedCount} / {materials.length} lessons
          </p>
          <div className="mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Flashcards Mastered
          </p>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1.5">
            {masteredCards} / {flashcards.length} cards
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Click any flashcard to flip and self-test
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Saved Materials
          </p>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1.5">
            {materials.filter((m) => m.isSaved).length} bookmarked
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Synced automatically across devices
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Study Materials & Saved Views */}
      {subTab !== 'flashcards' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chapters, formulas, or study guides..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                <option value="All">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Material Types</option>
                <option value="notes">Subject Notes</option>
                <option value="summary">Chapter Summaries</option>
                <option value="important_questions">Important Questions</option>
                <option value="guide">Study Guides</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="h-48 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60 animate-pulse" />
          ) : filteredMaterials.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No study materials match this view yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMaterials.map((mat) => (
                <div
                  key={mat.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <span>
                        {mat.subject} · {mat.chapter}
                      </span>
                      <span className="capitalize">
                        {mat.materialType.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {mat.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                      {mat.summary}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateMaterialProgress(mat.id, {
                            isCompleted: !mat.isCompleted,
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                          mat.isCompleted
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {mat.isCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Circle className="w-3.5 h-3.5" />
                        )}
                        {mat.isCompleted ? 'Completed' : 'Mark Complete'}
                      </button>

                      <button
                        onClick={() =>
                          updateMaterialProgress(mat.id, { isSaved: !mat.isSaved })
                        }
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          mat.isSaved
                            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                        title={mat.isSaved ? 'Remove bookmark' : 'Save for revision'}
                      >
                        {mat.isSaved ? (
                          <BookmarkCheck className="w-4 h-4" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => openMaterialReader(mat)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Read Lesson →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Digital Flashcards Deck */}
      {subTab === 'flashcards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {flashcards.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-12 text-center">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                No flashcards created yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
                Build your own active-recall deck for quick exam revision.
              </p>
              <button
                onClick={() => setShowCardModal(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
              >
                Create First Flashcard
              </button>
            </div>
          ) : (
            flashcards.map((card) => {
              const isFlipped = flippedIds.has(card.id);
              return (
                <div
                  key={card.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 flex flex-col justify-between min-h-[240px]"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
                      <span>
                        {card.subject} · {card.topic}
                      </span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {isFlipped ? 'Answer' : 'Prompt'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setFlippedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(card.id)) next.delete(card.id);
                          else next.add(card.id);
                          return next;
                        })
                      }
                      className="w-full text-left py-3 cursor-pointer"
                    >
                      <p
                        className={`text-sm leading-relaxed ${
                          isFlipped
                            ? 'text-slate-700 dark:text-slate-200'
                            : 'font-semibold text-slate-900 dark:text-white'
                        }`}
                      >
                        {isFlipped ? card.back : card.front}
                      </p>
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFlippedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(card.id)) next.delete(card.id);
                          else next.add(card.id);
                          return next;
                        })
                      }
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      {isFlipped ? 'Show Prompt' : 'Reveal Answer'}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleMastered(card)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                          card.mastered
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {card.mastered ? 'Mastered' : 'Mark Mastered'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCard(card.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete flashcard"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Material Reader Drawer/Modal */}
      {selectedMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedMaterial.subject} · {selectedMaterial.chapter} · By {selectedMaterial.uploaderName}
                </p>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedMaterial.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedMaterial(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {selectedMaterial.content}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() =>
                  updateMaterialProgress(selectedMaterial.id, {
                    isCompleted: !selectedMaterial.isCompleted,
                  })
                }
                className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                  selectedMaterial.isCompleted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {selectedMaterial.isCompleted
                  ? 'Topic Marked Completed'
                  : 'Mark Topic as Completed'}
              </button>
              <button
                onClick={() => setSelectedMaterial(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Flashcard Modal */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Create Study Flashcard
              </h2>
              <button
                onClick={() => setShowCardModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Subject
                  </label>
                  <select
                    value={cardSubject}
                    onChange={(e) => setCardSubject(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Biology">Biology</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Topic
                  </label>
                  <input
                    type="text"
                    required
                    value={cardTopic}
                    onChange={(e) => setCardTopic(e.target.value)}
                    placeholder="e.g., Wave Speed"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Front (Question / Concept Prompt)
                </label>
                <textarea
                  rows={2}
                  required
                  value={cardFront}
                  onChange={(e) => setCardFront(e.target.value)}
                  placeholder="Write a sharp recall question..."
                  className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Back (Concise Answer / Formula)
                </label>
                <textarea
                  rows={3}
                  required
                  value={cardBack}
                  onChange={(e) => setCardBack(e.target.value)}
                  placeholder="Write the clear explanation or answer..."
                  className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCardModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCard}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
                >
                  {savingCard ? 'Saving...' : 'Save Flashcard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
