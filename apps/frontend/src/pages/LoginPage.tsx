import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../lib/auth';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Alert } from '../components/Alert';

export function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      auth.login(response.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError('Login failed. Check your credentials and try again.');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-16 text-slate-100">
      <section className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-slate-900/95 p-10 shadow-xl shadow-slate-950/40 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.32em] text-brand-300">QA Management</p>
          <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Welcome back</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Sign in to manage checklists, collaborate with your team, and keep QA workflows running smoothly.</p>
        </div>

        {error && <Alert variant="danger" title="Login error" message={error} onClose={() => setError('')} />}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
          <Button type="submit" fullWidth>
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          New here?{' '}
          <Link className="text-brand-300 transition hover:text-brand-200" to="/register">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
