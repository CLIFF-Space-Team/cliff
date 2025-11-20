let cache: Record<string, any> | null = null

function parseSimpleYaml(yaml: string): any {
  const result: any = {}
  let currentSection: string | null = null
  yaml.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    if (!line.startsWith(' ')) {
      const [key] = trimmed.split(':')
      currentSection = key
      result[currentSection] = result[currentSection] || {}
    } else if (currentSection) {
      const m = trimmed.match(/(\w+):\s*"?([^"]*)"?$/)
      if (m) {
        const [, k, v] = m
        result[currentSection][k] = v
      }
    }
  })
  return result
}

export async function loadMessages(): Promise<Record<string, any>> {
  if (cache) return cache
  try {
    const res = await fetch('/messages.yml')
    const text = await res.text()
    cache = parseSimpleYaml(text)
  } catch (_e) {
    cache = {}
  }
  return cache!
}

export async function getMessage(path: string, fallback?: string): Promise<string> {
  const obj = await loadMessages()
  const parts = path.split('.')
  let cur: any = obj
  for (const p of parts) {
    cur = cur?.[p]
    if (cur == null) return fallback ?? path
  }
  return typeof cur === 'string' ? cur : fallback ?? path
}

