import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Brain,
  Info,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { apiRequest } from '../lib/api';

type Mode = 'explain' | 'step_by_step' | 'practice' | 'summarize';
type Level = 'beginner' | 'intermediate' | 'advanced';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: Mode;
  level?: Level;
  demoMode?: boolean;
}

const STARTER_PROMPTS = [
  {
    label: 'Explain Lenz Law simply',
    prompt: 'Explain Lenz law and why induced current opposes the change in magnetic flux using an everyday analogy.',
    subject: 'Physics',
    mode: 'explain' as Mode,
  },
  {
    label: 'Step-by-step Dijkstra failure case',
    prompt: 'Walk me step by step through a 3-node graph where Dijkstra fails because of one negative edge weight.',
    subject: 'Computer Science',
    mode: 'step_by_step' as Mode,
  },
  {
    label: 'Generate Biology practice questions',
    prompt: 'Create 3 practice questions on oxidative phosphorylation and proton gradients across the inner mitochondrial membrane.',
    subject: 'Biology',
    mode: 'practice' as Mode,
  },
  {
    label: 'Summarize aromatic resonance',
    prompt: 'Summarize Huckel 4n+2 rule and why benzene favors electrophilic substitution over addition reactions.',
    subject: 'Chemistry',
    mode: 'summarize' as Mode,
  },
];

interface AiAssistantProps {
  initialPrompt?: string | null;
  onConsumeInitialPrompt?: () => void;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  initialPrompt,
  onConsumeInitialPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am your Smart Classroom AI Learning Assistant. Pick an explanation mode (Explain Simply, Step-by-Step, Practice Questions, or Summarize) and a difficulty level, then ask any academic question.',
    },
  ]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('explain');
  const [level, setLevel] = useState<Level>('intermediate');
  const [subject, setSubject] = useState('General');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
      onConsumeInitialPrompt?.();
    }
  }, [initialPrompt, onConsumeInitialPrompt]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendPrompt = async (overridePrompt?: string, overrideSubject?: string, overrideMode?: Mode) => {
    const text = (overridePrompt ?? input).trim();
    if (text.length < 3 || loading) return;

    const chosenMode = overrideMode ?? mode;
    const chosenSubject = overrideSubject ?? subject;

    setError(null);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      mode: chosenMode,
      level,
    };

    const nextHistory = [...messages, userMsg]
      .filter((m) => m.id !== 'welcome')
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    if (!overridePrompt) setInput('');
    setLoading(true);

    try {
      const res = await apiRequest<{
        reply: string;
        demoMode: boolean;
        model: string;
      }>('/ai/assist', {
        method: 'POST',
        body: JSON.stringify({
          prompt: text,
          mode: chosenMode,
          level,
          subject: chosenSubject === 'General' ? undefined : chosenSubject,
          history: nextHistory.slice(0, -1),
        }),
      });

      setIsDemoMode(res.demoMode);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: res.reply,
          mode: chosenMode,
          level,
          demoMode: res.demoMode,
        },
      ]);
    } catch (err: any) {
      setError(err?.message || 'Unable to reach AI Learning Assistant.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 h-full flex flex-col">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Adaptive Academic Tutor · Multi-Level Explanations
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            AI Learning Assistant
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Difficulty Level Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800">
            {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  level === lvl
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-label="Subject focus"
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            <option value="General">All Subjects</option>
            <option value="Physics">Physics</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Biology">Biology</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Mathematics">Mathematics</option>
          </select>

          <button
            onClick={() =>
              setMessages([
                {
                  id: 'welcome',
                  role: 'assistant',
                  content:
                    'Conversation cleared. Ask a new question or choose a starter prompt below.',
                },
              ])
            }
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Selector Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'explain', label: 'Explain Simply + Real Example' },
            { id: 'step_by_step', label: 'Step-by-Step Breakdown' },
            { id: 'practice', label: 'Generate Practice Questions' },
            { id: 'summarize', label: 'Summarize Topic' },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === m.id
                ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Transparent Demo Mode Notice if API key is not configured */}
      {isDemoMode && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            <strong>Demo Mode Active:</strong> No live GEMINI_API_KEY was detected on the server, so structured study templates are shown instead of live AI completions.
          </span>
        </div>
      )}

      {/* Chat Viewport */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] flex flex-col min-h-[460px] max-h-[65vh] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
                    <Brain className="w-3.5 h-3.5" />
                    <span>
                      AI Learning Assistant
                      {msg.demoMode ? ' · Demo Mode' : ''}
                    </span>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                Drafting {level}-level explanation...
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Starter Suggestions */}
        {messages.length <= 2 && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
            {STARTER_PROMPTS.map((starter) => (
              <button
                key={starter.label}
                type="button"
                onClick={() => {
                  setSubject(starter.subject);
                  setMode(starter.mode);
                  sendPrompt(starter.prompt, starter.subject, starter.mode);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3 h-3 text-indigo-500" />
                {starter.label}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendPrompt();
          }}
          className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask anything (${mode.replace('_', ' ')} · ${level} level)...`}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || input.trim().length < 3}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
