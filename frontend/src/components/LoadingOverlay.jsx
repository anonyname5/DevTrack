function LoadingOverlay({ isLoading, message = 'Loading...' }) {
  if (!isLoading) return null

  return (
    <div className="loading-overlay">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div className="loading-spinner"></div>
        <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-soft)' }}>{message}</p>
      </div>
    </div>
  )
}

export default LoadingOverlay
