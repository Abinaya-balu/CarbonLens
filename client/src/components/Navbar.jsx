import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium ${
      isActive ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-green-600 text-white grid place-items-center font-semibold">CL</div>
          <div className="leading-tight">
            <div className="font-semibold">CarbonLens</div>
            <div className="text-xs text-gray-500">Passive CO₂ tracker</div>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <NavLink to="/dashboard" className={navClass}>
            Dashboard
          </NavLink>
          <NavLink to="/activities" className={navClass}>
            Activities
          </NavLink>
          <NavLink to="/history" className={navClass}>
            History
          </NavLink>
          <NavLink to="/system" className={navClass}>
            System
          </NavLink>
          <NavLink to="/profile" className={navClass}>
            Profile
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <div className="text-sm font-medium text-gray-900">{user?.name || 'User'}</div>
            <div className="text-xs text-gray-500">{user?.email}</div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

