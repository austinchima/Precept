import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Dashboard from './Dashboard';
import { mockApi, renderPage, testUser } from '../test/utils';

const page = <T,>(items: T[]) => ({ items, totalCount: items.length, page: 1, pageSize: 25, totalPages: 1, hasNextPage: false });

const story = (id: string) => ({
  id, title: `Story ${id}`, explanation: 'x'.repeat(60), sourceProject: 'P', userId: 'user-1', codeSnippet: '',
  category: 'Backend', confidenceLevel: 'Okay', createdAt: '2026-09-01T00:00:00Z', lastReviewedAt: null, nextReviewAt: null, updatedAt: '2026-09-01T00:00:00Z',
});

describe('Dashboard (M1-F8 regression)', () => {
  it('shows counts from the server, not from the first page of each list', async () => {
    mockApi({
      'GET /api/auth/me': { body: testUser },
      // The server says 35 stories are due and 40 exist, but the paged story list only returns 2 rows.
      'GET /api/dashboard': {
        body: {
          storyStats: { totalStories: 33, totalBehavioralStories: 7, confidenceBreakdown: {}, categoryBreakdown: {}, totalReviewed: 5, needsReview: 35 },
          applicationStats: { totalApplications: 30, activeApplications: 12, statusBreakdown: { Applied: 8, Interviewing: 4, Offer: 1, Rejected: 17 }, interviewingCount: 4, offersCount: 1, rejectionRate: 0, responseRate: 0 },
          jobDescriptionStats: { totalJobDescriptions: 0, averageMatchScore: 0 },
        },
      },
      'GET /api/dashboard/review-queue': {
        body: { total: 35, items: [{ id: 'a', title: 'Panic story', kind: 'Technical', confidenceLevel: 'Panic', nextReviewAt: null }] },
      },
      'GET /api/story': { body: page([story('1'), story('2')]) },
      'GET /api/behavioralstory': { body: page([]) },
      'GET /api/application': { body: page([]) },
      'GET /api/skill': { body: page([]) },
      'GET /api/application/followups-due': { body: { items: [], count: 0 } },
    });

    // Rendered at / because the test router reserves /dashboard as a redirect target.
    renderPage(<Dashboard />, { route: '/' });

    const tile = async (label: string) => (await screen.findByText(label)).closest('a')!;
    expect(within(await tile('Reviews due')).getByText('35')).toBeInTheDocument();
    expect(within(await tile('Active applications')).getByText('12')).toBeInTheDocument();
    expect(within(await tile('Stories banked')).getByText('40')).toBeInTheDocument();
    expect(screen.getByText('30 applications tracked.')).toBeInTheDocument();
    expect(screen.getByText('and 34 more in the drill.')).toBeInTheDocument();
    expect(screen.getByText('Panic story')).toBeInTheDocument();
  });
});
