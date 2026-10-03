import type { LucideIcon } from 'lucide-react';
import { BookOpen, Briefcase, Gauge, Layers, LayoutGrid, Mic, ScanText } from 'lucide-react';

export interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  description: string;
  group: 'Overview' | 'Prepare' | 'Search';
  testId: string;
}

export const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid, description: 'Reviews due, pipeline and next steps', group: 'Overview', testId: 'nav-dashboard' },
  { name: 'STAR Bank', path: '/story-bank', icon: BookOpen, description: 'Technical and behavioral stories', group: 'Prepare', testId: 'nav-star-bank' },
  { name: 'Quiz Mode', path: '/story-bank/quiz', icon: Layers, description: 'Drill stories that are due', group: 'Prepare', testId: 'nav-quiz-mode' },
  { name: 'Mock Interview', path: '/mock-interview', icon: Mic, description: 'Practise answers out loud', group: 'Prepare', testId: 'nav-mock-interview' },
  { name: 'Applications', path: '/applications', icon: Briefcase, description: 'Your job pipeline', group: 'Search', testId: 'nav-applications' },
  { name: 'JD Matcher', path: '/jd-matcher', icon: ScanText, description: 'Check a job description against your skills', group: 'Search', testId: 'nav-jd-matcher' },
  { name: 'Readiness', path: '/readiness', icon: Gauge, description: 'Skill coverage by category', group: 'Search', testId: 'nav-readiness' },
];
