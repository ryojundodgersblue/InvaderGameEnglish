import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import SelectPage from './pages/SelectPage';
import Ranking from './pages/Ranking';
import PlayPage from './pages/PlayPage';
import ResultPage from './pages/ResultPage';
import AdminPage from './pages/AdminPage';
import { useAuth } from './hooks/useAuth';
import { registerUnauthorizedHandler, AUTH_EXPIRED_MESSAGE } from './utils/apiClient';

// 認証切れ(401)を検知したらセッションを破棄してログイン画面へ誘導する (No139/No140)
function AuthExpiryHandler() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      logout();
      navigate('/logIn', { state: { message: AUTH_EXPIRED_MESSAGE } });
    });
    return () => registerUnauthorizedHandler(null);
  }, [logout, navigate]);

  return null;
}

function App() {
  return (
    <>
      <AuthExpiryHandler />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/logIn" element={<LoginPage />} />
        <Route path="/select" element={<SelectPage />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="/result"   element={<ResultPage />} />
        <Route path="/admin"    element={<AdminPage />} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
