import { Router } from 'express';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import {
  announcements,
  classroomMemberships,
  classrooms,
  doubts,
  flashcards,
  notifications,
  quizAttempts,
  quizzes,
  revisionProgress,
  studyMaterials,
  users,
} from '../../db/schema.ts';
import {
  type AuthRequest,
  requireAuth,
  requireRoles,
} from '../../middleware/auth.ts';
import { generateLearningAssistance } from '../../lib/gemini.ts';
import { broadcastEvent } from '../../lib/realtime.ts';

const router = Router();

const progressSchema = z.object({
  isSaved: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
  markViewed: z.boolean().optional(),
});

const createFlashcardSchema = z.object({
  subject: z.string().trim().min(2).max(60),
  topic: z.string().trim().min(2).max(80),
  front: z.string().trim().min(3).max(400),
  back: z.string().trim().min(3).max(800),
  classroomId: z.number().int().positive().optional(),
});

const updateFlashcardSchema = z.object({
  mastered: z.boolean().optional(),
  front: z.string().trim().min(3).max(400).optional(),
  back: z.string().trim().min(3).max(800).optional(),
});

const aiAssistSchema = z.object({
  prompt: z.string().trim().min(3).max(2000),
  mode: z.enum(['explain', 'step_by_step', 'practice', 'summarize']).default('explain'),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  subject: z.string().trim().max(60).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .max(12)
    .optional(),
});

// -------------------- SMART REVISION CENTER --------------------

router.get('/revision/materials', requireAuth, async (req: AuthRequest, res) => {
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

    const materials = await db
      .select({
        id: studyMaterials.id,
        classroomId: studyMaterials.classroomId,
        classroomTitle: classrooms.title,
        title: studyMaterials.title,
        subject: studyMaterials.subject,
        chapter: studyMaterials.chapter,
        materialType: studyMaterials.materialType,
        summary: studyMaterials.summary,
        content: studyMaterials.content,
        createdAt: studyMaterials.createdAt,
        uploaderName: users.fullName,
      })
      .from(studyMaterials)
      .innerJoin(classrooms, eq(studyMaterials.classroomId, classrooms.id))
      .innerJoin(users, eq(studyMaterials.uploaderId, users.id))
      .orderBy(desc(studyMaterials.createdAt));

    const visibleMaterials = materials.filter((m) =>
      allowedClassroomIds ? allowedClassroomIds.includes(m.classroomId) : true
    );

    const progressRows = await db
      .select()
      .from(revisionProgress)
      .where(eq(revisionProgress.userId, user.id));

    const progressMap = new Map(progressRows.map((p) => [p.materialId, p]));

    const enriched = visibleMaterials.map((m) => {
      const prog = progressMap.get(m.id);
      return {
        ...m,
        isSaved: prog?.isSaved ?? false,
        isCompleted: prog?.isCompleted ?? false,
        lastViewedAt: prog?.lastViewedAt ?? null,
      };
    });

    res.json({ materials: enriched });
  } catch (error) {
    console.error('Failed to load revision materials:', error);
    res.status(500).json({ error: 'Unable to load study materials.' });
  }
});

router.post(
  '/revision/materials/:id/progress',
  requireAuth,
  async (req: AuthRequest, res) => {
    const materialId = Number(req.params.id);
    const parsed = progressSchema.safeParse(req.body);
    if (!Number.isInteger(materialId) || !parsed.success) {
      return res.status(400).json({ error: 'Invalid revision progress request.' });
    }

    try {
      const existing = await db
        .select()
        .from(revisionProgress)
        .where(
          and(
            eq(revisionProgress.userId, req.dbUser!.id),
            eq(revisionProgress.materialId, materialId)
          )
        )
        .limit(1);

      const current = existing[0];
      const nextSaved =
        parsed.data.isSaved !== undefined
          ? parsed.data.isSaved
          : current?.isSaved ?? false;
      const nextCompleted =
        parsed.data.isCompleted !== undefined
          ? parsed.data.isCompleted
          : current?.isCompleted ?? false;

      const [upserted] = await db
        .insert(revisionProgress)
        .values({
          userId: req.dbUser!.id,
          materialId,
          isSaved: nextSaved,
          isCompleted: nextCompleted,
          lastViewedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [revisionProgress.userId, revisionProgress.materialId],
          set: {
            isSaved: nextSaved,
            isCompleted: nextCompleted,
            lastViewedAt: new Date(),
          },
        })
        .returning();

      res.json({ progress: upserted });
    } catch (error) {
      console.error('Failed to save revision progress:', error);
      res.status(500).json({ error: 'Unable to save revision progress.' });
    }
  }
);

