import React, { useEffect, useState, useCallback } from 'react';
import {
  Check,
  ChevronLeft,
  Copy,
  FileText,
  KeyRound,
  Megaphone,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { ClassroomSummary } from '../types';

interface AvailableClass {
  id: number;
  title: string;
  subject: string;
  joinCode: string;
}

interface ClassroomDetail {
  classroom: ClassroomSummary;
  roster: Array<{
    userId: number;
    fullName: string;
    email?: string;
    gradeOrDepartment: string | null;
    joinedAt: string;
  }>;
  announcements: Array<{
    id: number;
    title: string;
    content: string;
    dueDate: string | null;
    createdAt: string;
    authorName: string;
  }>;
  materials: Array<{
    id: number;
    title: string;
    subject: string;
    chapter: string;
    materialType: string;
    summary: string;
    createdAt: string;
    uploaderName: string;
  }>;
}

export const ClassroomManager: React.FC<{ refreshSignal: number }> = ({
  refreshSignal,
}) => {
  const { profile } = useAuth();
  const isStaff = profile?.role === 'teacher' || profile?.role === 'admin';

  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
  const [availableToJoin, setAvailableToJoin] = useState<AvailableClass[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<ClassroomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Join by code form
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Create Classroom modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Physics');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Announcement & Material forms inside detail view
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annDue, setAnnDue] = useState('');
  const [postingAnn, setPostingAnn] = useState(false);

  const [matTitle, setMatTitle] = useState('');
  const [matChapter, setMatChapter] = useState('');
  const [matType, setMatType] = useState<'notes' | 'summary' | 'important_questions' | 'guide'>('notes');
  const [matSummary, setMatSummary] = useState('');
  const [matContent, setMatContent] = useState('');
  const [uploadingMat, setUploadingMat] = useState(false);

  const loadList = useCallback(async () => {
    try {
      setError(null);
      const data = await apiRequest<{
        classrooms: ClassroomSummary[];
        availableToJoin: AvailableClass[];
      }>('/classrooms');
      setClassrooms(data.classrooms);
      setAvailableToJoin(data.availableToJoin);
    } catch (err: any) {
      setError(err?.message || 'Unable to load classrooms.');
    } finally {
      setLoading(false);
    }
  }, []);

  const openDetail = useCallback(async (classroomId: number) => {
    try {
      setError(null);
      const data = await apiRequest<ClassroomDetail>(`/classrooms/${classroomId}`);
      setSelectedDetail(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to load classroom workspace.');
    }
  }, []);

  useEffect(() => {
    loadList();
    if (selectedDetail) {
      openDetail(selectedDetail.classroom.id);
    }
  }, [loadList, refreshSignal]);

  const handleJoin = async (e: React.FormEvent, overrideCode?: string) => {
    e.preventDefault();
    const code = (overrideCode ?? joinCode).trim().toUpperCase();
    if (!code) return;
    setError(null);
    setSuccessMsg(null);
    setJoining(true);
    try {
      const res = await apiRequest<{ classroom: ClassroomSummary }>('/classrooms/join', {
        method: 'POST',
        body: JSON.stringify({ joinCode: code }),
      });
      setJoinCode('');
      setSuccessMsg(`Joined ${res.classroom.title} (${res.classroom.joinCode}).`);
      await loadList();
    } catch (err: any) {
      setError(err?.message || 'Could not join classroom.');
    } finally {
      setJoining(false);
    }
  };

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await apiRequest<{ classroom: ClassroomSummary }>('/classrooms', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          subject: newSubject.trim(),
          description: newDesc.trim(),
        }),
      });
      setNewTitle('');
      setNewDesc('');
      setShowCreateModal(false);
      setSuccessMsg(
        `Created "${res.classroom.title}" with join code ${res.classroom.joinCode}.`
      );
      await loadList();
    } catch (err: any) {
      setError(err?.message || 'Unable to create classroom.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1800);
    } catch {
      // ignore clipboard restriction
    }
  };

  const handleRemoveStudent = async (classroomId: number, userId: number) => {
    try {
      await apiRequest(`/classrooms/${classroomId}/members/${userId}`, {
        method: 'DELETE',
      });
      await openDetail(classroomId);
      await loadList();
    } catch (err: any) {
      setError(err?.message || 'Unable to remove student.');
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetail) return;
    setPostingAnn(true);
    try {
      await apiRequest(`/classrooms/${selectedDetail.classroom.id}/announcements`, {
        method: 'POST',
        body: JSON.stringify({
          title: annTitle.trim(),
          content: annContent.trim(),
          dueDate: annDue.trim() || undefined,
        }),
      });
      setAnnTitle('');
      setAnnContent('');
      setAnnDue('');
      await openDetail(selectedDetail.classroom.id);
    } catch (err: any) {
      setError(err?.message || 'Unable to post announcement.');
    } finally {
      setPostingAnn(false);
    }
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetail) return;
    setUploadingMat(true);
    try {
      await apiRequest(`/classrooms/${selectedDetail.classroom.id}/materials`, {
        method: 'POST',
        body: JSON.stringify({
          title: matTitle.trim(),
          subject: selectedDetail.classroom.subject,
          chapter: matChapter.trim(),
          materialType: matType,
          summary: matSummary.trim(),
          content: matContent.trim(),
        }),
      });
      setMatTitle('');
      setMatChapter('');
      setMatSummary('');
      setMatContent('');
      setSuccessMsg('Study material uploaded and published to students.');
      await openDetail(selectedDetail.classroom.id);
    } catch (err: any) {
      setError(err?.message || 'Unable to upload study material.');
    } finally {
      setUploadingMat(false);
    }
  };

  // --- Classroom Detail Workspace ---
  if (selectedDetail) {
    const cls = selectedDetail.classroom;
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedDetail(null)}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1 hover:underline cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> All Classrooms
        </button>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {cls.subject} · Instructor: {cls.teacherName}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              {cls.title}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 max-w-2xl">
              {cls.description}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Join Code
              </p>
              <p className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {cls.joinCode}
              </p>
            </div>
            <button
              onClick={() => handleCopyCode(cls.joinCode)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Copy join code"
            >
              {copiedCode === cls.joinCode ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Announcements + Study Materials */}
          <div className="lg:col-span-8 space-y-6">
            {/* Announcements */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Announcements ({selectedDetail.announcements.length})
                </h2>
              </div>

              {isStaff && (
                <form
                  onSubmit={handlePostAnnouncement}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      placeholder="Announcement headline..."
                      className="sm:col-span-2 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                    <input
                      type="date"
                      value={annDue}
                      onChange={(e) => setAnnDue(e.target.value)}
                      className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    placeholder="Share schedule updates, exam reminders, or lab notes..."
                    className="w-full p-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={postingAnn}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      {postingAnn ? 'Posting...' : 'Publish Announcement'}
                    </button>
                  </div>
                </form>
              )}

              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedDetail.announcements.map((a) => (
                  <li key={a.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {a.authorName} · {new Date(a.createdAt).toLocaleDateString()}
                      </span>
                      {a.dueDate && (
                        <span className="font-mono text-amber-700 dark:text-amber-400">
                          Due {a.dueDate}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                      {a.title}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {a.content}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Study Materials */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Lesson Materials ({selectedDetail.materials.length})
                </h2>
              </div>

              {isStaff && (
                <form
                  onSubmit={handleUploadMaterial}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      value={matTitle}
                      onChange={(e) => setMatTitle(e.target.value)}
                      placeholder="Lesson title..."
                      className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      required
                      value={matChapter}
                      onChange={(e) => setMatChapter(e.target.value)}
                      placeholder="Chapter (e.g. Ch 8 · Optics)"
                      className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                    <select
                      value={matType}
                      onChange={(e) => setMatType(e.target.value as any)}
                      className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    >
                      <option value="notes">Subject Notes</option>
                      <option value="summary">Chapter Summary</option>
                      <option value="important_questions">Important Questions</option>
                      <option value="guide">Study Guide</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    required
                    value={matSummary}
                    onChange={(e) => setMatSummary(e.target.value)}
                    placeholder="Short 1-sentence summary..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                  <textarea
                    rows={3}
                    required
                    value={matContent}
                    onChange={(e) => setMatContent(e.target.value)}
                    placeholder="Full study notes, formulas, or worked examples..."
                    className="w-full p-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={uploadingMat}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      {uploadingMat ? 'Publishing...' : 'Upload Study Material'}
                    </button>
                  </div>
                </form>
              )}

              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedDetail.materials.map((m) => (
                  <li key={m.id} className="py-3.5 first:pt-0 last:pb-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {m.chapter} · {m.materialType.replace('_', ' ')} · By {m.uploaderName}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                      {m.title}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {m.summary}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Roster Panel */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 h-fit">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Enrolled Students ({selectedDetail.roster.length})
              </h2>
            </div>

            {selectedDetail.roster.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share join code <strong className="font-mono">{cls.joinCode}</strong> with students to enroll them.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedDetail.roster.map((student) => (
                  <li
                    key={student.userId}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {student.fullName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {student.email || student.gradeOrDepartment || 'Enrolled'}
                      </p>
                    </div>
                    {isStaff && (
                      <button
                        onClick={() => handleRemoveStudent(cls.id, student.userId)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Remove student"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Classroom List View ---
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Course Cohorts · Join Codes, Rosters & Announcements
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Classroom Management
          </h1>
        </div>

        {isStaff && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl inline-flex items-center gap-1.5 self-start whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Classroom
          </button>
        )}
      </div>

      {/* Join Classroom by Code Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <form
          onSubmit={handleJoin}
          className="flex flex-wrap items-center gap-2.5 flex-1"
        >
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter class code (e.g. CHEM-110)"
              className="w-full pl-10 pr-3 py-2 text-sm font-mono uppercase rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={joining || joinCode.trim().length < 3}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl cursor-pointer"
          >
            {joining ? 'Joining...' : 'Join Classroom'}
          </button>
        </form>

        {availableToJoin.length > 0 && (
          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
            <span>Open codes:</span>
            {availableToJoin.slice(0, 3).map((cls) => (
              <button
                key={cls.id}
                type="button"
                onClick={(e) => handleJoin(e, cls.joinCode)}
                className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {cls.joinCode} ({cls.subject})
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300">
          {successMsg}
        </div>
      )}

      {/* Classroom Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {classrooms.map((cls) => (
            <div
              key={cls.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span>
                    {cls.subject} · {cls.teacherName}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(cls.joinCode)}
                    className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {cls.joinCode}
                    {copiedCode === cls.joinCode ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {cls.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  {cls.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  <span>{cls.studentCount} students</span>
                  <span>{cls.doubtCount} doubts</span>
                  <span>{cls.quizCount} quizzes</span>
                </div>
                <button
                  onClick={() => openDetail(cls.id)}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Open Classroom →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Classroom Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Create New Classroom
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  A unique student join code is generated automatically
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClassroom} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Classroom Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Linear Algebra & Differential Equations"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g., Mathematics, Physics, History"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Course Overview
                </label>
                <textarea
                  rows={3}
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe topics, syllabus goals, and quiz expectations..."
                  className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
                >
                  {creating ? 'Creating...' : 'Create Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
