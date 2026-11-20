import { eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  announcements,
  classroomMemberships,
  classrooms,
  doubtResponses,
  doubts,
  flashcards,
  notifications,
  quizAttempts,
  quizQuestions,
  quizzes,
  studyMaterials,
  users,
} from './schema.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureAcademicSeedData(): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = (async () => {
    try {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(classrooms);

      if (count > 0) {
        return;
      }

      // Create realistic faculty and cohort seed accounts
      const seedAccounts = [
        {
          uid: 'seed-teacher-elena',
          email: 'elena.vance@smartclassroom.edu',
          fullName: 'Dr. Elena Vance',
          role: 'teacher',
          bio: 'Applied Physics & Electromagnetism Chair',
          gradeOrDepartment: 'Physics Department',
          leaderboardOptIn: false,
        },
        {
          uid: 'seed-teacher-marcus',
          email: 'marcus.chen@smartclassroom.edu',
          fullName: 'Prof. Marcus Chen',
          role: 'teacher',
          bio: 'Algorithms, Discrete Math & Data Structures',
          gradeOrDepartment: 'Computer Science',
          leaderboardOptIn: false,
        },
        {
          uid: 'seed-teacher-priya',
          email: 'priya.nair@smartclassroom.edu',
          fullName: 'Dr. Priya Nair',
          role: 'teacher',
          bio: 'Molecular Biology & Organic Chemistry',
          gradeOrDepartment: 'Life Sciences',
          leaderboardOptIn: false,
        },
        {
          uid: 'seed-student-aarav',
          email: 'aarav.patel@student.smartclassroom.edu',
          fullName: 'Aarav Patel',
          role: 'student',
          bio: 'STEM track student focusing on AP Physics & CS',
          gradeOrDepartment: 'Grade 12 · Section A',
          leaderboardOptIn: true,
        },
        {
          uid: 'seed-student-maya',
          email: 'maya.lin@student.smartclassroom.edu',
          fullName: 'Maya Lin',
          role: 'student',
          bio: 'Preparing for Olympiad Biology and Chemistry',
          gradeOrDepartment: 'Grade 12 · Section B',
          leaderboardOptIn: true,
        },
        {
          uid: 'seed-student-lucas',
          email: 'lucas.meyer@student.smartclassroom.edu',
          fullName: 'Lucas Meyer',
          role: 'student',
          bio: 'Graph algorithms and physics simulation enthusiast',
          gradeOrDepartment: 'Grade 11 · Section A',
          leaderboardOptIn: true,
        },
      ];

      const insertedUsers: Record<string, number> = {};
      for (const acc of seedAccounts) {
        const res = await db
          .insert(users)
          .values(acc)
          .onConflictDoUpdate({
            target: users.uid,
            set: { fullName: acc.fullName },
          })
          .returning();
        insertedUsers[acc.uid] = res[0].id;
      }

      const teacherElena = insertedUsers['seed-teacher-elena'];
      const teacherMarcus = insertedUsers['seed-teacher-marcus'];
      const teacherPriya = insertedUsers['seed-teacher-priya'];
      const studentAarav = insertedUsers['seed-student-aarav'];
      const studentMaya = insertedUsers['seed-student-maya'];
      const studentLucas = insertedUsers['seed-student-lucas'];

      // Create 4 core classrooms with memorable join codes
      const createdClasses = await db
        .insert(classrooms)
        .values([
          {
            title: 'AP Physics C: Electromagnetism & Waves',
            subject: 'Physics',
            description:
              'Maxwell equations, transverse electromagnetic propagation, Faraday induction, and circuit transients.',
            joinCode: 'PHYS-204',
            teacherId: teacherElena,
          },
          {
            title: 'Algorithms & Graph Theory Honors',
            subject: 'Computer Science',
            description:
              'Shortest-path optimization, dynamic programming, greedy proofs, and asymptotic complexity analysis.',
            joinCode: 'CS-301',
            teacherId: teacherMarcus,
          },
          {
            title: 'Cellular Energetics & Molecular Biology',
            subject: 'Biology',
            description:
              'Mitochondrial chemiosmosis, Krebs cycle intermediates, gene regulation, and enzyme kinetics.',
            joinCode: 'BIO-202',
            teacherId: teacherPriya,
          },
          {
            title: 'Organic Chemistry: Bonding & Mechanisms',
            subject: 'Chemistry',
            description:
              'Orbital hybridization, aromatic resonance stability, stereochemistry, and nucleophilic substitution.',
            joinCode: 'CHEM-110',
            teacherId: teacherPriya,
          },
        ])
        .returning();

      const [physClass, csClass, bioClass, chemClass] = createdClasses;

      // Enroll sample students
      const membershipPairs = [
        [physClass.id, studentAarav],
        [physClass.id, studentMaya],
        [physClass.id, studentLucas],
        [csClass.id, studentAarav],
        [csClass.id, studentLucas],
        [bioClass.id, studentMaya],
        [bioClass.id, studentAarav],
        [chemClass.id, studentMaya],
      ];

      for (const [classroomId, userId] of membershipPairs) {
        await db
          .insert(classroomMemberships)
          .values({ classroomId, userId })
          .onConflictDoNothing();
      }

      // Seed Anonymous Doubts (MAIN FEATURE)
      const createdDoubts = await db
        .insert(doubts)
        .values([
          {
            classroomId: physClass.id,
            authorId: studentAarav,
            subject: 'Physics',
            topic: 'Faraday Induction',
            title: 'Why does Lenz law oppose the change in flux instead of the flux itself?',
            question:
              'When a magnet moves away from a conducting loop, I keep getting the induced current direction backwards. Could someone explain intuitively why the loop tries to preserve the flux rather than always pushing the magnet away?',
            isAnonymous: true,
            status: 'resolved',
            isPinned: true,
            upvotesCount: 14,
          },
          {
            classroomId: csClass.id,
            authorId: studentLucas,
            subject: 'Computer Science',
            topic: 'Dijkstra Algorithm',
            title: 'Why does Dijkstra fail when a single negative edge exists even without a cycle?',
            question:
              'I understand negative weight cycles cause infinite loops, but why can Dijkstra still return the wrong shortest path on a simple 3-node graph with one negative edge?',
            isAnonymous: true,
            status: 'answered',
            isPinned: true,
            upvotesCount: 11,
          },
          {
            classroomId: bioClass.id,
            authorId: studentMaya,
            subject: 'Biology',
            topic: 'Oxidative Phosphorylation',
            title: 'What happens to NADH oxidation immediately if oxygen is suddenly removed?',
            question:
              'Does the Krebs cycle stop immediately when O2 drops to zero, or does it keep running until FAD and NAD+ pools are completely depleted?',
            isAnonymous: true,
            status: 'pending',
            isPinned: false,
            upvotesCount: 9,
          },
          {
            classroomId: physClass.id,
            authorId: studentMaya,
            subject: 'Physics',
            topic: 'Electromagnetic Waves',
            title: 'Are E and B fields in phase or 90 degrees out of phase in a vacuum?',
            question:
              'In LC circuits, current and voltage are 90 degrees out of phase, so I assumed E and B waves in free space were also out of phase. Why do textbook diagrams show their peaks aligned?',
            isAnonymous: true,
            status: 'pending',
            isPinned: false,
            upvotesCount: 7,
          },
          {
            classroomId: chemClass.id,
            authorId: studentAarav,
            subject: 'Chemistry',
            topic: 'Aromaticity & Resonance',
            title: 'Why does benzene resist addition reactions that easily happen with alkenes?',
            question:
              'If benzene has three double bonds in Kekule structure, why does adding Br2 require a FeBr3 catalyst and perform substitution instead of addition?',
            isAnonymous: true,
            status: 'answered',
            isPinned: false,
            upvotesCount: 6,
          },
        ])
        .returning();

      // Seed Teacher Responses to Doubts
      await db.insert(doubtResponses).values([
        {
          doubtId: createdDoubts[0].id,
          responderId: teacherElena,
          content:
            'Think of a conducting loop as having "magnetic inertia." By conservation of energy, the induced current always creates a magnetic field that resists whatever CHANGE is happening right now. If the magnet moves closer (flux increasing), the loop pushes back. If the magnet pulls away (flux decreasing), the loop pulls it back to keep the flux from dropping. Always check: (1) direction of external B, (2) is flux increasing or decreasing, (3) point thumb opposite to the change.',
          isPinned: true,
          isOfficial: true,
        },
        {
          doubtId: createdDoubts[1].id,
          responderId: teacherMarcus,
          content:
            'Dijkstra relies on a greedy invariant: once a node is popped from the priority queue with the minimum tentative distance, no future path through other unvisited nodes can shorten it because all remaining edge weights are >= 0. A negative edge breaks that invariant—a longer initial path can suddenly become shorter later after the destination node was already finalized.',
          isPinned: true,
          isOfficial: true,
        },
        {
          doubtId: createdDoubts[4].id,
          responderId: teacherPriya,
          content:
            'Benzene does not actually contain three isolated double bonds—its six pi electrons are delocalized across a continuous ring above and below the plane, lowering its potential energy by ~150 kJ/mol (resonance stabilization energy). An addition reaction would permanently break this aromatic ring, whereas electrophilic aromatic substitution restores aromaticity in the final deprotonation step.',
          isPinned: false,
          isOfficial: true,
        },
      ]);

      // Seed Interactive Quizzes + Questions
      const createdQuizzes = await db
        .insert(quizzes)
        .values([
          {
            classroomId: physClass.id,
            teacherId: teacherElena,
            title: 'Electromagnetic Waves & Faraday Induction',
            topic: 'Faraday Induction',
            description:
              'Timed diagnostic covering Lenz law, induced EMF, and transverse wave propagation in vacuum.',
            durationMinutes: 10,
            totalMarks: 8,
            status: 'published',
          },
          {
            classroomId: csClass.id,
            teacherId: teacherMarcus,
            title: 'Graph Shortest Paths & Complexity',
            topic: 'Dijkstra Algorithm',
            description:
              'Assess mastery of priority queues, relaxation invariants, BFS vs Dijkstra, and Bellman-Ford edge cases.',
            durationMinutes: 12,
            totalMarks: 8,
            status: 'published',
          },
          {
            classroomId: bioClass.id,
            teacherId: teacherPriya,
            title: 'Cellular Respiration & ATP Yield',
            topic: 'Oxidative Phosphorylation',
            description:
              'Check understanding of glycolysis, citric acid cycle NADH yield, and proton motive force.',
            durationMinutes: 8,
            totalMarks: 6,
            status: 'published',
          },
        ])
        .returning();

      const [physQuiz, csQuiz, bioQuiz] = createdQuizzes;

      await db.insert(quizQuestions).values([
        // Physics Quiz Questions
        {
          quizId: physQuiz.id,
          questionText:
            'In a vacuum, what is the phase relationship between the oscillating electric field E and magnetic field B of a plane electromagnetic wave?',
          options: [
            'They oscillate in phase (reach peaks and zeroes together)',
            'E leads B by 90 degrees',
            'B leads E by 90 degrees',
            'They are 180 degrees out of phase',
          ],
          correctIndex: 0,
          explanation:
            'Maxwell equations show that for a traveling plane EM wave in free space, E and B are perpendicular in space and strictly in phase in time.',
          marks: 2,
          orderIndex: 0,
        },
        {
          quizId: physQuiz.id,
          questionText:
            'A bar magnet with its North pole facing a stationary copper ring is pulled rapidly AWAY from the ring. Looking from the magnet toward the ring, what is the direction of the induced current?',
          options: [
            'Clockwise, creating a South pole to attract the receding North pole',
            'Counter-clockwise, creating a North pole to repel the magnet',
            'Zero current because the magnet is moving away',
            'Alternating rapidly back and forth',
          ],
          correctIndex: 0,
          explanation:
            'By Lenz law, the ring opposes the decrease in magnetic flux by creating a South pole facing the receding North pole, requiring a clockwise current.',
          marks: 2,
          orderIndex: 1,
        },
        {
          quizId: physQuiz.id,
          questionText:
            'If the frequency of an electromagnetic wave in vacuum doubles, what happens to its wavelength?',
          options: [
            'It doubles',
            'It halves',
            'It quadruples',
            'It remains unchanged',
          ],
          correctIndex: 1,
          explanation:
            'Because c = f * lambda is constant in vacuum, doubling frequency f cuts wavelength lambda exactly in half.',
          marks: 2,
          orderIndex: 2,
        },
        {
          quizId: physQuiz.id,
          questionText:
            'Which physical principle directly underlies Lenz law?',
          options: [
            'Conservation of energy',
            'Conservation of linear momentum',
            'Pauli exclusion principle',
            'Gauss law for magnetism alone',
          ],
          correctIndex: 0,
          explanation:
            'If induced current aided the flux change rather than opposing it, kinetic and electrical energy would grow without bound, violating conservation of energy.',
          marks: 2,
          orderIndex: 3,
        },

        // CS Quiz Questions
        {
          quizId: csQuiz.id,
          questionText:
            'Using a binary min-heap priority queue on a graph with V vertices and E edges, what is the time complexity of Dijkstra algorithm?',
          options: [
            'O((V + E) log V)',
            'O(V^3)',
            'O(V + E)',
            'O(E log E^2)',
          ],
          correctIndex: 0,
          explanation:
            'Each vertex is extracted once (V log V) and each edge relaxation can push/decrease-key in O(log V), yielding O((V + E) log V).',
          marks: 2,
          orderIndex: 0,
        },
        {
          quizId: csQuiz.id,
          questionText:
            'Which algorithm correctly finds single-source shortest paths when negative edge weights exist (and detects negative cycles)?',
          options: [
            'Standard Dijkstra algorithm',
            'Bellman-Ford algorithm',
            'Breadth-First Search (BFS)',
            'Prim minimum spanning tree',
          ],
          correctIndex: 1,
          explanation:
            'Bellman-Ford relaxes all edges V - 1 times and performs a V-th check to detect reachable negative cycles.',
          marks: 2,
          orderIndex: 1,
        },
        {
          quizId: csQuiz.id,
          questionText:
            'When all edge weights in an unweighted graph equal 1, which traversal finds shortest paths in optimal O(V + E) time?',
          options: [
            'Depth-First Search (DFS)',
            'Breadth-First Search (BFS)',
            'Floyd-Warshall',
            'Topological Sort only',
          ],
          correctIndex: 1,
          explanation:
            'BFS explores vertices layer by layer in non-decreasing order of edge distance from the source.',
          marks: 2,
          orderIndex: 2,
        },
        {
          quizId: csQuiz.id,
          questionText:
            'What greedy assumption makes Dijkstra invalid on negative edge weights?',
          options: [
            'Finalized nodes assume no future path can decrease their known distance',
            'Priority queues cannot store negative integers',
            'Graphs with negative weights are always disconnected',
            'Adjacency lists require positive integers',
          ],
          correctIndex: 0,
          explanation:
            'Once a vertex is popped as minimum, Dijkstra assumes adding more edges can only increase total path cost—false if negative edges exist.',
          marks: 2,
          orderIndex: 3,
        },

        // Biology Quiz Questions
        {
          quizId: bioQuiz.id,
          questionText:
            'Where does the proton gradient directly drive ATP synthase during oxidative phosphorylation?',
          options: [
            'Across the inner mitochondrial membrane',
            'Inside the cytosol',
            'Across the nuclear envelope',
            'Within the Golgi lumen',
          ],
          correctIndex: 0,
          explanation:
            'Complexes I, III, and IV pump H+ from the matrix into the intermembrane space; protons flow back through ATP synthase across the inner mitochondrial membrane.',
          marks: 2,
          orderIndex: 0,
        },
        {
          quizId: bioQuiz.id,
          questionText:
            'What molecule acts as the terminal electron acceptor at Complex IV of the mitochondrial electron transport chain?',
          options: ['Molecular oxygen (O2)', 'Pyruvate', 'Carbon dioxide (CO2)', 'NAD+'],
          correctIndex: 0,
          explanation:
            'Oxygen accepts low-energy electrons and combines with H+ protons to form water (H2O).',
          marks: 2,
          orderIndex: 1,
        },
        {
          quizId: bioQuiz.id,
          questionText:
            'How many net ATP molecules are produced directly by substrate-level phosphorylation during glycolysis per glucose molecule?',
          options: ['2 net ATP', '4 net ATP', '32 net ATP', '0 ATP'],
          correctIndex: 0,
          explanation:
            'Glycolysis consumes 2 ATP in the investment phase and produces 4 ATP in the payoff phase, giving a net yield of 2 ATP.',
          marks: 2,
          orderIndex: 2,
        },
      ]);

      // Seed Quiz Attempts for realistic leaderboard and teacher learning gap analytics
      await db.insert(quizAttempts).values([
        {
          quizId: physQuiz.id,
          studentId: studentAarav,
          answers: [0, 1, 1, 0],
          score: 6,
          totalMarks: 8,
          percentage: 75,
          timeSpentSeconds: 310,
        },
        {
          quizId: physQuiz.id,
          studentId: studentMaya,
          answers: [1, 1, 1, 0],
          score: 4,
          totalMarks: 8,
          percentage: 50,
          timeSpentSeconds: 420,
        },
        {
          quizId: csQuiz.id,
          studentId: studentAarav,
          answers: [0, 1, 1, 0],
          score: 8,
          totalMarks: 8,
          percentage: 100,
          timeSpentSeconds: 265,
        },
        {
          quizId: csQuiz.id,
          studentId: studentLucas,
          answers: [0, 1, 1, 1],
          score: 6,
          totalMarks: 8,
          percentage: 75,
          timeSpentSeconds: 390,
        },
        {
          quizId: bioQuiz.id,
          studentId: studentMaya,
          answers: [0, 0, 0],
          score: 6,
          totalMarks: 6,
          percentage: 100,
          timeSpentSeconds: 215,
        },
      ]);

      // Seed Study Materials (Notes, Summaries, Important Questions)
      await db.insert(studyMaterials).values([
        {
          classroomId: physClass.id,
          uploaderId: teacherElena,
          title: 'Faraday Law & Lenz Rule Visual Field Guide',
          subject: 'Physics',
          chapter: 'Chapter 7 · Electromagnetic Induction',
          materialType: 'notes',
          summary:
            'Core flux equation, sign conventions, right-hand thumb rule checklist, and 3 worked loop problems.',
          content: `## Magnetic Flux & Induced EMF\n\nMagnetic flux measures the total magnetic field passing perpendicularly through a surface:\nPhi_B = B · A · cos(theta)\n\nFaraday's Law states that the magnitude of induced electromotive force equals the rate of change of magnetic flux through N loops:\nEMF = -N * (dPhi_B / dt)\n\n### 3-Step Lenz Law Method\n1. Identify the direction of the external magnetic field passing through the loop.\n2. Determine whether the flux is increasing or decreasing.\n3. Point your right thumb OPPOSITE the change (opposite B if increasing; along B if decreasing). Your curled fingers give the induced current direction.\n\n### Common Exam Trap\nA strong stationary magnetic field produces ZERO induced EMF. Only a CHANGE in B, area A, or angle theta generates current.`,
        },
        {
          classroomId: csClass.id,
          uploaderId: teacherMarcus,
          title: 'Shortest-Path Algorithms Comparison Matrix',
          subject: 'Computer Science',
          chapter: 'Chapter 4 · Weighted Graphs',
          materialType: 'summary',
          summary:
            'Side-by-side summary of BFS, Dijkstra, Bellman-Ford, and Floyd-Warshall with invariants and pitfalls.',
          content: `## Choosing the Right Shortest-Path Algorithm\n\n- **Unweighted Graphs (all weights = 1)**: Use BFS in O(V + E). Never over-engineer with a heap.\n- **Non-negative Weights (w >= 0)**: Use Dijkstra with a binary min-heap in O((V + E) log V).\n- **Negative Edge Weights Allowed**: Use Bellman-Ford in O(V * E). Perform a V-th pass to detect reachable negative cycles.\n- **All-Pairs Shortest Paths (dense small graphs)**: Use Floyd-Warshall dynamic programming in O(V^3).\n\n### Key Relaxation Step\nif (dist[u] + weight(u, v) < dist[v]) {\n  dist[v] = dist[u] + weight(u, v);\n  parent[v] = u;\n}`,
        },
        {
          classroomId: bioClass.id,
          uploaderId: teacherPriya,
          title: 'Cellular Respiration High-Yield Exam Questions',
          subject: 'Biology',
          chapter: 'Chapter 9 · Cellular Energetics',
          materialType: 'important_questions',
          summary:
            'Top 5 conceptual questions on proton gradients, uncoupling agents, and anaerobic fermentation.',
          content: `## High-Yield Revision Questions\n\n1. **Why does DNP (an uncoupler that makes the inner membrane leaky to H+) increase O2 consumption while halting ATP synthesis?**\n   Answer: Protons bypass ATP synthase, dissipating gradient energy as heat. Without back-pressure, electron transport runs faster and consumes more O2.\n\n2. **What is the sole purpose of lactic acid fermentation when oxygen is absent?**\n   Answer: To regenerate NAD+ from NADH so glycolysis can continue producing 2 net ATP per glucose.\n\n3. **Why does FADH2 yield slightly less ATP than NADH?**\n   Answer: FADH2 enters at Complex II (which does not pump protons), whereas NADH enters at Complex I, pumping more H+ into the intermembrane space.`,
        },
        {
          classroomId: chemClass.id,
          uploaderId: teacherPriya,
          title: 'Aromatic Stability & Huckel 4n+2 Rule Summary',
          subject: 'Chemistry',
          chapter: 'Chapter 6 · Aromatic Compounds',
          materialType: 'summary',
          summary:
            'Four strict criteria for aromaticity, anti-aromatic destabilization, and electrophilic substitution steps.',
          content: `## Criteria for Aromaticity\nA molecule is aromatic only if ALL four conditions hold:\n1. Cyclic ring structure\n2. Completely conjugated (every ring atom has an unhybridized p orbital)\n3. Planar geometry allowing continuous orbital overlap\n4. Contains 4n + 2 pi electrons (2, 6, 10, 14...) per Huckel's Rule\n\n### Benzene Stabilization\nHeat of hydrogenation experiments show benzene is ~150 kJ/mol more stable than hypothetical 1,3,5-cyclohexatriene. This resonance energy explains why benzene favors substitution over addition.`,
        },
      ]);

      // Seed Announcements
      await db.insert(announcements).values([
        {
          classroomId: physClass.id,
          authorId: teacherElena,
          title: 'Lab 4 Pre-Reading & Faraday Induction Quiz Open',
          content:
            'Complete the 10-minute Electromagnetic Waves diagnostic before Friday 6:00 PM. Post any conceptual doubts anonymously in the Doubt Board so we can cover them in review.',
          dueDate: '2026-11-22',
        },
        {
          classroomId: csClass.id,
          authorId: teacherMarcus,
          title: 'Graph Complexity Review Session Added',
          content:
            'Several students upvoted the anonymous question on negative edge weights in Dijkstra. Review the pinned explanation and try the Graph Shortest Paths quiz.',
          dueDate: '2026-11-24',
        },
        {
          classroomId: bioClass.id,
          authorId: teacherPriya,
          title: 'Unit 9 Revision Flashcards & High-Yield Guide Uploaded',
          content:
            'I uploaded the Cellular Respiration high-yield questions to the Revision Center. Mark the chapter complete once you finish reviewing the chemiosmosis diagram.',
          dueDate: '2026-11-25',
        },
      ]);

      // Seed Starter Flashcards for sample users
      await db.insert(flashcards).values([
        {
          userId: studentAarav,
          classroomId: physClass.id,
          subject: 'Physics',
          topic: 'Faraday Induction',
          front: 'What does the negative sign in Faraday Law (EMF = -N dPhi/dt) represent?',
          back: 'Lenz Law: the induced EMF creates a current whose magnetic field opposes the change in magnetic flux that produced it.',
          mastered: true,
        },
        {
          userId: studentAarav,
          classroomId: csClass.id,
          subject: 'Computer Science',
          topic: 'Dijkstra Algorithm',
          front: 'Why can Bellman-Ford handle negative edge weights while Dijkstra cannot?',
          back: 'Bellman-Ford relaxes every edge V-1 times without assuming popped vertices are permanently finalized, allowing later negative edges to improve distances.',
          mastered: false,
        },
      ]);

      // Seed Notifications for sample teacher
      await db.insert(notifications).values([
        {
          userId: teacherElena,
          title: 'New anonymous doubt in AP Physics C',
          message:
            'A student asked about E and B field phase alignment in vacuum.',
          category: 'doubt',
          linkTab: 'doubts',
        },
      ]);
    } catch (error) {
      seedPromise = null;
      console.error('Seed data initialization failed:', error);
    }
  })();

  return seedPromise;
}