// -------------------- FLASHCARDS --------------------

router.get('/flashcards', requireAuth, async (req: AuthRequest, res) => {
  try {
    const cards = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.userId, req.dbUser!.id))
      .orderBy(desc(flashcards.createdAt));

    res.json({ flashcards: cards });
  } catch (error) {
    console.error('Failed to load flashcards:', error);
    res.status(500).json({ error: 'Unable to load flashcards.' });
  }
});

router.post('/flashcards', requireAuth, async (req: AuthRequest, res) => {
  const parsed = createFlashcardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'Please complete the front, back, subject, and topic fields.' });
  }

  try {
    const [card] = await db
      .insert(flashcards)
      .values({
        userId: req.dbUser!.id,
        classroomId: parsed.data.classroomId ?? null,
        subject: parsed.data.subject,
        topic: parsed.data.topic,
        front: parsed.data.front,
        back: parsed.data.back,
      })
      .returning();

    res.status(201).json({ flashcard: card });
  } catch (error) {
    console.error('Failed to create flashcard:', error);
    res.status(500).json({ error: 'Unable to save flashcard.' });
  }
});

router.patch('/flashcards/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parsed = updateFlashcardSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) {
    return res.status(400).json({ error: 'Invalid flashcard update.' });
  }

  try {
    const updates: Partial<typeof flashcards.$inferInsert> = {};
    if (parsed.data.mastered !== undefined) updates.mastered = parsed.data.mastered;
    if (parsed.data.front !== undefined) updates.front = parsed.data.front;
    if (parsed.data.back !== undefined) updates.back = parsed.data.back;

    const [updated] = await db
      .update(flashcards)
      .set(updates)
      .where(and(eq(flashcards.id, id), eq(flashcards.userId, req.dbUser!.id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Flashcard not found.' });
    }

    res.json({ flashcard: updated });
  } catch (error) {
    console.error('Failed to update flashcard:', error);
    res.status(500).json({ error: 'Unable to update flashcard.' });
  }
});

router.delete('/flashcards/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid flashcard ID.' });
  }

  try {
    await db
      .delete(flashcards)
      .where(and(eq(flashcards.id, id), eq(flashcards.userId, req.dbUser!.id)));
    res.json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete flashcard:', error);
    res.status(500).json({ error: 'Unable to delete flashcard.' });
  }
});

// -------------------- NOTIFICATIONS --------------------

router.get('/notifications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const items = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.dbUser!.id))
      .orderBy(desc(notifications.createdAt))
      .limit(30);

    const unreadCount = items.filter((n) => !n.isRead).length;
    res.json({ notifications: items, unreadCount });
  } catch (error) {
    console.error('Failed to load notifications:', error);
    res.status(500).json({ error: 'Unable to load notifications.' });
  }
});

router.patch(
  '/notifications/:id/read',
  requireAuth,
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid notification ID.' });
    }

    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(eq(notifications.id, id), eq(notifications.userId, req.dbUser!.id))
        );
      res.json({ read: true });
    } catch (error) {
      console.error('Failed to mark notification read:', error);
      res.status(500).json({ error: 'Unable to update notification.' });
    }
  }
);

router.post(
  '/notifications/read-all',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, req.dbUser!.id));
      res.json({ readAll: true });
    } catch (error) {
      console.error('Failed to mark all notifications read:', error);
      res.status(500).json({ error: 'Unable to mark notifications read.' });
    }
  }
);

// -------------------- STUDENT DASHBOARD --------------------

