import { useState, useEffect } from 'react'
import CommentsSection from './CommentsSection'
import ActivityFeed from './ActivityFeed'

const TASK_STATUSES = {
  0: { id: 0, label: 'Backlog' },
  1: { id: 1, label: 'To Do' },
  2: { id: 2, label: 'In Progress' },
  3: { id: 3, label: 'Review' },
  4: { id: 4, label: 'Done' }
}

const TASK_PRIORITIES = {
  0: { id: 0, label: 'Low' },
  1: { id: 1, label: 'Medium' },
  2: { id: 2, label: 'High' },
  3: { id: 3, label: 'Urgent' }
}

function TaskDetailModal({ task, onClose, onUpdate, members }) {
  const [activeTab, setActiveTab] = useState('details')
  const [editingTask, setEditingTask] = useState({ ...task })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setEditingTask({ ...task })
  }, [task])

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onUpdate(editingTask)
      onClose()
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card task-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task.title}</h2>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>

        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button 
            className={`tab ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            Comments
          </button>
          <button 
            className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
        </div>

        <div className="modal-content">
          {activeTab === 'details' && (
            <form onSubmit={handleSubmit} className="form">
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
                    onChange={e => setEditingTask({...editingTask, status: parseInt(e.target.value)})}
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
                    onChange={e => setEditingTask({...editingTask, priority: parseInt(e.target.value)})}
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
                <button type="button" className="ghost" onClick={onClose}>Cancel</button>
                <button type="submit" disabled={isSubmitting}>Save Changes</button>
              </div>
            </form>
          )}

          {activeTab === 'comments' && (
            <CommentsSection taskId={task.id} />
          )}

          {activeTab === 'activity' && (
            <ActivityFeed entityType="Task" entityId={task.id} />
          )}
        </div>
      </div>
    </div>
  )
}

export default TaskDetailModal
