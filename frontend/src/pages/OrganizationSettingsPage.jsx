import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { useOrganization } from '../context/OrganizationContext'
import ToastStack from '../components/ToastStack'
import CopyLinkModal from '../components/CopyLinkModal'
import ConfirmModal from '../components/ConfirmModal'

function OrganizationSettingsPage() {
  const navigate = useNavigate()
  const { currentOrg, organizations, refreshOrganizations } = useOrganization()
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState(2) // Default to Member (2)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingOrg, setIsDeletingOrg] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const [error, setError] = useState('')
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    link: ''
  })

  function showToast(message, type = 'success') {
    const toastId = Date.now() + Math.random()
    setToasts((currentToasts) => [...currentToasts, { id: toastId, message, type }])
    window.setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId))
    }, 3000)
  }

  const loadData = useCallback(async () => {
    setError('')
    try {
      // Fetch members (allowed for all members)
      const membersRes = await apiClient.get(`/api/organizations/${currentOrg.id}/members`)
      setMembers(membersRes.data)

      // Fetch invitations only if Admin or Owner (0 or 1)
      if (currentOrg.role === 0 || currentOrg.role === 1) {
        const invitesRes = await apiClient.get(`/api/invitations/pending?organizationId=${currentOrg.id}`)
        setInvitations(invitesRes.data)
      } else {
        setInvitations([])
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load organization data.')
    }
  }, [currentOrg])

  useEffect(() => {
    if (currentOrg) {
      loadData()
    }
  }, [currentOrg, loadData])

  const canManageInvites = currentOrg && (currentOrg.role === 0 || currentOrg.role === 1)
  const ownerOrgCount = organizations.filter((org) => org.role === 0).length
  const canDeleteCurrentOrg = currentOrg?.role === 0 && ownerOrgCount > 1

  async function handleInvite(e) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await apiClient.post('/api/invitations', {
        email: inviteEmail,
        organizationId: currentOrg.id,
        role: parseInt(inviteRole)
      })
      showToast('Invitation sent successfully.')
      
      // Show custom modal with link
      const inviteLink = `${window.location.origin}/accept-invite?token=${response.data.token}`
      setModalState({
        isOpen: true,
        title: 'Invitation Created',
        message: 'Share this link with the user to invite them to your organization:',
        link: inviteLink
      })
      console.log('Invitation Link:', inviteLink)
      
      setInviteEmail('')
      loadData()
    } catch (err) {
      showToast(err.response?.data || 'Failed to send invitation.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRevoke(id) {
    if (!confirm('Are you sure you want to revoke this invitation?')) return
    try {
      await apiClient.delete(`/api/invitations/${id}`)
      showToast('Invitation revoked.')
      loadData()
    } catch (err) {
      console.error(err)
      showToast('Failed to revoke invitation.', 'error')
    }
  }

  async function handleDeleteOrganization() {
    if (!currentOrg) return
    setIsDeletingOrg(true)
    try {
      await apiClient.delete(`/api/organizations/${currentOrg.id}`)
      await refreshOrganizations()
      showToast('Organization deleted.')
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.message || 'Failed to delete organization.', 'error')
    } finally {
      setIsDeletingOrg(false)
      setIsDeleteModalOpen(false)
    }
  }

  const getRoleName = (roleId) => {
    switch (roleId) {
      case 0: return 'Owner'
      case 1: return 'Admin'
      case 2: return 'Member'
      case 3: return 'Viewer'
      default: return 'Unknown'
    }
  }

  if (!currentOrg) return <div className="page">Loading...</div>

  return (
    <main className="page workspace-page">
      <section className="workspace-shell">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Organization Settings</p>
            <h1>{currentOrg.name}</h1>
            <p className="page-copy">Manage members and invitations.</p>
          </div>
          <div className="workspace-actions">
            <button className="ghost" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
          </div>
        </header>

        {error && <p className="error">{error}</p>}

        {canManageInvites && (
          <div className="stats-grid org-settings-grid">
              <section className="section-card">
              <div className="section-heading">
                  <h2>Invite Member</h2>
              </div>
              <form className="form" onSubmit={handleInvite}>
                  <label>
                  Email Address
                  <input 
                      type="email" 
                      required 
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                  />
                  </label>
                  <label>
                  Role
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                      <option value={1}>Admin</option>
                      <option value={2}>Member</option>
                      <option value={3}>Viewer</option>
                  </select>
                  </label>
                  <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send Invitation'}
                  </button>
              </form>
              </section>

              <section className="section-card">
              <div className="section-heading">
                  <h2>Pending Invitations</h2>
              </div>
              {invitations.length === 0 ? (
                  <p className="muted">No pending invitations.</p>
              ) : (
                  <ul className="list">
                  {invitations.map(inv => (
                      <li key={inv.id} className="org-list-item">
                      <div className="org-list-content">
                          <strong>{inv.email}</strong>
                          <span className="muted">{getRoleName(inv.role)} • Expires {new Date(inv.expiresAt).toLocaleDateString()}</span>
                      </div>
                      <button className="ghost danger btn-sm" onClick={() => handleRevoke(inv.id)}>Revoke</button>
                      </li>
                  ))}
                  </ul>
              )}
              </section>
          </div>
        )}

        <section className="section-card">
          <div className="section-heading">
            <h2>Members ({members.length})</h2>
          </div>
          <ul className="list">
            {members.map(member => (
              <li key={member.id} className="org-list-item">
                <div className="org-list-content">
                  <strong>{member.email}</strong>
                  <span className="muted">Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                </div>
                <span className="section-badge">{getRoleName(member.role)}</span>
              </li>
            ))}
          </ul>
        </section>

        {currentOrg.role === 0 ? (
          <section className="section-card">
            <div className="section-heading">
              <h2>Danger Zone</h2>
            </div>
            <p className="muted">
              Deleting this organization removes its projects, tasks, and memberships permanently.
              {!canDeleteCurrentOrg ? ' You cannot delete your last owned organization.' : ''}
            </p>
            <div className="row" style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="danger"
                onClick={() => setIsDeleteModalOpen(true)}
                disabled={isDeletingOrg || !canDeleteCurrentOrg}
              >
                {isDeletingOrg ? 'Deleting...' : 'Delete Organization'}
              </button>
            </div>
          </section>
        ) : null}
      </section>
      <ToastStack toasts={toasts} />
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Organization?"
        message={`"${currentOrg.name}" will be permanently deleted, including projects, tasks, and memberships.`}
        confirmLabel={isDeletingOrg ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        onConfirm={handleDeleteOrganization}
        onCancel={() => {
          if (!isDeletingOrg) setIsDeleteModalOpen(false)
        }}
      />
      <CopyLinkModal 
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        title={modalState.title}
        message={modalState.message}
        link={modalState.link}
      />
    </main>
  )
}

export default OrganizationSettingsPage
