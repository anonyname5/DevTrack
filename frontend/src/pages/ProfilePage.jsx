import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../lib/apiClient'

function ProfilePage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    async function loadProfile() {
      setError('')
      setIsLoading(true)
      try {
        const response = await apiClient.get('/api/users/me')
        setFullName(response.data?.fullName ?? '')
        setEmail(response.data?.email ?? '')
        setCreatedAt(response.data?.createdAt ?? '')
      } catch (requestError) {
        setError(requestError?.response?.data?.message ?? 'Failed to load profile.')
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsSaving(true)

    try {
      const response = await apiClient.put('/api/users/me', {
        fullName,
        email,
      })

      setFullName(response.data?.fullName ?? fullName)
      setEmail(response.data?.email ?? email)
      setSuccessMessage('Profile updated successfully.')
    } catch (requestError) {
      setError(requestError?.response?.data?.message ?? 'Failed to update profile.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="page workspace-page">
      <section className="workspace-shell">
        <header className="workspace-header">
          <div>
            <h1>User Profile</h1>
            <p className="page-copy">Manage your basic account information.</p>
          </div>
          <div className="workspace-actions">
            <Link className="link-button ghost" to="/dashboard">Back to dashboard</Link>
          </div>
        </header>

        <section className="section-card" style={{ maxWidth: '760px' }}>
          <div className="section-heading">
            <div>
              <h2>Account details</h2>
              {createdAt ? (
                <p className="muted">Member since {new Date(createdAt).toLocaleDateString()}</p>
              ) : null}
            </div>
          </div>

          {isLoading ? (
            <div className="form">
              <span className="skeleton-line w-70" />
              <span className="skeleton-line w-60" />
              <span className="skeleton-line w-40" />
            </div>
          ) : (
            <form className="form" onSubmit={handleSubmit}>
              <label>
                Full name
                <input
                  type="text"
                  minLength={2}
                  maxLength={120}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>

              {error ? <p className="error">{error}</p> : null}
              {successMessage ? <p className="success-message">{successMessage}</p> : null}

              <div className="row" style={{ marginTop: '8px' }}>
                <button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          )}
        </section>
      </section>
    </main>
  )
}

export default ProfilePage
