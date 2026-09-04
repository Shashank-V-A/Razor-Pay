/**
 * Parse timeline events from PDF text.
 * Primary format: Hackathon_Event_Card_Format.pdf
 *   Event #N
 *   TIME / SLOT: 09:00 AM - 10:00 AM
 *   TITLE: Registration & Check-in
 *   DETAILS: Optional description...
 */

const EVENT_CARD_HEADER = /^Hackathon Timeline\s*-\s*Event Card Format\s*/i

/** One event block in the event-card PDF layout (pdf.js often flattens to a single line). */
const EVENT_CARD_BLOCK_RE =
  /Event\s*#\s*\d+\s*TIME\s*\/\s*SLOT:\s*(.+?)\s*TITLE:\s*(.+?)\s*DETAILS:\s*(.+?)(?=\s*Event\s*#\s*\d+\s*TIME\s*\/\s*SLOT:|$)/gis

const TIME_LINE_RE =
  /^(\d{1,2}(?::\d{2})?\s?(?:AM|PM|am|pm)?\s?(?:-|–|to)\s?\d{1,2}(?::\d{2})?\s?(?:AM|PM|am|pm)?|\d{1,2}(?::\d{2})?\s?(?:AM|PM|am|pm))\b/

function defaultCreateId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function collapseWhitespace(text) {
  return (text || '').replace(/\s+/g, ' ').trim()
}

function cleanField(value) {
  return collapseWhitespace(value).replace(/\s+([,.;:!?])/g, '$1')
}

/**
 * Event Card Format (reference: Hackathon_Event_Card_Format.pdf)
 */
export function parseEventCardFormat(text, createId = defaultCreateId) {
  const normalized = collapseWhitespace(text.replace(EVENT_CARD_HEADER, ''))
  if (!/Event\s*#\s*\d+\s*TIME\s*\/\s*SLOT:/i.test(normalized)) {
    return []
  }

  const events = []
  for (const match of normalized.matchAll(EVENT_CARD_BLOCK_RE)) {
    const time = cleanField(match[1])
    const title = cleanField(match[2])
    const details = cleanField(match[3])
    if (!time && !title && !details) continue
    events.push({
      id: createId(),
      time,
      title,
      details,
    })
  }

  return events.slice(0, 100)
}

/**
 * Line-oriented fallback for PDFs that expose one row per line with leading times.
 */
export function parseGenericTimeline(text, createId = defaultCreateId) {
  const lines = (text || '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const events = []
  let current = null

  for (const rawLine of lines) {
    const line = rawLine.replace(/^[\u2022\-*]\s*/, '')
    const timeMatch = line.match(TIME_LINE_RE)

    if (timeMatch) {
      if (current && (current.time || current.title || current.details)) {
        events.push(current)
      }
      const time = timeMatch[1].trim()
      const title = line.slice(timeMatch[0].length).replace(/^[-:–]\s*/, '').trim()
      current = {
        id: createId(),
        time,
        title,
        details: '',
      }
      continue
    }

    if (!current) {
      if (line.length > 8) {
        current = {
          id: createId(),
          time: '',
          title: line,
          details: '',
        }
      }
      continue
    }

    if (!current.title) {
      current.title = line
    } else {
      current.details = current.details ? `${current.details}\n${line}` : line
    }
  }

  if (current && (current.time || current.title || current.details)) {
    events.push(current)
  }

  return events.slice(0, 100)
}

/**
 * Try event-card format first, then generic line parsing.
 */
export function extractTimelineEventsFromText(text, createId = defaultCreateId) {
  const eventCardEvents = parseEventCardFormat(text, createId)
  if (eventCardEvents.length) return eventCardEvents
  return parseGenericTimeline(text, createId)
}

/**
 * Build readable text from pdf.js text items, inserting line breaks when Y shifts.
 */
export function textFromPdfContentItems(items) {
  if (!items?.length) return ''

  const rows = []
  let currentRow = []
  let lastY = null
  const rowTolerance = 4

  for (const item of items) {
    const str = 'str' in item ? item.str : ''
    if (!str) continue

    const y = item.transform?.[5]
    if (lastY !== null && y !== undefined && Math.abs(y - lastY) > rowTolerance) {
      if (currentRow.length) {
        rows.push(currentRow.join(' '))
        currentRow = []
      }
    }

    currentRow.push(str)
    if (y !== undefined) lastY = y
  }

  if (currentRow.length) rows.push(currentRow.join(' '))
  return rows.join('\n')
}
