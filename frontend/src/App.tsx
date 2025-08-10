import { Routes, Route } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import SelectPage from './pages/SelectPage'
import Ranking from './pages/Ranking'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/select" element={<SelectPage />} />
      <Route path="/ranking" element={<Ranking />} />
    </Routes>
  )
}

export default App
