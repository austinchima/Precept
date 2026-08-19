export type ConfidenceLevel = 'Panic' | 'Shaky' | 'Okay' | 'Solid' | 'CanTeach';
export type StoryCategory = 'Auth' | 'Database' | 'Ai' | 'ML' | 'DevOps' | 'Frontend' | 'Backend' | 'SystemDesign' | 'Security' | 'Testing' | 'Cloud' | 'Architecture';

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface QuizStoryResponse<T> {
  story: T | null;
  dueCount: number;
  totalStories: number;
  nextDueAt: string | null;
}

export type ReviewResult = 'NailedIt' | 'Partial' | 'BlankPanic';

export interface Story {
  id: string;
  title: string;
  explanation: string;
  sourceProject: string;
  userId: string;
  codeSnippet: string;
  category: StoryCategory;
  confidenceLevel: ConfidenceLevel;
  createdAt: string;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  updatedAt: string;
}

export interface BehavioralStory {
  id: string;
  userId: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string;
  confidenceLevel: ConfidenceLevel;
  createdAt: string;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  updatedAt: string;
}

export type ApplicationStatus = 'Applied' | 'PhoneScreen' | 'Interviewing' | 'Offer' | 'Rejected' | 'Ghosted';

export interface ApplicationEvent {
  id: string;
  status: ApplicationStatus;
  dateOccurred: string;
  notes: string;
}

export interface Application {
  id: string;
  userId: string;
  companyName: string;
  roleTitle: string;
  location: string;
  salaryRange?: string;
  status: ApplicationStatus;
  dateApplied?: string;
  dateLastContact?: string;
  followUpDate: string;
  resumeVersion: string;
  notes: string;
  isRemote: boolean;
  source: string;
  jobDescriptionId?: string;
  events?: ApplicationEvent[];
}

export interface FollowUp {
  id: string;
  company: string;
  task: string;
  dueDate: string;
  isOverdue: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailDigestEnabled?: boolean;
  digestIncludeFollowUps?: boolean;
  digestIncludeReviews?: boolean;
  digestHourUtc?: number;
}

export interface UserContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, passcode: string, rememberMe?: boolean) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, passcode: string, agreedToTerms: boolean) => Promise<void>;
  demoLogin: () => Promise<void>;
  googleLogin: (email: string, firstName?: string, lastName?: string, idToken?: string) => Promise<void>;
  updateProfile: (firstName: string, lastName: string, emailDigestEnabled?: boolean, digestIncludeFollowUps?: boolean, digestIncludeReviews?: boolean, digestHourUtc?: number) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export type SkillProficiency = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export const SKILL_CATEGORIES = [
  'Language',
  'Framework',
  'Library',
  'Database',
  'Tool',
  'Cloud',
  'DevOps',
  'Testing',
  'Mobile',
  'Concept',
] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export interface Skill {
  id: string;
  userId: string;
  name: string;
  category?: string;
  proficiencyLevel: SkillProficiency;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Testimonial {
  id: string;
  userId: string;
  name: string;
  handle: string;
  text: string;
  avatarSrc?: string;
  isApproved: boolean;
  dateSubmitted: string;
}

export interface TestimonialDto {
  name: string;
  handle: string;
  text: string;
  avatarSrc?: string;
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  route: string;
  icon?: string;
}

export interface JobDescription {
  id: string;
  userId: string;
  companyName: string;
  roleTitle: string;
  description: string;
  extractedKeyWords: string[];
  missingKeyWords: string[];
  yourMatchScore: number | null;
  url: string;
  salaryRange?: string;
  location: string;
  isRemote: boolean;
  source: string;
  datePosted: string;
}

export interface DashboardStats {
  storyStats: {
    totalStories: number;
    confidenceBreakdown: Record<string, number>;
    categoryBreakdown: Record<string, number>;
    totalReviewed: number;
    needsReview: number;
  };
  applicationStats: {
    totalApplications: number;
    statusBreakdown: Record<string, number>;
    interviewingCount: number;
    offersCount: number;
    rejectionRate: number;
    responseRate: number;
  };
  jobDescriptionStats: {
    totalJobDescriptions: number;
    averageMatchScore: number;
  };
}

export interface SessionInfo {
  id: string;
  deviceInfo: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface MockQuestionResponse {
  question: string;
  category: string;
  focusArea: string;
  contextTips: string;
}

export interface StarBreakdown {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface MockInterviewEvaluation {
  score: number;
  starBreakdown: StarBreakdown;
  strengths: string[];
  areasForImprovement: string[];
  modelAnswer: string;
  deliveryFeedback: string;
}

