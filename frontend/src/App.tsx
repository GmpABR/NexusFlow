import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BoardsPage from './pages/BoardsPage';
import BoardPage from './pages/BoardPage';
import WorkspaceDetailsPage from './pages/WorkspaceDetailsPage';
import MyTasksPage from './pages/MyTasksPage';
import ProfilePage from './pages/ProfilePage';
import AppNavbar from './components/AppNavbar';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppNavbar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
        {children}
      </div>
    </div>
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
        <Route path="*" element={<Navigate to="/boards" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
