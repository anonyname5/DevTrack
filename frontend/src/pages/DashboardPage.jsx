import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { clearToken } from '../lib/authStorage'
import ToastStack from '../components/ToastStack'

function DashboardPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [newProjectName, setNewProjectName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [error, setError] = useState('')
  const [toasts, setToasts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function showToast(message, type = 'success') {
    const toastId = Date.now() + Math.random()
    setToasts((currentToasts) => [...currentToasts, { id: toastId, message, type }])
    window.setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId))
    }, 3000)
  }

  const loadProjects = useCallback(async () => {
    setError('')

    try {
      const response = await apiClient.get('/api/projects')
      if (Array.isArray(response.data)) {
        setProjects(response.data)
      } else {
        setProjects([])
        setError('Unexpected projects response format.')
      }
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        clearToken()
        navigate('/login')
        return
      }
      setError(requestError?.response?.data?.message ?? 'Failed to load projects.')
    } finally {
      setIsLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  async function handleCreateProject(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await apiClient.post('/api/projects', { name: newProjectName })
      setNewProjectName('')
      await loadProjects()
      showToast('Project created successfully.')
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        clearToken()
        navigate('/login')
        return
      }
      setError(requestError?.response?.data?.message ?? 'Failed to create project.')
      showToast('Unable to create project.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const filteredProjects = projects.filter((project) =>
    project.name?.toLowerCase().includes(normalizedSearchTerm),
  )

  const visibleProjects = [...filteredProjects].sort((left, right) => {
    if (sortBy === 'name') {
      return left.name.localeCompare(right.name)
    }

    if (sortBy === 'progress') {
      return (right.progressPercentage ?? 0) - (left.progressPercentage ?? 0)
    }

    return right.id - left.id
  })

  const totalProjects = projects.length
  const averageProgress =
    totalProjects === 0
      ? 0
      : Math.round(
          projects.reduce((sum, project) => sum + (project.progressPercentage ?? 0), 0) /
            totalProjects,
        )
  const completedProjects = projects.filter(
    (project) => (project.progressPercentage ?? 0) >= 100,
  ).length

  return (
    <main className="page">
      <section className="card wide dashboard-card">
        <div className="row page-header">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>DevTrack Dashboard</h1>
          </div>
          <button type="button" className="ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <div className="stats-grid section-top">
          <article className="stat-card">
            <p>Total projects</p>
            <strong>{totalProjects}</strong>
          </article>
          <article className="stat-card">
            <p>Average progress</p>
            <strong>{averageProgress}%</strong>
          </article>
          <article className="stat-card">
            <p>Completed</p>
            <strong>{completedProjects}</strong>
          </article>
        </div>

        <form className="row section-top" onSubmit={handleCreateProject}>
          <input
            type="text"
            placeholder="New project name"
            value={newProjectName}
            onChange={(event) => setNewProjectName(event.target.value)}
            required
          />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Add project'}
          </button>
        </form>

        {error ? <p className="error">{error}</p> : null}

        <div className="row section-top controls-row">
          <input
            type="text"
            placeholder="Search project by name"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="recent">Newest</option>
            <option value="name">Name</option>
            <option value="progress">Progress</option>
          </select>
        </div>

        {isLoading ? (
          <ul className="list">
            {[1, 2, 3].map((skeletonId) => (
              <li key={skeletonId} className="skeleton-item">
                <span className="skeleton-line w-50" />
                <span className="skeleton-line w-70" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="list">
            {visibleProjects.map((project) => (
              <li key={project.id}>
                <div className="row">
                  <div>
                    <strong>{project.name}</strong>
                    <p className="muted">Progress: {project.progressPercentage ?? 0}%</p>
                    <div className="progress-track">
                      <span
                        className="progress-fill"
                        style={{ width: `${project.progressPercentage ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <Link className="link-button" to={`/projects/${project.id}`}>
                    Open
                  </Link>
                </div>
              </li>
            ))}
            {visibleProjects.length === 0 ? (
              <li className="empty-state">
                {projects.length === 0
                  ? 'No projects yet. Create your first project above.'
                  : 'No project matches your search/filter.'}
              </li>
            ) : null}
          </ul>
        )}
      </section>
      <ToastStack toasts={toasts} />
    </main>
  )
}

export default DashboardPage
