import { API_BASE_URL } from '@/config/api'

export type SearchParams = {
  q?: string
  risk?: string[]
  min_diameter_km?: number
  max_diameter_km?: number
  max_ld?: number
  window_days?: number
  page?: number
  page_size?: number
  sort?: string
}

export async function searchAsteroids(params: SearchParams) {
  const url = new URL(`${API_BASE_URL}/api/v1/asteroids/search`)
  Object.entries(params).forEach(([k, v]) => {
    if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) return
    if (Array.isArray(v)) v.forEach((vv) => url.searchParams.append(k, String(vv)))
    else url.searchParams.set(k, String(v))
  })
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`search_failed_${res.status}`)
  return res.json()
}

export async function compareAsteroids(ids: string[]) {
  const url = new URL(`${API_BASE_URL}/api/v1/asteroids/compare`)
  url.searchParams.set('ids', ids.join(','))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`compare_failed_${res.status}`)
  return res.json()
}

export function exportToCSV(filename: string, rows: any[]) {
  if (!rows || rows.length === 0) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(',')].concat(
    rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(','))
  ).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}


