import { Navigate, Route, Routes } from 'react-router-dom'
import { Helmet } from 'react-helmet'
import { useLocation } from 'react-router-dom'
import { getToken } from './lib/authStorage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import OrganizationSettingsPage from './pages/OrganizationSettingsPage'
import AcceptInvitePage from './pages/AcceptInvitePage'
import GlobalSearchPalette from './components/GlobalSearchPalette'
import NotificationsPage from './pages/NotificationsPage'

function ProtectedRoute({ children }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  const location = useLocation()

  const pageTitle = (() => {
    const path = location.pathname
    if (path === '/login') return 'Login | DevTrack'
    if (path === '/register') return 'Register | DevTrack'
    if (path === '/dashboard' || path === '/') return 'Dashboard | DevTrack'
    if (path === '/organization/settings') return 'Organization Settings | DevTrack'
    if (path === '/notifications') return 'Notifications | DevTrack'
    if (path === '/accept-invite') return 'Accept Invitation | DevTrack'
    if (path.startsWith('/projects/')) return 'Project Details | DevTrack'
    return 'DevTrack'
  })()

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
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
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
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