router.get('/dashboard/student', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.dbUser!;

    const memberships = await db
      .select({ classroomId: classroomMemberships.classroomId })
      .from(classroomMemberships)
      .where(eq(classroomMemberships.userId, user.id));

    const classIds = memberships.map((m) => m.classroomId);

    const [
      enrolledQuizzes,
      myAttempts,
      recentAnnouncements,
      myDoubts,
      myFlashcards,
      myProgress,
    ] = await Promise.all([
      classIds.length > 0
        ? db
            .select({
              id: quizzes.id,
              title: quizzes.title,
              topic: quizzes.topic,
              durationMinutes: quizzes.durationMinutes,
              totalMarks: quizzes.totalMarks,
              status: quizzes.status,
              classroomTitle: classrooms.title,
              subject: classrooms.subject,
              createdAt: quizzes.createdAt,
            })
            .from(quizzes)
            .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
            .where(inArray(quizzes.classroomId, classIds))
            .orderBy(desc(quizzes.createdAt))
        : [],
      db
        .select({
          id: quizAttempts.id,
          quizId: quizAttempts.quizId,
          quizTitle: quizzes.title,
          subject: classrooms.subject,
          score: quizAttempts.score,
          totalMarks: quizAttempts.totalMarks,
          percentage: quizAttempts.percentage,
          submittedAt: quizAttempts.submittedAt,
        })
        .from(quizAttempts)
        .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
        .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
        .where(eq(quizAttempts.studentId, user.id))
        .orderBy(desc(quizAttempts.submittedAt)),
      classIds.length > 0
        ? db
            .select({
              id: announcements.id,
              title: announcements.title,
              content: announcements.content,
              dueDate: announcements.dueDate,
              createdAt: announcements.createdAt,
              classroomTitle: classrooms.title,
              subject: classrooms.subject,
            })
            .from(announcements)
            .innerJoin(classrooms, eq(announcements.classroomId, classrooms.id))
            .where(inArray(announcements.classroomId, classIds))
            .orderBy(desc(announcements.createdAt))
            .limit(6)
        : [],
      db
        .select({
          id: doubts.id,
          title: doubts.title,
          topic: doubts.topic,
          status: doubts.status,
          upvotesCount: doubts.upvotesCount,
          createdAt: doubts.createdAt,
        })
        .from(doubts)
        .where(eq(doubts.authorId, user.id))
        .orderBy(desc(doubts.createdAt))
        .limit(5),
      db.select().from(flashcards).where(eq(flashcards.userId, user.id)),
      db
        .select()
        .from(revisionProgress)
        .where(eq(revisionProgress.userId, user.id)),
    ]);

    const attemptedQuizIds = new Set(myAttempts.map((a) => a.quizId));
    const upcomingQuizzes = enrolledQuizzes.filter(
      (q) => q.status !== 'draft' && !attemptedQuizIds.has(q.id)
    );

    const avgScore =
      myAttempts.length > 0
        ? Math.round(
            myAttempts.reduce((sum, a) => sum + a.percentage, 0) /
              myAttempts.length
          )
        : 0;

    // Build learning progress chart data from actual quiz attempts + subject mastery
    const progressSeries =
      myAttempts.length > 0
        ? [...myAttempts]
            .reverse()
            .slice(-8)
            .map((a, idx) => ({
              label: a.quizTitle.slice(0, 18),
              attempt: `#${idx + 1}`,
              score: a.percentage,
              subject: a.subject,
            }))
        : enrolledQuizzes.slice(0, 4).map((q) => ({
            label: q.subject,
            attempt: 'Not started',
            score: 0,
            subject: q.subject,
          }));

    // Pending tasks synthesized from real upcoming quizzes + unmastered flashcards
    const pendingTasks = [
      ...upcomingQuizzes.slice(0, 3).map((q) => ({
        id: `quiz-${q.id}`,
        title: `Complete quiz: ${q.title}`,
        meta: `${q.subject} · ${q.durationMinutes} min`,
        actionTab: 'quizzes',
      })),
      ...myFlashcards
        .filter((f) => !f.mastered)
        .slice(0, 2)
        .map((f) => ({
          id: `card-${f.id}`,
          title: `Review flashcard: ${f.topic}`,
          meta: f.subject,
          actionTab: 'revision',
        })),
    ];

    const recentActivities = [
      ...myAttempts.slice(0, 3).map((a) => ({
        id: `att-${a.id}`,
        title: `Scored ${a.percentage}% on ${a.quizTitle}`,
        meta: `${a.subject} · ${a.score}/${a.totalMarks} marks`,
        timestamp: a.submittedAt,
      })),
      ...myDoubts.slice(0, 3).map((d) => ({
        id: `dbt-${d.id}`,
        title: `Asked anonymously: ${d.title}`,
        meta: `${d.topic} · Status: ${d.status}`,
        timestamp: d.createdAt,
      })),
    ].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.json({
      stats: {
        enrolledClasses: classIds.length,
        upcomingQuizzes: upcomingQuizzes.length,
        completedQuizzes: myAttempts.length,
        averageQuizScore: avgScore,
        masteredFlashcards: myFlashcards.filter((f) => f.mastered).length,
        totalFlashcards: myFlashcards.length,
        completedLessons: myProgress.filter((p) => p.isCompleted).length,
      },
      progressSeries,
      recentActivities: recentActivities.slice(0, 6),
      pendingTasks,
      recentAnnouncements,
      upcomingQuizList: upcomingQuizzes.slice(0, 4),
    });
  } catch (error) {
    console.error('Failed to load student dashboard:', error);
    res.status(500).json({ error: 'Unable to load student dashboard.' });
  }
});

