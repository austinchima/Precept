import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import MockInterview from './MockInterview';
import { mockApi, renderPage, testUser } from '../test/utils';

const question = {
  question: 'Tell me about a time you led a migration.',
  category: 'Behavioral',
  focusArea: 'Ownership',
  contextTips: 'Use STAR.',
};

const heuristicEvaluation = {
  score: 70,
  isHeuristic: true,
  starBreakdown: { situation: 'Too short to include much context.', task: 'Not checked by the offline heuristic.', action: 'First-person actions found.', result: 'No number appears in the answer.' },
  strengths: ['It describes actions in the first person.'],
  areasForImprovement: ['Add a measured result if you have one.'],
  modelAnswer: '',
  deliveryFeedback: 'AI feedback was unavailable, so this is an offline check of length, first-person actions and numbers only. Your answer has 9 words.',
};

async function askAndAnswer() {
  await userEvent.click(await screen.findByRole('button', { name: /get a question/i }));
  await screen.findByRole('heading', { name: question.question });
  await userEvent.type(screen.getAllByRole('textbox').at(-1)!, 'I rolled back the deploy and added an alert.');
  await userEvent.click(screen.getByRole('button', { name: /get feedback/i }));
}

describe('MockInterview', () => {
  it('labels offline feedback as a heuristic and shows no model answer', async () => {
    mockApi({
      'GET /api/auth/me': { body: testUser },
      'POST /api/mockinterview/generate-question': { body: question },
      'POST /api/mockinterview/evaluate': { body: heuristicEvaluation },
    });
    renderPage(<MockInterview />, { route: '/mock-interview' });

    await askAndAnswer();

    expect(await screen.findByTestId('mock-heuristic-label')).toHaveTextContent('Offline heuristic, not an AI evaluation');
    expect(screen.getByText('heuristic, out of 100')).toBeInTheDocument();
    expect(screen.queryByText(/model answer/i)).not.toBeInTheDocument();
  });

  it('does not show the heuristic label for an AI evaluation', async () => {
    mockApi({
      'GET /api/auth/me': { body: testUser },
      'POST /api/mockinterview/generate-question': { body: question },
      'POST /api/mockinterview/evaluate': { body: { ...heuristicEvaluation, isHeuristic: false, deliveryFeedback: 'Clear structure.' } },
    });
    renderPage(<MockInterview />, { route: '/mock-interview' });

    await askAndAnswer();

    expect(await screen.findByText('Clear structure.')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-heuristic-label')).not.toBeInTheDocument();
    expect(screen.getByText('out of 100')).toBeInTheDocument();
  });

  it('tells the user when their AI allowance is used up, with the reset time', async () => {
    mockApi({
      'GET /api/auth/me': { body: testUser },
      'POST /api/mockinterview/generate-question': {
        status: 402,
        body: { code: 'limit_reached', feature: 'mock_question', remaining: 0, resetsAt: '2026-10-05T00:00:00Z' },
      },
    });
    renderPage(<MockInterview />, { route: '/mock-interview' });

    await userEvent.click(await screen.findByRole('button', { name: /get a question/i }));

    expect(await screen.findByText(/You have used this AI feature's allowance\. It resets/)).toBeInTheDocument();
  });
});
