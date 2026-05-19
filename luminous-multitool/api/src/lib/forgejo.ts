import { env } from '../env'

const ROOT = env.FORGEJO_INTERNAL_URL.replace(/\/$/, '')

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (env.FORGEJO_ADMIN_TOKEN) h.Authorization = `token ${env.FORGEJO_ADMIN_TOKEN}`
  return h
}

export interface ForgejoUser {
  id: number
  login: string
  full_name: string
  email: string
  avatar_url: string
}

export interface ForgejoRepo {
  id: number
  full_name: string
  size: number // kilobytes
  private: boolean
}

export async function getUser(username: string): Promise<ForgejoUser | null> {
  const res = await fetch(`${ROOT}/api/v1/users/${username}`, { headers: headers() })
  if (!res.ok) return null
  return res.json() as Promise<ForgejoUser>
}

export async function listUserRepos(username: string): Promise<ForgejoRepo[]> {
  const res = await fetch(
    `${ROOT}/api/v1/users/${username}/repos?limit=50`,
    { headers: headers() },
  )
  if (!res.ok) return []
  return res.json() as Promise<ForgejoRepo[]>
}

export async function getUserStorageMb(username: string): Promise<number> {
  const repos = await listUserRepos(username)
  const totalKb = repos.reduce((sum, r) => sum + (r.size || 0), 0)
  return Math.round((totalKb / 1024) * 100) / 100
}
