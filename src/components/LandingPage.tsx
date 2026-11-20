import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  EyeOff,
  GraduationCap,
  Layers,
  Moon,
  ShieldCheck,
  Sun,
  ThumbsUp,
  Timer,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LandingPageProps {
  onOpenAuth: (preferredRole?: 'student' | 'teacher' | 'admin') => void;
}

interface PublicStats {
  classrooms: number;
  doubtsResolvedOrAsked: number;
  activeQuizzes: number;
  learnersAndFaculty: number;
}

const PREVIEW_TABS = [
  { id: 'doubt', label: 'Anonymous Doubts' },
  { id: 'quiz', label: 'Timed Quizzes' },
  { id: 'ai', label: 'AI Assistant' },
] as const;

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  const { theme, toggleTheme } = useAuth();
  const [previewTab, setPreviewTab] = useState<'doubt' | 'quiz' | 'ai'>('doubt');
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetch('/api/public/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#0B1120] dark:text-slate-100 transition-colors">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0B1120]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          {/* Zone 1: Clean single-line brand wordmark */}
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 flex items-center gap-2.5"
          >
            <span className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </span>
            Smart Classroom
          </a>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a
              href="#features"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#students"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Students
            </a>
            <a
              href="#teachers"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Teachers
            </a>
            <a
              href="#stories"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Stories
            </a>
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="flex items-center shrink-0">
            <button
              onClick={() => onOpenAuth('student')}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-14 pb-20 lg:pt-20 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-4">
                  Digital Learning Workspace · Anonymous Doubt Resolution · AI Tutoring
                </p>
                <h1 className="text-[clamp(2.4rem,4.4vw,3.75rem)] font-extrabold tracking-tight leading-[1.08] text-slate-950 dark:text-white mb-6">
                  Learn Smarter. Ask Freely. Grow Faster.
                </h1>
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl mb-8">
                  Smart Classroom removes the fear of asking questions in class. Students post doubts anonymously, practice with timed quizzes, study through interactive visual labs, and receive structured explanations from teachers and an AI tutor.
                </p>

                <div className="flex flex-wrap items-center gap-3.5">
                  <button
                    onClick={() => onOpenAuth('student')}
                    className="px-6 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Get Started Free
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <a
                    href="#features"
                    className="px-6 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors whitespace-nowrap shrink-0"
                  >
                    Explore Features
                  </a>
                  <button
                    onClick={toggleTheme}
                    aria-label="Toggle color theme"
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4" />
                    ) : (
                      <Moon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Architectural Classroom Photo */}
              <div className="mt-10 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 aspect-[16/9] bg-slate-900 relative">
                {!heroImgFailed ? (
                  <img
                    src="/src/assets/images/hero_classroom_workspace_1795151058927.jpg"
                    alt="Modern collaborative university study studio with natural daylight"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
                    <GraduationCap className="w-10 h-10 text-indigo-400 mb-2" />
                    <p className="text-sm font-semibold">Smart Classroom Learning Studio</p>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent p-5">
                  <p className="text-xs text-slate-200 font-medium">
                    Built for Physics, Computer Science, Biology, and Chemistry cohorts · Role-based classrooms for Students, Teachers, and Admins
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Animated Dashboard Preview */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111827] p-6 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Interactive Workspace Preview
                      </p>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">
                        Inside Smart Classroom
                      </h2>
                    </div>

                    <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800">
                      {PREVIEW_TABS.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setPreviewTab(tab.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            previewTab === tab.id
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <motion.div
                    key={previewTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="py-6 space-y-5"
                  >
                    {previewTab === 'doubt' && (
                      <>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>Physics · Faraday Induction · Posted Anonymously</span>
                            <span className="font-medium text-emerald-700 dark:text-emerald-400">
                              Resolved
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Why does Lenz law oppose the change in flux instead of the flux itself?
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            When a magnet moves away from a conducting loop, I keep getting the induced current direction backwards. Could someone explain intuitively why the loop preserves flux?
                          </p>
                          <div className="flex items-center gap-5 text-xs text-slate-500 dark:text-slate-400 pt-1">
                            <span className="inline-flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400 tabular-nums">
                              <ThumbsUp className="w-3.5 h-3.5" /> 14 classmates upvoted
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <EyeOff className="w-3.5 h-3.5" /> Identity hidden from peers
                            </span>
                          </div>
                        </div>

                        <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-2">
                          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                            Pinned Teacher Explanation · Dr. Elena Vance
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            Think of a conducting loop as having magnetic inertia. By conservation of energy, the induced current resists whatever change is happening right now: if flux drops as the magnet pulls away, the loop pulls back to sustain it.
                          </p>
                        </div>
                      </>
                    )}

                    {previewTab === 'quiz' && (
                      <div className="space-y-5">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>AP Physics C · Question 2 of 4</span>
                          <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums inline-flex items-center gap-1">
                            <Timer className="w-3.5 h-3.5" /> 08:42 remaining
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                          A bar magnet with its North pole facing a stationary copper ring is pulled rapidly away. What is the induced current direction?
                        </h3>
                        <div className="space-y-2.5">
                          {[
                            {
                              text: 'Clockwise, creating a South pole to attract the receding North pole',
                              selected: true,
                            },
                            {
                              text: 'Counter-clockwise, creating a North pole to repel the magnet',
                              selected: false,
                            },
                            {
                              text: 'Zero current because the magnet is moving away',
                              selected: false,
                            },
                          ].map((opt, idx) => (
                            <div
                              key={idx}
                              className={`p-3.5 rounded-xl border text-sm flex items-center justify-between ${
                                opt.selected
                                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-slate-900 dark:text-white font-medium'
                                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              <span>{opt.text}</span>
                              {opt.selected && (
                                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {previewTab === 'ai' && (
                      <div className="space-y-4">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Mode: Step-by-Step · Difficulty: Intermediate · Computer Science
                        </div>
                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200">
                          Why does Dijkstra fail when a single negative edge exists even without a cycle?
                        </div>
                        <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/35 border border-indigo-200/70 dark:border-indigo-900/60 text-sm text-slate-700 dark:text-slate-200 space-y-2 leading-relaxed">
                          <p className="font-semibold text-indigo-900 dark:text-indigo-300">
                            Smart Classroom AI Tutor
                          </p>
                          <p>
                            1. Dijkstra pops the closest unvisited node u and permanently locks its distance.
                          </p>
                          <p>
                            2. That greedy lock assumes every unexplored path through other nodes can only add non-negative cost.
                          </p>
                          <p>
                            3. One negative edge lets a detour that looked longer at first end up shorter than u after u was already finalized.
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Live PostgreSQL Stats Row */}
                <div className="pt-5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Active Classes</p>
                    <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                      {stats ? stats.classrooms : '4'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Doubts Shared</p>
                    <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                      {stats ? stats.doubtsResolvedOrAsked : '5'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Live Quizzes</p>
                    <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                      {stats ? stats.activeQuizzes : '3'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Showcase — Asymmetric Bento Grid */}
        <section
          id="features"
          className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0F172A]/60 py-20"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-2">
                Core Capabilities
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
                Six connected learning tools in one classroom hub
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Marquee 2-col feature: Anonymous Doubt System */}
              <div className="md:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-8 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Anonymous Doubt Resolution Board
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                    Students ask conceptual questions without revealing their identity to classmates. Peers upvote shared confusion points, while teachers group doubts by topic, pin official explanations, and track unresolved learning gaps in real time.
                  </p>
                </div>
                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Peer identity masking</span>
                  <span>Topic & subject filters</span>
                  <span>Upvoting & pinned teacher replies</span>
                  <span>Faculty moderation visibility</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-8">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5">
                  <Timer className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Timed Interactive Quizzes
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Real countdown timers, server-side grading, instant answer explanations, historical attempt review, and an opt-in class leaderboard.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-8">
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-5">
                  <Brain className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  AI Learning Assistant
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Switch between Beginner, Intermediate, and Advanced explanations, request step-by-step breakdowns, summarize chapters, or generate practice questions.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-8">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Smart Revision Center
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Organized subject notes, high-yield exam guides, custom digital flashcards with mastery tracking, saved lessons, and completion progress.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-8">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-5">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Visual Learning Labs
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Interactive topic diagrams with parameter sliders, progressive stage walkthroughs, and concept breakdowns for Physics, Biology, CS, and Chemistry.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works — Clean Editorial Numbered Steps */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-2xl mb-12">
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-2">
              Workflow
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
              How Smart Classroom works from day one
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                num: '01. Join or create a classroom',
                desc: 'Teachers create subject cohorts and share unique join codes like PHYS-204. Students enroll in seconds and immediately see course materials, quizzes, and announcements.',
              },
              {
                num: '02. Ask freely and test mastery',
                desc: 'Whenever a concept feels unclear, students submit an anonymous doubt, explore interactive visual models, or ask the AI tutor for a step-by-step walkthrough before taking timed quizzes.',
              },
              {
                num: '03. Close learning gaps together',
                desc: 'Every doubt upvote and quiz score feeds into the Teacher Learning Gap Analysis, helping faculty pinpoint misunderstood topics and pin targeted explanations for the entire cohort.',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="pt-6 border-t border-slate-200 dark:border-slate-800"
              >
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                  {step.num}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Student Benefits & Teacher Benefits */}
        <section
          id="students"
          className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0F172A]/60 py-20"
        >
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-8 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
                  For Students
                </p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                  Clarity without classroom hesitation
                </h3>
                <ul className="space-y-3.5 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <span>Ask difficult questions anonymously and upvote classmates' doubts that match yours.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <span>Turn weak quiz topics into custom flashcards and saved chapter summaries.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <span>Get instant beginner-to-advanced breakdowns from the AI Learning Assistant.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8">
                <button
                  onClick={() => onOpenAuth('student')}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer"
                >
                  Enter Student Workspace
                </button>
              </div>
            </div>

            <div
              id="teachers"
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-8 flex flex-col justify-between"
            >
              <div>
                <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-2">
                  For Teachers & Administrators
                </p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                  Spot hidden misunderstandings before exam week
                </h3>
                <ul className="space-y-3.5 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                    <span>Group anonymous doubts by topic and pin canonical explanations once for the whole class.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                    <span>Publish timed multiple-choice quizzes and inspect real-time Learning Gap Analysis.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                    <span>Manage rosters, announcements, and study materials across cohorts from one panel.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => onOpenAuth('teacher')}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Open Teacher Dashboard
                </button>
                <button
                  onClick={() => onOpenAuth('admin')}
                  className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4" />
                  Admin Console
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Clearly Marked Sample Testimonials */}
        <section id="stories" className="max-w-7xl mx-auto px-6 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
            <div>
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-2">
                Illustrative Classroom Outcomes · Sample Testimonials
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                How cohorts use Smart Classroom
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Note: The testimonials below are clearly labeled sample scenarios illustrating typical platform workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote:
                  'Before Smart Classroom, I rarely raised my hand during AP Physics lectures. Posting doubts anonymously let me ask about Faraday induction and review Dr. Vance’s pinned explanation before our midterm.',
                name: 'Ananya Verma',
                role: 'Grade 12 Physics Student · Sample Story',
                org: 'Northbridge STEM Academy',
              },
              {
                quote:
                  'Grouping anonymous doubts alongside quiz accuracy showed me that half the class struggled with negative edge weights in Dijkstra. One targeted review session raised average quiz scores by 18 percentage points.',
                name: 'Prof. David Morales',
                role: 'Computer Science Instructor · Sample Story',
                org: 'Westview Collegiate Institute',
              },
              {
                quote:
                  'Combining the Visual Learning diagrams with my own revision flashcards cut my Biology exam prep time significantly because I could track exactly which chapters were mastered.',
                name: 'Samuel Okafor',
                role: 'Undergraduate Biology Student · Sample Story',
                org: 'Lakeside Honors College',
              },
            ].map((story) => (
              <figure
                key={story.name}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-7 flex flex-col justify-between"
              >
                <blockquote className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
                  “{story.quote}”
                </blockquote>
                <figcaption className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {story.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {story.role} · {story.org}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D19]">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Smart Classroom
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              AI-powered student learning, anonymous doubt resolution, and classroom analytics.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 dark:text-slate-400">
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white">
              How It Works
            </a>
            <a href="#students" className="hover:text-slate-900 dark:hover:text-white">
              Students
            </a>
            <a href="#teachers" className="hover:text-slate-900 dark:hover:text-white">
              Teachers
            </a>
            <a
              href="mailto:support@smartclassroom.edu"
              className="hover:text-slate-900 dark:hover:text-white"
            >
              Contact: support@smartclassroom.edu
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
