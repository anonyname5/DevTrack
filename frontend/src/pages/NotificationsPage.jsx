import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { useOrganization } from '../context/OrganizationContext'

function NotificationsPage() {
  const { currentOrg } = useOrganization()
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadNotifications = useCallback(async () => {
    if (!currentOrg) return

    setError('')
    setIsLoading(true)
    try {
      const response = await apiClient.get('/api/notifications', {
        params: {
          organizationId: currentOrg.id,
          limit: 50,
        },
      })
      setNotifications(Array.isArray(response.data) ? response.data : [])
    } catch (requestError) {
      setError(requestError?.response?.data?.message ?? 'Failed to load notifications.')
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }, [currentOrg])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  async function handleMarkRead(notificationId) {
    try {
      await apiClient.patch(`/api/notifications/${notificationId}/read`)
      setNotifications((currentList) =>
        currentList.map((item) =>
          item.id === notificationId
            ? { ...item, isRead: true, readAt: new Date().toISOString() }
            : item,
        ),
      )
    } catch {
      // Keep UX silent for this light action.
    }
  }

  async function handleMarkAllRead() {
    if (!currentOrg) return
    try {
      await apiClient.patch('/api/notifications/read-all', null, {
        params: { organizationId: currentOrg.id },
      })
      setNotifications((currentList) =>
        currentList.map((item) => ({ ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() })),
      )
    } catch {
      // Keep UX silent for this light action.
    }
  }

  const unreadCount = notifications.filter((item) => !item.isRead).length

  return (
    <main className="page workspace-page">
      <section className="workspace-shell">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>Notifications</h1>
            <p className="page-copy">Stay up to date with assignments, comments, and important workspace events.</p>
          </div>
          <div className="workspace-actions">
            <Link className="link-button ghost" to="/dashboard">
              Back to dashboard
            </Link>
          </div>
        </header>

        <section className="section-card">
          <div className="section-heading">
            <h2>Inbox</h2>
            <div className="row" style={{ gap: '10px' }}>
              <span className="section-badge">{unreadCount} unread</span>
              <button type="button" className="ghost" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
                Mark all as read
              </button>
            </div>
          </div>

          {error ? <p className="error">{error}</p> : null}

          {isLoading ? (
            <ul className="list project-list">
              {[1, 2, 3].map((skeletonId) => (
                <li key={skeletonId} className="skeleton-item project-list-item">
                  <span className="skeleton-line w-50" />
                  <span className="skeleton-line w-70" />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="list project-list">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`project-list-item notification-item ${notification.isRead ? 'read' : 'unread'}`}
                >
                  <div className="project-card-main">
                    <div className="project-card-content">
                      <div className="project-card-title-row">
                        <strong>{notification.title}</strong>
                        {!notification.isRead ? <span className="status-pill todo">New</span> : null}
                      </div>
                      <p className="muted">{notification.message}</p>
                      <p className="muted">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="project-card-meta">
                      {notification.link ? (
                        <Link className="link-button ghost" to={notification.link}>
                          Open
                        </Link>
                      ) : null}
                      {!notification.isRead ? (
                        <button type="button" className="ghost" onClick={() => handleMarkRead(notification.id)}>
                          Mark read
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
              {notifications.length === 0 ? (
                <li className="empty-state">No notifications yet. You are all caught up.</li>
              ) : null}
            </ul>
          )}
        </section>
      </section>
    </main>
  )
}

export default NotificationsPage
