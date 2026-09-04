const AUDIT_LOG_STORAGE_KEY = 'prize_vault_issuer_audit_logs'

function readStoredLogs() {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (_) {
    return []
  }
}

function writeStoredLogs(logs) {
  try {
    localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(logs))
  } catch (_) {
    // ignore storage write errors
  }
}

export function getIssuerAuditLogs() {
  return readStoredLogs()
}

export function appendIssuerAuditLog(entry) {
  const logs = readStoredLogs()
  const newLog = {
    timestamp: new Date().toISOString(),
    action: entry?.action || 'update',
    user: entry?.user || 'Organizer',
    credentialId: entry?.credentialId || null,
    details: entry?.details || '',
    txHash: entry?.txHash || null,
    wallet: entry?.wallet || null,
    hackathonId: entry?.hackathonId || null,
  }
  const next = [newLog, ...logs].slice(0, 1000)
  writeStoredLogs(next)
  try {
    window.dispatchEvent(new CustomEvent('prize_vault_audit_logs_updated'))
  } catch (_) {
    // ignore
  }
}

