import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import SelectPage from './pages/SelectPage';
import Ranking from './pages/Ranking';
import PlayPage from './pages/PlayPage';
import ResultPage from './pages/ResultPage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
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
  )
}

export default App
