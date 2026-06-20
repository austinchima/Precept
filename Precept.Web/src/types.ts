export type ConfidenceLevel = 'Panic' | 'Shaky' | 'Okay' | 'Solid' | 'CanTeach';
export type StoryCategory = 'Auth' | 'Database' | 'Ai' | 'ML' | 'DevOps' | 'Frontend' | 'Backend' | 'SystemDesign' | 'Security' | 'Testing' | 'Cloud' | 'Architecture';

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
  createdAt: string;
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
}

export interface UserContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, passcode: string, rememberMe?: boolean) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, passcode: string) => Promise<void>;
  updateProfile: (firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
}

export type SkillProficiency = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

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
