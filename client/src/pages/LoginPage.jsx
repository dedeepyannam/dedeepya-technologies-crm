import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, ShieldCheck, Lock } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, #1e1b4b 0%, #0f172a 60%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--glass-border)',
        borderRadius: '1rem',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '0.75rem',
            borderRadius: '1rem',
            background: 'rgba(99, 102, 241, 0.15)',
            color: '#818cf8',
            marginBottom: '1rem'
          }}>
            <Building2 size={36} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>ApexCRM</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Enterprise Customer Relationship Management
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger)',
            color: '#f87171',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            fontSize: '0.85rem',
            marginBottom: '1.25rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Work Email</label>
            <input 
              type="email" 
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@crm.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', padding: '0.8rem' }}
            disabled={loading}
          >
            <Lock size={18} />
            <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Don't have an account? </span>
          <Link to="/register" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>Create one now</Link>
        </div>

        {/* Enterprise Role Quick Switcher Helper */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', textAlign: 'center' }}>
            Quick Demo Role Login
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
              type="button" 
              onClick={() => handleQuickLogin('dedeepya@dedeepyatechnologies.com')}
              className="btn btn-secondary" 
              style={{ fontSize: '0.8rem', justifyContent: 'space-between', padding: '0.5rem 0.75rem' }}
            >
              <span>👑 Admin (Dedeepya Yannam)</span>
              <span className="role-tag role-admin">Admin</span>
            </button>

            <button 
              type="button" 
              onClick={() => handleQuickLogin('rahul@dedeepyatechnologies.com')}
              className="btn btn-secondary" 
              style={{ fontSize: '0.8rem', justifyContent: 'space-between', padding: '0.5rem 0.75rem' }}
            >
              <span>👔 Sales Manager (Rahul Sharma)</span>
              <span className="role-tag role-manager">Manager</span>
            </button>

            <button 
              type="button" 
              onClick={() => handleQuickLogin('priya@dedeepyatechnologies.com')}
              className="btn btn-secondary" 
              style={{ fontSize: '0.8rem', justifyContent: 'space-between', padding: '0.5rem 0.75rem' }}
            >
              <span>💼 Sales Executive (Priya Reddy)</span>
              <span className="role-tag role-executive">Executive</span>
            </button>

            <button 
              type="button" 
              onClick={() => handleQuickLogin('arjun@dedeepyatechnologies.com')}
              className="btn btn-secondary" 
              style={{ fontSize: '0.8rem', justifyContent: 'space-between', padding: '0.5rem 0.75rem' }}
            >
              <span>💼 Sales Executive (Arjun Kumar)</span>
              <span className="role-tag role-executive">Executive</span>
            </button>

            <button 
              type="button" 
              onClick={() => handleQuickLogin('sneha@dedeepyatechnologies.com')}
              className="btn btn-secondary" 
              style={{ fontSize: '0.8rem', justifyContent: 'space-between', padding: '0.5rem 0.75rem' }}
            >
              <span>💼 Sales Executive (Sneha Rao)</span>
              <span className="role-tag role-executive">Executive</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
