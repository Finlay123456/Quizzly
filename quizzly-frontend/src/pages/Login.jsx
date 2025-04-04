// Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
  
    if (!email || !password) {
      return setError('Please fill in all fields');
    }
  
    try {
      setLoading(true);
      // Call login from AuthContext. Backend handles the verification.
      await login(email, password);

      // store the current user
      localStorage.setItem('quizzlyUser', email);
      console.log("Current user: ", email);

      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to log in. Please try again.');
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Log In to Quizzly</h2>
        <p className="auth-subtitle">Welcome back! Log in to create and play quizzes.</p>
        {error && <div className="auth-error">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input type="email" id="email" className="form-control"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email" required />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input type="password" id="password" className="form-control"
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password" required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        <div className="auth-alternative">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
