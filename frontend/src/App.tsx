import './App.css'
import { Navigate, Route, Routes } from 'react-router-dom'
import JobForm from './components/JobForm'
import Jobs from './pages/Jobs'
import Candidates from './pages/Candidates'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/jobs" replace />} />
      <Route path="/jobs" element={<Jobs />} />
      <Route path="/jobs/new" element={<JobForm />} />
      <Route path="/jobs/:companySlug/:id" element={<Candidates />} />
    </Routes>
  )
}

export default App
