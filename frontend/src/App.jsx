import { Navigate, Route, Routes } from 'react-router-dom'
import { getToken } from './lib/authStorage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import OrganizationSettingsPage from './pages/OrganizationSettingsPage'
import AcceptInvitePage from './pages/AcceptInvitePage'
import GlobalSearchPalette from './components/GlobalSearchPalette'

function ProtectedRoute({ children }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organization/settings"
          element={
            <ProtectedRoute>
              <OrganizationSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <ProtectedRoute>
              <ProjectDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
      </Routes>
      <GlobalSearchPalette />
    </>
  )
}

export default App
