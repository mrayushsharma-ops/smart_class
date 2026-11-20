import React, { useState } from 'react';
import { GraduationCap, Shield, Users, X, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

interface AuthModalProps {
  initialRole?: UserRole;
  onClose: () => void;
}

const ROLE_OPTIONS: Array<{
  role: UserRole;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    role: 'student',
    title: 'Student Account',
    desc: 'Join classrooms, ask anonymous doubts, take timed quizzes, create flashcards, and use the AI tutor.',
    icon: BookOpen,
  },
  {
    role: 'teacher',
    title: 'Teacher Account',
    desc: 'Create classrooms, publish quizzes, reply & pin doubt explanations, and inspect Learning Gap Analysis.',
    icon: GraduationCap,
  },
  {
    role: 'admin',
    title: 'Administrator Account',
    desc: 'Manage platform users, role permissions, classrooms, and moderate platform content.',
    icon: Shield,
  },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  initialRole = 'student',
  onClose,
}) => {
  const { signInWithGoogle, authError } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle(selectedRole);
      onClose();
    } catch {
      // Error surfaced via authError
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Users className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Sign in to Smart Classroom
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose your workspace role and continue with Google
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2.5">
            {ROLE_OPTIONS.map((item) => {
              const Icon = item.icon;
              const active = selectedRole === item.role;
              return (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => setSelectedRole(item.role)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors flex items-start gap-3.5 cursor-pointer ${
                    active
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {authError}
            </div>
          )}

          <button
            type="button"
            disabled={submitting}
            onClick={handleContinue}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.35 11.1h-9.18v2.98h5.27c-.23 1.48-1.72 4.35-5.27 4.35-3.17 0-5.76-2.63-5.76-5.88s2.59-5.88 5.76-5.88c1.81 0 3.02.77 3.71 1.43l2.53-2.44C16.79 4.15 14.69 3.2 12.17 3.2 7.11 3.2 3 7.31 3 12.55s4.11 9.35 9.17 9.35c5.29 0 8.8-3.72 8.8-8.96 0-.6-.06-1.22-.16-1.84Z"
              />
            </svg>
            {submitting
              ? 'Signing in...'
              : `Continue with Google as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`}
          </button>

          <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
            Secured with Firebase Authentication & PostgreSQL role-based permissions. You can also switch roles inside the workspace to explore all views.
          </p>
        </div>
      </div>
    </div>
  );
};
