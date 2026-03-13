import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { getToken } from '../lib/authStorage'
import { useOrganization } from '../context/OrganizationContext'

function GlobalSearchPalette() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentOrg } = useOrganization()

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const isAuthPage = useMemo(
    () => location.pathname.startsWith('/login') || location.pathname.startsWith('/register'),
    [location.pathname],
  )

  useEffect(() => {
    function onKeyDown(event) {
      const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'
      if (!isShortcut) return
      if (!getToken() || isAuthPage) return
      event.preventDefault()
      setIsOpen(true)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isAuthPage])

  useEffect(() => {
    if (!isOpen) return

    function onEscape(event) {
      if (event.key === 'Escape') {
        closePalette()
      }
    }

    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || query.trim().length < 2) {
      setResults([])
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await apiClient.get('/api/search', {
          params: {
            q: query.trim(),
            organizationId: currentOrg?.id,
          },
        })
        setResults(Array.isArray(response.data) ? response.data : [])
      } catch {
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 220)

    return () => window.clearTimeout(timeoutId)
  }, [isOpen, query, currentOrg])

  function closePalette() {
    setIsOpen(false)
    setQuery('')
    setResults([])
  }

  function handleSelect(item) {
    if (item.projectId) {
      navigate(`/projects/${item.projectId}`)
    }
    closePalette()
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="global-search-overlay" role="presentation" onClick={closePalette}>
      <section
        className="global-search-card"
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="global-search-input-wrap">
          <input
            autoFocus
            type="text"
            placeholder="Search projects and tasks..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="muted">ESC</span>
        </div>

        <div className="global-search-results">
          {query.trim().length < 2 ? (
            <p className="muted">Type at least 2 characters to search.</p>
          ) : isLoading ? (
            <p className="muted">Searching...</p>
          ) : results.length === 0 ? (
            <p className="muted">No results found.</p>
          ) : (
            <ul className="global-search-list">
              {results.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    type="button"
                    className="global-search-item"
                    onClick={() => handleSelect(item)}
                  >
                    <span className="global-search-item-title">{item.title}</span>
                    <span className="global-search-item-subtitle">{item.subtitle}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

export default GlobalSearchPalette
