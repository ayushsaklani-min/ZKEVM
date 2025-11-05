export const backend = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

export async function getMarkets() {
  const res = await fetch(`${backend}/markets`)
  return await res.json()
}
