import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BoardsPage from './pages/BoardsPage';
import BoardPage from './pages/BoardPage';
import WorkspaceDetailsPage from './pages/WorkspaceDetailsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
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
        <Route path="*" element={<Navigate to="/boards" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
