import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { clearToken } from '../lib/authStorage'

function ProjectDetailPage() {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const numericProjectId = useMemo(() => Number(projectId), [projectId])

  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleUnauthorized = useCallback(() => {
    clearToken()
    navigate('/login')
  }, [navigate])

  const loadProjectAndTasks = useCallback(async () => {
    if (!Number.isFinite(numericProjectId)) {
      setError('Invalid project ID.')
      setIsLoading(false)
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const [projectsResponse, tasksResponse] = await Promise.all([
        apiClient.get('/api/projects'),
        apiClient.get(`/api/projects/${numericProjectId}/tasks`),
      ])

      if (!Array.isArray(projectsResponse.data) || !Array.isArray(tasksResponse.data)) {
        setProject(null)
        setTasks([])
        setError('Unexpected response format.')
        return
      }

      const selectedProject = projectsResponse.data.find(
        (item) => item.id === numericProjectId,
      )

      if (!selectedProject) {
        setProject(null)
        setTasks([])
        setError('Project not found.')
        return
      }

      setProject(selectedProject)
      setTasks(tasksResponse.data)
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        handleUnauthorized()
        return
      }
      setError(
        requestError?.response?.data?.message ?? 'Failed to load project details.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [handleUnauthorized, numericProjectId])

  useEffect(() => {
    loadProjectAndTasks()
  }, [loadProjectAndTasks])

  async function handleCreateTask(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await apiClient.post(`/api/projects/${numericProjectId}/tasks`, {
        title: newTaskTitle,
      })
      setNewTaskTitle('')
      await loadProjectAndTasks()
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        handleUnauthorized()
        return
      }
      setError(requestError?.response?.data?.message ?? 'Failed to create task.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleToggleTask(taskId, isCompleted) {
    setError('')

    try {
      await apiClient.patch(`/api/tasks/${taskId}/complete`, {
        isCompleted: !isCompleted,
      })
      await loadProjectAndTasks()
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        handleUnauthorized()
        return
      }
      setError(requestError?.response?.data?.message ?? 'Failed to update task.')
    }
  }

  async function handleEditTask(taskId, currentTitle) {
    const updatedTitle = prompt('Update task title:', currentTitle)
    if (!updatedTitle || updatedTitle.trim() === currentTitle) {
      return
    }

    setError('')
    try {
      await apiClient.put(`/api/tasks/${taskId}`, { title: updatedTitle.trim() })
      await loadProjectAndTasks()
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        handleUnauthorized()
        return
      }
      setError(requestError?.response?.data?.message ?? 'Failed to update task.')
    }
  }

  async function handleDeleteTask(taskId) {
    const confirmed = confirm('Delete this task?')
    if (!confirmed) {
      return
    }

    setError('')
    try {
      await apiClient.delete(`/api/tasks/${taskId}`)
      await loadProjectAndTasks()
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        handleUnauthorized()
        return
      }
      setError(requestError?.response?.data?.message ?? 'Failed to delete task.')
    }
  }

  async function handleEditProject() {
    if (!project) {
      return
    }

    const updatedName = prompt('Update project name:', project.name)
    if (!updatedName || updatedName.trim() === project.name) {
      return
    }

    setError('')
    try {
      await apiClient.put(`/api/projects/${project.id}`, { name: updatedName.trim() })
      await loadProjectAndTasks()
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        handleUnauthorized()
        return
      }
      setError(requestError?.response?.data?.message ?? 'Failed to update project.')
    }
  }

  async function handleDeleteProject() {
    if (!project) {
      return
    }

    const confirmed = confirm('Delete this project and all tasks?')
    if (!confirmed) {
      return
    }

    setError('')
    try {
      await apiClient.delete(`/api/projects/${project.id}`)
      navigate('/dashboard')
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        handleUnauthorized()
        return
      }
      setError(requestError?.response?.data?.message ?? 'Failed to delete project.')
    }
  }

  return (
    <main className="page">
      <section className="card wide">
        <div className="row">
          <Link className="link-button ghost" to="/dashboard">
            Back
          </Link>
          <button type="button" className="danger" onClick={handleDeleteProject}>
            Delete project
          </button>
        </div>

        <div className="row section-top">
          <h1>{project?.name ?? 'Project'}</h1>
          <button type="button" onClick={handleEditProject}>
            Edit project
          </button>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <form className="row section-top" onSubmit={handleCreateTask}>
          <input
            type="text"
            placeholder="New task title"
            value={newTaskTitle}
            onChange={(event) => setNewTaskTitle(event.target.value)}
            required
          />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add task'}
          </button>
        </form>

        {isLoading ? (
          <p>Loading tasks...</p>
        ) : (
          <ul className="list section-top">
            {tasks.map((task) => (
              <li key={task.id}>
                <div className="row">
                  <label className="task-row">
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      onChange={() => handleToggleTask(task.id, task.isCompleted)}
                    />
                    <span className={task.isCompleted ? 'task-done' : ''}>{task.title}</span>
                  </label>
                  <div className="row">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => handleEditTask(task.id, task.title)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {tasks.length === 0 ? <li>No tasks yet.</li> : null}
          </ul>
        )}
      </section>
    </main>
  )
}

export default ProjectDetailPage
