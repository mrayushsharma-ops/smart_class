import React, { useEffect, useState, useCallback } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardPlus,
  HelpCircle,
  Plus,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import type { WorkspaceTab } from '../types';

interface TeacherDashboardData {
  stats: {
    totalStudents: number;
    activeClassrooms: number;
    pendingDoubts: number;
    quizzesCreated: number;
    avgClassPerformance: number;
  };
  learningGaps: Array<{
    topic: string;
    subject: string;
    doubtCount: number;
    doubtUpvotes: number;
    avgQuizScore: number | null;
    gapIndex: number;
    severity: 'High Priority' | 'Watch' | 'On Track';
  }>;
  participationChart: Array<{
    classroom: string;
    title: string;
    students: number;
    doubts: number;
    quizSubmissions: number;
  }>;
  recentActivity: Array<{
    id: string;
    title: string;
    meta: string;
    timestamp: string;
  }>;
}

interface TeacherDashboardProps {
  onNavigate: (tab: WorkspaceTab) => void;
  refreshSignal: number;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onNavigate,
  refreshSignal,
}) => {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await apiRequest<TeacherDashboardData>('/dashboard/teacher');
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Unable to load teacher analytics.');
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-6 flex items-center justify-between">
        <p className="text-sm text-rose-700 dark:text-rose-300">
          {error || 'Unable to load teacher dashboard.'}
        </p>
        <button
          onClick={load}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Instructor Analytics · Learning Gap Intelligence
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Teacher Command Center
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('doubts')}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Review Pending Doubts ({data.stats.pendingDoubts})
          </button>
          <button
            onClick={() => onNavigate('quizzes')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ClipboardPlus className="w-3.5 h-3.5" />
            Create Quiz
          </button>
          <button
            onClick={() => onNavigate('classrooms')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Manage Classrooms
          </button>
        </div>
      </div>

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Students', value: data.stats.totalStudents },
          { label: 'Active Classrooms', value: data.stats.activeClassrooms },
          { label: 'Pending Doubts', value: data.stats.pendingDoubts },
          { label: 'Quizzes Created', value: data.stats.quizzesCreated },
          {
            label: 'Avg Class Score',
            value: `${data.stats.avgClassPerformance}%`,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {kpi.label}
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-950 dark:text-white mt-2">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Learning Gap Analysis (Signature Teacher Feature) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Learning Gap Analysis — Frequently Misunderstood Topics
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Synthesized directly from anonymous doubt frequency, student upvotes, and graded quiz scores
            </p>
          </div>
          <button
            onClick={() => onNavigate('doubts')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            Answer Doubts <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/40">
                <th className="py-3 px-6">Topic</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4 text-right">Doubts</th>
                <th className="py-3 px-4 text-right">Upvotes</th>
                <th className="py-3 px-4 text-right">Quiz Accuracy</th>
                <th className="py-3 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {data.learningGaps.map((gap) => (
                <tr
                  key={`${gap.subject}-${gap.topic}`}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3.5 px-6 font-semibold text-slate-900 dark:text-white">
                    {gap.topic}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {gap.subject}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                    {gap.doubtCount}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                    {gap.doubtUpvotes}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                    {gap.avgQuizScore !== null ? `${gap.avgQuizScore}%` : 'No attempts'}
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                        gap.severity === 'High Priority'
                          ? 'text-rose-600 dark:text-rose-400'
                          : gap.severity === 'Watch'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {gap.severity === 'On Track' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                      {gap.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Participation Chart & Recent Classroom Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Student Participation by Classroom
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Enrolled students, anonymous doubts raised, and quiz submissions per subject
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.participationChart}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.2)"
                  vertical={false}
                />
                <XAxis
                  dataKey="classroom"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
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
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="students" name="Students" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="doubts" name="Doubts" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="quizSubmissions"
                  name="Quiz Attempts"
                  fill="#0284C7"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Recent Classroom Activity
          </h2>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.recentActivity.map((item) => (
              <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {item.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {item.meta} · {new Date(item.timestamp).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
