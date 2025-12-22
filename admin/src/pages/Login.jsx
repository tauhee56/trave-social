import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import '../styles/Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // TODO: Replace with actual Firebase/backend authentication
      // For now, accept any email/password with 'admin' role
      if (email && password) {
        const mockUser = { uid: 'admin', email, role: 'admin' };
        const mockToken = 'mock-jwt-token'; // Replace with real JWT
        setAuth(mockUser, mockToken);
        toast.success('Logged in successfully');
        navigate('/');
      } else {
        toast.error('Please enter email and password');
      }
    } catch (err) {
      toast.error('Login failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Admin Panel</h1>
        <p>Sign in to your admin account</p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <p className="login-note">Note: Implement proper Firebase/backend authentication</p>
      </div>
    </div>
  );
}
