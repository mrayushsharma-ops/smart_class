import { Router } from 'express';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import {
  classroomMemberships,
  classrooms,
  notifications,
  quizAttempts,
  quizQuestions,
  quizzes,
  users,
} from '../../db/schema.ts';
import {
  type AuthRequest,
  requireAuth,
  requireRoles,
} from '../../middleware/auth.ts';
import { broadcastEvent } from '../../lib/realtime.ts';

const router = Router();

const createQuizSchema = z.object({
  classroomId: z.number().int().positive(),
  title: z.string().trim().min(3).max(140),
  topic: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).default(''),
  durationMinutes: z.number().int().min(1).max(180),
  status: z.enum(['draft', 'published', 'scheduled']).default('published'),
  scheduledFor: z.string().optional(),
  questions: z
    .array(
      z.object({
        questionText: z.string().trim().min(5).max(500),
        options: z.array(z.string().trim().min(1).max(200)).min(2).max(6),
        correctIndex: z.number().int().min(0),
        explanation: z.string().trim().min(3).max(500),
        marks: z.number().int().min(1).max(20).default(2),
      })
    )
    .min(1)
    .max(30),
});

const submitQuizSchema = z.object({
  answers: z.array(z.number().int().min(-1)),
  timeSpentSeconds: z.number().int().min(0).default(0),
});

// List quizzes available to user with attempt summaries
router.get('/quizzes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.dbUser!;

    let allowedClassroomIds: number[] | null = null;
    if (user.role === 'student') {
      const memberships = await db
        .select({ classroomId: classroomMemberships.classroomId })
        .from(classroomMemberships)
        .where(eq(classroomMemberships.userId, user.id));
      allowedClassroomIds = memberships.map((m) => m.classroomId);
    }

    const quizRows = await db
      .select({
        id: quizzes.id,
        classroomId: quizzes.classroomId,
        classroomTitle: classrooms.title,
        subject: classrooms.subject,
        teacherId: quizzes.teacherId,
        teacherName: users.fullName,
        title: quizzes.title,
        topic: quizzes.topic,
        description: quizzes.description,
        durationMinutes: quizzes.durationMinutes,
        totalMarks: quizzes.totalMarks,
        status: quizzes.status,
        scheduledFor: quizzes.scheduledFor,
        createdAt: quizzes.createdAt,
      })
      .from(quizzes)
      .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
      .innerJoin(users, eq(quizzes.teacherId, users.id))
      .orderBy(desc(quizzes.createdAt));

    const visibleQuizzes = quizRows.filter((q) => {
      if (user.role === 'student') {
        if (!allowedClassroomIds || !allowedClassroomIds.includes(q.classroomId)) {
          return false;
        }
        return q.status !== 'draft';
      }
      return true;
    });

    const quizIds = visibleQuizzes.map((q) => q.id);

    const [questionCounts, allAttempts] =
      quizIds.length > 0
        ? await Promise.all([
            db
              .select({
                quizId: quizQuestions.quizId,
                count: sql<number>`count(*)::int`,
              })
              .from(quizQuestions)
              .where(inArray(quizQuestions.quizId, quizIds))
              .groupBy(quizQuestions.quizId),
            db
              .select()
              .from(quizAttempts)
              .where(inArray(quizAttempts.quizId, quizIds))
              .orderBy(desc(quizAttempts.submittedAt)),
          ])
        : [[], []];

    const qCountMap = new Map(questionCounts.map((c) => [c.quizId, c.count]));

    const formatted = visibleQuizzes.map((q) => {
      const attemptsForQuiz = allAttempts.filter((a) => a.quizId === q.id);
      const myAttempts = attemptsForQuiz.filter((a) => a.studentId === user.id);
      const avgClassPercentage =
        attemptsForQuiz.length > 0
          ? Math.round(
              attemptsForQuiz.reduce((sum, a) => sum + a.percentage, 0) /
                attemptsForQuiz.length
            )
          : null;

      return {
        ...q,
        questionCount: qCountMap.get(q.id) ?? 0,
        attemptCount: attemptsForQuiz.length,
        avgClassPercentage,
        myLatestAttempt: myAttempts[0] ?? null,
        myBestScore:
          myAttempts.length > 0
            ? Math.max(...myAttempts.map((a) => a.percentage))
            : null,
      };
    });

    res.json({ quizzes: formatted });
  } catch (error) {
    console.error('Failed to list quizzes:', error);
    res.status(500).json({ error: 'Unable to load quizzes.' });
  }
});

