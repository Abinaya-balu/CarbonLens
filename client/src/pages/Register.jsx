import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('TN');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, password, region });
      if (!res.data?.success) throw new Error(res.data?.message || 'Register failed');
      login(res.data.data);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Register failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-6">
        <div className="text-lg font-semibold">Create your CarbonLens account</div>
        <div className="text-sm text-gray-500 mt-1">You’ll get a daily CO₂ score and smart nudges.</div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              className="mt-1 w-full border rounded-xl px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
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
            <label className="text-sm font-medium text-gray-700">Region</label>
            <select
              className="mt-1 w-full border rounded-xl px-3 py-2 bg-white"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="TN">TN</option>
              <option value="MH">MH</option>
              <option value="DL">DL</option>
              <option value="KA">KA</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              className="mt-1 w-full border rounded-xl px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={6}
            />
            <div className="mt-1 text-xs text-gray-500">Minimum 6 characters.</div>
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <button
            disabled={loading}
            className="w-full px-4 py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-60"
            type="submit"
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-600">
          Already have an account?{' '}
          <Link className="text-green-700 font-medium hover:underline" to="/login">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}

