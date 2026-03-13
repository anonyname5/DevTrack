import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import apiClient from '../lib/apiClient'
import { clearToken } from '../lib/authStorage'
import ConfirmModal from '../components/ConfirmModal'
import ToastStack from '../components/ToastStack'
import { useOrganization } from '../context/OrganizationContext'

const TASK_STATUSES = {
  0: { id: 0, label: 'Backlog', color: 'var(--text-soft)' },
  1: { id: 1, label: 'To Do', color: 'var(--warning-text)' },
  2: { id: 2, label: 'In Progress', color: 'var(--primary)' },
  3: { id: 3, label: 'Review', color: '#8b5cf6' }, // Purple
  4: { id: 4, label: 'Done', color: 'var(--success-text)' }
}

const TASK_PRIORITIES = {
  0: { id: 0, label: 'Low', color: 'var(--text-soft)' },
  1: { id: 1, label: 'Medium', color: 'var(--warning-text)' },
  2: { id: 2, label: 'High', color: 'var(--danger)' },
  3: { id: 3, label: 'Urgent', color: '#b91c1c' }
}

function SortableTaskItem({ task, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id, data: { task } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const priorityConfig = TASK_PRIORITIES[task.priority] || TASK_PRIORITIES[1]

  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners} className="task-card">
      <div className="task-card-header">
        <span className="task-title">{task.title}</span>
        <div className="task-actions">
           <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onEdit(task); }}>✎</button>
           <button className="icon-btn danger" onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}>×</button>
        </div>
      </div>
      <div className="task-card-meta">
        <span className="badge" style={{ color: priorityConfig.color, borderColor: priorityConfig.color }}>
          {priorityConfig.label}
        </span>
        {task.dueDate && (
          <span className="task-date">
            Due {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
        {task.assigneeName && (
           <span className="task-assignee" title={task.assigneeName}>
             {task.assigneeName.charAt(0).toUpperCase()}
           </span>
        )}
      </div>
    </li>
  )
}

function KanbanColumn({ status, tasks, onEdit, onDelete }) {
  const { setNodeRef } = useDroppable({
    id: status.id,
  });

  return (
    <div ref={setNodeRef} className="kanban-column">
      <h3 style={{ borderBottom: `3px solid ${status.color}`, paddingBottom: '8px', marginBottom: '12px' }}>
        {status.label} <span className="muted">({tasks.length})</span>
      </h3>
      <SortableContext 
        id={status.id.toString()} 
        items={tasks.map(t => t.id)} 
        strategy={verticalListSortingStrategy}
      >
        <ul className="kanban-list">
          {tasks.map(task => (
            <SortableTaskItem 
              key={task.id} 
              task={task} 
              onEdit={onEdit} 
              onDelete={onDelete} 
            />
          ))}
        </ul>
      </SortableContext>
    </div>
  )
}

function ProjectDetailPage() {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const numericProjectId = useMemo(() => Number(projectId), [projectId])
  const { selectOrganization } = useOrganization()

  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  
  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState(1) // Medium
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('')

  const [editingTask, setEditingTask] = useState(null)
  
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    action: '',
    taskId: null,
  })
  
  const [error, setError] = useState('')
  const [toasts, setToasts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeDragId, setActiveDragId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function showToast(message, type = 'success') {
    const toastId = Date.now() + Math.random()
    setToasts((currentToasts) => [...currentToasts, { id: toastId, message, type }])
    window.setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId))
    }, 3000)
  }

  const loadData = useCallback(async () => {
    if (!Number.isFinite(numericProjectId)) return

    setError('')
    setIsLoading(true)

    try {
      const [projectRes, tasksRes] = await Promise.all([
        apiClient.get(`/api/projects`), 
        apiClient.get(`/api/projects/${numericProjectId}/tasks`)
      ])

      const foundProject = projectRes.data.find(p => p.id === numericProjectId)
      if (!foundProject) {
        setError('Project not found')
        return
      }

      setProject(foundProject)
      if (foundProject.organizationId) {
        selectOrganization(foundProject.organizationId)
        const membersRes = await apiClient.get(`/api/organizations/${foundProject.organizationId}/members`)
        setMembers(membersRes.data)
      }
      
      setTasks(tasksRes.data)
    } catch (err) {
      setError('Failed to load project data.')
    } finally {
      setIsLoading(false)
    }
  }, [numericProjectId, selectOrganization])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleCreateTask(e) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await apiClient.post(`/api/projects/${numericProjectId}/tasks`, {
        title: newTaskTitle,
        description: newTaskDescription,
        priority: parseInt(newTaskPriority),
        dueDate: newTaskDueDate || null,
        assigneeId: newTaskAssigneeId ? parseInt(newTaskAssigneeId) : null,
        status: 1 // Default to Todo
      })
      
      setNewTaskTitle('')
      setNewTaskDescription('')
      setNewTaskPriority(1)
      setNewTaskDueDate('')
      setNewTaskAssigneeId('')
      
      await loadData()
      showToast('Task created')
    } catch {
      showToast('Failed to create task', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUpdateTask(e) {
    e.preventDefault()
    if (!editingTask) return

    try {
      await apiClient.put(`/api/tasks/${editingTask.id}`, {
        title: editingTask.title,
        description: editingTask.description,
        priority: parseInt(editingTask.priority),
        status: parseInt(editingTask.status),
        dueDate: editingTask.dueDate || null,
        assigneeId: editingTask.assigneeId ? parseInt(editingTask.assigneeId) : null
      })
      
      setEditingTask(null)
      await loadData()
      showToast('Task updated')
    } catch {
      showToast('Failed to update task', 'error')
    }
  }

  async function handleDeleteTask(taskId) {
    try {
      await apiClient.delete(`/api/tasks/${taskId}`)
      await loadData()
      showToast('Task deleted')
    } catch {
      showToast('Failed to delete task', 'error')
    }
  }

  function handleDragStart(event) {
    setActiveDragId(event.active.id)
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    setActiveDragId(null)

    if (!over) return

    const activeId = active.id
    const overId = over.id 

    const activeTask = tasks.find(t => t.id === activeId)
    if (!activeTask) return

    let newStatus = activeTask.status

    if (TASK_STATUSES[overId]) {
      newStatus = parseInt(overId)
    } 
    else {
      const overTask = tasks.find(t => t.id === overId)
      if (overTask) {
        newStatus = overTask.status
      }
    }

    if (newStatus !== activeTask.status) {
      const updatedTasks = tasks.map(t => 
        t.id === activeId ? { ...t, status: newStatus } : t
      )
      setTasks(updatedTasks)

      try {
        await apiClient.patch(`/api/tasks/${activeId}/status`, { status: newStatus })
      } catch {
        showToast('Failed to move task', 'error')
        loadData() 
      }
    }
  }

  const tasksByStatus = useMemo(() => {
    const grouped = { 0: [], 1: [], 2: [], 3: [], 4: [] }
    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task)
      } else {
        grouped[1].push(task) 
      }
    })
    return grouped
  }, [tasks])

  const taskProgress = useMemo(() => {
    if (tasks.length === 0) return 0
    const done = tasks.filter(t => t.status === 4).length
    return Math.round((done / tasks.length) * 100)
  }, [tasks])

  return (
    <main className="page workspace-page">
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
      >
        <section className="workspace-shell">
          <header className="workspace-header">
            <div>
              <p className="eyebrow">Project workspace</p>
              <h1>{project?.name ?? 'Project'}</h1>
              <p className="page-copy">
                Manage tasks, track progress, and coordinate with your team.
              </p>
            </div>
            <div className="workspace-actions">
              <Link className="link-button ghost" to="/dashboard">Back to dashboard</Link>
            </div>
          </header>

          <div className="stats-grid">
             <article className="stat-card">
               <p>Total Tasks</p>
               <strong>{tasks.length}</strong>
             </article>
             <article className="stat-card">
               <p>Progress</p>
               <strong>{taskProgress}%</strong>
               <div className="progress-track compact" style={{ marginTop: '8px' }}>
                 <span className="progress-fill" style={{ width: `${taskProgress}%` }} />
               </div>
             </article>
          </div>

          {error && <p className="error">{error}</p>}

          <section className="section-card">
            <div className="section-heading">
              <h2>Add Task</h2>
            </div>
            <form className="toolbar toolbar-form task-create-form" onSubmit={handleCreateTask}>
              <input 
                type="text" 
                placeholder="Task title" 
                value={newTaskTitle} 
                onChange={e => setNewTaskTitle(e.target.value)} 
                required 
              />
              <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)}>
                {Object.values(TASK_PRIORITIES).map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              <input 
                type="date" 
                value={newTaskDueDate} 
                onChange={e => setNewTaskDueDate(e.target.value)} 
              />
              <select value={newTaskAssigneeId} onChange={e => setNewTaskAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.email} ({m.user?.email || 'User'})</option>
                ))}
              </select>
              <button type="submit" disabled={isSubmitting}>Add</button>
            </form>
          </section>

          {isLoading ? (
            <div className="kanban-board">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="kanban-column" style={{ minHeight: '300px' }}>
                  <div className="skeleton-line w-50" style={{ marginBottom: '16px' }} />
                  <div className="skeleton-item" style={{ height: '80px', marginBottom: '12px' }} />
                  <div className="skeleton-item" style={{ height: '80px' }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="kanban-board">
              {Object.values(TASK_STATUSES).map(status => (
                <KanbanColumn 
                  key={status.id} 
                  status={status} 
                  tasks={tasksByStatus[status.id] || []} 
                  onEdit={setEditingTask} 
                  onDelete={(id) => setConfirmModal({ isOpen: true, action: 'deleteTask', taskId: id })} 
                />
              ))}
            </div>
          )}
        </section>

        <DragOverlay>
          {activeDragId ? (
            <div className="task-card dragging">
               Drag Item
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {editingTask && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Edit Task</h2>
            <form onSubmit={handleUpdateTask} className="form">
              <label>
                Title
                <input 
                  value={editingTask.title} 
                  onChange={e => setEditingTask({...editingTask, title: e.target.value})} 
                  required 
                />
              </label>
              <label>
                Description
                <textarea 
                  value={editingTask.description || ''} 
                  onChange={e => setEditingTask({...editingTask, description: e.target.value})}
                  rows={3}
                  style={{ width: '100%', padding: '10px', borderRadius: '14px', border: '1px solid var(--border)' }}
                />
              </label>
              <div className="row">
                <label>
                  Status
                  <select 
                    value={editingTask.status} 
                    onChange={e => setEditingTask({...editingTask, status: e.target.value})}
                  >
                    {Object.values(TASK_STATUSES).map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Priority
                  <select 
                    value={editingTask.priority} 
                    onChange={e => setEditingTask({...editingTask, priority: e.target.value})}
                  >
                    {Object.values(TASK_PRIORITIES).map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="row">
                 <label>
                  Due Date
                  <input 
                    type="date" 
                    value={editingTask.dueDate ? editingTask.dueDate.split('T')[0] : ''} 
                    onChange={e => setEditingTask({...editingTask, dueDate: e.target.value})} 
                  />
                </label>
                <label>
                  Assignee
                  <select 
                    value={editingTask.assigneeId || ''} 
                    onChange={e => setEditingTask({...editingTask, assigneeId: e.target.value})}
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.email}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="row" style={{ marginTop: '16px' }}>
                <button type="button" className="ghost" onClick={() => setEditingTask(null)}>Cancel</button>
                <button type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Delete Task?"
        message="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={async () => {
          await handleDeleteTask(confirmModal.taskId)
          setConfirmModal({ isOpen: false, action: '', taskId: null })
        }}
        onCancel={() => setConfirmModal({ isOpen: false, action: '', taskId: null })}
      />
      
      <ToastStack toasts={toasts} />
    </main>
  )
}

export default ProjectDetailPage
