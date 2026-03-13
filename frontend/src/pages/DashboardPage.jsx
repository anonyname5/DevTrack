import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { clearToken } from '../lib/authStorage'
import ToastStack from '../components/ToastStack'
import LoadingOverlay from '../components/LoadingOverlay'
import { useOrganization } from '../context/OrganizationContext'

function DashboardPage() {
  const TASK_STATUS_LABELS = {
    0: 'Backlog',
    1: 'To Do',
    2: 'In Progress',
    3: 'Review',
    4: 'Done',
  }

  const navigate = useNavigate()
  const { currentOrg, organizations, selectOrganization, createOrganization, loading: orgLoading } = useOrganization()
  const [projects, setProjects] = useState([])
  const [myTasks, setMyTasks] = useState([])
  const [newProjectName, setNewProjectName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [myTaskFilter, setMyTaskFilter] = useState('all')
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
  }, [currentOrg])

  const loadMyTasks = useCallback(async () => {
    if (!currentOrg) return

    try {
      const response = await apiClient.get('/api/tasks/my', {
        params: { organizationId: currentOrg.id },
      })
      setMyTasks(Array.isArray(response.data) ? response.data : [])
    } catch {
      setMyTasks([])
    }
  }, [currentOrg])

  useEffect(() => {
    if (currentOrg) {
      loadProjects()
      loadMyTasks()
    } else if (!orgLoading && organizations.length === 0) {
        setIsLoading(false) // No orgs, stop loading
    }
  }, [loadProjects, loadMyTasks, currentOrg, orgLoading, organizations.length])

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

  function getSortIndicator(key) {
    return sortBy === key ? ' ↓' : ''
  }

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

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const endOfToday = new Date(startOfToday)
  endOfToday.setDate(endOfToday.getDate() + 1)

  const isTaskOverdue = (task) => {
    if (!task.dueDate || task.status === 4) return false
    return new Date(task.dueDate) < startOfToday
  }

  const isTaskDueToday = (task) => {
    if (!task.dueDate || task.status === 4) return false
    const dueDate = new Date(task.dueDate)
    return dueDate >= startOfToday && dueDate < endOfToday
  }

  const overdueMyTasks = myTasks.filter(isTaskOverdue).length

  const dueTodayMyTasks = myTasks.filter(isTaskDueToday).length

  const doneMyTasks = myTasks.filter((task) => task.status === 4).length

  const filteredMyTasks = myTasks.filter((task) => {
    if (myTaskFilter === 'overdue') return isTaskOverdue(task)
    if (myTaskFilter === 'today') return isTaskDueToday(task)
    if (myTaskFilter === 'done') return task.status === 4
    return true
  })

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
            <p className="muted">Tip: Press Ctrl/Cmd + K for global search.</p>
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
              <h2>My Tasks</h2>
              <p className="muted">Tasks assigned to you in this workspace.</p>
            </div>
            <span className="section-badge">{myTasks.length} assigned</span>
          </div>

          <div className="stats-grid" style={{ marginTop: '12px', marginBottom: '14px' }}>
            <article className="stat-card">
              <p>Overdue</p>
              <strong>{overdueMyTasks}</strong>
              <span className="stat-footnote">Past due and not done</span>
            </article>
            <article className="stat-card">
              <p>Due Today</p>
              <strong>{dueTodayMyTasks}</strong>
              <span className="stat-footnote">Action needed today</span>
            </article>
            <article className="stat-card">
              <p>Done</p>
              <strong>{doneMyTasks}</strong>
              <span className="stat-footnote">Completed assigned tasks</span>
            </article>
          </div>

          <div className="task-filter-row">
            <button
              type="button"
              className={`task-filter-btn ${myTaskFilter === 'all' ? 'active' : ''}`}
              onClick={() => setMyTaskFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`task-filter-btn ${myTaskFilter === 'overdue' ? 'active' : ''}`}
              onClick={() => setMyTaskFilter('overdue')}
            >
              Overdue
            </button>
            <button
              type="button"
              className={`task-filter-btn ${myTaskFilter === 'today' ? 'active' : ''}`}
              onClick={() => setMyTaskFilter('today')}
            >
              Due Today
            </button>
            <button
              type="button"
              className={`task-filter-btn ${myTaskFilter === 'done' ? 'active' : ''}`}
              onClick={() => setMyTaskFilter('done')}
            >
              Done
            </button>
          </div>

          <ul className="list project-list">
            {filteredMyTasks.map((task) => (
              <li key={task.id} className="project-list-item">
                <div className="project-card-main">
                  <div className="project-card-content">
                    <div className="project-card-title-row">
                      <strong>{task.title}</strong>
                      <span className="status-pill todo">{TASK_STATUS_LABELS[task.status] ?? 'To Do'}</span>
                    </div>
                    <p className="muted">
                      {task.projectName}
                      {task.dueDate ? ` • Due ${new Date(task.dueDate).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <div className="project-card-meta">
                    <Link className="link-button" to={`/projects/${task.projectId}`}>
                      Open project
                    </Link>
                  </div>
                </div>
              </li>
            ))}
            {filteredMyTasks.length === 0 ? (
              <li className="empty-state">
                {myTasks.length === 0
                  ? 'No assigned tasks in this organization yet.'
                  : 'No assigned tasks match the selected filter.'}
              </li>
            ) : null}
          </ul>
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

          <div className="project-table-wrap">
            <table className="project-table">
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      className="table-sort-btn"
                      onClick={() => setSortBy('name')}
                    >
                      Project{getSortIndicator('name')}
                    </button>
                  </th>
                  <th>Status</th>
                  <th>
                    <button
                      type="button"
                      className="table-sort-btn"
                      onClick={() => setSortBy('progress')}
                    >
                      Progress{getSortIndicator('progress')}
                    </button>
                  </th>
                  <th className="align-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? [1, 2, 3].map((skeletonId) => (
                      <tr key={skeletonId}>
                        <td data-label="Project">
                          <span className="skeleton-line w-50" />
                        </td>
                        <td data-label="Status">
                          <span className="skeleton-line w-35" />
                        </td>
                        <td data-label="Progress">
                          <span className="skeleton-line w-70" />
                        </td>
                        <td data-label="Action" className="align-right">
                          <span className="skeleton-line w-50" style={{ marginLeft: 'auto' }} />
                        </td>
                      </tr>
                    ))
                  : visibleProjects.map((project) => (
                      <tr key={project.id}>
                        <td data-label="Project">
                          <div className="project-table-title">
                            <strong>{project.name}</strong>
                          </div>
                        </td>
                        <td data-label="Status">
                          <span
                            className={`status-pill ${
                              (project.progressPercentage ?? 0) >= 100 ? 'done' : 'todo'
                            }`}
                          >
                            {(project.progressPercentage ?? 0) >= 100 ? 'Completed' : 'In progress'}
                          </span>
                        </td>
                        <td data-label="Progress">
                          <div className="project-table-progress">
                            <span className="project-progress-label">{project.progressPercentage ?? 0}%</span>
                            <div className="progress-track compact">
                              <span
                                className="progress-fill"
                                style={{ width: `${project.progressPercentage ?? 0}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td data-label="Action" className="align-right">
                          <Link className="link-button" to={`/projects/${project.id}`}>
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                {!isLoading && visibleProjects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-state">
                      {projects.length === 0
                        ? 'No projects yet. Create your first project above.'
                        : 'No project matches your current search or sorting criteria.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>
      <ToastStack toasts={toasts} />
    </main>
  )
}

export default DashboardPage
