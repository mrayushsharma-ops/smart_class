import React, { useEffect, useState, useCallback } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpRight,
  BookOpen,
  ClipboardList,
  HelpCircle,
  Layers,
  Plus,
  Sparkles,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { WorkspaceTab } from '../types';

interface StudentDashboardData {
  stats: {
    enrolledClasses: number;
    upcomingQuizzes: number;
    completedQuizzes: number;
    averageQuizScore: number;
    masteredFlashcards: number;
    totalFlashcards: number;
    completedLessons: number;
  };
  progressSeries: Array<{
    label: string;
    attempt: string;
    score: number;
    subject: string;
  }>;
  recentActivities: Array<{
    id: string;
    title: string;
    meta: string;
    timestamp: string;
  }>;
  pendingTasks: Array<{
    id: string;
    title: string;
    meta: string;
    actionTab: WorkspaceTab;
  }>;
  recentAnnouncements: Array<{
    id: number;
    title: string;
    content: string;
    dueDate: string | null;
    createdAt: string;
    classroomTitle: string;
    subject: string;
  }>;
}

interface StudentDashboardProps {
  onNavigate: (tab: WorkspaceTab) => void;
  refreshSignal: number;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onNavigate,
  refreshSignal,
}) => {
  const { profile } = useAuth();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await apiRequest<StudentDashboardData>('/dashboard/student');
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-6 flex items-center justify-between gap-4">
        <p className="text-sm text-rose-700 dark:text-rose-300">
          {error || 'Dashboard data could not be loaded.'}
        </p>
        <button
          onClick={load}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const firstName = profile?.fullName?.split(' ')[0] || 'Student';

  return (
    <div className="space-y-8">
      {/* Welcome Header & Quick Access Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Student Learning Overview · {profile?.gradeOrDepartment || 'Academic Workspace'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Welcome back, {firstName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('doubts')}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Ask a Doubt
          </button>
          <button
            onClick={() => onNavigate('classrooms')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Join Classroom
          </button>
          <button
            onClick={() => onNavigate('quizzes')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Take a Quiz
          </button>
          <button
            onClick={() => onNavigate('revision')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Revision Center
          </button>
          <button
            onClick={() => onNavigate('ai')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Tutor
          </button>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Enrolled Classes',
            value: String(data.stats.enrolledClasses),
            sub: 'Active cohorts',
          },
          {
            label: 'Upcoming Quizzes',
            value: String(data.stats.upcomingQuizzes),
            sub: 'Open for attempt',
          },
          {
            label: 'Completed Quizzes',
            value: String(data.stats.completedQuizzes),
            sub: `${data.stats.masteredFlashcards}/${data.stats.totalFlashcards} flashcards mastered`,
          },
          {
            label: 'Average Quiz Score',
            value: `${data.stats.averageQuizScore}%`,
            sub:
              data.stats.completedQuizzes > 0
                ? 'Calculated from graded attempts'
                : 'Take your first quiz to track',
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {metric.label}
            </p>
            <p className="text-3xl font-bold font-mono tabular-nums text-slate-950 dark:text-white mt-2">
              {metric.value}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              {metric.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Learning Progress Chart + Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Learning Progress
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Quiz accuracy percentage across your recent graded submissions
              </p>
            </div>
            <button
              onClick={() => onNavigate('quizzes')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Open Quizzes <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.progressSeries}
                margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.2)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    backgroundColor: '#0F172A',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  name="Score (%)"
                  stroke="#4F46E5"
                  strokeWidth={2.5}
                  fill="url(#scoreGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Pending Tasks
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Unattempted quizzes and flashcards awaiting mastery
            </p>

            {data.pendingTasks.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
                All caught up. Explore Visual Learning Labs or create new flashcards.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.pendingTasks.map((task) => (
                  <li key={task.id} className="py-3 first:pt-0 last:pb-0">
                    <button
                      onClick={() => onNavigate(task.actionTab)}
                      className="w-full text-left group flex items-start justify-between gap-3 cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {task.meta}
                        </p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0 mt-0.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={() => onNavigate('visual')}
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            Explore Interactive Visual Labs
          </button>
        </div>
      </div>

      {/* Recent Classroom Activities + Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Recent Classroom Activities
          </h2>
          {data.recentActivities.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No recent quiz or doubt activity yet.
              </p>
              <button
                onClick={() => onNavigate('doubts')}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                Post Your First Anonymous Doubt
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.recentActivities.map((act) => (
                <li key={act.id} className="py-3.5 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {act.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {act.meta} · {new Date(act.timestamp).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Announcements
            </h2>
            <button
              onClick={() => onNavigate('classrooms')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              View Classes
            </button>
          </div>
          {data.recentAnnouncements.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-6">
              Join a classroom to see teacher announcements and deadlines.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.recentAnnouncements.map((ann) => (
                <li key={ann.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>
                      {ann.subject} · {ann.classroomTitle}
                    </span>
                    {ann.dueDate && (
                      <span className="font-mono text-amber-700 dark:text-amber-400">
                        Due {ann.dueDate}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {ann.title}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {ann.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
