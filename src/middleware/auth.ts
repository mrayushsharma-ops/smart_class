import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';

export type UserRole = 'student' | 'teacher' | 'admin';

export interface DbUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  bio: string | null;
  gradeOrDepartment: string | null;
  leaderboardOptIn: boolean;
  createdAt: Date;
}

export interface AuthRequest extends Request {
  firebaseUid?: string;
  dbUser?: DbUser;
}

export async function getOrCreateDbUser(
  uid: string,
  email: string,
  fullName: string,
  avatarUrl?: string | null,
  preferredRole?: UserRole
): Promise<DbUser> {
  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const safeRole: UserRole =
      preferredRole === 'teacher' || preferredRole === 'admin'
        ? preferredRole
        : 'student';

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        fullName: fullName || email.split('@')[0] || 'Learner',
        avatarUrl: avatarUrl || null,
        role: safeRole,
        gradeOrDepartment:
          safeRole === 'teacher'
            ? 'STEM Faculty'
            : safeRole === 'admin'
              ? 'Academic Operations'
              : 'Grade 12 · Sciences',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          fullName: fullName || email.split('@')[0] || 'Learner',
        },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database user synchronization failed:', error);
    throw new Error('Unable to synchronize user account.', { cause: error });
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token.' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.firebaseUid = decoded.uid;

    const preferredRoleHeader = req.headers['x-preferred-role'];
    const preferredRole =
      preferredRoleHeader === 'teacher' ||
      preferredRoleHeader === 'admin' ||
      preferredRoleHeader === 'student'
        ? preferredRoleHeader
        : undefined;

    const dbUser = await getOrCreateDbUser(
      decoded.uid,
      decoded.email || `${decoded.uid}@smartclassroom.edu`,
      decoded.name || decoded.email?.split('@')[0] || 'Smart Classroom User',
      decoded.picture || null,
      preferredRole
    );

    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error('Auth verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
};

export const requireRoles = (...allowed: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowed.includes(req.dbUser.role as UserRole)) {
      return res.status(403).json({
        error: `Access denied. Requires ${allowed.join(' or ')} role.`,
      });
    }
    next();
  };
};
