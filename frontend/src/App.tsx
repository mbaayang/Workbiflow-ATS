import './App.css'
import { Navigate, Route, Routes } from 'react-router-dom'
import JobForm from './components/JobForm'
import Jobs from './pages/Jobs'
import Application from './pages/Application'
import Pipeline from './pages/Pipeline'
import Candidates from './pages/Candidates'
import Interviews from './pages/Interviews'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/jobs" replace />} />
      <Route path="/jobs" element={<Jobs />} />
      <Route path="/jobs/new" element={<JobForm />} />
      <Route path="/jobs/:jobId/candidates" element={<Candidates />} />
      <Route path="/interviews" element={<Interviews />} />
      <Route path="/jobs/:jobId/interviews" element={<Interviews />} />
      <Route path="/pipeline" element={<Pipeline />} />
      <Route path="/jobs/:jobId/pipeline" element={<Pipeline />} />
      <Route path="/jobs/:companySlug/:id" element={<Application />} />
    </Routes>
  )
}

export default App
