import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// 1. Users & Profiles (linked to Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  avatarUrl: text('avatar_url'),
  role: text('role').notNull().default('student'), // 'student' | 'teacher' | 'admin'
  bio: text('bio').default(''),
  gradeOrDepartment: text('grade_or_department').default(''),
  leaderboardOptIn: boolean('leaderboard_opt_in').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Classrooms
export const classrooms = pgTable('classrooms', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  description: text('description').notNull(),
  joinCode: text('join_code').notNull().unique(),
  teacherId: integer('teacher_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Classroom Memberships
export const classroomMemberships = pgTable(
  'classroom_memberships',
  {
    id: serial('id').primaryKey(),
    classroomId: integer('classroom_id')
      .references(() => classrooms.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('classroom_user_unique_idx').on(table.classroomId, table.userId),
  ]
);

// 4. Anonymous Doubts (Core Feature)
export const doubts = pgTable('doubts', {
  id: serial('id').primaryKey(),
  classroomId: integer('classroom_id')
    .references(() => classrooms.id, { onDelete: 'cascade' })
    .notNull(),
  authorId: integer('author_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  subject: text('subject').notNull(),
  topic: text('topic').notNull(),
  title: text('title').notNull(),
  question: text('question').notNull(),
  isAnonymous: boolean('is_anonymous').notNull().default(true),
  status: text('status').notNull().default('pending'), // 'pending' | 'answered' | 'resolved'
  isPinned: boolean('is_pinned').notNull().default(false),
  upvotesCount: integer('upvotes_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. Doubt Upvotes (prevents duplicate upvoting per user)
export const doubtUpvotes = pgTable(
  'doubt_upvotes',
  {
    id: serial('id').primaryKey(),
    doubtId: integer('doubt_id')
      .references(() => doubts.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('doubt_upvote_unique_idx').on(table.doubtId, table.userId),
  ]
);

// 6. Doubt Responses
export const doubtResponses = pgTable('doubt_responses', {
  id: serial('id').primaryKey(),
  doubtId: integer('doubt_id')
    .references(() => doubts.id, { onDelete: 'cascade' })
    .notNull(),
  responderId: integer('responder_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  isPinned: boolean('is_pinned').notNull().default(false),
  isOfficial: boolean('is_official').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Quizzes
export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  classroomId: integer('classroom_id')
    .references(() => classrooms.id, { onDelete: 'cascade' })
    .notNull(),
  teacherId: integer('teacher_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  topic: text('topic').notNull(),
  description: text('description').notNull().default(''),
  durationMinutes: integer('duration_minutes').notNull().default(15),
  totalMarks: integer('total_marks').notNull().default(10),
  status: text('status').notNull().default('published'), // 'draft' | 'published' | 'scheduled'
  scheduledFor: timestamp('scheduled_for'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. Quiz Questions
export const quizQuestions = pgTable('quiz_questions', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id')
    .references(() => quizzes.id, { onDelete: 'cascade' })
    .notNull(),
  questionText: text('question_text').notNull(),
  options: jsonb('options').$type<string[]>().notNull(),
  correctIndex: integer('correct_index').notNull(),
  explanation: text('explanation').notNull(),
  marks: integer('marks').notNull().default(1),
  orderIndex: integer('order_index').notNull().default(0),
});

// 9. Quiz Attempts
export const quizAttempts = pgTable('quiz_attempts', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id')
    .references(() => quizzes.id, { onDelete: 'cascade' })
    .notNull(),
  studentId: integer('student_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  answers: jsonb('answers').$type<number[]>().notNull(),
  score: integer('score').notNull(),
  totalMarks: integer('total_marks').notNull(),
  percentage: integer('percentage').notNull(),
  timeSpentSeconds: integer('time_spent_seconds').notNull().default(0),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
});

// 10. Study Materials
export const studyMaterials = pgTable('study_materials', {
  id: serial('id').primaryKey(),
  classroomId: integer('classroom_id')
    .references(() => classrooms.id, { onDelete: 'cascade' })
    .notNull(),
  uploaderId: integer('uploader_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  chapter: text('chapter').notNull(),
  materialType: text('material_type').notNull().default('notes'), // 'notes' | 'summary' | 'important_questions' | 'guide'
  summary: text('summary').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. Revision Progress (Saved, Completed, Recently Viewed)
export const revisionProgress = pgTable(
  'revision_progress',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    materialId: integer('material_id')
      .references(() => studyMaterials.id, { onDelete: 'cascade' })
      .notNull(),
    isSaved: boolean('is_saved').notNull().default(false),
    isCompleted: boolean('is_completed').notNull().default(false),
    lastViewedAt: timestamp('last_viewed_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('revision_user_material_unique_idx').on(
      table.userId,
      table.materialId
    ),
  ]
);

// 12. Flashcards
export const flashcards = pgTable('flashcards', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  classroomId: integer('classroom_id').references(() => classrooms.id, {
    onDelete: 'set null',
  }),
  subject: text('subject').notNull(),
  topic: text('topic').notNull(),
  front: text('front').notNull(),
  back: text('back').notNull(),
  mastered: boolean('mastered').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. Announcements
export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  classroomId: integer('classroom_id')
    .references(() => classrooms.id, { onDelete: 'cascade' })
    .notNull(),
  authorId: integer('author_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  dueDate: text('due_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 14. Notifications
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  category: text('category').notNull(), // 'quiz' | 'announcement' | 'doubt' | 'material' | 'classroom'
  isRead: boolean('is_read').notNull().default(false),
  linkTab: text('link_tab').default('dashboard'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  taughtClassrooms: many(classrooms),
  memberships: many(classroomMemberships),
  doubts: many(doubts),
  doubtResponses: many(doubtResponses),
  quizAttempts: many(quizAttempts),
  flashcards: many(flashcards),
  notifications: many(notifications),
}));

export const classroomsRelations = relations(classrooms, ({ one, many }) => ({
  teacher: one(users, {
    fields: [classrooms.teacherId],
    references: [users.id],
  }),
  memberships: many(classroomMemberships),
  doubts: many(doubts),
  quizzes: many(quizzes),
  materials: many(studyMaterials),
  announcements: many(announcements),
}));

export const doubtsRelations = relations(doubts, ({ one, many }) => ({
  classroom: one(classrooms, {
    fields: [doubts.classroomId],
    references: [classrooms.id],
  }),
  author: one(users, {
    fields: [doubts.authorId],
    references: [users.id],
  }),
  responses: many(doubtResponses),
  upvotes: many(doubtUpvotes),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  classroom: one(classrooms, {
    fields: [quizzes.classroomId],
    references: [classrooms.id],
  }),
  teacher: one(users, {
    fields: [quizzes.teacherId],
    references: [users.id],
  }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
}));
