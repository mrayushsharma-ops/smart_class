import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Eye,
  Play,
  Plus,
  Trash2,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type {
  ClassroomSummary,
  QuizQuestionClient,
  QuizReviewItem,
  QuizSummary,
} from '../types';

interface LeaderboardRow {
  studentId: number;
  fullName: string;
  gradeOrDepartment: string;
  quizzesCompleted: number;
  averageScore: number;
  points: number;
}

interface ClassResultRow {
  attemptId: number;
  studentName: string;
  studentEmail: string;
  score: number;
  totalMarks: number;
  percentage: number;
  timeSpentSeconds: number;
  submittedAt: string;
}

interface ActiveQuizState {
  quiz: {
    id: number;
    title: string;
    subject: string;
    topic: string;
    durationMinutes: number;
    totalMarks: number;
  };
  questions: QuizQuestionClient[];
  answers: number[];
  secondsLeft: number;
  startedAt: number;
}

interface ReviewState {
  quizTitle: string;
  score: number;
  totalMarks: number;
  percentage: number;
  review: QuizReviewItem[];
}

export const QuizSystem: React.FC<{ refreshSignal: number }> = ({
  refreshSignal,
}) => {
  const { profile, updateProfile } = useAuth();
  const isStaff = profile?.role === 'teacher' || profile?.role === 'admin';

  const [tab, setTab] = useState<'quizzes' | 'leaderboard' | 'create'>('quizzes');
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Quiz Taking State
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuizState | null>(null);
  const [submittingAttempt, setSubmittingAttempt] = useState(false);
  const [reviewState, setReviewState] = useState<ReviewState | null>(null);

  // Teacher Class Results Modal
  const [resultsModalQuiz, setResultsModalQuiz] = useState<QuizSummary | null>(null);
  const [classResults, setClassResults] = useState<ClassResultRow[]>([]);

  // Teacher Create Quiz Builder State
  const [newClassId, setNewClassId] = useState<number>(0);
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDuration, setNewDuration] = useState(10);
  const [newStatus, setNewStatus] = useState<'published' | 'scheduled' | 'draft'>('published');
  const [newQuestions, setNewQuestions] = useState([
    {
      questionText: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      explanation: '',
      marks: 2,
    },
  ]);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const submitRef = useRef<(() => Promise<void>) | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [quizRes, lbRes, classRes] = await Promise.all([
        apiRequest<{ quizzes: QuizSummary[] }>('/quizzes'),
        apiRequest<{ leaderboard: LeaderboardRow[] }>('/quizzes/leaderboard'),
        apiRequest<{ classrooms: ClassroomSummary[] }>('/classrooms'),
      ]);
      setQuizzes(quizRes.quizzes);
      setLeaderboard(lbRes.leaderboard);
      setClassrooms(classRes.classrooms);
      if (classRes.classrooms.length > 0 && newClassId === 0) {
        setNewClassId(classRes.classrooms[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load quizzes.');
    } finally {
      setLoading(false);
    }
  }, [newClassId]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshSignal]);

  const submitActiveQuiz = useCallback(async () => {
    if (!activeQuiz || submittingAttempt) return;
    setSubmittingAttempt(true);
    try {
      const elapsedSeconds = Math.max(
        1,
        Math.round((Date.now() - activeQuiz.startedAt) / 1000)
      );
      const res = await apiRequest<{
        attempt: { score: number; totalMarks: number; percentage: number };
        review: QuizReviewItem[];
      }>(`/quizzes/${activeQuiz.quiz.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          answers: activeQuiz.answers,
          timeSpentSeconds: elapsedSeconds,
        }),
      });

      setReviewState({
        quizTitle: activeQuiz.quiz.title,
        score: res.attempt.score,
        totalMarks: res.attempt.totalMarks,
        percentage: res.attempt.percentage,
        review: res.review,
      });
      setActiveQuiz(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to submit quiz.');
    } finally {
      setSubmittingAttempt(false);
    }
  }, [activeQuiz, submittingAttempt, loadData]);

  submitRef.current = submitActiveQuiz;

  // Live countdown timer for active quiz
  useEffect(() => {
    if (!activeQuiz) return;
    const interval = setInterval(() => {
      setActiveQuiz((prev) => {
        if (!prev) return null;
        if (prev.secondsLeft <= 1) {
          clearInterval(interval);
          setTimeout(() => submitRef.current?.(), 0);
          return { ...prev, secondsLeft: 0 };
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeQuiz?.quiz.id]);

  const startQuiz = async (quizId: number) => {
    try {
      setError(null);
      const data = await apiRequest<{
        quiz: ActiveQuizState['quiz'];
        questions: QuizQuestionClient[];
      }>(`/quizzes/${quizId}`);

      setReviewState(null);
      setActiveQuiz({
        quiz: data.quiz,
        questions: data.questions,
        answers: new Array(data.questions.length).fill(-1),
        secondsLeft: data.quiz.durationMinutes * 60,
        startedAt: Date.now(),
      });
    } catch (err: any) {
      setError(err?.message || 'Could not start quiz.');
    }
  };

  const viewPastAttempt = async (attemptId: number) => {
    try {
      setError(null);
      const data = await apiRequest<{
        attempt: { score: number; totalMarks: number; percentage: number };
        quiz: { title: string };
        review: QuizReviewItem[];
      }>(`/quizzes/attempts/${attemptId}`);
      setReviewState({
        quizTitle: data.quiz.title,
        score: data.attempt.score,
        totalMarks: data.attempt.totalMarks,
        percentage: data.attempt.percentage,
        review: data.review,
      });
    } catch (err: any) {
      setError(err?.message || 'Unable to load past attempt.');
    }
  };

  const openClassResults = async (quiz: QuizSummary) => {
    try {
      const data = await apiRequest<{ results: ClassResultRow[] }>(
        `/quizzes/${quiz.id}/results`
      );
      setClassResults(data.results);
      setResultsModalQuiz(quiz);
    } catch (err: any) {
      setError(err?.message || 'Unable to load class results.');
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMessage(null);
    setError(null);

    const validQuestions = newQuestions.filter(
      (q) =>
        q.questionText.trim().length >= 5 &&
        q.options.every((o) => o.trim().length > 0) &&
        q.explanation.trim().length >= 3
    );

    if (validQuestions.length === 0) {
      setError('Complete at least one question with all 4 options and an explanation.');
      return;
    }

    setCreatingQuiz(true);
    try {
      await apiRequest('/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          classroomId: newClassId,
          title: newTitle.trim(),
          topic: newTopic.trim(),
          description: newDesc.trim(),
          durationMinutes: Number(newDuration),
          status: newStatus,
          questions: validQuestions,
        }),
      });
      setNewTitle('');
      setNewTopic('');
      setNewDesc('');
      setNewQuestions([
        {
          questionText: '',
          options: ['', '', '', ''],
          correctIndex: 0,
          explanation: '',
          marks: 2,
        },
      ]);
      setCreateMessage('Quiz created and saved to PostgreSQL.');
      await loadData();
      setTab('quizzes');
    } catch (err: any) {
      setError(err?.message || 'Failed to create quiz.');
    } finally {
      setCreatingQuiz(false);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // --- Active Timed Quiz Runner ---
  if (activeQuiz) {
    const answeredCount = activeQuiz.answers.filter((a) => a >= 0).length;
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 flex flex-wrap items-center justify-between gap-4 sticky top-4 z-20 shadow-sm">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeQuiz.quiz.subject} · {activeQuiz.quiz.topic}
            </p>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              {activeQuiz.quiz.title}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
              {answeredCount}/{activeQuiz.questions.length} answered
            </span>
            <div
              className={`px-3.5 py-1.5 rounded-xl font-mono text-sm font-bold tabular-nums inline-flex items-center gap-1.5 ${
                activeQuiz.secondsLeft <= 60
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              {formatTimer(activeQuiz.secondsLeft)}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {activeQuiz.questions.map((q, qIdx) => (
            <div
              key={q.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span>Question {qIdx + 1}</span>
                <span className="font-mono tabular-nums">{q.marks} marks</span>
              </div>
              <p className="text-base font-semibold text-slate-900 dark:text-white mb-4">
                {q.questionText}
              </p>
              <div className="space-y-2.5">
                {q.options.map((opt, oIdx) => {
                  const chosen = activeQuiz.answers[qIdx] === oIdx;
                  return (
                    <button
                      key={oIdx}
                      type="button"
                      onClick={() =>
                        setActiveQuiz((prev) => {
                          if (!prev) return null;
                          const nextAns = [...prev.answers];
                          nextAns[qIdx] = oIdx;
                          return { ...prev, answers: nextAns };
                        })
                      }
                      className={`w-full text-left p-3.5 rounded-xl border text-sm transition-colors flex items-center gap-3 cursor-pointer ${
                        chosen
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-slate-900 dark:text-white font-medium'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full border text-xs font-mono flex items-center justify-center shrink-0 ${
                          chosen
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setActiveQuiz(null)}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            Exit Without Submitting
          </button>
          <button
            type="button"
            disabled={submittingAttempt}
            onClick={submitActiveQuiz}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl cursor-pointer"
          >
            {submittingAttempt ? 'Grading...' : 'Submit Quiz & View Score'}
          </button>
        </div>
      </div>
    );
  }

  // --- Quiz Result & Explanation Review ---
  if (reviewState) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => setReviewState(null)}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1 hover:underline cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Quizzes
        </button>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              Graded Attempt Summary
            </p>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {reviewState.quizTitle}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
              {reviewState.percentage}%
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {reviewState.score} / {reviewState.totalMarks} marks
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {reviewState.review.map((item, idx) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-3"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  Question {idx + 1} · {item.marks} marks
                </span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    item.isCorrect
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {item.isCorrect ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Correct
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" /> Incorrect
                    </>
                  )}
                </span>
              </div>

              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {item.questionText}
              </p>

              <div className="space-y-1.5 text-xs">
                <p className="text-slate-600 dark:text-slate-300">
                  Your answer:{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {item.selectedIndex >= 0
                      ? item.options[item.selectedIndex]
                      : 'Unanswered'}
                  </span>
                </p>
                <p className="text-emerald-700 dark:text-emerald-400">
                  Correct answer:{' '}
                  <span className="font-semibold">
                    {item.options[item.correctIndex]}
                  </span>
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Explanation:{' '}
                </span>
                {item.explanation}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Interactive Assessment · Timed Mastery Checks
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Interactive Quiz System
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 self-start">
          <button
            onClick={() => setTab('quizzes')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'quizzes'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Available Quizzes ({quizzes.length})
          </button>
          <button
            onClick={() => setTab('leaderboard')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'leaderboard'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Leaderboard
          </button>
          {isStaff && (
            <button
              onClick={() => setTab('create')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === 'create'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Create Quiz
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {createMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-700 dark:text-emerald-300">
          {createMessage}
        </div>
      )}

      {/* TAB 1: Available Quizzes */}
      {tab === 'quizzes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {loading ? (
            [1, 2].map((i) => (
              <div
                key={i}
                className="h-52 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60 animate-pulse"
              />
            ))
          ) : quizzes.length === 0 ? (
            <div className="md:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-12 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No quizzes available in your classrooms yet.
              </p>
            </div>
          ) : (
            quizzes.map((q) => (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <span>
                      {q.subject} · {q.topic}
                    </span>
                    <span className="capitalize font-medium text-indigo-600 dark:text-indigo-400">
                      {q.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {q.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {q.description || `Timed assessment in ${q.classroomTitle}`}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                    <span>{q.questionCount} questions</span>
                    <span>{q.durationMinutes} min</span>
                    <span>{q.totalMarks} marks</span>
                    {isStaff && q.avgClassPercentage !== null && (
                      <span>Class avg: {q.avgClassPercentage}% ({q.attemptCount} attempts)</span>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  {q.myLatestAttempt ? (
                    <div className="text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        Best score:{' '}
                      </span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {q.myBestScore}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Not attempted yet
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    {q.myLatestAttempt && (
                      <button
                        onClick={() => viewPastAttempt(q.myLatestAttempt!.id)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review
                      </button>
                    )}

                    {isStaff && (
                      <button
                        onClick={() => openClassResults(q)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Class Results ({q.attemptCount})
                      </button>
                    )}

                    <button
                      onClick={() => startQuiz(q.id)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {q.myLatestAttempt ? 'Retake Quiz' : 'Start Quiz'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: Optional Participation Leaderboard */}
      {tab === 'leaderboard' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Trophy className="w-5 h-5 text-amber-500" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Opt-In Quiz Leaderboard
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ranked by total earned marks across graded quizzes. Participation is completely optional.
                </p>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={profile?.leaderboardOptIn ?? true}
                onChange={async (e) => {
                  await updateProfile({ leaderboardOptIn: e.target.checked });
                  await loadData();
                }}
                className="rounded text-indigo-600"
              />
              Show my score on leaderboard
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/40">
                  <th className="py-3 px-6">Rank</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4 text-right">Quizzes</th>
                  <th className="py-3 px-4 text-right">Average</th>
                  <th className="py-3 px-6 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {leaderboard.map((row, idx) => (
                  <tr key={row.studentId}>
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                      #{idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {row.fullName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {row.gradeOrDepartment}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {row.quizzesCompleted}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                      {row.averageScore}%
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Teacher Quiz Builder */}
      {tab === 'create' && isStaff && (
        <form
          onSubmit={handleCreateQuiz}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Classroom
              </label>
              <select
                value={newClassId}
                onChange={(e) => setNewClassId(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
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
                Quiz Title
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Wave Optics Checkpoint"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Topic
              </label>
              <input
                type="text"
                required
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="e.g., Diffraction & Interference"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Duration (min)
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Publish Mode
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="published">Publish Now</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Brief instructions or scope for students..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Questions ({newQuestions.length})
              </h3>
              <button
                type="button"
                onClick={() =>
                  setNewQuestions((prev) => [
                    ...prev,
                    {
                      questionText: '',
                      options: ['', '', '', ''],
                      correctIndex: 0,
                      explanation: '',
                      marks: 2,
                    },
                  ])
                }
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>

            {newQuestions.map((q, qIdx) => (
              <div
                key={qIdx}
                className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Question {qIdx + 1}
                  </span>
                  {newQuestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setNewQuestions((prev) =>
                          prev.filter((_, i) => i !== qIdx)
                        )
                      }
                      className="text-rose-600 hover:text-rose-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  required
                  value={q.questionText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewQuestions((prev) =>
                      prev.map((item, i) =>
                        i === qIdx ? { ...item, questionText: val } : item
                      )
                    );
                  }}
                  placeholder="Enter question stem..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIdx}`}
                        checked={q.correctIndex === oIdx}
                        onChange={() =>
                          setNewQuestions((prev) =>
                            prev.map((item, i) =>
                              i === qIdx ? { ...item, correctIndex: oIdx } : item
                            )
                          )
                        }
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        required
                        value={opt}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewQuestions((prev) =>
                            prev.map((item, i) =>
                              i === qIdx
                                ? {
                                    ...item,
                                    options: item.options.map((o, idx) =>
                                      idx === oIdx ? val : o
                                    ),
                                  }
                                : item
                            )
                          );
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    required
                    value={q.explanation}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewQuestions((prev) =>
                        prev.map((item, i) =>
                          i === qIdx ? { ...item, explanation: val } : item
                        )
                      );
                    }}
                    placeholder="Explanation shown after submission..."
                    className="sm:col-span-3 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={q.marks}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNewQuestions((prev) =>
                        prev.map((item, i) =>
                          i === qIdx ? { ...item, marks: val } : item
                        )
                      );
                    }}
                    placeholder="Marks"
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creatingQuiz}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl cursor-pointer"
            >
              {creatingQuiz ? 'Saving Quiz...' : 'Publish Quiz'}
            </button>
          </div>
        </form>
      )}

      {/* Teacher Class Results Modal */}
      {resultsModalQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Class Results — {resultsModalQuiz.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {classResults.length} recorded submissions
                </p>
              </div>
              <button
                onClick={() => setResultsModalQuiz(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-6">
              {classResults.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                  No student submissions recorded yet.
                </p>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                      <th className="py-2">Student</th>
                      <th className="py-2 text-right">Score</th>
                      <th className="py-2 text-right">Accuracy</th>
                      <th className="py-2 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {classResults.map((r) => (
                      <tr key={r.attemptId}>
                        <td className="py-3">
                          <p className="font-medium text-slate-900 dark:text-white">
                            {r.studentName}
                          </p>
                          <p className="text-xs text-slate-500">{r.studentEmail}</p>
                        </td>
                        <td className="py-3 text-right font-mono tabular-nums">
                          {r.score}/{r.totalMarks}
                        </td>
                        <td className="py-3 text-right font-mono font-semibold tabular-nums">
                          {r.percentage}%
                        </td>
                        <td className="py-3 text-right font-mono text-xs text-slate-500 tabular-nums">
                          {Math.floor(r.timeSpentSeconds / 60)}m {r.timeSpentSeconds % 60}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
