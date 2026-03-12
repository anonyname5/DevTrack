import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { setToken } from '../lib/authStorage'

function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await apiClient.post('/api/auth/login', {
        email,
        password,
      })

      setToken(response.data.token)
      navigate(returnUrl || '/dashboard')
    } catch (requestError) {
      setError(requestError?.response?.data?.message ?? 'Login failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page auth-page">
      <section className="auth-shell">
        <aside className="auth-aside">
          <p className="eyebrow">DevTrack workspace</p>
          <h1>Modern delivery tracking for teams building with confidence.</h1>
          <p className="auth-copy">
            Sign in to manage projects, track milestones, and keep delivery progress visible
            across your workspace.
          </p>
          <div className="auth-feature-list">
            <article className="auth-feature-card">
              <strong>Centralized project visibility</strong>
              <p className="muted">Monitor active work, progress trends, and delivery status in one place.</p>
            </article>
            <article className="auth-feature-card">
              <strong>Structured execution</strong>
              <p className="muted">Organize tasks, keep priorities clear, and maintain a professional workflow.</p>
            </article>
          </div>
        </aside>

        <section className="card auth-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Welcome back</p>
              <h2>Sign in to DevTrack</h2>
            </div>
            <p className="muted">Use your account to access your workspace dashboard.</p>
          </div>

          <form className="form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="helper">
            No account? <Link to={`/register${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}>Create one now</Link>
          </p>
        </section>
      </section>
    </main>
  )
}

export default LoginPage