// -------------------- TEACHER DASHBOARD + LEARNING GAP ANALYSIS --------------------

router.get(
  '/dashboard/teacher',
  requireAuth,
  requireRoles('teacher', 'admin'),
  async (_req: AuthRequest, res) => {
    try {
      const [
        allClasses,
        allMemberships,
        allDoubts,
        allQuizzes,
        allAttempts,
      ] = await Promise.all([
        db.select().from(classrooms),
        db.select().from(classroomMemberships),
        db
          .select({
            id: doubts.id,
            classroomId: doubts.classroomId,
            subject: doubts.subject,
            topic: doubts.topic,
            title: doubts.title,
            status: doubts.status,
            upvotesCount: doubts.upvotesCount,
            createdAt: doubts.createdAt,
          })
          .from(doubts)
          .orderBy(desc(doubts.createdAt)),
        db.select().from(quizzes),
        db
          .select({
            id: quizAttempts.id,
            quizId: quizAttempts.quizId,
            studentId: quizAttempts.studentId,
            studentName: users.fullName,
            quizTitle: quizzes.title,
            topic: quizzes.topic,
            classroomId: quizzes.classroomId,
            percentage: quizAttempts.percentage,
            submittedAt: quizAttempts.submittedAt,
          })
          .from(quizAttempts)
          .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
          .innerJoin(users, eq(quizAttempts.studentId, users.id))
          .orderBy(desc(quizAttempts.submittedAt)),
      ]);

      const uniqueStudents = new Set(allMemberships.map((m) => m.userId));
      const pendingDoubtsCount = allDoubts.filter(
        (d) => d.status === 'pending'
      ).length;
      const avgClassPerformance =
        allAttempts.length > 0
          ? Math.round(
              allAttempts.reduce((sum, a) => sum + a.percentage, 0) /
                allAttempts.length
            )
          : 0;

      // Learning Gap Analysis: combine quiz accuracy by topic + doubt volume & upvotes by topic
      const gapMap = new Map<
        string,
        {
          topic: string;
          subject: string;
          doubtCount: number;
          doubtUpvotes: number;
          attemptCount: number;
          totalQuizPct: number;
        }
      >();

      for (const d of allDoubts) {
        const key = d.topic;
        const entry = gapMap.get(key) ?? {
          topic: d.topic,
          subject: d.subject,
          doubtCount: 0,
          doubtUpvotes: 0,
          attemptCount: 0,
          totalQuizPct: 0,
        };
        entry.doubtCount += 1;
        entry.doubtUpvotes += d.upvotesCount;
        gapMap.set(key, entry);
      }

      const classSubjectMap = new Map(allClasses.map((c) => [c.id, c.subject]));
      for (const a of allAttempts) {
        const key = a.topic;
        const entry = gapMap.get(key) ?? {
          topic: a.topic,
          subject: classSubjectMap.get(a.classroomId) || 'General',
          doubtCount: 0,
          doubtUpvotes: 0,
          attemptCount: 0,
          totalQuizPct: 0,
        };
        entry.attemptCount += 1;
        entry.totalQuizPct += a.percentage;
        gapMap.set(key, entry);
      }

      const learningGaps = Array.from(gapMap.values())
        .map((g) => {
          const avgQuizScore =
            g.attemptCount > 0
              ? Math.round(g.totalQuizPct / g.attemptCount)
              : null;
          // Higher risk score means students struggle more (low quiz avg + high doubts/upvotes)
          const quizDeficit = avgQuizScore !== null ? 100 - avgQuizScore : 35;
          const gapIndex = Math.min(
            100,
            Math.round(quizDeficit * 0.6 + g.doubtCount * 12 + g.doubtUpvotes * 1.5)
          );
          const severity =
            gapIndex >= 55 ? 'High Priority' : gapIndex >= 32 ? 'Watch' : 'On Track';
          return {
            topic: g.topic,
            subject: g.subject,
            doubtCount: g.doubtCount,
            doubtUpvotes: g.doubtUpvotes,
            avgQuizScore,
            gapIndex,
            severity,
          };
        })
        .sort((a, b) => b.gapIndex - a.gapIndex);

      // Classroom participation chart
      const participationChart = allClasses.map((c) => {
        const enrolled = allMemberships.filter(
          (m) => m.classroomId === c.id
        ).length;
        const classDoubts = allDoubts.filter(
          (d) => d.classroomId === c.id
        ).length;
        const classAttempts = allAttempts.filter(
          (a) => a.classroomId === c.id
        ).length;
        return {
          classroom: c.subject,
          title: c.title,
          students: enrolled,
          doubts: classDoubts,
          quizSubmissions: classAttempts,
        };
      });

      const recentActivity = [
        ...allDoubts.slice(0, 4).map((d) => ({
          id: `d-${d.id}`,
          title: `Anonymous doubt: ${d.title}`,
          meta: `${d.subject} · ${d.topic} · ${d.status}`,
          timestamp: d.createdAt,
        })),
        ...allAttempts.slice(0, 4).map((a) => ({
          id: `q-${a.id}`,
          title: `${a.studentName} scored ${a.percentage}% on ${a.quizTitle}`,
          meta: a.topic,
          timestamp: a.submittedAt,
        })),
      ]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 7);

      res.json({
        stats: {
          totalStudents: uniqueStudents.size,
          activeClassrooms: allClasses.length,
          pendingDoubts: pendingDoubtsCount,
          quizzesCreated: allQuizzes.length,
          avgClassPerformance,
        },
        learningGaps,
        participationChart,
        recentActivity,
      });
    } catch (error) {
      console.error('Failed to load teacher dashboard:', error);
      res.status(500).json({ error: 'Unable to load teacher analytics.' });
    }
  }
);

