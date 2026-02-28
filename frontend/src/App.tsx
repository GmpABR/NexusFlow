import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useComputedColorScheme } from '@mantine/core';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BoardsPage from './pages/BoardsPage';
import BoardPage from './pages/BoardPage';
import WorkspaceDetailsPage from './pages/WorkspaceDetailsPage';
import MyTasksPage from './pages/MyTasksPage';
import ProfilePage from './pages/ProfilePage';
import JoinBoardPage from './pages/JoinBoardPage';
import JoinWorkspacePage from './pages/JoinWorkspacePage';
import AppNavbar from './components/AppNavbar';

import { PresenceProvider } from './contexts/PresenceContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  const computedColorScheme = useComputedColorScheme('dark');

  return (
    <PresenceProvider>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: computedColorScheme === 'dark' ? '#0a0a0b' : '#f1f3f5'
      }}>
        <AppNavbar />
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </PresenceProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/boards"
          element={
            <ProtectedRoute>
              <BoardsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspaces/:id"
          element={
            <ProtectedRoute>
              <WorkspaceDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/boards/:id"
          element={
            <ProtectedRoute>
              <BoardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-tasks"
          element={
            <ProtectedRoute>
              <MyTasksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/join/:token" element={<JoinBoardPage />} />
        <Route path="/join/workspace/:token" element={<JoinWorkspacePage />} />
        <Route path="*" element={<Navigate to="/boards" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
