import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import { classrooms, doubts, quizzes, users } from '../../db/schema.ts';
import {
  ensureAcademicSeedData,
  ensureStarterEnrollmentForUser,
} from '../../db/seed.ts';
import { type AuthRequest, requireAuth } from '../../middleware/auth.ts';
import { issueSseTicket } from '../../lib/realtime.ts';

const router = Router();

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(240).optional(),
  gradeOrDepartment: z.string().trim().max(80).optional(),
  leaderboardOptIn: z.boolean().optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(['student', 'teacher', 'admin']),
});

// Public platform summary stats for the landing page
router.get('/public/stats', async (_req, res) => {
  try {
    await ensureAcademicSeedData();

    const [[classCount], [doubtCount], [quizCount], [userCount]] =
      await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(classrooms),
        db.select({ count: sql<number>`count(*)::int` }).from(doubts),
        db.select({ count: sql<number>`count(*)::int` }).from(quizzes),
        db.select({ count: sql<number>`count(*)::int` }).from(users),
      ]);

    res.json({
      classrooms: classCount?.count ?? 0,
      doubtsResolvedOrAsked: doubtCount?.count ?? 0,
      activeQuizzes: quizCount?.count ?? 0,
      learnersAndFaculty: userCount?.count ?? 0,
    });
  } catch (error) {
    console.error('Failed to fetch public stats:', error);
    res.status(500).json({ error: 'Unable to load platform summary.' });
  }
});

// Authenticated user profile + starter enrollment check
router.get('/auth/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.dbUser!;
    await ensureStarterEnrollmentForUser(user.id, user.role);

    const refreshed = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    res.json({ user: refreshed[0] ?? user });
  } catch (error) {
    console.error('Failed to load user profile:', error);
    res.status(500).json({ error: 'Unable to load your profile.' });
  }
});

// Update profile fields (name, bio, department, leaderboard opt-in)
router.patch('/auth/profile', requireAuth, async (req: AuthRequest, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'Invalid profile data.', details: parsed.error.flatten() });
  }

  try {
    const updates: Partial<typeof users.$inferInsert> = {};
    if (parsed.data.fullName !== undefined) updates.fullName = parsed.data.fullName;
    if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio;
    if (parsed.data.gradeOrDepartment !== undefined) {
      updates.gradeOrDepartment = parsed.data.gradeOrDepartment;
    }
    if (parsed.data.leaderboardOptIn !== undefined) {
      updates.leaderboardOptIn = parsed.data.leaderboardOptIn;
    }

    const updated = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, req.dbUser!.id))
      .returning();

    res.json({ user: updated[0] });
  } catch (error) {
    console.error('Failed to update profile:', error);
    res.status(500).json({ error: 'Unable to update profile.' });
  }
});

// Update workspace role (enables seamless onboarding & multi-role evaluation)
router.patch('/auth/role', requireAuth, async (req: AuthRequest, res) => {
  const parsed = updateRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid role selected.' });
  }

  try {
    const newRole = parsed.data.role;
    const updated = await db
      .update(users)
      .set({
        role: newRole,
        gradeOrDepartment:
          newRole === 'teacher'
            ? 'Faculty & Curriculum'
            : newRole === 'admin'
              ? 'Platform Administration'
              : 'Grade 12 · Sciences',
      })
      .where(eq(users.id, req.dbUser!.id))
      .returning();

    if (newRole === 'student') {
      await ensureStarterEnrollmentForUser(req.dbUser!.id, 'student');
    }

    res.json({ user: updated[0] });
  } catch (error) {
    console.error('Failed to switch role:', error);
    res.status(500).json({ error: 'Unable to update workspace role.' });
  }
});

// Issue short-lived single-use SSE ticket so Firebase ID tokens never appear in URLs
router.post('/auth/sse-ticket', requireAuth, async (req: AuthRequest, res) => {
  try {
    const ticket = issueSseTicket(req.dbUser!.id, req.dbUser!.role);
    res.json({ ticket });
  } catch (error) {
    console.error('Failed to issue SSE ticket:', error);
    res.status(500).json({ error: 'Unable to initialize live sync.' });
  }
});

export default router;
