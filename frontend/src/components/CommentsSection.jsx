import { useState, useEffect, useCallback } from 'react'
import apiClient from '../lib/apiClient'
import ConfirmModal from './ConfirmModal'

function CommentsSection({ taskId }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [commentToDeleteId, setCommentToDeleteId] = useState(null)

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
    try {
      await apiClient.delete(`/api/comments/${commentId}`)
      setComments((currentComments) => currentComments.filter((c) => c.id !== commentId))
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
              <div className="comment-actions">
                <button
                  type="button"
                  className="comment-delete-btn"
                  title="Delete comment"
                  aria-label="Delete comment"
                  onClick={() => setCommentToDeleteId(comment.id)}
                >
                  X
                </button>
              </div>
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

      <ConfirmModal
        isOpen={commentToDeleteId !== null}
        title="Delete Comment?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={async () => {
          if (commentToDeleteId !== null) {
            await handleDelete(commentToDeleteId)
          }
          setCommentToDeleteId(null)
        }}
        onCancel={() => setCommentToDeleteId(null)}
      />
    </div>
  )
}

export default CommentsSection
