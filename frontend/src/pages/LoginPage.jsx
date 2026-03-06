import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { setToken } from '../lib/authStorage'

function LoginPage() {
  const navigate = useNavigate()
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
      navigate('/dashboard')
    } catch (requestError) {
      setError(requestError?.response?.data?.message ?? 'Login failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page">
      <section className="card">
        <h1>DevTrack Login</h1>
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
          No account? <Link to="/register">Create one</Link>
        </p>
      </section>
    </main>
  )
}

export default LoginPage
