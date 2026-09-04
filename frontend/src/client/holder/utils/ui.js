export async function copyToClipboard(value) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value)
    return true
  }

  const textArea = document.createElement('textarea')
  textArea.value = value
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  textArea.style.left = '-9999px'
  textArea.style.top = '-9999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()

  let success = false
  try {
    success = document.execCommand('copy')
  } catch (err) {
    success = false
  } finally {
    document.body.removeChild(textArea)
  }
  return success
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function formatDateTime(value) {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function truncate(value, size = 10) {
  if (!value) return ''
  if (value.length <= size * 2) return value
  return `${value.slice(0, size)}…${value.slice(-size)}`
}


