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
    <main className="page workspace-page">
      <section className="workspace-shell">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Operations overview</p>
            <h1>Workspace dashboard</h1>
            <p className="page-copy">
              Review active initiatives, monitor completion trends, and manage delivery from one place.
            </p>
          </div>
          <div className="workspace-actions">
            <button type="button" className="ghost" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="stats-grid">
          <article className="stat-card">
            <p>Total projects</p>
            <strong>{totalProjects}</strong>
            <span className="stat-footnote">Active workstreams in this workspace</span>
          </article>
          <article className="stat-card">
            <p>Average progress</p>
            <strong>{averageProgress}%</strong>
            <span className="stat-footnote">Average completion across tracked projects</span>
          </article>
          <article className="stat-card">
            <p>Completed</p>
            <strong>{completedProjects}</strong>
            <span className="stat-footnote">Projects delivered to 100% completion</span>
          </article>
        </section>

        <section className="section-card">
          <div className="section-heading">
            <div>
              <h2>Project portfolio</h2>
              <p className="muted">Create, review, and open projects from a single workspace view.</p>
            </div>
            <span className="section-badge">{visibleProjects.length} visible</span>
          </div>

          {error ? <p className="error">{error}</p> : null}

          <div className="dashboard-toolbar">
            <form className="toolbar toolbar-form dashboard-create-form" onSubmit={handleCreateProject}>
              <input
                type="text"
                placeholder="Enter project name"
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                required
              />
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Add project'}
              </button>
            </form>

            <div className="toolbar controls-row dashboard-filters">
              <input
                type="text"
                placeholder="Search projects"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="recent">Newest</option>
                <option value="name">Name</option>
                <option value="progress">Progress</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <ul className="list project-list">
              {[1, 2, 3].map((skeletonId) => (
                <li key={skeletonId} className="skeleton-item project-list-item">
                  <span className="skeleton-line w-50" />
                  <span className="skeleton-line w-70" />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="list project-list">
              {visibleProjects.map((project) => (
                <li key={project.id} className="project-list-item">
                  <div className="project-card-main">
                    <div className="project-card-content">
                      <div className="project-card-title-row">
                        <strong>{project.name}</strong>
                        <span
                          className={`status-pill ${
                            (project.progressPercentage ?? 0) >= 100 ? 'done' : 'todo'
                          }`}
                        >
                          {(project.progressPercentage ?? 0) >= 100 ? 'Completed' : 'In progress'}
                        </span>
                      </div>
                      <p className="muted">Current completion: {project.progressPercentage ?? 0}%</p>
                    </div>
                    <div className="project-card-meta">
                      <span className="project-progress-label">{project.progressPercentage ?? 0}%</span>
                      <div className="progress-track compact">
                        <span
                          className="progress-fill"
                          style={{ width: `${project.progressPercentage ?? 0}%` }}
                        />
                      </div>
                      <Link className="link-button" to={`/projects/${project.id}`}>
                        Open project
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
              {visibleProjects.length === 0 ? (
                <li className="empty-state">
                  {projects.length === 0
                    ? 'No projects yet. Create your first project above.'
                    : 'No project matches your current search or sorting criteria.'}
                </li>
              ) : null}
            </ul>
          )}
        </section>
      </section>
      <ToastStack toasts={toasts} />
    </main>
  )
}

export default DashboardPage
