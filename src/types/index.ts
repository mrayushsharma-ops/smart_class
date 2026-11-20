export type UserRole = 'student' | 'teacher' | 'admin';

export type WorkspaceTab =
  | 'dashboard'
  | 'doubts'
  | 'quizzes'
  | 'ai'
  | 'revision'
  | 'visual'
  | 'classrooms'
  | 'admin';

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  bio: string | null;
  gradeOrDepartment: string | null;
  leaderboardOptIn: boolean;
  createdAt: string;
}

export interface ClassroomSummary {
  id: number;
  title: string;
  subject: string;
  description: string;
  joinCode: string;
  teacherId: number;
  teacherName: string;
  studentCount: number;
  doubtCount: number;
  quizCount: number;
  isOwner: boolean;
  createdAt: string;
}

export interface DoubtResponseItem {
  id: number;
  doubtId: number;
  content: string;
  isPinned: boolean;
  isOfficial: boolean;
  createdAt: string;
  responderName: string;
  responderRole: string;
}

export interface DoubtItem {
  id: number;
  classroomId: number;
  classroomTitle: string;
  subject: string;
  topic: string;
  title: string;
  question: string;
  isAnonymous: boolean;
  status: 'pending' | 'answered' | 'resolved';
  isPinned: boolean;
  upvotesCount: number;
  hasUpvoted: boolean;
  isOwnDoubt: boolean;
  authorDisplay: string;
  moderationAuthor?: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  responses: DoubtResponseItem[];
}

export interface QuizSummary {
  id: number;
  classroomId: number;
  classroomTitle: string;
  subject: string;
  teacherId: number;
  teacherName: string;
  title: string;
  topic: string;
  description: string;
  durationMinutes: number;
  totalMarks: number;
  status: 'draft' | 'published' | 'scheduled';
  scheduledFor: string | null;
  questionCount: number;
  attemptCount: number;
  avgClassPercentage: number | null;
  myLatestAttempt: {
    id: number;
    score: number;
    totalMarks: number;
    percentage: number;
    submittedAt: string;
  } | null;
  myBestScore: number | null;
  createdAt: string;
}

export interface QuizQuestionClient {
  id: number;
  questionText: string;
  options: string[];
  marks: number;
  correctIndex?: number;
  explanation?: string;
}

export interface QuizReviewItem {
  id: number;
  questionText: string;
  options: string[];
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  explanation: string;
  marks: number;
}

export interface StudyMaterialItem {
  id: number;
  classroomId: number;
  classroomTitle: string;
  title: string;
  subject: string;
  chapter: string;
  materialType: 'notes' | 'summary' | 'important_questions' | 'guide';
  summary: string;
  content: string;
  createdAt: string;
  uploaderName: string;
  isSaved: boolean;
  isCompleted: boolean;
  lastViewedAt: string | null;
}

export interface FlashcardItem {
  id: number;
  userId: number;
  classroomId: number | null;
  subject: string;
  topic: string;
  front: string;
  back: string;
  mastered: boolean;
  createdAt: string;
}

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  category: string;
  isRead: boolean;
  linkTab: string | null;
  createdAt: string;
}
