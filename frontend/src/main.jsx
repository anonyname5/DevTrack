import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { OrganizationProvider } from './context/OrganizationContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <OrganizationProvider>
        <App />
      </OrganizationProvider>
    </BrowserRouter>
  </StrictMode>,
)
