import { useState, useEffect } from 'react'
import apiClient from '../lib/apiClient'
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
  const [attachments, setAttachments] = useState([])
  const [uploadFiles, setUploadFiles] = useState([])
  const [attachmentsError, setAttachmentsError] = useState('')
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [imagePreviewUrls, setImagePreviewUrls] = useState({})

  useEffect(() => {
    async function loadAttachments() {
      try {
        const response = await apiClient.get(`/api/tasks/${task.id}/attachments`)
        setAttachments(response.data)
      } catch (error) {
        console.error(error)
        setAttachmentsError('Failed to load attachments')
      }
    }

    loadAttachments()
  }, [task.id])

  useEffect(() => {
    let isDisposed = false
    const objectUrls = []

    async function loadImagePreviews() {
      const imageAttachments = attachments.filter((attachment) =>
        attachment.contentType?.startsWith('image/')
      )

      if (imageAttachments.length === 0) {
        setImagePreviewUrls({})
        return
      }

      const previews = {}
      for (const attachment of imageAttachments) {
        try {
          const response = await apiClient.get(`/api/attachments/${attachment.id}/download`, { responseType: 'blob' })
          const url = window.URL.createObjectURL(response.data)
          previews[attachment.id] = url
          objectUrls.push(url)
        } catch (error) {
          console.error(error)
        }
      }

      if (!isDisposed) {
        setImagePreviewUrls(previews)
      }
    }

    loadImagePreviews()

    return () => {
      isDisposed = true
      objectUrls.forEach((url) => window.URL.revokeObjectURL(url))
    }
  }, [attachments])

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

  async function handleUploadAttachments() {
    if (uploadFiles.length === 0) return
    setIsUploadingAttachment(true)
    setAttachmentsError('')

    try {
      for (const file of uploadFiles) {
        const formData = new FormData()
        formData.append('file', file)
        await apiClient.post(`/api/tasks/${task.id}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      const response = await apiClient.get(`/api/tasks/${task.id}/attachments`)
      setAttachments(response.data)
      setUploadFiles([])
    } catch (error) {
      console.error(error)
      setAttachmentsError(error?.response?.data?.message || 'Failed to upload attachment')
    } finally {
      setIsUploadingAttachment(false)
    }
  }

  async function handleDownloadAttachment(attachment) {
    try {
      const response = await apiClient.get(`/api/attachments/${attachment.id}/download`, { responseType: 'blob' })
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = blobUrl
      link.setAttribute('download', attachment.fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error(error)
      setAttachmentsError('Failed to download attachment')
    }
  }

  async function handleDeleteAttachment(attachmentId) {
    try {
      await apiClient.delete(`/api/attachments/${attachmentId}`)
      setAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId))
    } catch (error) {
      console.error(error)
      setAttachmentsError('Failed to delete attachment')
    }
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

              <div className="task-attachments-panel">
                <h3>Attachments</h3>
                <div className="task-attachment-upload">
                  <input
                    type="file"
                    multiple
                    onChange={(event) => setUploadFiles(Array.from(event.target.files || []))}
                  />
                  <button
                    type="button"
                    onClick={handleUploadAttachments}
                    disabled={isUploadingAttachment || uploadFiles.length === 0}
                  >
                    {isUploadingAttachment ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
                {attachmentsError ? <p className="error">{attachmentsError}</p> : null}
                <ul className="attachment-list">
                  {attachments.length === 0 ? (
                    <li className="muted">No attachments yet.</li>
                  ) : (
                    attachments.map((attachment) => (
                      <li key={attachment.id} className="attachment-item">
                        <div>
                          <strong>{attachment.fileName}</strong>
                          <p className="muted">{formatSize(attachment.sizeBytes)} - {attachment.uploadedByEmail}</p>
                          {imagePreviewUrls[attachment.id] ? (
                            <img
                              className="attachment-image-preview"
                              src={imagePreviewUrls[attachment.id]}
                              alt={attachment.fileName}
                            />
                          ) : null}
                        </div>
                        <div className="attachment-actions">
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => handleDownloadAttachment(attachment)}
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            className="comment-delete-btn"
                            onClick={() => handleDeleteAttachment(attachment.id)}
                            title="Delete attachment"
                            aria-label="Delete attachment"
                          >
                            ×
                          </button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </form>
          )}

          {activeTab === 'comments' && (
            <CommentsSection taskId={task.id} members={members} />
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
