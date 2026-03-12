import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { setToken } from '../lib/authStorage'
import LoadingOverlay from '../components/LoadingOverlay'

function RegisterPage() {
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
      const response = await apiClient.post('/api/auth/register', {
        email,
        password,
      })

      setToken(response.data.token)
      navigate(returnUrl || '/dashboard')
    } catch (requestError) {
      setError(requestError?.response?.data?.message ?? 'Registration failed.')
      setIsSubmitting(false)
    }
    // Note: We don't set isSubmitting(false) on success to prevent flashing the form before navigation
  }

  return (
    <main className="page auth-page">
      <LoadingOverlay isLoading={isSubmitting} message="Creating account..." />
      <section className="auth-shell">
        <aside className="auth-aside">
          <p className="eyebrow">Operations workspace</p>
          <h1>Launch a shared workspace built for structured delivery.</h1>
          <p className="auth-copy">
            Create your account to start organizing projects, coordinating tasks, and preparing
            DevTrack for a larger team workflow.
          </p>
          <div className="auth-feature-list">
            <article className="auth-feature-card">
              <strong>Project visibility</strong>
              <p className="muted">Keep workstreams, milestones, and task completion easy to review.</p>
            </article>
            <article className="auth-feature-card">
              <strong>Built to grow</strong>
              <p className="muted">Start simple today and evolve into a richer team platform over time.</p>
            </article>
          </div>
        </aside>

        <section className="card auth-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Get started</p>
              <h2>Create your DevTrack account</h2>
            </div>
            <p className="muted">Provision your workspace and begin tracking delivery with confidence.</p>
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
              Password (min 8 chars)
              <input
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create account'}
            </button>
          </form>

          <p className="helper">
            Already registered? <Link to={`/login${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}>Sign in</Link>
          </p>
        </section>
      </section>
    </main>
  )
}

export default RegisterPage
