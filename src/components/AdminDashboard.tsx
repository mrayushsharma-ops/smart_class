import React, { useEffect, useState, useCallback } from 'react';
import { Trash2, Shield } from 'lucide-react';
import { apiRequest } from '../lib/api';
import type { UserRole } from '../types';

interface AdminOverviewData {
  stats: {
    totalUsers: number;
    students: number;
    teachers: number;
    admins: number;
    totalClassrooms: number;
    totalDoubts: number;
    totalQuizzes: number;
    totalAttempts: number;
    totalMaterials: number;
  };
  users: Array<{
    id: number;
    fullName: string;
    email: string;
    role: UserRole;
    gradeOrDepartment: string | null;
    createdAt: string;
  }>;
  classrooms: Array<{
    id: number;
    title: string;
    subject: string;
    joinCode: string;
    teacherName: string;
    createdAt: string;
  }>;
  doubts: Array<{
    id: number;
    title: string;
    subject: string;
    topic: string;
    status: string;
    upvotesCount: number;
    authorName: string;
    createdAt: string;
  }>;
  materials: Array<{
    id: number;
    title: string;
    subject: string;
    chapter: string;
    materialType: string;
    createdAt: string;
  }>;
}

export const AdminDashboard: React.FC<{ refreshSignal: number }> = ({
  refreshSignal,
}) => {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [section, setSection] = useState<'users' | 'classrooms' | 'content'>('users');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await apiRequest<AdminOverviewData>('/admin/overview');
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Unable to load admin overview.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  const handleRoleChange = async (userId: number, role: UserRole) => {
    setBusyId(`user-${userId}`);
    try {
      await apiRequest(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Role update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (type: 'classrooms' | 'doubts' | 'materials', id: number) => {
    setBusyId(`${type}-${id}`);
    try {
      await apiRequest(`/admin/${type}/${id}`, { method: 'DELETE' });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Delete operation failed.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
        <div className="h-96 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-6">
        <p className="text-sm text-rose-700 dark:text-rose-300">{error || 'Admin access required.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Platform Governance · Role & Content Administration
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Admin Console
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800">
          {[
            { id: 'users', label: `Users (${data.stats.totalUsers})` },
            { id: 'classrooms', label: `Classrooms (${data.stats.totalClassrooms})` },
            { id: 'content', label: `Content (${data.stats.totalDoubts + data.stats.totalMaterials})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSection(tab.id as any)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                section === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Accounts',
            value: data.stats.totalUsers,
            sub: `${data.stats.students} students · ${data.stats.teachers} teachers · ${data.stats.admins} admins`,
          },
          {
            label: 'Active Classrooms',
            value: data.stats.totalClassrooms,
            sub: `${data.stats.totalMaterials} study materials`,
          },
          {
            label: 'Doubts Logged',
            value: data.stats.totalDoubts,
            sub: 'Full moderation audit trail',
          },
          {
            label: 'Quiz Activity',
            value: data.stats.totalAttempts,
            sub: `Across ${data.stats.totalQuizzes} published quizzes`,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {item.label}
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-950 dark:text-white mt-2">
              {item.value}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {item.sub}
            </p>
          </div>
        ))}
      </div>

      {section === 'users' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/40">
                  <th className="py-3 px-6">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Department / Grade</th>
                  <th className="py-3 px-6 text-right">Assigned Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {data.users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-white">
                      {u.fullName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono text-xs">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs">
                      {u.gradeOrDepartment || '—'}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <select
                        value={u.role}
                        disabled={busyId === `user-${u.id}`}
                        onChange={(e) =>
                          handleRoleChange(u.id, e.target.value as UserRole)
                        }
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white cursor-pointer"
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'classrooms' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/40">
                  <th className="py-3 px-6">Classroom</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Join Code</th>
                  <th className="py-3 px-4">Instructor</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {data.classrooms.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-white">
                      {c.title}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {c.subject}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                      {c.joinCode}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {c.teacherName}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        disabled={busyId === `classrooms-${c.id}`}
                        onClick={() => handleDelete('classrooms', c.id)}
                        className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete classroom"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'content' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Doubt Moderation Queue
            </h2>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.doubts.map((d) => (
                <li
                  key={d.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {d.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {d.subject} · {d.topic} · Author (Admin Audit): {d.authorName} · {d.status}
                    </p>
                  </div>
                  <button
                    disabled={busyId === `doubts-${d.id}`}
                    onClick={() => handleDelete('doubts', d.id)}
                    className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0 cursor-pointer"
                    title="Remove doubt"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Published Study Materials
            </h2>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.materials.map((m) => (
                <li
                  key={m.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {m.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {m.subject} · {m.chapter} · {m.materialType}
                    </p>
                  </div>
                  <button
                    disabled={busyId === `materials-${m.id}`}
                    onClick={() => handleDelete('materials', m.id)}
                    className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0 cursor-pointer"
                    title="Remove material"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
