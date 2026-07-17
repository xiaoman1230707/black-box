import { normalizeApiBaseUrl } from "./runtime-value"

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

const apiUrl = (path: string) => {
  const normalizedPath = path.replace(/^\/+/, "")
  return normalizedPath ? `${API_BASE_URL}/${normalizedPath}` : API_BASE_URL
}

export { API_BASE_URL, apiUrl }