// Optional-participation Leaderboard
router.get('/quizzes/leaderboard', requireAuth, async (_req: AuthRequest, res) => {
  try {
    const attempts = await db
      .select({
        studentId: quizAttempts.studentId,
        fullName: users.fullName,
        gradeOrDepartment: users.gradeOrDepartment,
        leaderboardOptIn: users.leaderboardOptIn,
        score: quizAttempts.score,
        totalMarks: quizAttempts.totalMarks,
        percentage: quizAttempts.percentage,
      })
      .from(quizAttempts)
      .innerJoin(users, eq(quizAttempts.studentId, users.id));

    const studentStats = new Map<
      number,
      {
        studentId: number;
        fullName: string;
        gradeOrDepartment: string;
        attempts: number;
        totalPercentage: number;
        totalPoints: number;
      }
    >();

    for (const row of attempts) {
      if (!row.leaderboardOptIn) continue;
      const existing = studentStats.get(row.studentId) ?? {
        studentId: row.studentId,
        fullName: row.fullName,
        gradeOrDepartment: row.gradeOrDepartment || 'Student',
        attempts: 0,
        totalPercentage: 0,
        totalPoints: 0,
      };
      existing.attempts += 1;
      existing.totalPercentage += row.percentage;
      existing.totalPoints += row.score * 10;
      studentStats.set(row.studentId, existing);
    }

    const leaderboard = Array.from(studentStats.values())
      .map((s) => ({
        studentId: s.studentId,
        fullName: s.fullName,
        gradeOrDepartment: s.gradeOrDepartment,
        quizzesCompleted: s.attempts,
        averageScore: Math.round(s.totalPercentage / s.attempts),
        points: s.totalPoints,
      }))
      .sort((a, b) => b.points - a.points || b.averageScore - a.averageScore)
      .slice(0, 10);

    res.json({ leaderboard });
  } catch (error) {
    console.error('Failed to load leaderboard:', error);
    res.status(500).json({ error: 'Unable to load leaderboard.' });
  }
});

// Review a completed attempt with full answers and explanations
router.get(
  '/quizzes/attempts/:attemptId',
  requireAuth,
  async (req: AuthRequest, res) => {
    const attemptId = Number(req.params.attemptId);
    if (!Number.isInteger(attemptId) || attemptId <= 0) {
      return res.status(400).json({ error: 'Invalid attempt ID.' });
    }

    try {
      const attemptRows = await db
        .select()
        .from(quizAttempts)
        .where(eq(quizAttempts.id, attemptId))
        .limit(1);

      if (attemptRows.length === 0) {
        return res.status(404).json({ error: 'Quiz attempt not found.' });
      }

      const attempt = attemptRows[0];
      if (
        req.dbUser!.role === 'student' &&
        attempt.studentId !== req.dbUser!.id
      ) {
        return res.status(403).json({ error: 'Access denied to this attempt.' });
      }

      const [quizRow] = await db
        .select()
        .from(quizzes)
        .where(eq(quizzes.id, attempt.quizId))
        .limit(1);

      const questions = await db
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, attempt.quizId))
        .orderBy(quizQuestions.orderIndex);

      res.json({
        attempt,
        quiz: quizRow,
        review: questions.map((q, idx) => ({
          id: q.id,
          questionText: q.questionText,
          options: q.options,
          selectedIndex: attempt.answers[idx] ?? -1,
          correctIndex: q.correctIndex,
          isCorrect: attempt.answers[idx] === q.correctIndex,
          explanation: q.explanation,
          marks: q.marks,
        })),
      });
    } catch (error) {
      console.error('Failed to load attempt review:', error);
      res.status(500).json({ error: 'Unable to load attempt review.' });
    }
  }
);

// Get quiz questions to start a quiz (hides correct answers for students)
router.get('/quizzes/:id', requireAuth, async (req: AuthRequest, res) => {
  const quizId = Number(req.params.id);
  if (!Number.isInteger(quizId) || quizId <= 0) {
    return res.status(400).json({ error: 'Invalid quiz ID.' });
  }

  try {
    const found = await db
      .select({
        id: quizzes.id,
        classroomId: quizzes.classroomId,
        classroomTitle: classrooms.title,
        subject: classrooms.subject,
        title: quizzes.title,
        topic: quizzes.topic,
        description: quizzes.description,
        durationMinutes: quizzes.durationMinutes,
        totalMarks: quizzes.totalMarks,
        status: quizzes.status,
      })
      .from(quizzes)
      .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
      .where(eq(quizzes.id, quizId))
      .limit(1);

    if (found.length === 0) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(quizQuestions.orderIndex);

    const isInstructor =
      req.dbUser!.role === 'teacher' || req.dbUser!.role === 'admin';

    res.json({
      quiz: found[0],
      questions: questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: q.options,
        marks: q.marks,
        ...(isInstructor
          ? { correctIndex: q.correctIndex, explanation: q.explanation }
          : {}),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch quiz:', error);
    res.status(500).json({ error: 'Unable to load quiz questions.' });
  }
});

// Create a new quiz with questions (Teacher / Admin)
router.post(
  '/quizzes',
  requireAuth,
  requireRoles('teacher', 'admin'),
  async (req: AuthRequest, res) => {
    const parsed = createQuizSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Please check all quiz fields and ensure every question has valid options.',
      });
    }

    try {
      const totalMarks = parsed.data.questions.reduce(
        (sum, q) => sum + q.marks,
        0
      );

      const [createdQuiz] = await db
        .insert(quizzes)
        .values({
          classroomId: parsed.data.classroomId,
          teacherId: req.dbUser!.id,
          title: parsed.data.title,
          topic: parsed.data.topic,
          description: parsed.data.description,
          durationMinutes: parsed.data.durationMinutes,
          totalMarks,
          status: parsed.data.status,
          scheduledFor: parsed.data.scheduledFor
            ? new Date(parsed.data.scheduledFor)
            : null,
        })
        .returning();

      await db.insert(quizQuestions).values(
        parsed.data.questions.map((q, idx) => ({
          quizId: createdQuiz.id,
          questionText: q.questionText,
          options: q.options,
          correctIndex: Math.min(q.correctIndex, q.options.length - 1),
          explanation: q.explanation,
          marks: q.marks,
          orderIndex: idx,
        }))
      );

      // Notify enrolled students if published
      if (parsed.data.status === 'published') {
        const members = await db
          .select({ userId: classroomMemberships.userId })
          .from(classroomMemberships)
          .where(eq(classroomMemberships.classroomId, parsed.data.classroomId));

        if (members.length > 0) {
          await db.insert(notifications).values(
            members.map((m) => ({
              userId: m.userId,
              title: `New quiz published: ${parsed.data.title}`,
              message: `${parsed.data.questions.length} questions · ${parsed.data.durationMinutes} min · Topic: ${parsed.data.topic}`,
              category: 'quiz',
              linkTab: 'quizzes',
            }))
          );
        }
      }

      broadcastEvent('quiz:created', {
        quizId: createdQuiz.id,
        classroomId: createdQuiz.classroomId,
      });

      res.status(201).json({ quiz: createdQuiz });
    } catch (error) {
      console.error('Failed to create quiz:', error);
      res.status(500).json({ error: 'Unable to publish quiz.' });
    }
  }
);

