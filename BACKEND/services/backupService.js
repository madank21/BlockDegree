/**
 * Backup service — persists admin backups to Supabase Storage (with local fallback).
 */
const fs = require('fs');
const path = require('path');
const { getSupabaseAdmin } = require('../database/supabase');
const { logger } = require('../src/utils/logger');

const BUCKET = process.env.SUPABASE_BACKUP_BUCKET || 'backups';
const LOCAL_BACKUP_DIR = path.join(__dirname, '../backups');

function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_BACKUP_DIR)) {
    fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
  }
}

async function logBackup({ backupId, createdBy, filePath, fileSize, status, metadata }) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('backup_logs').insert({
    backup_id: backupId,
    created_by: createdBy || null,
    file_path: filePath,
    file_size: fileSize,
    status,
    metadata: metadata || {},
  });
  if (error) {
    logger.warn('[Backup] backup_logs insert failed:', error.message);
  }
}

async function uploadToStorage(backupId, jsonContent) {
  const supabase = getSupabaseAdmin();
  const storagePath = `${backupId}.json`;
  const buffer = Buffer.from(jsonContent, 'utf8');

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'application/json',
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  return { storagePath, fileSize: buffer.length, provider: 'supabase' };
}

function saveLocally(backupId, jsonContent) {
  ensureLocalDir();
  const filePath = path.join(LOCAL_BACKUP_DIR, `${backupId}.json`);
  fs.writeFileSync(filePath, jsonContent, 'utf8');
  return { storagePath: filePath, fileSize: Buffer.byteLength(jsonContent, 'utf8'), provider: 'local' };
}

async function createBackup(backupData, createdBy) {
  const backupId = `backup_${Date.now()}`;
  const jsonContent = JSON.stringify(backupData, null, 2);
  let result;

  try {
    result = await uploadToStorage(backupId, jsonContent);
  } catch (err) {
    logger.warn('[Backup] Cloud upload failed, using local fallback:', err.message);
    result = saveLocally(backupId, jsonContent);
  }

  await logBackup({
    backupId,
    createdBy,
    filePath: result.storagePath,
    fileSize: result.fileSize,
    status: 'completed',
    metadata: { provider: result.provider, version: backupData.version },
  });

  return { backupId, ...result, timestamp: backupData.timestamp };
}

async function downloadBackup(backupId) {
  const supabase = getSupabaseAdmin();
  const storagePath = backupId.endsWith('.json') ? backupId : `${backupId}.json`;

  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (!error && data) {
    const text = await data.text();
    return JSON.parse(text);
  }

  ensureLocalDir();
  const localPath = path.join(LOCAL_BACKUP_DIR, storagePath);
  if (fs.existsSync(localPath)) {
    return JSON.parse(fs.readFileSync(localPath, 'utf8'));
  }

  throw new Error(`Backup not found: ${backupId}`);
}

async function getLastBackupInfo() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('backup_logs')
    .select('backup_id, file_path, file_size, created_at, metadata')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    return {
      lastBackup: data.created_at,
      backupId: data.backup_id,
      filePath: data.file_path,
      fileSize: data.file_size,
      provider: data.metadata?.provider,
    };
  }

  ensureLocalDir();
  const files = fs.readdirSync(LOCAL_BACKUP_DIR).filter((f) => f.endsWith('.json'));
  if (!files.length) return { lastBackup: null };

  const sorted = files.sort((a, b) =>
    fs.statSync(path.join(LOCAL_BACKUP_DIR, b)).mtimeMs -
    fs.statSync(path.join(LOCAL_BACKUP_DIR, a)).mtimeMs
  );
  const stat = fs.statSync(path.join(LOCAL_BACKUP_DIR, sorted[0]));
  return {
    lastBackup: stat.mtime.toISOString(),
    backupId: sorted[0].replace('.json', ''),
    filePath: path.join(LOCAL_BACKUP_DIR, sorted[0]),
    provider: 'local',
  };
}

module.exports = {
  createBackup,
  downloadBackup,
  getLastBackupInfo,
  BUCKET,
};
