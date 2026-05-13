import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('demo@carbonlens.in');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (!res.data?.success) throw new Error(res.data?.message || 'Login failed');
      login(res.data.data);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-green-600 text-white grid place-items-center font-semibold">CL</div>
          <div>
            <div className="text-lg font-semibold">Welcome back</div>
            <div className="text-sm text-gray-500">Log in to track your footprint</div>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              className="mt-1 w-full border rounded-xl px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              className="mt-1 w-full border rounded-xl px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <button
            disabled={loading}
            className="w-full px-4 py-2 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:opacity-60"
            type="submit"
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-600">
          New here?{' '}
          <Link className="text-green-700 font-medium hover:underline" to="/register">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

