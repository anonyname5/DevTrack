import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { clearToken } from '../lib/authStorage'

function DashboardPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [newProjectName, setNewProjectName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function loadProjects() {
    setError('')

    try {
      const response = await apiClient.get('/api/projects')
      setProjects(response.data)
    } catch (requestError) {
      setError(requestError?.response?.data?.message ?? 'Failed to load projects.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  async function handleCreateProject(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await apiClient.post('/api/projects', { name: newProjectName })
      setNewProjectName('')
      await loadProjects()
    } catch (requestError) {
      setError(requestError?.response?.data?.message ?? 'Failed to create project.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  return (
    <main className="page">
      <section className="card wide">
        <div className="row">
          <h1>DevTrack Dashboard</h1>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <form className="row" onSubmit={handleCreateProject}>
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

        {isLoading ? (
          <p>Loading projects...</p>
        ) : (
          <ul className="list">
            {projects.map((project) => (
              <li key={project.id}>
                <div>
                  <strong>{project.name}</strong>
                  <p className="muted">Progress: {project.progressPercentage ?? 0}%</p>
                </div>
              </li>
            ))}
            {projects.length === 0 ? <li>No projects yet.</li> : null}
          </ul>
        )}
      </section>
    </main>
  )
}

export default DashboardPage
