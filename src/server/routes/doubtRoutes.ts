import { Router } from 'express';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import {
  classroomMemberships,
  classrooms,
  doubtResponses,
  doubts,
  doubtUpvotes,
  notifications,
  users,
} from '../../db/schema.ts';
import {
  type AuthRequest,
  requireAuth,
  requireRoles,
} from '../../middleware/auth.ts';
import { broadcastEvent } from '../../lib/realtime.ts';

const router = Router();

const createDoubtSchema = z.object({
  classroomId: z.number().int().positive(),
  subject: z.string().trim().min(2).max(60),
  topic: z.string().trim().min(2).max(80),
  title: z.string().trim().min(5).max(160),
  question: z.string().trim().min(10).max(3000),
  isAnonymous: z.boolean().default(true),
});

const respondDoubtSchema = z.object({
  content: z.string().trim().min(5).max(3000),
  markResolved: z.boolean().optional(),
  pinResponse: z.boolean().optional(),
});

const updateDoubtSchema = z.object({
  status: z.enum(['pending', 'answered', 'resolved']).optional(),
  isPinned: z.boolean().optional(),
});

// List doubts with strict student anonymity masking & rich search/filters
router.get('/doubts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.dbUser!;
    const search = String(req.query.search || '').trim().toLowerCase();
    const subjectFilter = String(req.query.subject || '').trim();
    const topicFilter = String(req.query.topic || '').trim();
    const statusFilter = String(req.query.status || '').trim();
    const classroomIdFilter = req.query.classroomId
      ? Number(req.query.classroomId)
      : undefined;

    // Determine visible classrooms for students
    let allowedClassroomIds: number[] | null = null;
    if (user.role === 'student') {
      const memberships = await db
        .select({ classroomId: classroomMemberships.classroomId })
        .from(classroomMemberships)
        .where(eq(classroomMemberships.userId, user.id));
      allowedClassroomIds = memberships.map((m) => m.classroomId);
      if (allowedClassroomIds.length === 0) {
        return res.json({ doubts: [], topics: [], subjects: [] });
      }
    }

    const rawDoubts = await db
      .select({
        id: doubts.id,
        classroomId: doubts.classroomId,
        classroomTitle: classrooms.title,
        authorId: doubts.authorId,
        authorName: users.fullName,
        authorEmail: users.email,
        subject: doubts.subject,
        topic: doubts.topic,
        title: doubts.title,
        question: doubts.question,
        isAnonymous: doubts.isAnonymous,
        status: doubts.status,
        isPinned: doubts.isPinned,
        upvotesCount: doubts.upvotesCount,
        createdAt: doubts.createdAt,
        updatedAt: doubts.updatedAt,
      })
      .from(doubts)
      .innerJoin(classrooms, eq(doubts.classroomId, classrooms.id))
      .innerJoin(users, eq(doubts.authorId, users.id))
      .orderBy(desc(doubts.isPinned), desc(doubts.upvotesCount), desc(doubts.createdAt));

    const visibleDoubts = rawDoubts.filter((d) => {
      if (allowedClassroomIds && !allowedClassroomIds.includes(d.classroomId)) {
        return false;
      }
      if (classroomIdFilter && d.classroomId !== classroomIdFilter) return false;
      if (subjectFilter && subjectFilter !== 'All' && d.subject !== subjectFilter) {
        return false;
      }
      if (topicFilter && topicFilter !== 'All' && d.topic !== topicFilter) {
        return false;
      }
      if (statusFilter && statusFilter !== 'all' && d.status !== statusFilter) {
        return false;
      }
      if (search) {
        const hay = `${d.title} ${d.question} ${d.topic} ${d.subject}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    const doubtIds = visibleDoubts.map((d) => d.id);

    const [responsesList, userUpvotes] =
      doubtIds.length > 0
        ? await Promise.all([
            db
              .select({
                id: doubtResponses.id,
                doubtId: doubtResponses.doubtId,
                content: doubtResponses.content,
                isPinned: doubtResponses.isPinned,
                isOfficial: doubtResponses.isOfficial,
                createdAt: doubtResponses.createdAt,
                responderName: users.fullName,
                responderRole: users.role,
              })
              .from(doubtResponses)
              .innerJoin(users, eq(doubtResponses.responderId, users.id))
              .where(inArray(doubtResponses.doubtId, doubtIds))
              .orderBy(desc(doubtResponses.isPinned), desc(doubtResponses.createdAt)),
            db
              .select({ doubtId: doubtUpvotes.doubtId })
              .from(doubtUpvotes)
              .where(
                and(
                  eq(doubtUpvotes.userId, user.id),
                  inArray(doubtUpvotes.doubtId, doubtIds)
                )
              ),
          ])
        : [[], []];

    const upvotedSet = new Set(userUpvotes.map((u) => u.doubtId));
    const responseMap = new Map<number, typeof responsesList>();
    for (const r of responsesList) {
      const list = responseMap.get(r.doubtId) ?? [];
      list.push(r);
      responseMap.set(r.doubtId, list);
    }

    const canSeeModerationIdentity =
      user.role === 'teacher' || user.role === 'admin';

    const formatted = visibleDoubts.map((d) => {
      const isOwnDoubt = d.authorId === user.id;
      const authorDisplay = d.isAnonymous
        ? isOwnDoubt
          ? 'You · Hidden from classmates'
          : 'Anonymous Student'
        : d.authorName;

      return {
        id: d.id,
        classroomId: d.classroomId,
        classroomTitle: d.classroomTitle,
        subject: d.subject,
        topic: d.topic,
        title: d.title,
        question: d.question,
        isAnonymous: d.isAnonymous,
        status: d.status,
        isPinned: d.isPinned,
        upvotesCount: d.upvotesCount,
        hasUpvoted: upvotedSet.has(d.id),
        isOwnDoubt,
        authorDisplay,
        // Moderation identity strictly restricted to teachers & admins
        moderationAuthor: canSeeModerationIdentity
          ? { name: d.authorName, email: d.authorEmail }
          : undefined,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        responses: responseMap.get(d.id) ?? [],
      };
    });

    const topics = Array.from(new Set(rawDoubts.map((d) => d.topic))).sort();
    const subjects = Array.from(new Set(rawDoubts.map((d) => d.subject))).sort();

    res.json({ doubts: formatted, topics, subjects });
  } catch (error) {
    console.error('Failed to list doubts:', error);
    res.status(500).json({ error: 'Unable to load doubts.' });
  }
});

// Submit a new doubt (Anonymous by default)
router.post('/doubts', requireAuth, async (req: AuthRequest, res) => {
  const parsed = createDoubtSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'Please complete the title, topic, and question fields.' });
  }

  try {
    const classroomRows = await db
      .select()
      .from(classrooms)
      .where(eq(classrooms.id, parsed.data.classroomId))
      .limit(1);

    if (classroomRows.length === 0) {
      return res.status(404).json({ error: 'Selected classroom not found.' });
    }

    const classroom = classroomRows[0];

    const [created] = await db
      .insert(doubts)
      .values({
        classroomId: classroom.id,
        authorId: req.dbUser!.id,
        subject: parsed.data.subject,
        topic: parsed.data.topic,
        title: parsed.data.title,
        question: parsed.data.question,
        isAnonymous: parsed.data.isAnonymous,
        status: 'pending',
      })
      .returning();

    // Notify classroom teacher (preserving student anonymity in notification text)
    if (classroom.teacherId !== req.dbUser!.id) {
      await db.insert(notifications).values({
        userId: classroom.teacherId,
        title: `New ${parsed.data.isAnonymous ? 'anonymous ' : ''}doubt in ${classroom.subject}`,
        message: `${parsed.data.topic}: "${parsed.data.title}"`,
        category: 'doubt',
        linkTab: 'doubts',
      });
    }

    broadcastEvent('doubt:created', {
      doubtId: created.id,
      classroomId: classroom.id,
    });

    res.status(201).json({ doubt: created });
  } catch (error) {
    console.error('Failed to submit doubt:', error);
    res.status(500).json({ error: 'Unable to submit doubt right now.' });
  }
});

// Upvote / remove upvote on a doubt
router.post('/doubts/:id/upvote', requireAuth, async (req: AuthRequest, res) => {
  const doubtId = Number(req.params.id);
  if (!Number.isInteger(doubtId) || doubtId <= 0) {
    return res.status(400).json({ error: 'Invalid doubt ID.' });
  }

  try {
    const existing = await db
      .select()
      .from(doubtUpvotes)
      .where(
        and(
          eq(doubtUpvotes.doubtId, doubtId),
          eq(doubtUpvotes.userId, req.dbUser!.id)
        )
      )
      .limit(1);

    let upvoted = false;
    if (existing.length > 0) {
      await db.delete(doubtUpvotes).where(eq(doubtUpvotes.id, existing[0].id));
      await db
        .update(doubts)
        .set({ upvotesCount: sql`GREATEST(${doubts.upvotesCount} - 1, 0)` })
        .where(eq(doubts.id, doubtId));
      upvoted = false;
    } else {
      await db
        .insert(doubtUpvotes)
        .values({ doubtId, userId: req.dbUser!.id });
      await db
        .update(doubts)
        .set({ upvotesCount: sql`${doubts.upvotesCount} + 1` })
        .where(eq(doubts.id, doubtId));
      upvoted = true;
    }

    const [updated] = await db
      .select({ upvotesCount: doubts.upvotesCount })
      .from(doubts)
      .where(eq(doubts.id, doubtId))
      .limit(1);

    broadcastEvent('doubt:updated', { doubtId });
    res.json({ upvoted, upvotesCount: updated?.upvotesCount ?? 0 });
  } catch (error) {
    console.error('Failed to toggle upvote:', error);
    res.status(500).json({ error: 'Unable to update upvote.' });
  }
});

// Teacher or Admin reply to a doubt
router.post(
  '/doubts/:id/responses',
  requireAuth,
  requireRoles('teacher', 'admin'),
  async (req: AuthRequest, res) => {
    const doubtId = Number(req.params.id);
    const parsed = respondDoubtSchema.safeParse(req.body);
    if (!Number.isInteger(doubtId) || !parsed.success) {
      return res.status(400).json({ error: 'Please write a response of at least 5 characters.' });
    }

    try {
      const doubtRows = await db
        .select()
        .from(doubts)
        .where(eq(doubts.id, doubtId))
        .limit(1);

      if (doubtRows.length === 0) {
        return res.status(404).json({ error: 'Doubt not found.' });
      }

      const targetDoubt = doubtRows[0];

      const [responseRow] = await db
        .insert(doubtResponses)
        .values({
          doubtId,
          responderId: req.dbUser!.id,
          content: parsed.data.content,
          isPinned: parsed.data.pinResponse ?? false,
          isOfficial: true,
        })
        .returning();

      const nextStatus = parsed.data.markResolved ? 'resolved' : 'answered';

      await db
        .update(doubts)
        .set({
          status: nextStatus,
          isPinned: parsed.data.pinResponse ? true : targetDoubt.isPinned,
          updatedAt: new Date(),
        })
        .where(eq(doubts.id, doubtId));

      // Notify the student who asked the doubt privately
      if (targetDoubt.authorId !== req.dbUser!.id) {
        await db.insert(notifications).values({
          userId: targetDoubt.authorId,
          title: 'Your doubt received an explanation',
          message: `${req.dbUser!.fullName} answered "${targetDoubt.title}".`,
          category: 'doubt',
          linkTab: 'doubts',
        });
      }

      broadcastEvent('doubt:updated', { doubtId });
      res.status(201).json({ response: responseRow, status: nextStatus });
    } catch (error) {
      console.error('Failed to post doubt response:', error);
      res.status(500).json({ error: 'Unable to post explanation.' });
    }
  }
);

// Update doubt status or pin state (Teacher / Admin)
router.patch(
  '/doubts/:id',
  requireAuth,
  requireRoles('teacher', 'admin'),
  async (req: AuthRequest, res) => {
    const doubtId = Number(req.params.id);
    const parsed = updateDoubtSchema.safeParse(req.body);
    if (!Number.isInteger(doubtId) || !parsed.success) {
      return res.status(400).json({ error: 'Invalid doubt update payload.' });
    }

    try {
      const updates: Partial<typeof doubts.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (parsed.data.status !== undefined) updates.status = parsed.data.status;
      if (parsed.data.isPinned !== undefined) updates.isPinned = parsed.data.isPinned;

      const [updated] = await db
        .update(doubts)
        .set(updates)
        .where(eq(doubts.id, doubtId))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Doubt not found.' });
      }

      broadcastEvent('doubt:updated', { doubtId });
      res.json({ doubt: updated });
    } catch (error) {
      console.error('Failed to update doubt:', error);
      res.status(500).json({ error: 'Unable to update doubt.' });
    }
  }
);

// Topic grouping and FAQ analytics for Teachers & Admins
router.get(
  '/doubts/analytics',
  requireAuth,
  requireRoles('teacher', 'admin'),
  async (_req: AuthRequest, res) => {
    try {
      const allDoubts = await db.select().from(doubts);
      const topicMap = new Map<
        string,
        {
          topic: string;
          subject: string;
          total: number;
          pending: number;
          resolved: number;
          totalUpvotes: number;
        }
      >();

      for (const d of allDoubts) {
        const key = `${d.subject}::${d.topic}`;
        const existing = topicMap.get(key) ?? {
          topic: d.topic,
          subject: d.subject,
          total: 0,
          pending: 0,
          resolved: 0,
          totalUpvotes: 0,
        };
        existing.total += 1;
        if (d.status === 'pending') existing.pending += 1;
        if (d.status === 'resolved') existing.resolved += 1;
        existing.totalUpvotes += d.upvotesCount;
        topicMap.set(key, existing);
      }

      const groupedTopics = Array.from(topicMap.values()).sort(
        (a, b) => b.totalUpvotes + b.total * 3 - (a.totalUpvotes + a.total * 3)
      );

      res.json({ groupedTopics });
    } catch (error) {
      console.error('Failed to aggregate doubt analytics:', error);
      res.status(500).json({ error: 'Unable to analyze doubt topics.' });
    }
  }
);

export default router;
