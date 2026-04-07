export const MAX_NOTE_IMAGES = 8
export const MAX_IMAGE_BYTES = Math.floor(2.5 * 1024 * 1024)

export function formatNoteSavedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fileToDataUrl(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return Promise.resolve(null)
  if (file.size > MAX_IMAGE_BYTES) return Promise.resolve(null)
  return new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(typeof r.result === 'string' ? r.result : null)
    r.onerror = () => resolve(null)
    r.readAsDataURL(file)
  })
}
