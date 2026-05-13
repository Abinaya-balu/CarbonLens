import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import History from './pages/History.jsx';
import Activities from './pages/Activities.jsx';
import SystemStatus from './pages/SystemStatus.jsx';
import { useAuth } from './context/AuthContext.jsx';

function Protected({ children }) {
  const { isAuthed } = useAuth();
  if (!isAuthed) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { isAuthed } = useAuth();

  return (
    <div className="min-h-screen">
      {isAuthed ? <Navbar /> : null}
      <Routes>
        <Route path="/" element={<Navigate to={isAuthed ? '/dashboard' : '/login'} replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />
        <Route
          path="/profile"
          element={
            <Protected>
              <Profile />
            </Protected>
          }
        />
        <Route
          path="/history"
          element={
            <Protected>
              <History />
            </Protected>
          }
        />
        <Route
          path="/activities"
          element={
            <Protected>
              <Activities />
            </Protected>
          }
        />
        <Route
          path="/system"
          element={
            <Protected>
              <SystemStatus />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

