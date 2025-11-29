/**
 * Field-level encryption for sensitive data
 * Uses AES-256-GCM for encrypting API credentials
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Get encryption key from environment
 * In production, use a proper KMS (AWS KMS, HashiCorp Vault, etc.)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable not set')
  }

  // Derive a proper key from the environment variable
  return crypto.pbkdf2Sync(key, 'salt', 100000, KEY_LENGTH, 'sha256')
}

/**
 * Encrypt a string value
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const tag = cipher.getAuthTag()

  // Return: iv + encrypted + tag (all hex encoded)
  return iv.toString('hex') + encrypted + tag.toString('hex')
}

/**
 * Decrypt an encrypted string
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext

  const key = getEncryptionKey()

  // Extract iv, encrypted data, and tag
  const iv = Buffer.from(ciphertext.slice(0, IV_LENGTH * 2), 'hex')
  const tag = Buffer.from(ciphertext.slice(-TAG_LENGTH * 2), 'hex')
  const encrypted = ciphertext.slice(IV_LENGTH * 2, -TAG_LENGTH * 2)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Helper to encrypt API credentials object
 */
export function encryptCredentials(credentials: {
  apiKey: string
  apiSecret: string
  apiPassphrase: string
}) {
  return {
    apiKey: encrypt(credentials.apiKey),
    apiSecret: encrypt(credentials.apiSecret),
    apiPassphrase: encrypt(credentials.apiPassphrase),
  }
}

/**
 * Helper to decrypt API credentials object
 */
export function decryptCredentials(encryptedCredentials: {
  apiKey: string
  apiSecret: string
  apiPassphrase: string
}) {
  return {
    apiKey: decrypt(encryptedCredentials.apiKey),
    apiSecret: decrypt(encryptedCredentials.apiSecret),
    apiPassphrase: decrypt(encryptedCredentials.apiPassphrase),
  }
}
