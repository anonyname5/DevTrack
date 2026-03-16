import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import apiClient from '../lib/apiClient'
import ConfirmModal from './ConfirmModal'

function CommentsSection({ taskId, members = [] }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [commentToDeleteId, setCommentToDeleteId] = useState(null)
  const [mentionQuery, setMentionQuery] = useState('')
  const [isMentionOpen, setIsMentionOpen] = useState(false)
  const [imagePreviewUrls, setImagePreviewUrls] = useState({})
  const commentInputRef = useRef(null)

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

  useEffect(() => {
    let isDisposed = false
    const objectUrls = []

    async function loadImagePreviews() {
      const imageAttachments = comments
        .flatMap((comment) => comment.attachments || [])
        .filter((attachment) => attachment.contentType?.startsWith('image/'))

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
        } catch (err) {
          console.error(err)
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
  }, [comments])

  const mentionSuggestions = useMemo(() => {
    if (!mentionQuery.trim()) return []
    const normalizedQuery = mentionQuery.trim().toLowerCase()
    const mentionedEmails = new Set(extractMentionEmails(newComment))
    return members
      .filter((member) => {
        const email = member.email?.toLowerCase()
        return email?.includes(normalizedQuery) && !mentionedEmails.has(email)
      })
      .slice(0, 6)
  }, [mentionQuery, members, newComment])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      const response = await apiClient.post(`/api/tasks/${taskId}/comments`, {
        content: newComment
      })

      const createdComment = response.data
      if (selectedFiles.length > 0 && createdComment?.id) {
        for (const file of selectedFiles) {
          const formData = new FormData()
          formData.append('file', file)
          await apiClient.post(`/api/comments/${createdComment.id}/attachments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        }
      }

      setNewComment('')
      setSelectedFiles([])
      await loadComments()
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.message || 'Failed to post comment')
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

  async function handleDeleteAttachment(attachmentId) {
    try {
      await apiClient.delete(`/api/attachments/${attachmentId}`)
      await loadComments()
    } catch (err) {
      console.error(err)
      setError('Failed to delete file')
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
    } catch (err) {
      console.error(err)
      setError('Failed to download file')
    }
  }

  function insertMention(email) {
    const normalizedEmail = email.trim().toLowerCase()
    if (extractMentionEmails(newComment).includes(normalizedEmail)) {
      setMentionQuery('')
      setIsMentionOpen(false)
      return
    }

    const input = commentInputRef.current
    if (!input) {
      const mentionText = `@${email}`
      setNewComment((current) => (current.trim().length === 0 ? mentionText : `${current} ${mentionText}`))
      return
    }

    const currentValue = newComment
    const caret = input.selectionStart ?? currentValue.length
    const left = currentValue.slice(0, caret)
    const right = currentValue.slice(caret)
    const mentionMatch = left.match(/(^|\s)@([^\s@]*)$/)

    if (!mentionMatch) {
      const mentionText = `@${email} `
      const nextValue = currentValue.trim().length === 0 ? mentionText : `${currentValue} ${mentionText}`
      setNewComment(nextValue)
      setMentionQuery('')
      setIsMentionOpen(false)
      return
    }

    const mentionStart = left.length - mentionMatch[0].length + mentionMatch[1].length
    const nextLeft = `${left.slice(0, mentionStart)}@${email} `
    const nextValue = `${nextLeft}${right}`
    const nextCaret = nextLeft.length

    setNewComment(nextValue)
    setMentionQuery('')
    setIsMentionOpen(false)

    window.requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(nextCaret, nextCaret)
    })
  }

  function renderHighlightedMentions(content) {
    const mentionPattern = /(@[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g
    const mentionSinglePattern = /^@[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    const parts = content.split(mentionPattern)
    return parts.map((part, index) => (
      mentionSinglePattern.test(part)
        ? <span key={`${part}-${index}`} className="mention-token">{part}</span>
        : <span key={`${part}-${index}`}>{part}</span>
    ))
  }

  function updateMentionState(value, caret) {
    const left = value.slice(0, caret)
    const mentionMatch = left.match(/(^|\s)@([^\s@]*)$/)

    if (!mentionMatch) {
      setMentionQuery('')
      setIsMentionOpen(false)
      return
    }

    setMentionQuery(mentionMatch[2] || '')
    setIsMentionOpen(true)
  }

  function extractMentionEmails(content) {
    const mentionPattern = /@([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g
    const matches = content.matchAll(mentionPattern)
    const uniqueEmails = new Set()
    for (const match of matches) {
      uniqueEmails.add((match[1] || '').toLowerCase())
    }
    return Array.from(uniqueEmails)
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
              <p className="comment-body">{renderHighlightedMentions(comment.content)}</p>
              {comment.attachments?.length > 0 ? (
                <ul className="attachment-list comment-attachment-list">
                  {comment.attachments.map((attachment) => (
                    <li key={attachment.id} className="attachment-item">
                      <div>
                        <button
                          type="button"
                          className="link-button ghost"
                          onClick={() => handleDownloadAttachment(attachment)}
                        >
                          {attachment.fileName}
                        </button>
                        <span className="muted">{formatSize(attachment.sizeBytes)}</span>
                        {imagePreviewUrls[attachment.id] ? (
                          <img
                            className="attachment-image-preview"
                            src={imagePreviewUrls[attachment.id]}
                            alt={attachment.fileName}
                          />
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="comment-delete-btn"
                        title="Delete attachment"
                        aria-label="Delete attachment"
                        onClick={() => handleDeleteAttachment(attachment.id)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {/* TODO: Add check if current user owns the comment */}
              <div className="comment-actions">
                <button
                  type="button"
                  className="comment-delete-btn"
                  title="Delete comment"
                  aria-label="Delete comment"
                  onClick={() => setCommentToDeleteId(comment.id)}
                >
                  <svg
                    className="comment-delete-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 3h6m-9 4h12m-1 0-.6 10.2A2 2 0 0 1 14.4 19H9.6a2 2 0 0 1-2-1.8L7 7m3 4v5m4-5v5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSubmit} className="comment-form">
        {members.length > 0 ? (
          <div className="mention-row">
            <span className="muted">Mention:</span>
            {members.slice(0, 8).map((member) => (
              <button
                key={member.id}
                type="button"
                className="mention-chip"
                onClick={() => insertMention(member.email)}
                disabled={extractMentionEmails(newComment).includes((member.email || '').toLowerCase())}
              >
                @{member.email}
              </button>
            ))}
          </div>
        ) : null}
        <textarea
          ref={commentInputRef}
          value={newComment}
          onChange={(event) => {
            setNewComment(event.target.value)
            const caret = event.target.selectionStart ?? event.target.value.length
            updateMentionState(event.target.value, caret)
          }}
          onKeyUp={(event) => {
            const caret = event.currentTarget.selectionStart ?? event.currentTarget.value.length
            updateMentionState(event.currentTarget.value, caret)
          }}
          placeholder="Write a comment... (use @user@email.com to mention)"
          rows={2}
          disabled={isSubmitting}
        />
        {isMentionOpen && mentionSuggestions.length > 0 ? (
          <div className="mention-suggestions">
            {mentionSuggestions.map((member) => (
              <button
                key={member.id}
                type="button"
                className="mention-suggestion-item"
                onClick={() => insertMention(member.email)}
              >
                @{member.email}
              </button>
            ))}
          </div>
        ) : null}
        <input
          type="file"
          multiple
          onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
          disabled={isSubmitting}
        />
        {selectedFiles.length > 0 ? (
          <p className="muted">{selectedFiles.length} file(s) ready to upload</p>
        ) : null}
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
