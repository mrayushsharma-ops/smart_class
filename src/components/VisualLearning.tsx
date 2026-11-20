import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface VisualTopic {
  id: 'physics' | 'biology' | 'cs' | 'chemistry';
  subject: string;
  title: string;
  subtitle: string;
  imagePath: string;
  formula: string;
  videoTitle: string;
  videoEmbedUrl: string;
  videoSourceUrl: string;
  stages: Array<{
    stage: string;
    heading: string;
    detail: string;
  }>;
  conceptCards: Array<{
    term: string;
    definition: string;
  }>;
  aiPrompt: string;
}

const VISUAL_TOPICS: VisualTopic[] = [
  {
    id: 'physics',
    subject: 'Physics',
    title: 'Transverse Electromagnetic Wave Propagation',
    subtitle: 'Orthogonal oscillating electric (E) and magnetic (B) fields traveling in phase at c.',
    imagePath: '/src/assets/images/visual_electromagnetic_waves_1795151055440.jpg',
    formula: 'c = f · λ  |  E(x,t) = E₀ sin(kx − ωt)',
    videoTitle: 'MIT OpenCourseWare — Electromagnetic Waves & Maxwell Equations',
    videoEmbedUrl: 'https://www.youtube-nocookie.com/embed/FWCN_uI5ygY',
    videoSourceUrl: 'https://www.youtube.com/watch?v=FWCN_uI5ygY',
    stages: [
      {
        stage: 'Stage 1',
        heading: 'Changing Electric Field Induces Magnetic Field',
        detail:
          'Ampere-Maxwell law establishes that a time-varying electric flux generates a circulating magnetic field perpendicular to E.',
      },
      {
        stage: 'Stage 2',
        heading: 'Changing Magnetic Field Induces Electric Field',
        detail:
          'Faraday law completes the self-sustaining cycle: the changing B field induces a perpendicular E field without requiring any medium.',
      },
      {
        stage: 'Stage 3',
        heading: 'Strict In-Phase Alignment in Vacuum',
        detail:
          'Both fields hit maximum amplitude and zero crossings simultaneously, with E × B pointing in the propagation direction k.',
      },
      {
        stage: 'Stage 4',
        heading: 'Inverse Frequency–Wavelength Tradeoff',
        detail:
          'Because wave speed c = 3.0 × 10⁸ m/s is constant in vacuum, increasing frequency f compresses wavelength λ proportionally.',
      },
    ],
    conceptCards: [
      {
        term: 'Poynting Vector (S)',
        definition: 'Measures directional energy flux density carried by the wave: S = (1/μ₀)(E × B).',
      },
      {
        term: 'Transverse Geometry',
        definition: 'Both E and B oscillate at 90° to the direction of travel, enabling polarization.',
      },
    ],
    aiPrompt:
      'Explain visually why electric and magnetic fields in a vacuum electromagnetic wave are in phase and how c = f * lambda behaves.',
  },
  {
    id: 'biology',
    subject: 'Biology',
    title: 'Mitochondrial Cellular Respiration & ATP Synthase',
    subtitle: 'Electron transport proton pumping and chemiosmotic ATP production across the cristae.',
    imagePath: '/src/assets/images/visual_cellular_respiration_1795151055265.jpg',
    formula: 'C₆H₁₂O₆ + 6 O₂ → 6 CO₂ + 6 H₂O + ~30–32 ATP',
    videoTitle: 'Cellular Respiration & Electron Transport Chain Visual Overview',
    videoEmbedUrl: 'https://www.youtube-nocookie.com/embed/eJ9Zjc-jdys',
    videoSourceUrl: 'https://www.youtube.com/watch?v=eJ9Zjc-jdys',
    stages: [
      {
        stage: 'Stage 1',
        heading: 'Glycolysis & Pyruvate Oxidation',
        detail:
          'Glucose splits into two pyruvate molecules in the cytosol (2 net ATP, 2 NADH), then enters the mitochondrial matrix as Acetyl-CoA.',
      },
      {
        stage: 'Stage 2',
        heading: 'Citric Acid (Krebs) Cycle',
        detail:
          'Strips high-energy electrons onto carrier molecules NADH and FADH₂ while releasing CO₂ in the mitochondrial matrix.',
      },
      {
        stage: 'Stage 3',
        heading: 'Proton Gradient Pumping (Complexes I–IV)',
        detail:
          'Electrons pass down the inner membrane chain to O₂ (forming H₂O), powering proton pumps that acidify the intermembrane space.',
      },
      {
        stage: 'Stage 4',
        heading: 'Chemiosmosis Through ATP Synthase',
        detail:
          'Protons rush back into the matrix down their electrochemical gradient, spinning ATP synthase to phosphorylate ADP into ~26–28 ATP.',
      },
    ],
    conceptCards: [
      {
        term: 'Proton Motive Force',
        definition: 'Combined chemical (pH) and electrical charge gradient across the inner mitochondrial membrane.',
      },
      {
        term: 'Terminal Electron Acceptor',
        definition: 'Molecular O₂ pulls electrons through Complex IV; without O₂, the chain stalls and cells switch to fermentation.',
      },
    ],
    aiPrompt:
      'Explain cellular respiration and how oxygen availability changes ATP yield between aerobic oxidative phosphorylation and anaerobic fermentation.',
  },
  {
    id: 'cs',
    subject: 'Computer Science',
    title: "Dijkstra's Shortest-Path Graph Traversal",
    subtitle: 'Greedy priority-queue relaxation over weighted directed networks with non-negative edges.',
    imagePath: '/src/assets/images/visual_algorithms_graph_1795151055495.jpg',
    formula: 'dist[v] = min(dist[v], dist[u] + w(u, v))  |  O((V + E) log V)',
    videoTitle: "Dijkstra's Shortest Path Algorithm — Step-by-Step Graph Trace",
    videoEmbedUrl: 'https://www.youtube-nocookie.com/embed/GazC3A4OQTE',
    videoSourceUrl: 'https://www.youtube.com/watch?v=GazC3A4OQTE',
    stages: [
      {
        stage: 'Stage 1',
        heading: 'Initialize Source & Tentative Distances',
        detail:
          'Set dist[source] = 0 and all other vertices to ∞. Push (0, source) into a binary min-heap priority queue.',
      },
      {
        stage: 'Stage 2',
        heading: 'Extract Minimum Unvisited Vertex',
        detail:
          'Pop vertex u with the smallest tentative distance. Because all edge weights are ≥ 0, dist[u] is now permanently optimal.',
      },
      {
        stage: 'Stage 3',
        heading: 'Relax Outgoing Edges',
        detail:
          'For each neighbor v of u, check if dist[u] + weight(u,v) beats dist[v]. If improved, update dist[v] and record parent[v] = u.',
      },
      {
        stage: 'Stage 4',
        heading: 'Reconstruct Optimal Path Tree',
        detail:
          'Once the destination vertex is popped, trace parent pointers backwards to read the guaranteed minimum-cost route.',
      },
    ],
    conceptCards: [
      {
        term: 'Greedy Invariant',
        definition: 'Requires non-negative edge weights so finalized vertices can never be improved later.',
      },
      {
        term: 'Min-Heap Speedup',
        definition: 'Reduces minimum-vertex extraction from O(V) linear scan to O(log V).',
      },
    ],
    aiPrompt:
      'Trace Dijkstra shortest path algorithm step by step and explain when to switch to Bellman-Ford.',
  },
  {
    id: 'chemistry',
    subject: 'Chemistry',
    title: 'Benzene Ring & Aromatic Orbital Hybridization',
    subtitle: 'Six sp² carbons sharing a continuous delocalized π-electron cloud above and below the ring.',
    imagePath: '/src/assets/images/visual_organic_molecules_1795151054915.jpg',
    formula: 'C₆H₆ · 4n + 2 = 6 π electrons (n = 1) · ΔH_res ≈ −150 kJ/mol',
    videoTitle: 'Aromaticity, Resonance Stabilization & Molecular Orbitals of Benzene',
    videoEmbedUrl: 'https://www.youtube-nocookie.com/embed/6X_xJ4B6pG0',
    videoSourceUrl: 'https://www.youtube.com/watch?v=6X_xJ4B6pG0',
    stages: [
      {
        stage: 'Stage 1',
        heading: 'Planar sp² Carbon Skeleton',
        detail:
          'Every carbon forms three σ bonds at exact 120° trigonal planar angles, locking all six carbons into a flat hexagonal ring.',
      },
      {
        stage: 'Stage 2',
        heading: 'Parallel Unhybridized p Orbitals',
        detail:
          'Each carbon retains one unhybridized p orbital perpendicular to the ring plane containing a single π electron.',
      },
      {
        stage: 'Stage 3',
        heading: 'Continuous Ring Delocalization',
        detail:
          'Side-by-side overlap merges all six p orbitals into twin doughnut-shaped electron clouds above and below the carbon frame.',
      },
      {
        stage: 'Stage 4',
        heading: 'Equal Bond Lengths & Substitution Preference',
        detail:
          'Every C–C bond measures an identical 1.39 Å (between single and double), favoring electrophilic substitution to preserve stability.',
      },
    ],
    conceptCards: [
      {
        term: 'Hückel 4n + 2 Rule',
        definition: 'Planar, cyclic, fully conjugated rings with 2, 6, 10, or 14 π electrons exhibit aromatic stabilization.',
      },
      {
        term: 'Resonance Energy',
        definition: 'Benzene is ~150 kJ/mol lower in energy than three isolated alkene double bonds.',
      },
    ],
    aiPrompt:
      'Explain benzene sp2 orbital hybridization and why all six carbon-carbon bond lengths are identical at 1.39 Angstroms.',
  },
];

