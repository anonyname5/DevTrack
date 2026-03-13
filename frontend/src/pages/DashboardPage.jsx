import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { clearToken } from '../lib/authStorage'
import ToastStack from '../components/ToastStack'
import LoadingOverlay from '../components/LoadingOverlay'
import { useOrganization } from '../context/OrganizationContext'

function DashboardPage() {
  const navigate = useNavigate()
  const { currentOrg, organizations, selectOrganization, createOrganization, loading: orgLoading } = useOrganization()
  const [projects, setProjects] = useState([])
  const [newProjectName, setNewProjectName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [error, setError] = useState('')
  const [toasts, setToasts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false)

  function showToast(message, type = 'success') {
    const toastId = Date.now() + Math.random()
    setToasts((currentToasts) => [...currentToasts, { id: toastId, message, type }])
    window.setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId))
    }, 3000)
  }

  const loadProjects = useCallback(async () => {
    if (!currentOrg) return
    
    setError('')
    setIsLoading(true)

    try {
      const response = await apiClient.get('/api/projects', {
        params: { organizationId: currentOrg.id }
      })
      if (Array.isArray(response.data)) {
        setProjects(response.data)
      } else {
        setProjects([])
        setError('Unexpected projects response format.')
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message ?? 'Failed to load projects.')
    } finally {
      setIsLoading(false)
    }
  }, [navigate, currentOrg])

  useEffect(() => {
    if (currentOrg) {
      loadProjects()
    } else if (!orgLoading && organizations.length === 0) {
        setIsLoading(false) // No orgs, stop loading
    }
  }, [loadProjects, currentOrg, orgLoading, organizations.length])

  async function handleCreateProject(event) {
    event.preventDefault()
    if (!currentOrg) return

    setError('')
    setIsSubmitting(true)

    try {
      await apiClient.post('/api/projects', { 
        name: newProjectName,
        organizationId: currentOrg.id
      })
      setNewProjectName('')
      await loadProjects()
      showToast('Project created successfully.')
    } catch (requestError) {
      setError(requestError?.response?.data?.message ?? 'Failed to create project.')
      showToast('Unable to create project.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCreateOrg() {
    const name = prompt("Enter organization name:")
    if (name) {
      try {
        await createOrganization(name)
        showToast("Organization created")
      } catch (error) {
        console.error(error)
        showToast("Failed to create organization", "error")
      }
    }
  }

  function handleLogout() {
    setIsLoggingOut(true)
    // Simulate a brief delay for better UX
    setTimeout(() => {
      clearToken()
      navigate('/login')
    }, 800)
  }

  function handleOrgSelect(orgId) {
    selectOrganization(orgId)
    setIsOrgDropdownOpen(false)
  }

  function handleCreateOrgClick() {
    setIsOrgDropdownOpen(false)
    handleCreateOrg()
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

  if (orgLoading) {
      return <div className="page workspace-page">Loading workspace...</div>
  }

  return (
    <main className="page workspace-page">
      <LoadingOverlay isLoading={isLoggingOut} message="Logging out..." />
      <section className="workspace-shell">
        <header className="workspace-header">
          <div>
            <h1>Workspace dashboard</h1>
            <p className="page-copy">
              Review active initiatives, monitor completion trends, and manage delivery from one place.
            </p>
          </div>
          <div className="workspace-actions">
            <div className="org-control-group">
              <div className="org-dropdown-wrapper">
                <button 
                  className="org-avatar-btn" 
                  onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                  title="Switch organization"
                >
                  {currentOrg?.name?.charAt(0).toUpperCase() || '?'}
                </button>
                
                {isOrgDropdownOpen && (
                  <>
                    <div className="org-dropdown-backdrop" onClick={() => setIsOrgDropdownOpen(false)} />
                    <div className="org-dropdown-menu">
                      <div className="org-dropdown-header">
                        <span className="muted">Switch Organization</span>
                      </div>
                      <ul className="org-dropdown-list">
                        {organizations.map(org => (
                          <li key={org.id}>
                            <button 
                              className={`org-dropdown-item ${currentOrg?.id === org.id ? 'active' : ''}`}
                              onClick={() => handleOrgSelect(org.id)}
                            >
                              {org.name}
                              {currentOrg?.id === org.id && (
                                <span className="check-icon">✓</span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                      <div className="org-dropdown-footer">
                        <button 
                          className="org-dropdown-action"
                          onClick={() => navigate('/organization/settings')}
                        >
                          Organization Settings
                        </button>
                        <button 
                          className="org-dropdown-action"
                          onClick={handleCreateOrgClick}
                        >
                          + Create New Organization
                        </button>
                        <button 
                          className="org-dropdown-action danger-text"
                          onClick={handleLogout}
                        >
                          Log out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
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
