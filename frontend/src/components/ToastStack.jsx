function ToastStack({ toasts }) {
  if (!toasts.length) {
    return null
  }

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.message}
        </div>
      ))}
    </div>
  )
}

export default ToastStack
