import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { setToken } from '../lib/authStorage'

function RegisterPage() {
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
      const response = await apiClient.post('/api/auth/register', {
        email,
        password,
      })

      setToken(response.data.token)
      navigate('/dashboard')
    } catch (requestError) {
      setError(requestError?.response?.data?.message ?? 'Registration failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Create account</h1>
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
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  )
}

export default RegisterPage
