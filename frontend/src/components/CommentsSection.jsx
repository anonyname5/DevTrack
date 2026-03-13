import { useState, useEffect, useCallback } from 'react'
import apiClient from '../lib/apiClient'

function CommentsSection({ taskId }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadComments = useCallback(async () => {
    if (!taskId) return
    setIsLoading(true)
    try {
      const response = await apiClient.get(`/api/tasks/${taskId}/comments`)
      setComments(response.data)
    } catch (err) {
      console.error(err)
      setError('Failed to load comments')
    } finally {
      setIsLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      await apiClient.post(`/api/tasks/${taskId}/comments`, {
        content: newComment
      })
      setNewComment('')
      await loadComments()
    } catch (err) {
      console.error(err)
      setError('Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(commentId) {
    if (!confirm('Delete this comment?')) return
    try {
      await apiClient.delete(`/api/comments/${commentId}`)
      setComments(comments.filter(c => c.id !== commentId))
    } catch (err) {
      console.error(err)
      setError('Failed to delete comment')
    }
  }

  if (isLoading && comments.length === 0) {
    return <div className="muted">Loading comments...</div>
  }

  return (
    <div className="comments-section">
      <h3>Comments</h3>
      
      <div className="comments-list">
        {comments.length === 0 ? (
          <p className="muted">No comments yet.</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <strong>{comment.userEmail}</strong>
                <span className="muted">{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              <p className="comment-body">{comment.content}</p>
              {/* TODO: Add check if current user owns the comment */}
              <button 
                className="link-button danger-text" 
                style={{ fontSize: '12px', padding: 0, minHeight: 'auto' }}
                onClick={() => handleDelete(comment.id)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSubmit} className="comment-form">
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          rows={2}
          disabled={isSubmitting}
        />
        <button type="submit" disabled={isSubmitting || !newComment.trim()}>
          {isSubmitting ? 'Posting...' : 'Post Comment'}
        </button>
      </form>
    </div>
  )
}

export default CommentsSection
