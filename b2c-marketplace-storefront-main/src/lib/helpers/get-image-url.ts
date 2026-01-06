const stripTrailingSlash = (url: string) => url.replace(/\/$/, "")

export const getImageUrl = (image?: string | null) => {
  if (!image) return ""

  const backendUrl = stripTrailingSlash(process.env.MEDUSA_BACKEND_URL || "")
  const localBackend = "http://localhost:9000"

  let normalized = image

  try {
    normalized = decodeURIComponent(image)
  } catch (e) {
    normalized = image
  }

  if (normalized.startsWith(`${localBackend}/`) && backendUrl) {
    return `${backendUrl}${normalized.slice(localBackend.length)}`
  }

  if (normalized.startsWith("/static/") && backendUrl) {
    return `${backendUrl}${normalized}`
  }

  return normalized
}
