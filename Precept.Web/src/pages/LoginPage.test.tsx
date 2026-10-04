import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import LoginPage from './LoginPage';
import { mockApi, renderPage, testUser } from '../test/utils';

/** /api/auth/me answers 401 until a login succeeds, like the real API. */
function authApi(loginReply: { status?: number; body?: unknown } = { body: {} }) {
  let signedIn = false;
  return mockApi({
    'GET /api/auth/me': () => (signedIn ? { body: testUser } : { status: 401 }),
    'POST /api/auth/login': () => {
      if ((loginReply.status ?? 200) < 300) signedIn = true;
      return loginReply;
    },
  });
}

describe('LoginPage', () => {
  it('signs in with the typed credentials and goes to the dashboard', async () => {
    const { calls } = authApi();
    renderPage(<LoginPage />, { route: '/login' });

    await userEvent.type(screen.getByTestId('signin-email'), 'ines@example.com');
    await userEvent.type(screen.getByTestId('signin-password'), 'Secret-pass-1!');
    await userEvent.click(screen.getByTestId('signin-submit'));

    expect(await screen.findByText('Dashboard route')).toBeInTheDocument();
    const login = calls.find((c) => c.method === 'POST' && c.path === '/api/auth/login');
    expect(login?.body).toEqual({ email: 'ines@example.com', password: 'Secret-pass-1!', rememberMe: true });
  });

  it('rejects an email without a domain before calling the API', async () => {
    const { calls } = authApi();
    renderPage(<LoginPage />, { route: '/login' });

    await userEvent.type(screen.getByTestId('signin-email'), 'ines@localhost');
    await userEvent.type(screen.getByTestId('signin-password'), 'x');
    await userEvent.click(screen.getByTestId('signin-submit'));

    expect(await screen.findByTestId('signin-error')).toHaveTextContent('Enter a valid email address');
    expect(calls.some((c) => c.path === '/api/auth/login')).toBe(false);
  });

  it('shows the server message when sign-in fails', async () => {
    authApi({ status: 401, body: { message: 'Invalid email or password.' } });
    renderPage(<LoginPage />, { route: '/login' });

    await userEvent.type(screen.getByTestId('signin-email'), 'ines@example.com');
    await userEvent.type(screen.getByTestId('signin-password'), 'wrong');
    await userEvent.click(screen.getByTestId('signin-submit'));

    await waitFor(() => expect(screen.getByTestId('signin-error')).toBeInTheDocument());
    expect(screen.queryByText('Dashboard route')).not.toBeInTheDocument();
  });

  it('opens in sign-up mode from ?mode=signup and requires the terms box', async () => {
    const { calls } = authApi();
    renderPage(<LoginPage />, { route: '/login?mode=signup' });

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    await userEvent.type(screen.getByTestId('signin-firstname'), 'Ines');
    await userEvent.type(screen.getByTestId('signin-lastname'), 'Adeyemi');
    await userEvent.type(screen.getByTestId('signin-email'), 'ines@example.com');
    await userEvent.type(screen.getByTestId('signin-password'), 'Secret-pass-1!');
    await userEvent.click(screen.getByTestId('signin-submit'));

    expect(await screen.findByTestId('signin-error')).toHaveTextContent('Agree to the Terms of Service');
    expect(calls.some((c) => c.path === '/api/auth/register')).toBe(false);
  });
});
