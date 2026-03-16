import { useState } from 'react'

function CopyLinkModal({ isOpen, onClose, title, message, link }) {
  const [copyLabel, setCopyLabel] = useState('Copy Link')

  if (!isOpen) return null

  async function handleCopy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link)
      } else {
        // Fallback for non-secure contexts (HTTP)
        const textArea = document.createElement("textarea")
        textArea.value = link
        textArea.style.position = "fixed"
        textArea.style.left = "-9999px"
        textArea.style.top = "0"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          document.execCommand('copy')
        } catch (err) {
          console.error('Fallback: Oops, unable to copy', err)
          setCopyLabel('Failed')
          return
        } finally {
          document.body.removeChild(textArea)
        }
      }
      
      setCopyLabel('Copied!')
      setTimeout(() => setCopyLabel('Copy Link'), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      setCopyLabel('Failed')
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h2>{title}</h2>
        <p className="muted" style={{ marginBottom: '16px' }}>{message}</p>
        
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          background: 'var(--surface-muted)', 
          padding: '8px', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <input 
            type="text" 
            readOnly 
            value={link} 
            style={{ 
              flex: 1, 
              border: 'none', 
              background: 'transparent', 
              fontSize: '13px',
              fontFamily: 'monospace',
              color: 'var(--text)',
              outline: 'none'
            }}
            onClick={(e) => e.target.select()}
          />
        </div>

        <div className="row">
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" onClick={handleCopy}>
            {copyLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

export default CopyLinkModal
