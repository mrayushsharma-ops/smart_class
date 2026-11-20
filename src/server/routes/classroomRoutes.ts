import crypto from 'crypto';
import { Router } from 'express';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import {
  announcements,
  classroomMemberships,
  classrooms,
  doubts,
  notifications,
  quizzes,
  studyMaterials,
  users,
} from '../../db/schema.ts';
import {
  type AuthRequest,
  requireAuth,
  requireRoles,
} from '../../middleware/auth.ts';
import { broadcastEvent } from '../../lib/realtime.ts';

const router = Router();

const createClassroomSchema = z.object({
  title: z.string().trim().min(3).max(120),
  subject: z.string().trim().min(2).max(60),
  description: z.string().trim().min(10).max(500),
});

const joinClassroomSchema = z.object({
  joinCode: z.string().trim().min(3).max(24),
});

const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3).max(140),
  content: z.string().trim().min(5).max(1500),
  dueDate: z.string().trim().max(32).optional(),
});

const createMaterialSchema = z.object({
  title: z.string().trim().min(3).max(140),
  subject: z.string().trim().min(2).max(60),
  chapter: z.string().trim().min(2).max(100),
  materialType: z.enum(['notes', 'summary', 'important_questions', 'guide']),
  summary: z.string().trim().min(10).max(400),
  content: z.string().trim().min(20).max(10000),
});

function generateJoinCode(subject: string): string {
  const prefix = subject
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 4)
    .toUpperCase()
    .padEnd(3, 'X');
  const suffix = crypto.randomInt(100, 999).toString();
  return `${prefix}-${suffix}`;
}

// List classrooms visible to the logged-in user
router.get('/classrooms', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.dbUser!;

    let classRows = await db
      .select({
        id: classrooms.id,
        title: classrooms.title,
        subject: classrooms.subject,
        description: classrooms.description,
        joinCode: classrooms.joinCode,
        teacherId: classrooms.teacherId,
        createdAt: classrooms.createdAt,
        teacherName: users.fullName,
      })
      .from(classrooms)
      .innerJoin(users, eq(classrooms.teacherId, users.id))
      .orderBy(desc(classrooms.createdAt));

    const memberships = await db
      .select()
      .from(classroomMemberships);

    const enrolledIds = new Set(
      memberships
        .filter((m) => m.userId === user.id)
        .map((m) => m.classroomId)
    );

    if (user.role === 'student') {
      classRows = classRows.filter((c) => enrolledIds.has(c.id));
    }

    const memberCountMap = new Map<number, number>();
    for (const m of memberships) {
      memberCountMap.set(
        m.classroomId,
        (memberCountMap.get(m.classroomId) ?? 0) + 1
      );
    }

    const doubtCounts = await db
      .select({
        classroomId: doubts.classroomId,
        count: sql<number>`count(*)::int`,
      })
      .from(doubts)
      .groupBy(doubts.classroomId);

    const quizCounts = await db
      .select({
        classroomId: quizzes.classroomId,
        count: sql<number>`count(*)::int`,
      })
      .from(quizzes)
      .groupBy(quizzes.classroomId);

    const doubtCountMap = new Map(doubtCounts.map((d) => [d.classroomId, d.count]));
    const quizCountMap = new Map(quizCounts.map((q) => [q.classroomId, q.count]));

    // Also provide discoverable unjoined join codes for students to try joining
    const allClassrooms = await db
      .select({
        id: classrooms.id,
        title: classrooms.title,
        subject: classrooms.subject,
        joinCode: classrooms.joinCode,
      })
      .from(classrooms);

    const availableToJoin = allClassrooms.filter((c) => !enrolledIds.has(c.id));

    res.json({
      classrooms: classRows.map((c) => ({
        ...c,
        studentCount: memberCountMap.get(c.id) ?? 0,
        doubtCount: doubtCountMap.get(c.id) ?? 0,
        quizCount: quizCountMap.get(c.id) ?? 0,
        isOwner: c.teacherId === user.id,
      })),
      availableToJoin,
    });
  } catch (error) {
    console.error('Failed to list classrooms:', error);
    res.status(500).json({ error: 'Unable to load classrooms.' });
  }
});

