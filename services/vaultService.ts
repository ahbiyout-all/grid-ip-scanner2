/**
 * Grid IP Scanner2 - Secure Vault Service (Web Crypto + Native Vault DLL Bridge)
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

const VAULT_MAGIC_PREFIX = 'GVAULT10_';
const DEFAULT_SALT = new TextEncoder().encode('CISNET_GRID_SECURE_SALT_V1');

/**
 * Derives an AES-GCM CryptoKey from a passphrase using PBKDF2.
 */
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: DEFAULT_SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string into a Secure Vault envelope format.
 */
export async function encryptToVault(
  plaintext: string,
  passphrase = 'CISNET_GRID_DEFAULT_MACHINE_KEY'
): Promise<string> {
  try {
    if (!crypto.subtle) {
      // Fallback base64 container if crypto is restricted
      return `${VAULT_MAGIC_PREFIX}B64:${btoa(unescape(encodeURIComponent(plaintext)))}`;
    }

    const key = await deriveKey(passphrase);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encodedData = enc.encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encodedData
    );

    // Combine IV (12 bytes) + Ciphertext into single base64
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    let binary = '';
    const bytes = new Uint8Array(combined);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return `${VAULT_MAGIC_PREFIX}${btoa(binary)}`;
  } catch (err) {
    console.warn('Secure Vault encryption fallback:', err);
    return `${VAULT_MAGIC_PREFIX}B64:${btoa(unescape(encodeURIComponent(plaintext)))}`;
  }
}

/**
 * Decrypts a Secure Vault envelope format string back into plaintext.
 */
export async function decryptFromVault(
  vaultString: string,
  passphrase = 'CISNET_GRID_DEFAULT_MACHINE_KEY'
): Promise<string> {
  try {
    if (!vaultString.startsWith(VAULT_MAGIC_PREFIX)) {
      // Unencrypted raw legacy string
      return vaultString;
    }

    const payload = vaultString.slice(VAULT_MAGIC_PREFIX.length);
    if (payload.startsWith('B64:')) {
      return decodeURIComponent(escape(atob(payload.slice(4))));
    }

    if (!crypto.subtle) {
      return vaultString;
    }

    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);
    const key = await deriveKey(passphrase);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (err) {
    console.error('Secure Vault decryption failed:', err);
    throw new Error('Vault decryption or authentication tag mismatch');
  }
}

/**
 * Checks if a string is encrypted with the Secure Vault format.
 */
export function isVaultEncrypted(str: string): boolean {
  return typeof str === 'string' && str.startsWith(VAULT_MAGIC_PREFIX);
}
