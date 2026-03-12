import { createContext, useContext, useState, useEffect } from 'react'
import apiClient from '../lib/apiClient'
import { getToken } from '../lib/authStorage'

const OrganizationContext = createContext()

export function OrganizationProvider({ children }) {
  const [organizations, setOrganizations] = useState([])
  const [currentOrg, setCurrentOrg] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (getToken()) {
      fetchOrganizations()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchOrganizations = async () => {
    try {
      const response = await apiClient.get('/api/organizations')
      const orgs = response.data
      setOrganizations(orgs)

      if (orgs.length > 0) {
        // Try to restore from localStorage or default to first
        const savedOrgId = localStorage.getItem('currentOrgId')
        const found = orgs.find(o => o.id === parseInt(savedOrgId))
        setCurrentOrg(found || orgs[0])
      }
    } catch (error) {
      console.error('Failed to fetch organizations', error)
    } finally {
      setLoading(false)
    }
  }

  const selectOrganization = (orgId) => {
    const org = organizations.find(o => o.id === orgId)
    if (org) {
      setCurrentOrg(org)
      localStorage.setItem('currentOrgId', org.id)
    }
  }

  const createOrganization = async (name) => {
    try {
      const response = await apiClient.post('/api/organizations', { name })
      const newOrg = response.data
      setOrganizations([...organizations, newOrg])
      selectOrganization(newOrg.id)
      return newOrg
    } catch (error) {
      console.error('Failed to create organization', error)
      throw error
    }
  }

  return (
    <OrganizationContext.Provider value={{
      organizations,
      currentOrg,
      loading,
      selectOrganization,
      createOrganization,
      refreshOrganizations: fetchOrganizations
    }}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  return useContext(OrganizationContext)
}
