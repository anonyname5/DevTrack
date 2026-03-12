import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { clearToken } from '../lib/authStorage'
import ConfirmModal from '../components/ConfirmModal'
import ToastStack from '../components/ToastStack'

const DEFAULT_TASK_META = {
  priority: 'medium',
  dueDate: '',
}

function ProjectDetailPage() {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const numericProjectId = useMemo(() => Number(projectId), [projectId])

  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState('medium')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [taskSearchTerm, setTaskSearchTerm] = useState('')
  const [taskSortBy, setTaskSortBy] = useState('recent')
  const [taskFilter, setTaskFilter] = useState('all')
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editingTaskTitle, setEditingTaskTitle] = useState('')
  const [taskMeta, setTaskMeta] = useState({})
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
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  const taskMetaStorageKey = useMemo(
    () => `devtrack-task-meta-project-${numericProjectId}`,
    [numericProjectId],
  )

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

  useEffect(() => {
    if (!Number.isFinite(numericProjectId)) {
      return
    }

    try {
      const rawValue = window.localStorage.getItem(taskMetaStorageKey)
      if (!rawValue) {
        setTaskMeta({})
        return
      }
      const parsedValue = JSON.parse(rawValue)
      if (parsedValue && typeof parsedValue === 'object') {
        setTaskMeta(parsedValue)
      } else {
        setTaskMeta({})
      }
    } catch {
      setTaskMeta({})
    }
  }, [numericProjectId, taskMetaStorageKey])

  useEffect(() => {
    window.localStorage.setItem(taskMetaStorageKey, JSON.stringify(taskMeta))
  }, [taskMeta, taskMetaStorageKey])

  async function handleCreateTask(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await apiClient.post(`/api/projects/${numericProjectId}/tasks`, {
        title: newTaskTitle,
      })
      setNewTaskTitle('')
      setNewTaskPriority('medium')
      setNewTaskDueDate('')

      const createdTaskId = Number(response?.data?.id)
      if (Number.isFinite(createdTaskId)) {
        setTaskMeta((currentTaskMeta) => ({
          ...currentTaskMeta,
          [createdTaskId]: {
            priority: newTaskPriority,
            dueDate: newTaskDueDate,
          },
        }))
      }

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

  function updateTaskMeta(taskId, patch) {
    setTaskMeta((currentTaskMeta) => ({
      ...currentTaskMeta,
      [taskId]: {
        ...(currentTaskMeta[taskId] ?? DEFAULT_TASK_META),
        ...patch,
      },
    }))
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

  async function handleCompleteAllOpenTasks() {
    const openTaskIds = tasks.filter((task) => !task.isCompleted).map((task) => task.id)
    if (openTaskIds.length === 0) {
      showToast('All tasks are already done.')
      return
    }

    setIsBulkUpdating(true)
    setError('')
    try {
      await Promise.all(
        openTaskIds.map((taskId) =>
          apiClient.patch(`/api/tasks/${taskId}/complete`, { isCompleted: true }),
        ),
      )
      await loadProjectAndTasks()
      showToast(`Marked ${openTaskIds.length} task(s) as done.`)
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        handleUnauthorized()
        return
      }
      setError(requestError?.response?.data?.message ?? 'Failed to complete all open tasks.')
      showToast('Unable to complete all open tasks.', 'error')
    } finally {
      setIsBulkUpdating(false)
    }
  }

  async function handleReopenAllDoneTasks() {
    const doneTaskIds = tasks.filter((task) => task.isCompleted).map((task) => task.id)
    if (doneTaskIds.length === 0) {
      showToast('No completed tasks to reopen.')
      return
    }

    setIsBulkUpdating(true)
    setError('')
    try {
      await Promise.all(
        doneTaskIds.map((taskId) =>
          apiClient.patch(`/api/tasks/${taskId}/complete`, { isCompleted: false }),
        ),
      )
      await loadProjectAndTasks()
      showToast(`Reopened ${doneTaskIds.length} task(s).`)
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        handleUnauthorized()
        return
      }
      setError(requestError?.response?.data?.message ?? 'Failed to reopen completed tasks.')
      showToast('Unable to reopen completed tasks.', 'error')
    } finally {
      setIsBulkUpdating(false)
    }
  }

  const completedTasks = tasks.filter((task) => task.isCompleted).length
  const openTasks = tasks.length - completedTasks
  const taskProgress = tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100)
  const normalizedTaskSearch = taskSearchTerm.trim().toLowerCase()
  const searchedTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(normalizedTaskSearch),
  )
  const sortedTasks = [...searchedTasks].sort((left, right) => {
    if (taskSortBy === 'title') {
      return left.title.localeCompare(right.title)
    }
    return right.id - left.id
  })
  const todoTasks = sortedTasks.filter((task) => !task.isCompleted)
  const doneTasks = sortedTasks.filter((task) => task.isCompleted)

  function renderTaskCard(task) {
    const metadata = taskMeta[task.id] ?? DEFAULT_TASK_META
    return (
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

        <div className="task-meta-grid section-top">
          <label>
            Priority
            <select
              value={metadata.priority}
              onChange={(event) => updateTaskMeta(task.id, { priority: event.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>
            Due date
            <input
              type="date"
              value={metadata.dueDate}
              onChange={(event) => updateTaskMeta(task.id, { dueDate: event.target.value })}
            />
          </label>
        </div>
        <p className="muted local-meta-note">Priority and due date are saved locally.</p>

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
            <button type="button" className="ghost" onClick={() => beginEditTask(task.id, task.title)}>
              Edit
            </button>
            <button type="button" className="danger" onClick={() => openDeleteTaskModal(task.id)}>
              Delete
            </button>
          </div>
        )}
      </li>
    )
  }

  return (
    <main className="page workspace-page">
      <section className="workspace-shell">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Project workspace</p>
            <h1>{project?.name ?? 'Project'}</h1>
            <p className="page-copy">
              Coordinate task delivery, keep status visible, and manage execution in one board view.
            </p>
          </div>
          <div className="workspace-actions">
            <Link className="link-button ghost" to="/dashboard">
              Back to dashboard
            </Link>
            {!isEditingProjectName ? (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setIsEditingProjectName(true)
                  setProjectNameDraft(project?.name ?? '')
                }}
              >
                Edit project
              </button>
            ) : null}
            <button type="button" className="danger" onClick={openDeleteProjectModal}>
              Delete project
            </button>
          </div>
        </header>

        {isEditingProjectName ? (
          <section className="section-card">
            <div className="section-heading">
              <div>
                <h2>Update project name</h2>
                <p className="muted">Keep the project title aligned with the current scope.</p>
              </div>
            </div>
            <form
              className="toolbar toolbar-form"
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
          </section>
        ) : null}

        <section className="stats-grid">
          <article className="stat-card">
            <p>Total tasks</p>
            <strong>{tasks.length}</strong>
            <span className="stat-footnote">Tracked work items in this project</span>
          </article>
          <article className="stat-card">
            <p>Open tasks</p>
            <strong>{openTasks}</strong>
            <span className="stat-footnote">Items still requiring action</span>
          </article>
          <article className="stat-card">
            <p>Completed</p>
            <strong>{completedTasks}</strong>
            <span className="stat-footnote">Tasks marked as delivered</span>
          </article>
        </section>

        <section className="section-card">
          <div className="section-heading">
            <div>
              <h2>Delivery progress</h2>
              <p className="muted">A quick view of overall project completion.</p>
            </div>
            <strong className="progress-label">{taskProgress}% complete</strong>
          </div>

          <div className="progress-track">
            <span className="progress-fill" style={{ width: `${taskProgress}%` }} />
          </div>
        </section>

        <section className="section-card">
          <div className="section-heading">
            <div>
              <h2>Add a task</h2>
              <p className="muted">Create a task and capture its working priority and due date.</p>
            </div>
          </div>

          {error ? <p className="error">{error}</p> : null}

          <form className="toolbar toolbar-form task-create-form" onSubmit={handleCreateTask}>
            <input
              type="text"
              placeholder="New task title"
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
              required
            />
            <select
              value={newTaskPriority}
              onChange={(event) => setNewTaskPriority(event.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              type="date"
              value={newTaskDueDate}
              onChange={(event) => setNewTaskDueDate(event.target.value)}
            />
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add task'}
            </button>
          </form>
        </section>

        <section className="section-card">
          <div className="section-heading">
            <div>
              <h2>Task board</h2>
              <p className="muted">Filter, update, and review current task execution from one workspace.</p>
            </div>
          </div>

          <div className="toolbar controls-row">
            <input
              type="text"
              placeholder="Search tasks"
              value={taskSearchTerm}
              onChange={(event) => setTaskSearchTerm(event.target.value)}
            />
            <select value={taskFilter} onChange={(event) => setTaskFilter(event.target.value)}>
              <option value="all">All</option>
              <option value="todo">To do</option>
              <option value="done">Done</option>
            </select>
            <select value={taskSortBy} onChange={(event) => setTaskSortBy(event.target.value)}>
              <option value="recent">Newest</option>
              <option value="title">Title</option>
            </select>
          </div>

          <div className="toolbar bulk-actions">
            <button
              type="button"
              className="ghost"
              disabled={isBulkUpdating}
              onClick={handleCompleteAllOpenTasks}
            >
              Complete all open
            </button>
            <button
              type="button"
              className="ghost"
              disabled={isBulkUpdating}
              onClick={handleReopenAllDoneTasks}
            >
              Reopen all done
            </button>
          </div>

          {isLoading ? (
            <div className="kanban-grid">
            <section className="kanban-column">
              <h3>To do</h3>
              <ul className="list">
                {[1, 2].map((skeletonId) => (
                  <li key={skeletonId} className="skeleton-item">
                    <span className="skeleton-line w-70" />
                    <span className="skeleton-line w-35" />
                  </li>
                ))}
              </ul>
            </section>
            <section className="kanban-column">
              <h3>Done</h3>
              <ul className="list">
                {[1, 2].map((skeletonId) => (
                  <li key={skeletonId} className="skeleton-item">
                    <span className="skeleton-line w-50" />
                    <span className="skeleton-line w-35" />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : (
          <div className="kanban-grid">
            {taskFilter !== 'done' ? (
              <section className="kanban-column">
                <h3>To do ({todoTasks.length})</h3>
                <ul className="list">
                  {todoTasks.map(renderTaskCard)}
                  {todoTasks.length === 0 ? (
                    <li className="empty-state">No to-do tasks match current filters.</li>
                  ) : null}
                </ul>
              </section>
            ) : null}
            {taskFilter !== 'todo' ? (
              <section className="kanban-column">
                <h3>Done ({doneTasks.length})</h3>
                <ul className="list">
                  {doneTasks.map(renderTaskCard)}
                  {doneTasks.length === 0 ? (
                    <li className="empty-state">No done tasks match current filters.</li>
                  ) : null}
                </ul>
              </section>
            ) : null}
          </div>
        )}
        </section>
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
