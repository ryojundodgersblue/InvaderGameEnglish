import { Routes, Route } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import SelectPage from './pages/SelectPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/select" element={<SelectPage />} />
    </Routes>
  )
}

export default App