// Submit quiz answers, calculate real score on server, return full review
router.post('/quizzes/:id/submit', requireAuth, async (req: AuthRequest, res) => {
  const quizId = Number(req.params.id);
  const parsed = submitQuizSchema.safeParse(req.body);
  if (!Number.isInteger(quizId) || !parsed.success) {
    return res.status(400).json({ error: 'Invalid quiz submission.' });
  }

  try {
    const [quizRow] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);

    if (!quizRow) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(quizQuestions.orderIndex);

    if (questions.length === 0) {
      return res.status(400).json({ error: 'Quiz has no questions.' });
    }

    let score = 0;
    let totalMarks = 0;
    const review = questions.map((q, idx) => {
      const selectedIndex = parsed.data.answers[idx] ?? -1;
      const isCorrect = selectedIndex === q.correctIndex;
      totalMarks += q.marks;
      if (isCorrect) score += q.marks;
      return {
        id: q.id,
        questionText: q.questionText,
        options: q.options,
        selectedIndex,
        correctIndex: q.correctIndex,
        isCorrect,
        explanation: q.explanation,
        marks: q.marks,
      };
    });

    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

    const [attempt] = await db
      .insert(quizAttempts)
      .values({
        quizId,
        studentId: req.dbUser!.id,
        answers: parsed.data.answers,
        score,
        totalMarks,
        percentage,
        timeSpentSeconds: parsed.data.timeSpentSeconds,
      })
      .returning();

    // Notify quiz teacher
    if (quizRow.teacherId !== req.dbUser!.id) {
      await db.insert(notifications).values({
        userId: quizRow.teacherId,
        title: `Quiz submitted: ${quizRow.title}`,
        message: `${req.dbUser!.fullName} scored ${score}/${totalMarks} (${percentage}%).`,
        category: 'quiz',
        linkTab: 'quizzes',
      });
    }

    broadcastEvent('quiz:submitted', { quizId, attemptId: attempt.id });

    res.status(201).json({ attempt, review });
  } catch (error) {
    console.error('Failed to grade quiz attempt:', error);
    res.status(500).json({ error: 'Unable to submit quiz attempt.' });
  }
});

// Teacher / Admin class results for a quiz
router.get(
  '/quizzes/:id/results',
  requireAuth,
  requireRoles('teacher', 'admin'),
  async (req: AuthRequest, res) => {
    const quizId = Number(req.params.id);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      return res.status(400).json({ error: 'Invalid quiz ID.' });
    }

    try {
      const results = await db
        .select({
          attemptId: quizAttempts.id,
          studentName: users.fullName,
          studentEmail: users.email,
          score: quizAttempts.score,
          totalMarks: quizAttempts.totalMarks,
          percentage: quizAttempts.percentage,
          timeSpentSeconds: quizAttempts.timeSpentSeconds,
          submittedAt: quizAttempts.submittedAt,
        })
        .from(quizAttempts)
        .innerJoin(users, eq(quizAttempts.studentId, users.id))
        .where(eq(quizAttempts.quizId, quizId))
        .orderBy(desc(quizAttempts.submittedAt));

      res.json({ results });
    } catch (error) {
      console.error('Failed to load quiz results:', error);
      res.status(500).json({ error: 'Unable to load class quiz results.' });
    }
  }
);

export default router;
