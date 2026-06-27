/**
 * Restore / import service — upserts backup JSON into Supabase tables.
 * Requires explicit confirm=true to prevent accidental data overwrite.
 */
const { getSupabaseAdmin } = require('../database/supabase');
const { logger } = require('../src/utils/logger');

function userToRow(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    password_hash: u.passwordHash || u.password_hash,
    role: u.role,
    student_id: u.studentId || u.student_id || null,
    institution_id: u.institutionId || u.institution_id || null,
    institution_name: u.institutionName || u.institution_name || null,
    wallet_address: u.walletAddress || u.wallet_address || null,
    is_active: u.isActive ?? u.is_active ?? true,
    email_verified: u.emailVerified ?? u.email_verified ?? false,
    avatar_url: u.avatarUrl || u.avatar_url || null,
    metadata: u.metadata || {},
    updated_at: new Date().toISOString(),
  };
}

function degreeToRow(d) {
  return {
    id: d.id,
    student_name: d.studentName || d.student_name,
    student_id: d.studentId || d.student_id,
    graduate_id: d.graduateId || d.graduate_id || null,
    graduate_email: d.graduateEmail || d.graduate_email || null,
    degree_title: d.degreeTitle || d.degree_title,
    field_of_study: d.fieldOfStudy || d.field_of_study,
    graduation_date: d.graduationDate || d.graduation_date,
    gpa: d.gpa ?? null,
    honors: d.honors ?? null,
    metadata: d.metadata || {},
    institution_id: d.institutionId || d.institution_id || null,
    institution_name: d.institutionName || d.institution_name || null,
    issued_by: d.issuedBy || d.issued_by || null,
    degree_hash: d.degreeHash || d.degree_hash,
    certificate_number: d.certificateNumber || d.certificate_number || null,
    status: d.status || 'pending',
    blockchain_sync_status: d.blockchainSyncStatus || d.blockchain_sync_status || 'queued',
    blockchain_tx_hash: d.blockchainTxHash || d.blockchain_tx_hash || null,
    blockchain_block_number: d.blockchainBlockNumber || d.blockchain_block_number || null,
    blockchain_timestamp: d.blockchainTimestamp || d.blockchain_timestamp || null,
    qr_code_url: d.qrCodeUrl || d.qr_code_url || null,
    document_hash: d.documentHash || d.document_hash || null,
    document_url: d.documentUrl || d.document_url || null,
    updated_at: new Date().toISOString(),
  };
}

function documentToRow(doc) {
  return {
    id: doc.id,
    user_id: doc.userId || doc.user_id || null,
    degree_id: doc.degreeId || doc.degree_id || null,
    file_name: doc.fileName || doc.file_name,
    file_path: doc.filePath || doc.file_path || null,
    file_size: doc.fileSize || doc.file_size || null,
    mime_type: doc.mimeType || doc.mime_type || null,
    document_type: doc.documentType || doc.document_type || doc.type || null,
    ocr_status: doc.ocrStatus || doc.ocr_status || 'pending',
    yolo_status: doc.yoloStatus || doc.yolo_status || 'pending',
    validation_status: doc.validationStatus || doc.validation_status || 'pending',
    ocr_text: doc.ocrText || doc.ocr_text || null,
    metadata: doc.metadata || {},
    updated_at: new Date().toISOString(),
  };
}

async function upsertBatch(table, rows, onConflict = 'id') {
  if (!rows?.length) return 0;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  return rows.length;
}

async function restoreBackupData(backupData, { includeAuditLogs = false } = {}) {
  const users = backupData.users || [];
  const degrees = backupData.degrees || [];
  const documents = backupData.documents || [];
  const auditLogs = backupData.auditLogs || [];

  const userRows = users.filter((u) => u.id && u.email).map(userToRow);
  const degreeRows = degrees.filter((d) => d.id).map(degreeToRow);
  const docRows = documents.filter((d) => d.id).map(documentToRow);

  const counts = {
    users: await upsertBatch('users', userRows),
    degrees: await upsertBatch('degrees', degreeRows),
    documents: await upsertBatch('documents', docRows),
    auditLogs: 0,
  };

  if (includeAuditLogs && auditLogs.length) {
    const supabase = getSupabaseAdmin();
    const logRows = auditLogs
      .filter((l) => l.id)
      .map((l) => ({
        id: l.id,
        action: l.action,
        actor_id: l.actorId || l.actor_id || null,
        actor_role: l.actorRole || l.actor_role || null,
        target_id: l.targetId || l.target_id || null,
        target_type: l.targetType || l.target_type || null,
        details: l.details || {},
        ip_address: l.ipAddress || l.ip_address || null,
        created_at: l.createdAt || l.created_at || new Date().toISOString(),
      }));
    const { error } = await supabase.from('audit_logs').upsert(logRows, { onConflict: 'id' });
    if (error) throw new Error(`audit_logs upsert failed: ${error.message}`);
    counts.auditLogs = logRows.length;
  }

  logger.info('[Restore] Completed:', counts);
  return counts;
}

function validateBackupFormat(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup — expected JSON object');
  }
  if (!Array.isArray(data.users) || !Array.isArray(data.degrees)) {
    throw new Error('Invalid backup format — missing users or degrees arrays');
  }
  return {
    users: data.users.length,
    degrees: data.degrees.length,
    documents: data.documents?.length || 0,
    auditLogs: data.auditLogs?.length || 0,
    timestamp: data.timestamp || data.exportedAt,
  };
}

module.exports = {
  restoreBackupData,
  validateBackupFormat,
};
