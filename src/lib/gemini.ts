import { GoogleGenAI } from '@google/genai';

export type AssistantMode = 'explain' | 'step_by_step' | 'practice' | 'summarize';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface AiAssistInput {
  prompt: string;
  mode: AssistantMode;
  level: DifficultyLevel;
  subject?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AiAssistResult {
  reply: string;
  demoMode: boolean;
  model: string;
}

function hasConfiguredApiKey(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return false;
  if (key === 'MY_GEMINI_API_KEY' || key.startsWith('YOUR_')) return false;
  return true;
}

function buildDemoModeReply(input: AiAssistInput): string {
  const levelLabel =
    input.level.charAt(0).toUpperCase() + input.level.slice(1);
  const subjectText = input.subject ? ` (${input.subject})` : '';

  if (input.mode === 'practice') {
    return [
      `[Demo Mode — No live AI API key configured on the server]`,
      ``,
      `Here is a sample ${levelLabel}-level practice set template for "${input.prompt}"${subjectText}:`,
      ``,
      `1. Conceptual Check: Define the core mechanism behind "${input.prompt}" in your own words and identify one boundary condition where it breaks down.`,
      `2. Applied Problem: Given a real-world scenario involving this topic, predict what changes when the primary input variable doubles.`,
      `3. Common Pitfall: Explain why learners often confuse the cause-and-effect direction in this concept.`,
      ``,
      `Connect a valid GEMINI_API_KEY in Settings > Secrets to receive live, dynamically generated explanations and worked solutions.`,
    ].join('\n');
  }

  if (input.mode === 'summarize') {
    return [
      `[Demo Mode — No live AI API key configured on the server]`,
      ``,
      `Structured Summary Template (${levelLabel} level${subjectText}):`,
      `- Core Idea: Focuses on "${input.prompt}".`,
      `- Key Takeaway 1: Identify the governing rule or invariant.`,
      `- Key Takeaway 2: Connect the formal formula or definition to a concrete visual analogy.`,
      `- Exam Check: Review edge cases and units before moving to timed practice.`,
      ``,
      `Configure GEMINI_API_KEY in Settings > Secrets for live AI summarization.`,
    ].join('\n');
  }

  if (input.mode === 'step_by_step') {
    return [
      `[Demo Mode — No live AI API key configured on the server]`,
      ``,
      `Step-by-Step Study Framework (${levelLabel} level${subjectText}) for "${input.prompt}":`,
      `Step 1 — State the knowns and definitions clearly.`,
      `Step 2 — Choose the governing law, theorem, or pathway.`,
      `Step 3 — Walk through the transformation one logical step at a time.`,
      `Step 4 — Sanity-check the final result with a real-life boundary case.`,
      ``,
      `Configure GEMINI_API_KEY in Settings > Secrets to enable live Gemini step-by-step tutoring.`,
    ].join('\n');
  }

  return [
    `[Demo Mode — No live AI API key configured on the server]`,
    ``,
    `You asked about "${input.prompt}" at the ${levelLabel} level${subjectText}.`,
    `In live mode, the Smart Classroom AI Learning Assistant breaks this topic into plain-language intuition, a real-life analogy, key formulas/mechanisms, and a quick self-check question.`,
    ``,
    `To activate live AI responses, set GEMINI_API_KEY in your environment Secrets panel.`,
  ].join('\n');
}

export async function generateLearningAssistance(
  input: AiAssistInput
): Promise<AiAssistResult> {
  if (!hasConfiguredApiKey()) {
    return {
      reply: buildDemoModeReply(input),
      demoMode: true,
      model: 'demo-mode',
    };
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const modeInstructions: Record<AssistantMode, string> = {
    explain:
      'Explain the concept clearly in approachable language, include a memorable real-life example, highlight 1 common misconception, and end with a 1-sentence takeaway.',
    step_by_step:
      'Break the concept or problem down into clearly numbered sequential steps (Step 1, Step 2, etc.), showing the reasoning behind each transition and verifying the final answer.',
    practice:
      'Generate 3 original practice questions tailored to this topic and level. Include multiple-choice or short-answer prompts followed by a clear "Solutions & Explanations" section.',
    summarize:
      'Produce a concise, high-yield revision summary with bullet points for Key Concepts, Essential Rules/Formulas, and Quick Self-Check Questions.',
  };

  const levelInstructions: Record<DifficultyLevel, string> = {
    beginner:
      'Target a beginner learner: avoid unnecessary jargon, build intuition from everyday experiences, and keep explanations crisp and encouraging.',
    intermediate:
      'Target an intermediate high-school or early undergraduate learner: balance clear intuition with formal terminology, equations, and exam-relevant distinctions.',
    advanced:
      'Target an advanced honors/university learner: include rigorous derivations, edge cases, formal invariants, and deeper conceptual connections.',
  };

  const systemInstruction = [
    'You are the Smart Classroom AI Learning Assistant — a clear, patient, rigorous academic tutor.',
    levelInstructions[input.level],
    modeInstructions[input.mode],
    input.subject ? `Academic subject context: ${input.subject}.` : '',
    'Use clean Markdown headings, numbered lists, and concise paragraphs so students can scan easily.',
  ]
    .filter(Boolean)
    .join('\n');

  const conversationLines: string[] = [];
  if (input.history && input.history.length > 0) {
    const recent = input.history.slice(-6);
    conversationLines.push('Recent conversation context:');
    for (const msg of recent) {
      conversationLines.push(
        `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}`
      );
    }
    conversationLines.push('');
  }
  conversationLines.push(`Current student request: ${input.prompt}`);

  const model = 'gemini-4-hydrogen';
  const response = await ai.models.generateContent({
    model,
    contents: conversationLines.join('\n'),
    config: {
      systemInstruction,
    },
  });

  const replyText = response.text?.trim();
  if (!replyText) {
    throw new Error('The AI assistant returned an empty response. Please try again.');
  }

  return {
    reply: replyText,
    demoMode: false,
    model,
  };
}
