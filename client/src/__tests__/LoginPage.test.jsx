import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth';
import { LoginPage } from '../pages/LoginPage';

const renderPage = () => render(<AuthProvider><LoginPage /></AuthProvider>);

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('LoginPage', () => {
  it('stores the token after a successful sign-in', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ token: 'jwt-123', user: { id: '1', name: 'Ali', role: 'customer' } }),
    }));
    renderPage();
    await userEvent.type(screen.getByLabelText('Email'), 'ali@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await vi.waitFor(() => expect(localStorage.getItem('helpdesk.token')).toBe('jwt-123'));
  });

  it('shows the server error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 401, json: () => Promise.resolve({ error: 'Wrong email or password' }),
    }));
    renderPage();
    await userEvent.type(screen.getByLabelText('Email'), 'ali@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password');
  });

  it('switches to registration and shows field errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 400,
      json: () => Promise.resolve({ error: 'Validation failed', details: { password: 'Use at least 8 characters' } }),
    }));
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /create an account/i }));
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Use at least 8 characters')).toBeInTheDocument();
  });
});
