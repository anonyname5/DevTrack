import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { getToken } from '../lib/authStorage'

function AcceptInvitePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [message, setMessage] = useState('Verifying invitation...')

  const acceptInvitation = useCallback(async () => {
    try {
      await apiClient.post('/api/invitations/accept', { token })
      setStatus('success')
      setMessage('Invitation accepted! Redirecting to dashboard...')
      setTimeout(() => {
        navigate('/dashboard')
        // Force reload to refresh org context if needed, or rely on context refresh
        window.location.reload() 
      }, 2000)
    } catch (error) {
      console.error(error)
      setStatus('error')
      setMessage(error.response?.data || 'Failed to accept invitation.')
    }
  }, [token, navigate])

  useEffect(() => {
    // If no token, we can't do anything.
    if (!token) {
        return
    }

    if (!getToken()) {
      navigate(`/login?returnUrl=${encodeURIComponent(`/accept-invite?token=${token}`)}`)
      return
    }

    // Delay execution slightly to avoid synchronous setState warning
    const timer = setTimeout(() => {
        acceptInvitation()
    }, 0)

    return () => clearTimeout(timer)
  }, [token, navigate, acceptInvitation])

  if (!token) {
      return (
        <main className="page auth-page">
            <div className="card">
                <div style={{ textAlign: 'center' }}>
                    <h2>Invalid Invitation</h2>
                    <p className="error" style={{ marginTop: '16px' }}>
                        Invalid invitation link.
                    </p>
                    <button 
                        onClick={() => navigate('/dashboard')} 
                        style={{ marginTop: '24px', width: '100%' }}
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        </main>
      )
  }

  return (
    <main className="page auth-page">
      <div className="card">
        <div style={{ textAlign: 'center' }}>
          <h2>Join Organization</h2>
          <p className={status === 'error' ? 'error' : 'muted'} style={{ marginTop: '16px' }}>
            {message}
          </p>
          {status === 'error' && (
            <button 
              onClick={() => navigate('/dashboard')} 
              style={{ marginTop: '24px', width: '100%' }}
            >
              Go to Dashboard
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

export default AcceptInvitePage
