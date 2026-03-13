import { useState, useEffect, useCallback } from 'react'
import apiClient from '../lib/apiClient'

function ActivityFeed({ entityType, entityId }) {
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadLogs = useCallback(async () => {
    if (!entityId) return
    setIsLoading(true)
    try {
      const response = await apiClient.get(`/api/activity-logs?entityType=${entityType}&entityId=${entityId}`)
      setLogs(response.data)
    } catch (err) {
      console.error(err)
      setError('Failed to load activity')
    } finally {
      setIsLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  if (isLoading && logs.length === 0) {
    return <div className="muted">Loading activity...</div>
  }

  return (
    <div className="activity-feed">
      <h3>Activity</h3>
      {error && <p className="error">{error}</p>}
      {logs.length === 0 ? (
        <p className="muted">No activity yet.</p>
      ) : (
        <ul className="activity-list">
          {logs.map(log => (
            <li key={log.id} className="activity-item">
              <div className="activity-header">
                <strong>{log.userEmail}</strong> <span className="muted">{log.action}</span>
              </div>
              <p className="activity-details">{log.details}</p>
              <span className="activity-time">{new Date(log.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ActivityFeed
