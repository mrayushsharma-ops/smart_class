import React, { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle2,
  Clock,
  EyeOff,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Send,
  ShieldCheck,
  ThumbsUp,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { ClassroomSummary, DoubtItem } from '../types';

interface GroupedTopic {
  topic: string;
  subject: string;
  total: number;
  pending: number;
  resolved: number;
  totalUpvotes: number;
}

export const DoubtSystem: React.FC<{ refreshSignal: number }> = ({
  refreshSignal,
}) => {
  const { profile } = useAuth();
  const isStaff = profile?.role === 'teacher' || profile?.role === 'admin';

  const [doubts, setDoubts] = useState<DoubtItem[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [groupedTopics, setGroupedTopics] = useState<GroupedTopic[]>([]);

  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [topicFilter, setTopicFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'answered' | 'resolved'>('all');
  const [viewMode, setViewMode] = useState<'feed' | 'grouped'>('feed');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ask Doubt Modal state
  const [showAskModal, setShowAskModal] = useState(false);
  const [formClassroomId, setFormClassroomId] = useState<number>(0);
  const [formTopic, setFormTopic] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnonymous, setFormAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Staff reply inline state
  const [replyTargetId, setReplyTargetId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyResolve, setReplyResolve] = useState(true);
  const [replyPin, setReplyPin] = useState(false);
  const [replyBusy, setReplyBusy] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (subjectFilter !== 'All') params.set('subject', subjectFilter);
      if (topicFilter !== 'All') params.set('topic', topicFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const [doubtsRes, classesRes] = await Promise.all([
        apiRequest<{ doubts: DoubtItem[]; subjects: string[]; topics: string[] }>(
          `/doubts?${params.toString()}`
        ),
        apiRequest<{ classrooms: ClassroomSummary[] }>('/classrooms'),
      ]);

      setDoubts(doubtsRes.doubts);
      setSubjects(doubtsRes.subjects);
      setTopics(doubtsRes.topics);
      setClassrooms(classesRes.classrooms);
      if (classesRes.classrooms.length > 0 && formClassroomId === 0) {
        setFormClassroomId(classesRes.classrooms[0].id);
      }

      if (isStaff) {
        const analytics = await apiRequest<{ groupedTopics: GroupedTopic[] }>(
          '/doubts/analytics'
        );
        setGroupedTopics(analytics.groupedTopics);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load doubts.');
    } finally {
      setLoading(false);
    }
  }, [search, subjectFilter, topicFilter, statusFilter, isStaff, formClassroomId]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshSignal]);

  const handleCreateDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const chosenClass = classrooms.find((c) => c.id === formClassroomId);
    if (!chosenClass) {
      setFormError('Please join or select a classroom first.');
      return;
    }
    if (formTitle.trim().length < 5 || formQuestion.trim().length < 10 || formTopic.trim().length < 2) {
      setFormError('Enter a clear topic, title (5+ chars), and detailed question (10+ chars).');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/doubts', {
        method: 'POST',
        body: JSON.stringify({
          classroomId: chosenClass.id,
          subject: chosenClass.subject,
          topic: formTopic.trim(),
          title: formTitle.trim(),
          question: formQuestion.trim(),
          isAnonymous: formAnonymous,
        }),
      });
      setFormTopic('');
      setFormTitle('');
      setFormQuestion('');
      setFormAnonymous(true);
      setShowAskModal(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit doubt.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (doubtId: number) => {
    try {
      const res = await apiRequest<{ upvoted: boolean; upvotesCount: number }>(
        `/doubts/${doubtId}/upvote`,
        { method: 'POST' }
      );
      setDoubts((prev) =>
        prev.map((d) =>
          d.id === doubtId
            ? { ...d, hasUpvoted: res.upvoted, upvotesCount: res.upvotesCount }
            : d
        )
      );
    } catch (err: any) {
      setError(err?.message || 'Could not update upvote.');
    }
  };

  const handleReplySubmit = async (doubtId: number) => {
    if (replyContent.trim().length < 5) return;
    setReplyBusy(true);
    try {
      await apiRequest(`/doubts/${doubtId}/responses`, {
        method: 'POST',
        body: JSON.stringify({
          content: replyContent.trim(),
          markResolved: replyResolve,
          pinResponse: replyPin,
        }),
      });
      setReplyTargetId(null);
      setReplyContent('');
      setReplyPin(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Could not post reply.');
    } finally {
      setReplyBusy(false);
    }
  };

  const handlePatchDoubt = async (
    doubtId: number,
    patch: { status?: 'pending' | 'answered' | 'resolved'; isPinned?: boolean }
  ) => {
    try {
      await apiRequest(`/doubts/${doubtId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update doubt.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Anonymous Q&A Board · Safe Classroom Inquiry
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Anonymous Doubt System
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {isStaff
              ? 'Review student questions grouped by topic, pin official explanations, and resolve learning blockers.'
              : 'Ask questions freely without revealing your identity to classmates. Upvote doubts you also want explained.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isStaff && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800">
              <button
                onClick={() => setViewMode('feed')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'feed'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All Doubts
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'grouped'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Grouped by Topic (FAQs)
              </button>
            </div>
          )}

          <button
            onClick={() => setShowAskModal(true)}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Ask a Doubt
          </button>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 py-3 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
        <EyeOff className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span>
          {isStaff
            ? 'Privacy rule active: Student identities on anonymous questions are masked from all classmates on the API and UI. Moderation details are restricted strictly to faculty and admins.'
            : 'Your privacy is enforced on the server: When you post anonymously, classmates never see your name or email.'}
        </span>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search previously answered doubts, topics, or keywords..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            aria-label="Filter by subject"
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
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            aria-label="Filter by topic"
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            <option value="All">All Topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
            {(['all', 'pending', 'answered', 'resolved'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Teacher Topic-Grouped FAQ View */}
      {isStaff && viewMode === 'grouped' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groupedTopics.map((group) => (
            <div
              key={`${group.subject}-${group.topic}`}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 flex flex-col justify-between"
            >
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {group.subject}
                </p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {group.topic}
                </h3>
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Questions</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                      {group.total}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Pending</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                      {group.pending}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Total Upvotes</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                      {group.totalUpvotes}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setTopicFilter(group.topic);
                  setViewMode('feed');
                }}
                className="mt-5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline text-left cursor-pointer"
              >
                Inspect {group.total} question(s) on this topic →
              </button>
            </div>
          ))}
        </div>
      ) : loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
          ))}
        </div>
      ) : doubts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-12 text-center">
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            No doubts match your current filters
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">
            Be the first to ask an anonymous question or clear your search filters.
          </p>
          <button
            onClick={() => setShowAskModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
          >
            Ask an Anonymous Doubt
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {doubts.map((doubt) => (
            <article
              key={doubt.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6"
            >
              {/* Clean Unboxed Metadata Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {doubt.subject}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{doubt.topic}</span>
                  <span aria-hidden="true">·</span>
                  <span>{doubt.authorDisplay}</span>
                  {doubt.isPinned && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                        <Pin className="w-3 h-3" /> Pinned Explanation
                      </span>
                    </>
                  )}
                </div>

                <span
                  className={`inline-flex items-center gap-1 font-semibold capitalize ${
                    doubt.status === 'resolved'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : doubt.status === 'answered'
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {doubt.status === 'resolved' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : doubt.status === 'answered' ? (
                    <MessageSquare className="w-3.5 h-3.5" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  {doubt.status}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {doubt.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
                {doubt.question}
              </p>

              {/* Moderation info restricted to teachers & admins */}
              {isStaff && doubt.moderationAuthor && (
                <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  Faculty moderation record (hidden from classmates): {doubt.moderationAuthor.name} ({doubt.moderationAuthor.email})
                </p>
              )}

              {/* Actions Bar */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleUpvote(doubt.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      doubt.hasUpvoted
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span className="font-mono tabular-nums">{doubt.upvotesCount}</span>
                    <span>{doubt.hasUpvoted ? 'Upvoted' : 'I have this doubt too'}</span>
                  </button>

                  <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {doubt.responses.length}{' '}
                    {doubt.responses.length === 1 ? 'explanation' : 'explanations'}
                  </span>
                </div>

                {isStaff && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() =>
                        setReplyTargetId(replyTargetId === doubt.id ? null : doubt.id)
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                    >
                      Reply
                    </button>
                    <button
                      onClick={() =>
                        handlePatchDoubt(doubt.id, {
                          status: doubt.status === 'resolved' ? 'answered' : 'resolved',
                        })
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {doubt.status === 'resolved' ? 'Reopen' : 'Mark Resolved'}
                    </button>
                    <button
                      onClick={() =>
                        handlePatchDoubt(doubt.id, { isPinned: !doubt.isPinned })
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {doubt.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                  </div>
                )}
              </div>

              {/* Teacher Inline Reply Composer */}
              {isStaff && replyTargetId === doubt.id && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <textarea
                    rows={3}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a clear explanation for the class..."
                    className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={replyResolve}
                          onChange={(e) => setReplyResolve(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        Mark doubt as Resolved
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={replyPin}
                          onChange={(e) => setReplyPin(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        Pin as canonical class explanation
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setReplyTargetId(null)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={replyBusy || replyContent.trim().length < 5}
                        onClick={() => handleReplySubmit(doubt.id)}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {replyBusy ? 'Posting...' : 'Post Explanation'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Teacher Responses */}
              {doubt.responses.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  {doubt.responses.map((resp) => (
                    <div
                      key={resp.id}
                      className="rounded-xl bg-slate-50 dark:bg-slate-900/70 p-4 border border-slate-200/70 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                          {resp.responderName} · Teacher Explanation
                          {resp.isPinned ? ' · Pinned' : ''}
                        </span>
                        <span className="text-slate-400">
                          {new Date(resp.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {resp.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Ask a Doubt Modal */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Ask a Classroom Doubt
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Anonymous by default — classmates never see your identity
                </p>
              </div>
              <button
                onClick={() => setShowAskModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDoubt} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Classroom & Subject
                  </label>
                  <select
                    value={formClassroomId}
                    onChange={(e) => setFormClassroomId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    required
                  >
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.subject} — {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Topic / Chapter
                  </label>
                  <input
                    type="text"
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="e.g., Faraday Induction, Recursion"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Doubt Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Summarize your confusion in one clear question..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Detailed Question
                </label>
                <textarea
                  rows={4}
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="Explain what step or concept feels unclear so your teacher can target the exact gap..."
                  className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formAnonymous}
                  onChange={(e) => setFormAnonymous(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600"
                />
                <div className="text-xs">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Submit anonymously to classmates
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Your name is hidden from peers. Only your teacher and platform admins can view moderation info if needed.
                  </p>
                </div>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAskModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl cursor-pointer"
                >
                  {submitting ? 'Submitting...' : 'Post Doubt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
