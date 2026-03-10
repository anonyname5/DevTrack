import axios from 'axios'
import { getToken } from './authStorage'

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

export default apiClient