export const VisualLearning: React.FC<{
  onAskAiAboutTopic: (prompt: string) => void;
}> = ({ onAskAiAboutTopic }) => {
  const [activeId, setActiveId] = useState<VisualTopic['id']>('physics');
  const [stageIdx, setStageIdx] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  // Interactive Sandbox Parameters (per 6_education_simulations.md: labeled sliders with units)
  const [waveFreq, setWaveFreq] = useState(2.5); // x10^14 Hz
  const [waveAmp, setWaveAmp] = useState(26); // V/m scaled
  const [oxygenLevel, setOxygenLevel] = useState(90); // % O2 saturation
  const [edgeWeightBC, setEdgeWeightBC] = useState(4); // graph edge weight
  const [piElectrons, setPiElectrons] = useState(6); // Hückel rule tester

  const topic = VISUAL_TOPICS.find((t) => t.id === activeId) || VISUAL_TOPICS[0];

  const handleSelectTopic = (id: VisualTopic['id']) => {
    setActiveId(id);
    setStageIdx(0);
    setShowVideo(false);
  };

  // Physics interactive SVG wave points
  const buildWavePath = (phaseOffset: number, scale: number) => {
    const pts: string[] = [];
    for (let x = 0; x <= 320; x += 4) {
      const y =
        60 -
        Math.sin((x / 320) * Math.PI * 2 * waveFreq + phaseOffset) *
          waveAmp *
          scale;
      pts.push(`${x === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(' ');
  };

  // Biology live ATP yield calculation
  const estimatedAtp = oxygenLevel >= 20 ? Math.round(2 + (oxygenLevel / 100) * 30) : 2;
  const respirationState =
    oxygenLevel >= 60
      ? 'NOMINAL · Aerobic Oxidative Phosphorylation'
      : oxygenLevel >= 20
        ? 'REDUCED · Hypoxic Slowdown'
        : 'ANAEROBIC · Fermentation Only (NAD+ Regeneration)';

  // CS Dijkstra interactive path comparison (A -> B -> D vs A -> C -> D)
  const pathABD = 2 + edgeWeightBC + 2; // A->B(2) + B->C(slider) + C->D(2)
  const pathDirectAD = 9;
  const bestCost = Math.min(pathABD, pathDirectAD);
  const optimalRoute = pathABD <= pathDirectAD ? 'A → B → C → D' : 'A → D (Direct)';

  // Chemistry Hückel aromaticity checker
  const isAromaticCount = piElectrons >= 2 && (piElectrons - 2) % 4 === 0;
  const isAntiAromatic = piElectrons >= 4 && piElectrons % 4 === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Interactive Concept Sandbox · Visual Diagrams & Step Walkthroughs
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Visual Learning Labs
          </h1>
        </div>

        {/* Topic Switcher */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800">
          {VISUAL_TOPICS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectTopic(item.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeId === item.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.subject}
            </button>
          ))}
        </div>
      </div>

      {/* Two-Zone Sandbox Layout (Left: Visual Stage + Interactive Model, Right: Control & Stage Deck) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Zone: Interactive Visual Stage */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {topic.subject} · Interactive Visual Model
                </p>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {topic.title}
                </h2>
              </div>
              <button
                onClick={() => onAskAiAboutTopic(topic.aiPrompt)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ask AI Tutor
              </button>
            </div>

            {/* Scientific Generated Diagram */}
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 aspect-[4/3] bg-slate-950 relative">
              {!imgErrors[topic.id] ? (
                <img
                  src={topic.imagePath}
                  alt={topic.title}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setImgErrors((prev) => ({ ...prev, [topic.id]: true }))
                  }
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
                  <Layers className="w-10 h-10 text-indigo-400 mb-2" />
                  <p className="text-sm font-semibold">{topic.title}</p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent px-4 py-3 flex items-center justify-between gap-2">
                <code className="text-xs font-mono text-indigo-200">
                  {topic.formula}
                </code>
                <span className="text-[11px] font-medium text-slate-300">
                  {topic.stages[stageIdx].stage} of {topic.stages.length}
                </span>
              </div>
            </div>
          </div>

          {/* Live Interactive Parameter Simulator directly tied to the topic */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 space-y-3">
            {activeId === 'physics' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Live Wave Parameter Explorer
                  </span>
                  <span className="font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                    λ = {(300 / (waveFreq * 100)).toFixed(2)} μm · f = {waveFreq.toFixed(1)} × 10¹⁴ Hz
                  </span>
                </div>
                <svg
                  viewBox="0 0 320 120"
                  className="w-full h-28 rounded-lg bg-slate-950 border border-slate-800"
                >
                  <line x1="0" y1="60" x2="320" y2="60" stroke="#334155" strokeWidth="1" />
                  <path
                    d={buildWavePath(0, 1)}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="2.5"
                  />
                  <path
                    d={buildWavePath(0, 0.55)}
                    fill="none"
                    stroke="#A78BFA"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                </svg>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <label className="space-y-1">
                    <span className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Frequency (f)</span>
                      <span className="font-mono tabular-nums">{waveFreq.toFixed(1)} × 10¹⁴ Hz</span>
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={0.5}
                      value={waveFreq}
                      onChange={(e) => setWaveFreq(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Field Amplitude (E₀)</span>
                      <span className="font-mono tabular-nums">{waveAmp} V/m</span>
                    </span>
                    <input
                      type="range"
                      min={12}
                      max={46}
                      step={2}
                      value={waveAmp}
                      onChange={(e) => setWaveAmp(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </label>
                </div>
              </>
            )}

            {activeId === 'biology' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Oxygen Availability & ATP Yield Simulator
                  </span>
                  <span className="font-mono font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                    Yield: {estimatedAtp} ATP / glucose
                  </span>
                </div>
                <label className="block space-y-1.5 text-xs">
                  <span className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Cellular O₂ Saturation</span>
                    <span className="font-mono tabular-nums">{oxygenLevel}%</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={oxygenLevel}
                    onChange={(e) => setOxygenLevel(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </label>
                <p
                  className={`text-xs font-semibold ${
                    oxygenLevel >= 60
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : oxygenLevel >= 20
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  Metabolic State: {respirationState}
                </p>
              </>
            )}

            {activeId === 'cs' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Dynamic Edge Relaxation Tester
                  </span>
                  <span className="font-mono font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                    Optimal: {optimalRoute} (Cost {bestCost})
                  </span>
                </div>
                <label className="block space-y-1.5 text-xs">
                  <span className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Edge Weight w(B → C)</span>
                    <span className="font-mono tabular-nums">{edgeWeightBC} units</span>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={edgeWeightBC}
                    onChange={(e) => setEdgeWeightBC(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono tabular-nums">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    Path A→B→C→D: <strong>{pathABD}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    Direct A→D: <strong>{pathDirectAD}</strong>
                  </div>
                </div>
              </>
            )}

            {activeId === 'chemistry' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Hückel 4n + 2 Aromaticity Checker
                  </span>
                  <span
                    className={`font-semibold ${
                      isAromaticCount
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : isAntiAromatic
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {isAromaticCount
                      ? 'AROMATIC (Stabilized 4n + 2)'
                      : isAntiAromatic
                        ? 'ANTI-AROMATIC (4n Destabilized)'
                        : 'NON-AROMATIC (Odd count)'}
                  </span>
                </div>
                <label className="block space-y-1.5 text-xs">
                  <span className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Conjugated Ring π Electrons</span>
                    <span className="font-mono tabular-nums">{piElectrons} π e⁻</span>
                  </span>
                  <input
                    type="range"
                    min={2}
                    max={14}
                    step={2}
                    value={piElectrons}
                    onChange={(e) => setPiElectrons(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </label>
              </>
            )}
          </div>
        </div>

        {/* Right Zone: Guided Stage Progression + Concept Cards + Video */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Step-by-step Walkthrough Deck */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Step-by-Step Visual Breakdown
              </h3>
              <button
                onClick={() => setStageIdx(0)}
                className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {topic.stages.map((st, idx) => (
                <button
                  key={st.stage}
                  onClick={() => setStageIdx(idx)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    idx === stageIdx
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            <div className="pt-2 space-y-2">
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {topic.stages[stageIdx].stage}
              </p>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {topic.stages[stageIdx].heading}
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {topic.stages[stageIdx].detail}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                disabled={stageIdx === 0}
                onClick={() => setStageIdx((i) => Math.max(0, i - 1))}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                disabled={stageIdx === topic.stages.length - 1}
                onClick={() =>
                  setStageIdx((i) => Math.min(topic.stages.length - 1, i + 1))
                }
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
              >
                Next Stage <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Concept Cards */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Key Concept Cards
            </h3>
            <div className="space-y-3">
              {topic.conceptCards.map((card) => (
                <div
                  key={card.term}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800"
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {card.term}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {card.definition}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Embedded Educational Video Module */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Video Lecture
              </h3>
              <a
                href={topic.videoSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                Watch on YouTube <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {showVideo ? (
              <div className="aspect-video rounded-xl overflow-hidden bg-slate-950">
                <iframe
                  src={topic.videoEmbedUrl}
                  title={topic.videoTitle}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowVideo(true)}
                className="w-full p-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-left flex items-center gap-3 transition-colors cursor-pointer"
              >
                <span className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                  <Play className="w-4 h-4 fill-current" />
                </span>
                <div>
                  <p className="text-xs font-semibold">{topic.videoTitle}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click to load embedded educational video player
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
