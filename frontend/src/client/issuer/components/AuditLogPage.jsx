import React, { useMemo, useState } from 'react'
import Icon from '../../components/Icon'
import { formatDateTime, stellarTxUrl } from '../../utils/format'

/** Only actions this app actually writes. The old list advertised eight dead ones. */
const ACTIONS = [
  { value: 'all', label: 'All actions' },
  { value: 'create', label: 'Create hackathon' },
  { value: 'select_winners', label: 'Select winners' },
  { value: 'create_payout', label: 'Create payout' },
  { value: 'execute', label: 'Execute payout' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
]

const ACTION_ICON = {
  create: 'calendar',
  select_winners: 'trophy',
  create_payout: 'send',
  execute: 'checkCircle',
  update: 'edit',
  delete: 'trash',
}

const ACTION_LABEL = {
  create: 'Create',
  select_winners: 'Select winners',
  create_payout: 'Create payout',
  execute: 'Execute',
  update: 'Update',
  delete: 'Delete',
}

/**
 * RFC 4180 field escaping. Without this, any comma in `details` shifted every
 * later column -- and audit details routinely contain commas, e.g.
 * "Timeline saved for X (3 events, previously 2)".
 */
function csvField(value) {
  const text = value == null ? '' : String(value)
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function csvRow(fields) {
  return fields.map(csvField).join(',')
}

export default function AuditLogPage({ logs = [] }) {
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredLogs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    return logs.filter((log) => {
      if (filter !== 'all' && log.action !== filter) return false
      if (!search) return true
      return [log.user, log.details, log.hackathonId, log.txHash, log.wallet]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(search))
    })
  }, [logs, filter, searchTerm])

  const handleExport = () => {
    const csv = [
      csvRow(['Timestamp', 'Action', 'User', 'Hackathon', 'Details', 'Wallet', 'Tx Hash']),
      ...filteredLogs.map((log) =>
        csvRow([
          log.timestamp,
          log.action,
          log.user,
          log.hackathonId,
          log.details,
          log.wallet,
          log.txHash,
        ]),
      ),
    ].join('\r\n')

    // BOM so Excel reads UTF-8 correctly.
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prizevault-audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="pv-card">
      <div className="pv-card__header">
        <div>
          <h3 className="pv-card__title">Activity</h3>
          <p className="pv-card__subtitle">
            {filteredLogs.length} of {logs.length} entr{logs.length === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <div className="pv-card__actions">
          <button
            type="button"
            className="pv-btn pv-btn--secondary pv-btn--sm"
            onClick={handleExport}
            disabled={filteredLogs.length === 0}
          >
            <Icon name="download" size={14} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="pv-card__body pv-card__body--tight">
        <div className="pv-toolbar">
          <div className="pv-search">
            <span className="pv-search__icon">
              <Icon name="search" size={14} />
            </span>
            <input
              type="search"
              className="pv-input"
              placeholder="Search details, wallet or tx hash"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search audit logs"
            />
          </div>
          <label className="pv-field" style={{ minWidth: 0, width: '100%', maxWidth: 320 }}>
            <span className="pv-sr-only">Filter by action</span>
            <select
              className="pv-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="pv-empty">
          <span className="pv-empty__icon">
            <Icon name="list" size={20} />
          </span>
          <h4 className="pv-empty__title">
            {logs.length === 0 ? 'No activity yet' : 'No matching entries'}
          </h4>
          <p className="pv-empty__text">
            {logs.length === 0
              ? 'Creating events, selecting winners and executing payouts are all recorded here.'
              : 'Try a different search term or action filter.'}
          </p>
        </div>
      ) : (
        <div className="pv-card__body pv-card__body--flush">
          <div className="pv-table-wrap">
            <table className="pv-table pv-table--hover">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Action</th>
                  <th scope="col">By</th>
                  <th scope="col">Details</th>
                  <th scope="col">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <tr key={`${log.timestamp}-${index}`}>
                    <td data-label="When">{formatDateTime(log.timestamp)}</td>
                    <td data-label="Action">
                      <span className="pv-badge">
                        <Icon name={ACTION_ICON[log.action] || 'list'} size={12} />
                        {ACTION_LABEL[log.action] || log.action || 'Update'}
                      </span>
                    </td>
                    <td data-label="By">{log.user || 'System'}</td>
                    <td data-label="Details">{log.details || <span className="pv-dim">--</span>}</td>
                    <td data-label="Transaction">
                      {log.txHash ? (
                        <a
                          href={stellarTxUrl(log.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pv-mono"
                          style={{ fontSize: 'var(--pv-text-xs)' }}
                        >
                          {String(log.txHash).slice(0, 10)}...
                          <Icon name="external" size={11} />
                        </a>
                      ) : (
                        <span className="pv-dim">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
