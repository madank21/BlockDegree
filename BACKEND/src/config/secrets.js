/**
 * Secrets loader — resolves PRIVATE_KEY from a secrets manager or secure mount.
 *
 * Resolution order:
 *   1. AWS Secrets Manager  (AWS_SECRETS_MANAGER_SECRET_ID + AWS_REGION)
 *   2. HashiCorp Vault      (VAULT_ADDR + VAULT_TOKEN + VAULT_SECRET_PATH)
 *   3. Mounted file         (PRIVATE_KEY_FILE)
 *   4. Environment variable (PRIVATE_KEY) — dev / legacy fallback
 */
const fs = require('fs');
const axios = require('axios');
const { logger } = require('../utils/logger');

let cachedPrivateKey = null;

async function loadFromAwsSecretsManager() {
  const secretId = process.env.AWS_SECRETS_MANAGER_SECRET_ID;
  if (!secretId) return null;

  try {
    const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
    const client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    const response = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
    const raw = response.SecretString;
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      return parsed.PRIVATE_KEY || parsed.privateKey || parsed.private_key || raw;
    } catch {
      return raw;
    }
  } catch (err) {
    logger.error('[Secrets] AWS Secrets Manager failed:', err.message);
    throw new Error(`Failed to load secret from AWS: ${err.message}`);
  }
}

async function loadFromVault() {
  const { VAULT_ADDR, VAULT_TOKEN, VAULT_SECRET_PATH } = process.env;
  if (!VAULT_ADDR || !VAULT_TOKEN || !VAULT_SECRET_PATH) return null;

  const url = `${VAULT_ADDR.replace(/\/$/, '')}/v1/${VAULT_SECRET_PATH.replace(/^\//, '')}`;
  const { data } = await axios.get(url, {
    headers: { 'X-Vault-Token': VAULT_TOKEN },
    timeout: 10000,
  });

  const secretData = data?.data?.data || data?.data || {};
  return secretData.PRIVATE_KEY || secretData.private_key || secretData.privateKey || null;
}

function loadFromFile() {
  const filePath = process.env.PRIVATE_KEY_FILE;
  if (!filePath) return null;
  if (!fs.existsSync(filePath)) {
    throw new Error(`PRIVATE_KEY_FILE not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8').trim();
}

async function getPrivateKey() {
  if (cachedPrivateKey) return cachedPrivateKey;

  let key = null;

  if (process.env.AWS_SECRETS_MANAGER_SECRET_ID) {
    key = await loadFromAwsSecretsManager();
  }

  if (!key && process.env.VAULT_ADDR) {
    key = await loadFromVault();
  }

  if (!key) {
    key = loadFromFile();
  }

  if (!key) {
    key = process.env.PRIVATE_KEY;
  }

  if (!key) {
    throw new Error(
      'No PRIVATE_KEY found. Set PRIVATE_KEY, PRIVATE_KEY_FILE, AWS_SECRETS_MANAGER_SECRET_ID, or VAULT_* env vars.'
    );
  }

  cachedPrivateKey = key.startsWith('0x') ? key : key;
  logger.info('[Secrets] Private key loaded successfully');
  return cachedPrivateKey;
}

module.exports = { getPrivateKey };