// Create a new classroom (Teacher / Admin)
router.post(
  '/classrooms',
  requireAuth,
  requireRoles('teacher', 'admin'),
  async (req: AuthRequest, res) => {
    const parsed = createClassroomSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Please complete all classroom fields properly.' });
    }

    try {
      const joinCode = generateJoinCode(parsed.data.subject);
      const [created] = await db
        .insert(classrooms)
        .values({
          title: parsed.data.title,
          subject: parsed.data.subject,
          description: parsed.data.description,
          joinCode,
          teacherId: req.dbUser!.id,
        })
        .returning();

      broadcastEvent('classroom:updated', { classroomId: created.id });
      res.status(201).json({ classroom: created });
    } catch (error) {
      console.error('Failed to create classroom:', error);
      res.status(500).json({ error: 'Unable to create classroom.' });
    }
  }
);

// Join a classroom using a join code
router.post('/classrooms/join', requireAuth, async (req: AuthRequest, res) => {
  const parsed = joinClassroomSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please enter a valid classroom code.' });
  }

  try {
    const code = parsed.data.joinCode.toUpperCase();
    const found = await db
      .select()
      .from(classrooms)
      .where(eq(classrooms.joinCode, code))
      .limit(1);

    if (found.length === 0) {
      return res
        .status(404)
        .json({ error: `No classroom found with code "${code}".` });
    }

    const classroom = found[0];
    const existing = await db
      .select()
      .from(classroomMemberships)
      .where(
        and(
          eq(classroomMemberships.classroomId, classroom.id),
          eq(classroomMemberships.userId, req.dbUser!.id)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res
        .status(409)
        .json({ error: `You are already enrolled in ${classroom.title}.` });
    }

    await db.insert(classroomMemberships).values({
      classroomId: classroom.id,
      userId: req.dbUser!.id,
    });

    await db.insert(notifications).values({
      userId: classroom.teacherId,
      title: 'New student joined classroom',
      message: `${req.dbUser!.fullName} joined ${classroom.title}.`,
      category: 'classroom',
      linkTab: 'classrooms',
    });

    broadcastEvent('classroom:updated', { classroomId: classroom.id });
    res.status(201).json({ classroom });
  } catch (error) {
    console.error('Failed to join classroom:', error);
    res.status(500).json({ error: 'Unable to join classroom right now.' });
  }
});