export async function ensureStarterEnrollmentForUser(userId: number, role: string): Promise<void> {
  try {
    await ensureAcademicSeedData();

    // Ensure a newly registered student has starter enrollments & starter flashcards so dashboards are immediately rich and real
    if (role === 'student') {
      const existingMemberships = await db
        .select()
        .from(classroomMemberships)
        .where(eq(classroomMemberships.userId, userId));

      if (existingMemberships.length === 0) {
        const defaultClasses = await db.select().from(classrooms).limit(3);
        for (const cls of defaultClasses) {
          await db
            .insert(classroomMemberships)
            .values({ classroomId: cls.id, userId })
            .onConflictDoNothing();
        }

        const existingCards = await db
          .select()
          .from(flashcards)
          .where(eq(flashcards.userId, userId));

        if (existingCards.length === 0 && defaultClasses.length > 0) {
          await db.insert(flashcards).values([
            {
              userId,
              classroomId: defaultClasses[0]?.id ?? null,
              subject: 'Physics',
              topic: 'Electromagnetic Waves',
              front: 'How are the directions of E, B, and wave propagation related in free space?',
              back: 'They are mutually perpendicular: E x B points in the direction of wave propagation (the Poynting vector S).',
              mastered: false,
            },
            {
              userId,
              classroomId: defaultClasses[1]?.id ?? null,
              subject: 'Computer Science',
              topic: 'Dijkstra Algorithm',
              front: 'What is the time complexity of Dijkstra with a binary heap?',
              back: 'O((V + E) log V), where V is the number of vertices and E is the number of edges.',
              mastered: false,
            },
            {
              userId,
              classroomId: defaultClasses[2]?.id ?? null,
              subject: 'Biology',
              topic: 'Oxidative Phosphorylation',
              front: 'What drives protons back into the mitochondrial matrix through ATP synthase?',
              back: 'The electrochemical proton motive force (both pH gradient and electrical charge gradient across the inner membrane).',
              mastered: true,
            },
          ]);
        }

        await db.insert(notifications).values([
          {
            userId,
            title: 'Welcome to Smart Classroom',
            message:
              'You are enrolled in 3 starter classes. Use code CHEM-110 to join Organic Chemistry or ask your first anonymous doubt.',
            category: 'classroom',
            linkTab: 'doubts',
          },
          {
            userId,
            title: 'New timed quiz available',
            message:
              'Electromagnetic Waves & Faraday Induction (10 min) is open in AP Physics C.',
            category: 'quiz',
            linkTab: 'quizzes',
          },
        ]);
      }
    }
  } catch (error) {
    console.error('Starter enrollment check failed:', error);
  }
}