// -------------------- ADMIN DASHBOARD & GOVERNANCE --------------------

router.get(
  '/admin/overview',
  requireAuth,
  requireRoles('admin'),
  async (_req: AuthRequest, res) => {
    try {
      const [allUsers, allClasses, allDoubts, allMaterials, allQuizzes, allAttempts] =
        await Promise.all([
          db.select().from(users).orderBy(desc(users.createdAt)),
          db
            .select({
              id: classrooms.id,
              title: classrooms.title,
              subject: classrooms.subject,
              joinCode: classrooms.joinCode,
              teacherName: users.fullName,
              createdAt: classrooms.createdAt,
            })
            .from(classrooms)
            .innerJoin(users, eq(classrooms.teacherId, users.id))
            .orderBy(desc(classrooms.createdAt)),
          db
            .select({
              id: doubts.id,
              title: doubts.title,
              subject: doubts.subject,
              topic: doubts.topic,
              status: doubts.status,
              upvotesCount: doubts.upvotesCount,
              authorName: users.fullName,
              createdAt: doubts.createdAt,
            })
            .from(doubts)
            .innerJoin(users, eq(doubts.authorId, users.id))
            .orderBy(desc(doubts.createdAt)),
          db
            .select({
              id: studyMaterials.id,
              title: studyMaterials.title,
              subject: studyMaterials.subject,
              chapter: studyMaterials.chapter,
              materialType: studyMaterials.materialType,
              createdAt: studyMaterials.createdAt,
            })
            .from(studyMaterials)
            .orderBy(desc(studyMaterials.createdAt)),
          db.select({ count: sql<number>`count(*)::int` }).from(quizzes),
          db.select({ count: sql<number>`count(*)::int` }).from(quizAttempts),
        ]);

      res.json({
        stats: {
          totalUsers: allUsers.length,
          students: allUsers.filter((u) => u.role === 'student').length,
          teachers: allUsers.filter((u) => u.role === 'teacher').length,
          admins: allUsers.filter((u) => u.role === 'admin').length,
          totalClassrooms: allClasses.length,
          totalDoubts: allDoubts.length,
          totalQuizzes: allQuizzes[0]?.count ?? 0,
          totalAttempts: allAttempts[0]?.count ?? 0,
          totalMaterials: allMaterials.length,
        },
        users: allUsers,
        classrooms: allClasses,
        doubts: allDoubts,
        materials: allMaterials,
      });
    } catch (error) {
      console.error('Failed to load admin overview:', error);
      res.status(500).json({ error: 'Unable to load admin console data.' });
    }
  }
);

