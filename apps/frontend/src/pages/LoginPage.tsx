import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../lib/auth';
import '../legacy-styles.css';

export function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      auth.login(response.data.token);
      navigate('/dashboard');
    } catch (err) {
      const responseMessage = (err as any)?.response?.data?.message;
      const message = responseMessage
        ? responseMessage
        : (err as any)?.message || 'Login failed. Check your credentials and try again.';
      setError(message);
    }
  };

  return (
    <main style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg)',
      color: 'var(--tx)',
      padding: '16px',
    }}>
      <section style={{
        width: '100%',
        maxWidth: '420px',
        borderRadius: 'var(--rr)',
        border: '1px solid var(--bd)',
        backgroundColor: 'var(--sf)',
        padding: '32px',
        boxShadow: 'var(--sh2)',
      }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <p style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.32em',
            color: 'var(--pm)',
            fontWeight: '800',
            marginBottom: '16px',
          }}>QA Management</p>
          <h1 style={{
            marginTop: '16px',
            fontSize: '32px',
            fontWeight: '700',
            color: 'var(--tx)',
            letterSpacing: '-0.02em',
          }}>Welcome back</h1>
          <p style={{
            marginTop: '12px',
            fontSize: '12px',
            lineHeight: '1.6',
            color: 'var(--mt)',
          }}>Sign in to manage checklists, collaborate with your team, and keep QA workflows running smoothly.</p>
        </div>

        {error && (
          <div style={{
            padding: '12px 14px',
            borderRadius: 'var(--rs)',
            backgroundColor: 'var(--no-l)',
            border: `1px solid var(--no)`,
            color: 'var(--no)',
            fontSize: '12px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--no)',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              marginBottom: '6px',
              color: 'var(--tx)',
            }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--rr)',
                border: '1px solid var(--bd2)',
                backgroundColor: 'var(--bg)',
                color: 'var(--tx)',
                fontSize: '12px',
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              marginBottom: '6px',
              color: 'var(--tx)',
            }}>Password</label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 12px',
                  borderRadius: 'var(--rr)',
                  border: '1px solid var(--bd2)',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--tx)',
                  fontSize: '12px',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--mt)',
                  fontSize: '16px',
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            style={{
              padding: '11px 16px',
              borderRadius: 'var(--rr)',
              border: 'none',
              background: 'linear-gradient(135deg, var(--pm), var(--ac))',
              color: '#fff',
              fontWeight: '600',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(99, 102, 241, 0.24)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.boxShadow = '0 5px 20px rgba(99, 102, 241, 0.38)';
              (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.boxShadow = '0 2px 12px rgba(99, 102, 241, 0.24)';
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            Sign in
          </button>
        </form>

        <p style={{
          marginTop: '24px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--mt)',
        }}>
          New here?{' '}
          <Link to="/register" style={{
            color: 'var(--pm)',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ac)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--pm)')}
          >
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
