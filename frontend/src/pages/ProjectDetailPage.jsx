import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { clearToken } from '../lib/authStorage'
import ConfirmModal from '../components/ConfirmModal'
import ToastStack from '../components/ToastStack'

function ProjectDetailPage() {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const numericProjectId = useMemo(() => Number(projectId), [projectId])

  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [taskFilter, setTaskFilter] = useState('all')
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editingTaskTitle, setEditingTaskTitle] = useState('')
  const [isEditingProjectName, setIsEditingProjectName] = useState(false)
  const [projectNameDraft, setProjectNameDraft] = useState('')
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    action: '',
    taskId: null,
  })
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
      showToast('Task created.')
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        handleUnauthorized()
        return
      }
      setError(requestError?.response?.data?.message ?? 'Failed to create task.')
      showToast('Unable to create task.', 'error')
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
      showToast(!isCompleted ? 'Task marked as done.' : 'Task marked as to do.')
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        handleUnauthorized()
        return
      }
      setError(requestError?.response?.data?.message ?? 'Failed to update task.')
      showToast('Unable to update task.', 'error')
    }
  }

  async function handleEditTask(taskId, currentTitle) {
    const updatedTitle = editingTaskTitle.trim()
    if (!updatedTitle || updatedTitle === currentTitle) {
      setEditingTaskId(null)
      setEditingTaskTitle('')
      return
    }

    setError('')
    try {
      await apiClient.put(`/api/tasks/${taskId}`, { title: updatedTitle })
      setEditingTaskId(null)
      setEditingTaskTitle('')
      await loadProjectAndTasks()
      showToast('Task updated.')
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        handleUnauthorized()
        return
      }
      setError(requestError?.response?.data?.message ?? 'Failed to update task.')
      showToast('Unable to update task title.', 'error')
    }
  }

  async function handleDeleteTask(taskId) {
    setError('')
    try {
      await apiClient.delete(`/api/tasks/${taskId}`)
      await loadProjectAndTasks()
      showToast('Task deleted.')
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        handleUnauthorized()
        return
      }
      setError(requestError?.response?.data?.message ?? 'Failed to delete task.')
      showToast('Unable to delete task.', 'error')
    }
  }

  async function handleEditProjectName() {
    if (!project) {
      return
    }

    const updatedName = projectNameDraft.trim()
    if (!updatedName || updatedName === project.name) {
      setIsEditingProjectName(false)
      setProjectNameDraft(project.name)
      return
    }

    setError('')
    try {
      await apiClient.put(`/api/projects/${project.id}`, { name: updatedName })
      setIsEditingProjectName(false)
      await loadProjectAndTasks()
      showToast('Project name updated.')
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        handleUnauthorized()
        return
      }
      setError(requestError?.response?.data?.message ?? 'Failed to update project.')
      showToast('Unable to update project.', 'error')
    }
  }

  async function handleDeleteProject() {
    if (!project) {
      return
    }

    setError('')
    try {
      await apiClient.delete(`/api/projects/${project.id}`)
      showToast('Project deleted.')
      navigate('/dashboard')
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        handleUnauthorized()
        return
      }
      setError(requestError?.response?.data?.message ?? 'Failed to delete project.')
      showToast('Unable to delete project.', 'error')
    }
  }

  function beginEditTask(taskId, currentTitle) {
    setEditingTaskId(taskId)
    setEditingTaskTitle(currentTitle)
  }

  function cancelEditTask() {
    setEditingTaskId(null)
    setEditingTaskTitle('')
  }

  function openDeleteTaskModal(taskId) {
    setConfirmModal({
      isOpen: true,
      action: 'deleteTask',
      taskId,
    })
  }

  function openDeleteProjectModal() {
    setConfirmModal({
      isOpen: true,
      action: 'deleteProject',
      taskId: null,
    })
  }

  function closeConfirmModal() {
    setConfirmModal({
      isOpen: false,
      action: '',
      taskId: null,
    })
  }

  async function handleConfirmAction() {
    if (confirmModal.action === 'deleteTask' && confirmModal.taskId) {
      await handleDeleteTask(confirmModal.taskId)
    }

    if (confirmModal.action === 'deleteProject') {
      await handleDeleteProject()
    }

    closeConfirmModal()
  }

  const completedTasks = tasks.filter((task) => task.isCompleted).length
  const openTasks = tasks.length - completedTasks
  const taskProgress = tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100)
  const visibleTasks = tasks.filter((task) => {
    if (taskFilter === 'done') {
      return task.isCompleted
    }

    if (taskFilter === 'todo') {
      return !task.isCompleted
    }

    return true
  })

  return (
    <main className="page">
      <section className="card wide">
        <div className="row">
          <Link className="link-button ghost" to="/dashboard">
            Back
          </Link>
          <button type="button" className="danger" onClick={openDeleteProjectModal}>
            Delete project
          </button>
        </div>

        <div className="row section-top page-header">
          <div>
            <p className="eyebrow">Project details</p>
            <h1>{project?.name ?? 'Project'}</h1>
          </div>
          {!isEditingProjectName ? (
            <button
              type="button"
              onClick={() => {
                setIsEditingProjectName(true)
                setProjectNameDraft(project?.name ?? '')
              }}
            >
              Edit project
            </button>
          ) : null}
        </div>

        {isEditingProjectName ? (
          <form
            className="row section-top"
            onSubmit={(event) => {
              event.preventDefault()
              handleEditProjectName()
            }}
          >
            <input
              type="text"
              value={projectNameDraft}
              onChange={(event) => setProjectNameDraft(event.target.value)}
              required
            />
            <button type="submit">Save</button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setIsEditingProjectName(false)
                setProjectNameDraft(project?.name ?? '')
              }}
            >
              Cancel
            </button>
          </form>
        ) : null}

        <div className="stats-grid section-top">
          <article className="stat-card">
            <p>Total tasks</p>
            <strong>{tasks.length}</strong>
          </article>
          <article className="stat-card">
            <p>Open tasks</p>
            <strong>{openTasks}</strong>
          </article>
          <article className="stat-card">
            <p>Completed</p>
            <strong>{completedTasks}</strong>
          </article>
        </div>

        <div className="progress-track section-top">
          <span className="progress-fill" style={{ width: `${taskProgress}%` }} />
        </div>
        <p className="muted">Task progress: {taskProgress}%</p>

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

        <div className="row section-top controls-row">
          <p className="muted">Filter tasks</p>
          <select value={taskFilter} onChange={(event) => setTaskFilter(event.target.value)}>
            <option value="all">All</option>
            <option value="todo">To do</option>
            <option value="done">Done</option>
          </select>
        </div>

        {isLoading ? (
          <ul className="list section-top">
            {[1, 2, 3, 4].map((skeletonId) => (
              <li key={skeletonId} className="skeleton-item">
                <span className="skeleton-line w-70" />
                <span className="skeleton-line w-35" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="list section-top">
            {visibleTasks.map((task) => (
              <li key={task.id}>
                <div className="row">
                  <label className="task-row">
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      onChange={() => handleToggleTask(task.id, task.isCompleted)}
                    />
                    <span className={task.isCompleted ? 'task-done' : ''}>{task.title}</span>
                    <span className={`status-pill ${task.isCompleted ? 'done' : 'todo'}`}>
                      {task.isCompleted ? 'Done' : 'To do'}
                    </span>
                  </label>
                </div>

                {editingTaskId === task.id ? (
                  <form
                    className="row section-top"
                    onSubmit={(event) => {
                      event.preventDefault()
                      handleEditTask(task.id, task.title)
                    }}
                  >
                    <input
                      type="text"
                      value={editingTaskTitle}
                      onChange={(event) => setEditingTaskTitle(event.target.value)}
                      required
                    />
                    <button type="submit">Save</button>
                    <button type="button" className="ghost" onClick={cancelEditTask}>
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="row section-top">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => beginEditTask(task.id, task.title)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => openDeleteTaskModal(task.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
            {visibleTasks.length === 0 ? (
              <li className="empty-state">
                {tasks.length === 0
                  ? 'No tasks yet. Add your first task above.'
                  : 'No tasks match the selected filter.'}
              </li>
            ) : null}
          </ul>
        )}
      </section>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.action === 'deleteProject' ? 'Delete project?' : 'Delete task?'}
        message={
          confirmModal.action === 'deleteProject'
            ? 'This removes the project and all its tasks permanently.'
            : 'This task will be removed permanently.'
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmAction}
        onCancel={closeConfirmModal}
      />
      <ToastStack toasts={toasts} />
    </main>
  )
}

export default ProjectDetailPage
