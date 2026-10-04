import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import QuizMode from './QuizMode';
import { mockApi, renderPage, testUser } from '../test/utils';

const story = {
  id: 'story-1',
  title: 'Token-bucket rate limiter',
  explanation: 'Each client gets a bucket that refills at a fixed rate; an empty bucket means a 429.',
  sourceProject: 'API Gateway',
  userId: 'user-1',
  codeSnippet: 'const bucket = new Map();',
  category: 'Backend',
  confidenceLevel: 'Okay',
  createdAt: '2026-09-01T00:00:00Z',
  lastReviewedAt: null,
  nextReviewAt: null,
  updatedAt: '2026-09-01T00:00:00Z',
};

function quizApi() {
  let served = 0;
  return mockApi({
    'GET /api/auth/me': { body: testUser },
    // First request serves the story; after a rating the queue is empty.
    'GET /api/story/quiz': () => (served++ === 0
      ? { body: { story, dueCount: 1, totalStories: 1, nextDueAt: null } }
      : { body: { story: null, dueCount: 0, totalStories: 1, nextDueAt: '2026-10-10T00:00:00Z' } }),
    'POST /api/story/story-1/review': { body: { ...story, confidenceLevel: 'Solid' } },
  });
}

describe('QuizMode', () => {
  it('reveals with R and records a rating with 1, then loads the next story', async () => {
    const { calls } = quizApi();
    renderPage(<QuizMode />, { route: '/story-bank/quiz' });

    expect(await screen.findByRole('heading', { name: story.title })).toBeInTheDocument();
    expect(screen.queryByTestId('quiz-nailed')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'r' });
    expect(await screen.findByTestId('quiz-nailed')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: '1' });
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/api/story/story-1/review')).toBe(true));
    const review = calls.find((c) => c.path === '/api/story/story-1/review');
    expect(review?.body).toEqual({ rating: 'NailedIt' });
    await waitFor(() => expect(calls.filter((c) => c.path.startsWith('/api/story/quiz'))).toHaveLength(2));
  });

  it('ignores the shortcut keys while typing an answer', async () => {
    quizApi();
    renderPage(<QuizMode />, { route: '/story-bank/quiz' });

    const answer = await screen.findByTestId('quiz-answer-input');
    await userEvent.type(answer, 'r is a letter in my answer');

    expect(answer).toHaveValue('r is a letter in my answer');
    expect(screen.queryByTestId('quiz-nailed')).not.toBeInTheDocument();
  });

  it('rates with the buttons as well as the keys', async () => {
    const { calls } = quizApi();
    renderPage(<QuizMode />, { route: '/story-bank/quiz' });

    await userEvent.click(await screen.findByTestId('quiz-reveal-btn'));
    await userEvent.click(await screen.findByTestId('quiz-panic'));

    await waitFor(() => expect(calls.find((c) => c.path === '/api/story/story-1/review')?.body).toEqual({ rating: 'BlankPanic' }));
  });
});
