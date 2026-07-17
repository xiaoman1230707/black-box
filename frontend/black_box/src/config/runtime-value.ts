const normalizeApiBaseUrl = (value: string | undefined) => {
  const normalized = value?.trim().replace(/\/+$/, "")

  if (!normalized) {
    throw new Error("VITE_API_BASE_URL is required")
  }

  return normalized
}

export { normalizeApiBaseUrl }
