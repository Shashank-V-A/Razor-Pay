/* eslint-disable no-bitwise */
export function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

export function bufferToBase64Url(buffer) {
  return bufferToBase64(buffer).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function hexToBase58(hex) {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  const bytes = new Uint8Array(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))
  const digits = [0]
  for (let i = 0; i < bytes.length; i += 1) {
    let carry = bytes[i]
    for (let j = 0; j < digits.length; j += 1) {
      const digit = digits[j] * 256 + carry
      digits[j] = digit % 58
      carry = Math.floor(digit / 58)
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = Math.floor(carry / 58)
    }
  }
  for (let k = 0; k < bytes.length && bytes[k] === 0; k += 1) {
    digits.push(0)
  }
  return digits
    .reverse()
    .map((digit) => alphabet[digit])
    .join('')
}

export function generateRandomId(prefix = 'id') {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return `${prefix}_${bufferToBase64Url(bytes.buffer)}`
}

export async function sha256(buffer) {
  const result = await crypto.subtle.digest('SHA-256', buffer)
  return new Uint8Array(result)
}

export async function deriveKeyFromPassphrase(passphrase, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 120000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
  return { key: derivedKey, salt }
}

export async function encryptWithKey(key, dataBuffer) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, dataBuffer)
  return { encrypted, iv }
}

export async function decryptWithKey(key, encrypted, iv) {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
}

export function createPseudoCid(hashHex) {
  const prefix = 'bafy'
  const slice = hashHex.slice(0, 46)
  return `${prefix}${slice}`
}

export function tryParseJSON(value) {
  try {
    return JSON.parse(value)
  } catch (err) {
    return null
  }
}

export function sortByDateDesc(items, key = 'createdAt') {
  return [...items].sort((a, b) => new Date(b[key]).getTime() - new Date(a[key]).getTime())
}


