import axios from 'axios'
import { getToken, clearToken } from './authStorage'

const defaultBaseUrl = import.meta.env.DEV ? 'http://localhost:5072' : ''

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? defaultBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearToken()
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = `/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