// Get full classroom detail (roster, announcements, materials)
router.get('/classrooms/:id', requireAuth, async (req: AuthRequest, res) => {
  const classroomId = Number(req.params.id);
  if (!Number.isInteger(classroomId) || classroomId <= 0) {
    return res.status(400).json({ error: 'Invalid classroom ID.' });
  }

  try {
    const found = await db
      .select({
        id: classrooms.id,
        title: classrooms.title,
        subject: classrooms.subject,
        description: classrooms.description,
        joinCode: classrooms.joinCode,
        teacherId: classrooms.teacherId,
        createdAt: classrooms.createdAt,
        teacherName: users.fullName,
      })
      .from(classrooms)
      .innerJoin(users, eq(classrooms.teacherId, users.id))
      .where(eq(classrooms.id, classroomId))
      .limit(1);

    if (found.length === 0) {
      return res.status(404).json({ error: 'Classroom not found.' });
    }

    const [roster, classAnnouncements, classMaterials] = await Promise.all([
      db
        .select({
          membershipId: classroomMemberships.id,
          userId: users.id,
          fullName: users.fullName,
          email: users.email,
          gradeOrDepartment: users.gradeOrDepartment,
          joinedAt: classroomMemberships.joinedAt,
        })
        .from(classroomMemberships)
        .innerJoin(users, eq(classroomMemberships.userId, users.id))
        .where(eq(classroomMemberships.classroomId, classroomId))
        .orderBy(desc(classroomMemberships.joinedAt)),
      db
        .select({
          id: announcements.id,
          title: announcements.title,
          content: announcements.content,
          dueDate: announcements.dueDate,
          createdAt: announcements.createdAt,
          authorName: users.fullName,
        })
        .from(announcements)
        .innerJoin(users, eq(announcements.authorId, users.id))
        .where(eq(announcements.classroomId, classroomId))
        .orderBy(desc(announcements.createdAt)),
      db
        .select({
          id: studyMaterials.id,
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
        .innerJoin(users, eq(studyMaterials.uploaderId, users.id))
        .where(eq(studyMaterials.classroomId, classroomId))
        .orderBy(desc(studyMaterials.createdAt)),
    ]);

    res.json({
      classroom: found[0],
      roster:
        req.dbUser!.role === 'student'
          ? roster.map((r) => ({
              userId: r.userId,
              fullName: r.fullName,
              gradeOrDepartment: r.gradeOrDepartment,
              joinedAt: r.joinedAt,
            }))
          : roster,
      announcements: classAnnouncements,
      materials: classMaterials,
    });
  } catch (error) {
    console.error('Failed to load classroom details:', error);
    res.status(500).json({ error: 'Unable to load classroom details.' });
  }
});

// Remove student from classroom (Teacher / Admin)
router.delete(
  '/classrooms/:id/members/:userId',
  requireAuth,
  requireRoles('teacher', 'admin'),
  async (req: AuthRequest, res) => {
    const classroomId = Number(req.params.id);
    const memberUserId = Number(req.params.userId);
    if (!Number.isInteger(classroomId) || !Number.isInteger(memberUserId)) {
      return res.status(400).json({ error: 'Invalid parameters.' });
    }

    try {
      await db
        .delete(classroomMemberships)
        .where(
          and(
            eq(classroomMemberships.classroomId, classroomId),
            eq(classroomMemberships.userId, memberUserId)
          )
        );
      broadcastEvent('classroom:updated', { classroomId });
      res.json({ removed: true });
    } catch (error) {
      console.error('Failed to remove student:', error);
      res.status(500).json({ error: 'Unable to remove student from classroom.' });
    }
  }
);

// Share announcement in classroom (Teacher / Admin)
router.post(
  '/classrooms/:id/announcements',
  requireAuth,
  requireRoles('teacher', 'admin'),
  async (req: AuthRequest, res) => {
    const classroomId = Number(req.params.id);
    const parsed = createAnnouncementSchema.safeParse(req.body);
    if (!Number.isInteger(classroomId) || !parsed.success) {
      return res.status(400).json({ error: 'Invalid announcement details.' });
    }

    try {
      const [created] = await db
        .insert(announcements)
        .values({
          classroomId,
          authorId: req.dbUser!.id,
          title: parsed.data.title,
          content: parsed.data.content,
          dueDate: parsed.data.dueDate || null,
        })
        .returning();

      const members = await db
        .select({ userId: classroomMemberships.userId })
        .from(classroomMemberships)
        .where(eq(classroomMemberships.classroomId, classroomId));

      if (members.length > 0) {
        await db.insert(notifications).values(
          members.map((m) => ({
            userId: m.userId,
            title: `Announcement: ${parsed.data.title}`,
            message: parsed.data.content.slice(0, 140),
            category: 'announcement',
            linkTab: 'classrooms',
          }))
        );
      }

      broadcastEvent('announcement:created', { classroomId });
      res.status(201).json({ announcement: created });
    } catch (error) {
      console.error('Failed to create announcement:', error);
      res.status(500).json({ error: 'Unable to publish announcement.' });
    }
  }
);

// Upload study material in classroom (Teacher / Admin)
router.post(
  '/classrooms/:id/materials',
  requireAuth,
  requireRoles('teacher', 'admin'),
  async (req: AuthRequest, res) => {
    const classroomId = Number(req.params.id);
    const parsed = createMaterialSchema.safeParse(req.body);
    if (!Number.isInteger(classroomId) || !parsed.success) {
      return res.status(400).json({ error: 'Please fill out all study material fields.' });
    }

    try {
      const [created] = await db
        .insert(studyMaterials)
        .values({
          classroomId,
          uploaderId: req.dbUser!.id,
          title: parsed.data.title,
          subject: parsed.data.subject,
          chapter: parsed.data.chapter,
          materialType: parsed.data.materialType,
          summary: parsed.data.summary,
          content: parsed.data.content,
        })
        .returning();

      const members = await db
        .select({ userId: classroomMemberships.userId })
        .from(classroomMemberships)
        .where(eq(classroomMemberships.classroomId, classroomId));

      if (members.length > 0) {
        await db.insert(notifications).values(
          members.map((m) => ({
            userId: m.userId,
            title: `New study material: ${parsed.data.title}`,
            message: `${parsed.data.chapter} (${parsed.data.subject}) is now available in your Revision Center.`,
            category: 'material',
            linkTab: 'revision',
          }))
        );
      }

      broadcastEvent('material:created', { classroomId, materialId: created.id });
      res.status(201).json({ material: created });
    } catch (error) {
      console.error('Failed to create study material:', error);
      res.status(500).json({ error: 'Unable to upload study material.' });
    }
  }
);

export default router;
