import React, { useEffect, useState, useCallback } from 'react';
import {
  Bell,
  BookOpen,
  Brain,
  CheckCheck,
  ClipboardList,
  GraduationCap,
  HelpCircle,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest, connectRealtimeStream } from '../lib/api';
import type { NotificationItem, UserRole, WorkspaceTab } from '../types';
import { StudentDashboard } from './StudentDashboard';
import { TeacherDashboard } from './TeacherDashboard';
import { AdminDashboard } from './AdminDashboard';
import { DoubtSystem } from './DoubtSystem';
import { QuizSystem } from './QuizSystem';
import { AiAssistant } from './AiAssistant';
import { RevisionCenter } from './RevisionCenter';
import { VisualLearning } from './VisualLearning';
import { ClassroomManager } from './ClassroomManager';

const NAV_ITEMS: Array<{
  id: WorkspaceTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'doubts', label: 'Anonymous Doubts', icon: HelpCircle },
  { id: 'quizzes', label: 'Quizzes', icon: ClipboardList },
  { id: 'ai', label: 'AI Assistant', icon: Brain },
  { id: 'revision', label: 'Revision Center', icon: BookOpen },
  { id: 'visual', label: 'Visual Learning', icon: Layers },
  { id: 'classrooms', label: 'Classrooms', icon: Users },
  { id: 'admin', label: 'Admin Console', icon: Shield, roles: ['admin'] },
];

export const WorkspaceShell: React.FC = () => {
  const { profile, theme, toggleTheme, switchRole, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await apiRequest<{
        notifications: NotificationItem[];
        unreadCount: number;
      }>('/notifications');
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // ignore transient notification errors
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications, refreshSignal]);

  // Connect real-time SSE stream for instant updates across tabs & users
  useEffect(() => {
    let cleanup = () => {};
    let active = true;

    connectRealtimeStream(() => {
      if (!active) return;
      setRefreshSignal((s) => s + 1);
    }).then((closeFn) => {
      if (active) cleanup = closeFn;
      else closeFn();
    });

    return () => {
      active = false;
      cleanup();
    };
  }, [profile?.id]);

  // Ensure tab stays valid when role changes
  useEffect(() => {
    if (activeTab === 'admin' && profile?.role !== 'admin') {
      setActiveTab('dashboard');
    }
  }, [profile?.role, activeTab]);

  const handleRoleSwitch = async (nextRole: UserRole) => {
    if (!profile || profile.role === nextRole) return;
    setSwitchingRole(true);
    try {
      await switchRole(nextRole);
      setActiveTab(nextRole === 'admin' ? 'admin' : 'dashboard');
      setRefreshSignal((s) => s + 1);
    } finally {
      setSwitchingRole(false);
    }
  };

  const handleMarkRead = async (item: NotificationItem) => {
    if (!item.isRead) {
      await apiRequest(`/notifications/${item.id}/read`, { method: 'PATCH' });
      await loadNotifications();
    }
    if (item.linkTab) {
      setActiveTab(item.linkTab as WorkspaceTab);
    }
    setNotifOpen(false);
  };

  const handleMarkAllRead = async () => {
    await apiRequest('/notifications/read-all', { method: 'POST' });
    await loadNotifications();
  };

  const handleAskAiAboutTopic = (prompt: string) => {
    setAiInitialPrompt(prompt);
    setActiveTab('ai');
  };

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.roles || (profile && item.roles.includes(profile.role))
  );

  const currentNavLabel =
    NAV_ITEMS.find((i) => i.id === activeTab)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] transition-[width] duration-200 ${
          sidebarCollapsed ? 'w-[76px]' : 'w-[252px]'
        }`}
      >
        <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 overflow-hidden cursor-pointer"
          >
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </span>
            {!sidebarCollapsed && (
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                Smart Classroom
              </span>
            )}
          </button>

          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Role Switcher & User Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
          {!sidebarCollapsed && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-1">
                Workspace Role
              </p>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900">
                {(['student', 'teacher', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    disabled={switchingRole}
                    onClick={() => handleRoleSwitch(r)}
                    className={`py-1 text-[11px] font-semibold rounded-md capitalize transition-colors cursor-pointer ${
                      profile?.role === r
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 px-1">
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {profile?.fullName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {profile?.email}
                </p>
              </div>
            )}
            <button
              onClick={logout}
              title="Sign out"
              className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-[#0F172A] h-full flex flex-col justify-between p-4 shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  Smart Classroom
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-4 space-y-1">
                {visibleNav.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer ${
                        active
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900">
                {(['student', 'teacher', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      handleRoleSwitch(r);
                      setMobileMenuOpen(false);
                    }}
                    className={`py-1.5 text-xs font-semibold rounded-md capitalize cursor-pointer ${
                      profile?.role === r
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <button
                onClick={logout}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-rose-600 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Workspace Header */}
        <header className="h-16 px-4 sm:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
              <span className="capitalize">{profile?.role} Workspace</span>
              <span className="mx-2">/</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {currentNavLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle light and dark theme"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {/* In-App Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                aria-label="Notifications"
                className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Notifications ({unreadCount} unread)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-xs text-center text-slate-500 dark:text-slate-400">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleMarkRead(n)}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                            !n.isRead
                              ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="capitalize font-medium text-indigo-600 dark:text-indigo-400">
                              {n.category}
                            </span>
                            <span>
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Active Module Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
          {activeTab === 'dashboard' &&
            (profile?.role === 'teacher' ? (
              <TeacherDashboard
                onNavigate={setActiveTab}
                refreshSignal={refreshSignal}
              />
            ) : profile?.role === 'admin' ? (
              <AdminDashboard refreshSignal={refreshSignal} />
            ) : (
              <StudentDashboard
                onNavigate={setActiveTab}
                refreshSignal={refreshSignal}
              />
            ))}

          {activeTab === 'doubts' && (
            <DoubtSystem refreshSignal={refreshSignal} />
          )}

          {activeTab === 'quizzes' && (
            <QuizSystem refreshSignal={refreshSignal} />
          )}

          {activeTab === 'ai' && (
            <AiAssistant
              initialPrompt={aiInitialPrompt}
              onConsumeInitialPrompt={() => setAiInitialPrompt(null)}
            />
          )}

          {activeTab === 'revision' && (
            <RevisionCenter refreshSignal={refreshSignal} />
          )}

          {activeTab === 'visual' && (
            <VisualLearning onAskAiAboutTopic={handleAskAiAboutTopic} />
          )}

          {activeTab === 'classrooms' && (
            <ClassroomManager refreshSignal={refreshSignal} />
          )}

          {activeTab === 'admin' && profile?.role === 'admin' && (
            <AdminDashboard refreshSignal={refreshSignal} />
          )}
        </main>
      </div>
    </div>
  );
};
