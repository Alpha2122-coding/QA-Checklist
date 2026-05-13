import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Alert } from '../components/Alert';

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.post('/auth/register', { name, email, password, role: 'EMPLOYEE' });
      setSuccess('Your account has been created. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError('Registration failed. Please verify your information and try again.');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-16 text-slate-100">
      <section className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-slate-900/95 p-10 shadow-xl shadow-slate-950/40 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.32em] text-brand-300">New account</p>
          <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Create your workspace</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Start tracking quality with modern checklist workflows across your team.</p>
        </div>

        {error && <Alert variant="danger" title="Registration error" message={error} onClose={() => setError('')} />}
        {success && <Alert variant="success" title="Success" message={success} />}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Input
            label="Full name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            required
          />
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
            placeholder="Create a secure password"
            required
          />
          <Button type="submit" fullWidth>
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link className="text-brand-300 transition hover:text-brand-200" to="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