router.patch(
  '/admin/users/:id/role',
  requireAuth,
  requireRoles('admin'),
  async (req: AuthRequest, res) => {
    const userId = Number(req.params.id);
    const parsed = z.object({ role: z.enum(['student', 'teacher', 'admin']) }).safeParse(req.body);
    if (!Number.isInteger(userId) || !parsed.success) {
      return res.status(400).json({ error: 'Invalid role update request.' });
    }

    try {
      const [updated] = await db
        .update(users)
        .set({ role: parsed.data.role })
        .where(eq(users.id, userId))
        .returning();
      if (!updated) return res.status(404).json({ error: 'User not found.' });
      res.json({ user: updated });
    } catch (error) {
      console.error('Failed to update user role:', error);
      res.status(500).json({ error: 'Unable to update user role.' });
    }
  }
);

router.delete(
  '/admin/classrooms/:id',
  requireAuth,
  requireRoles('admin'),
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid ID.' });
    try {
      await db.delete(classrooms).where(eq(classrooms.id, id));
      broadcastEvent('classroom:updated', { classroomId: id });
      res.json({ deleted: true });
    } catch (error) {
      console.error('Failed to delete classroom:', error);
      res.status(500).json({ error: 'Unable to delete classroom.' });
    }
  }
);

router.delete(
  '/admin/doubts/:id',
  requireAuth,
  requireRoles('admin'),
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid ID.' });
    try {
      await db.delete(doubts).where(eq(doubts.id, id));
      broadcastEvent('doubt:updated', { doubtId: id });
      res.json({ deleted: true });
    } catch (error) {
      console.error('Failed to delete doubt:', error);
      res.status(500).json({ error: 'Unable to delete doubt.' });
    }
  }
);

router.delete(
  '/admin/materials/:id',
  requireAuth,
  requireRoles('admin'),
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid ID.' });
    try {
      await db.delete(studyMaterials).where(eq(studyMaterials.id, id));
      broadcastEvent('material:created', { materialId: id });
      res.json({ deleted: true });
    } catch (error) {
      console.error('Failed to delete material:', error);
      res.status(500).json({ error: 'Unable to delete material.' });
    }
  }
);

// -------------------- AI LEARNING ASSISTANT --------------------

router.post('/ai/assist', requireAuth, async (req: AuthRequest, res) => {
  const parsed = aiAssistSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'Please enter a valid academic question (at least 3 characters).' });
  }

  try {
    const result = await generateLearningAssistance(parsed.data);
    res.json(result);
  } catch (error: any) {
    console.error('AI Learning Assistant error:', error);
    const statusCode = error?.status || error?.statusCode || 500;
    const message =
      statusCode === 403 || statusCode === 400
        ? 'The configured Gemini API key could not be validated. Please check Settings > Secrets.'
        : statusCode === 429
          ? 'AI rate limit reached temporarily. Please wait a moment and try again.'
          : error?.message || 'Unable to generate AI tutoring response right now.';
    res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
      error: message,
    });
  }
});

export default router;
