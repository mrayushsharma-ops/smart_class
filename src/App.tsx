import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { WorkspaceShell } from './components/WorkspaceShell';
import type { UserRole } from './types';

const AppRouter: React.FC = () => {
  const { profile, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [preferredRole, setPreferredRole] = useState<UserRole>('student');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex flex-col items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
        <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
          <GraduationCap className="w-5 h-5" />
        </span>
        <p className="text-sm font-medium">Loading Smart Classroom...</p>
      </div>
    );
  }

  if (profile) {
    return <WorkspaceShell />;
  }

  return (
    <>
      <LandingPage
        onOpenAuth={(role) => {
          setPreferredRole(role || 'student');
          setAuthModalOpen(true);
        }}
      />
      {authModalOpen && (
        <AuthModal
          initialRole={preferredRole}
          onClose={() => setAuthModalOpen(false)}
        />
      )}
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
