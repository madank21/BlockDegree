// BACKEND/controllers/adminController.js
//
// FIXES applied (Audit Report §7, re-verified against current codebase):
//   FIX-1: Degree.count()   → (await Degree.findMany({ limit:1 })).total
//   FIX-2: User.count()     → User.count() — method exists in User model ✓
//   FIX-3: Document.count() → (await Document.findAll({ limit:1 })).total
//   FIX-4: Degree.findAll() → (await Degree.findMany({ limit:9999 })).data
//   FIX-5: User.findAll()   → (await User.findMany({ limit:9999 })).data
//   FIX-6: Document.findAll() → (await Document.findAll({ limit:9999 })).data
//   FIX-7: AuditLog.findAll() → (await AuditLog.findMany({ limit:9999 })).data
//   FIX-8: Document.destroy({ where: {...} }) → direct Supabase delete (Document
//          model has no destroy/bulk-delete method)
//   FIX-9: Degree.findAll({ where: { degreeHash: null } }) → Supabase .is('degree_hash', null)
//   FIX-10: sendPaginated signature aligned with response.js (data, paginationObj, message)
//   FIX-11: asyncHandler wrapper added to all handlers
//   FIX-12: Added { getSupabaseAdmin } for direct DB queries where needed
//   FIX-13 (NEW): Document model only exposes findAll() — NOT findMany(). A
//          previous pass renamed every OTHER model's findAll→findMany but
//          accidentally did the same to Document, which has no findMany().
//          getStats(), createBackup(), and exportData() were throwing
//          "Document.findMany is not a function" on every single call.
//          Reverted those three call sites back to Document.findAll().
//   FIX-14 (NEW): importData() read req.file.buffer, but uploadImport uses
//          multer.diskStorage (not memoryStorage) — .buffer is always
//          undefined there. Switched to req.file.path + fs.readFileSync,
//          and now cleans up the temp upload afterward.

'use strict';

const { asyncHandler }  = require('../middleware/errorMiddleware');
const { sendSuccess, sendError, sendNotFound } = require('../src/utils/response');
const Degree    = require('../models/Degree');
const Document  = require('../models/Document');
const User      = require('../models/User');
const AuditLog  = require('../models/AuditLog');
const { getSupabaseAdmin } = require('../database/supabase');
const { logger } = require('../src/utils/logger');
const fs   = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../backups');

// ─── Helper: ensure backup directory exists ───────────────────────────────────
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// ─── GET /api/v1/admin/stats ──────────────────────────────────────────────────
// FIX-1,2,3: replaced Degree.count(), User.count(), Document.count() (Sequelize)
exports.getStats = asyncHandler(async (req, res) => {
  // Run all counts concurrently
  const [userCount, degreeCount, docResult, auditResult] = await Promise.all([
    // FIX-2: User.count() already exists in User model
    User.count(),
    // FIX-1: Degree has no .count() — use findMany with limit:1 to get total
    Degree.findMany({ page: 1, limit: 1 }).then(r => r.total),
    // FIX-3: Document has no .count() — same pattern
    Document.findAll({ page: 1, limit: 1 }).then(r => r.total), // FIX: Document model has findAll(), not findMany()
    // Today's audit log count
    AuditLog.getTodayCount().catch(() => 0),
  ]);

  // Disk usage for uploads directory (non-fatal)
  let diskUsed = 0;
  let diskTotal = 100 * 1024 * 1024; // 100 MB default
  try {
    const uploadsDir = path.join(__dirname, '../uploads');
    if (fs.existsSync(uploadsDir)) {
      const getDirSize = (dirPath) => {
        let size = 0;
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          try {
            const stat = fs.statSync(itemPath);
            size += stat.isDirectory() ? getDirSize(itemPath) : stat.size;
          } catch { /* skip unreadable files */ }
        }
        return size;
      };
      diskUsed = getDirSize(uploadsDir);
    }
  } catch (err) {
    logger.warn('[AdminController] Could not read disk usage:', err.message);
  }

  return sendSuccess(res, {
    total:     diskTotal,
    used:      diskUsed,
    documents: docResult,
    users:     userCount,
    degrees:   degreeCount,
    auditLogsToday: auditResult,
  }, 'Admin stats retrieved');
});

// ─── GET /api/v1/admin/integrity ─────────────────────────────────────────────
// FIX-9: replaced Degree.findAll({ where: { degreeHash: null } }) (Sequelize)
exports.checkIntegrity = asyncHandler(async (req, res) => {
  const errors = [];
  const supabase = getSupabaseAdmin();

  // Check 1: degrees with missing hash
  try {
    const { data: hashless, error } = await supabase
      .from('degrees')
      .select('id')
      .is('degree_hash', null);

    if (error) throw error;
    if (hashless?.length) {
      errors.push(`${hashless.length} degree(s) have a missing blockchain hash.`);
    }
  } catch (err) {
    errors.push(`Hash check failed: ${err.message}`);
  }

  // Check 2: degrees with no blockchain tx hash but status = 'issued'
  try {
    const { data: issuedNoTx, error } = await supabase
      .from('degrees')
      .select('id')
      .eq('status', 'issued')
      .is('blockchain_tx_hash', null);

    if (error) throw error;
    if (issuedNoTx?.length) {
      errors.push(`${issuedNoTx.length} issued degree(s) have no blockchain transaction.`);
    }
  } catch (err) {
    errors.push(`Blockchain tx check failed: ${err.message}`);
  }

  // Check 3: documents referencing non-existent degrees
  try {
    const { data: orphanDocs, error } = await supabase
      .from('documents')
      .select('id, degree_id')
      .not('degree_id', 'is', null);

    if (error) throw error;
    if (orphanDocs?.length) {
      // Get all valid degree IDs
      const { data: degreeIds } = await supabase.from('degrees').select('id');
      const validIds = new Set((degreeIds || []).map(d => d.id));
      const orphans = orphanDocs.filter(doc => !validIds.has(doc.degree_id));
      if (orphans.length) {
        errors.push(`${orphans.length} document(s) reference non-existent degrees.`);
      }
    }
  } catch (err) {
    errors.push(`Orphan document check failed: ${err.message}`);
  }

  return sendSuccess(res, {
    valid:  errors.length === 0,
    errors,
    checkedAt: new Date().toISOString(),
  }, 'Integrity check completed');
});

// ─── POST /api/v1/admin/backup ────────────────────────────────────────────────
// FIX-4,5,6,7: replaced all Sequelize findAll() calls
exports.createBackup = asyncHandler(async (req, res) => {
  ensureBackupDir();

  // FIX-4,5,6,7: use findMany({ limit:9999 }).data
  const [usersRes, degreesRes, docsRes, auditRes] = await Promise.all([
    User.findMany({ limit: 9999 }),
    Degree.findMany({ limit: 9999 }),
    Document.findAll({ limit: 9999 }), // FIX: Document model has findAll(), not findMany()
    AuditLog.findMany({ limit: 9999 }),
  ]);

  const backupData = {
    users:     usersRes.data,
    degrees:   degreesRes.data,
    documents: docsRes.data,
    auditLogs: auditRes.data,
    timestamp: new Date().toISOString(),
    version:   '1.0',
  };

  const backupId   = `backup_${Date.now()}`;
  const backupPath = path.join(BACKUP_DIR, `${backupId}.json`);

  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

  await AuditLog.create({
    action:    'ADMIN_BACKUP_CREATED',
    actorId:   req.user?.id,
    actorRole: req.user?.role,
    details:   { backupId, path: backupPath },
    ipAddress: req.ip,
  });

  logger.info(`[Admin] Backup created: ${backupId}`);

  return sendSuccess(res, {
    backupId,
    timestamp: backupData.timestamp,
    counts: {
      users:     usersRes.total,
      degrees:   degreesRes.total,
      documents: docsRes.total,
      auditLogs: auditRes.total,
    },
  }, 'Backup created successfully');
});

// ─── GET /api/v1/admin/backup/last ───────────────────────────────────────────
exports.getLastBackupInfo = asyncHandler(async (req, res) => {
  if (!fs.existsSync(BACKUP_DIR)) {
    return sendSuccess(res, { lastBackup: null }, 'No backups found');
  }

  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    return sendSuccess(res, { lastBackup: null }, 'No backups found');
  }

  const sorted = files.sort((a, b) => {
    const statA = fs.statSync(path.join(BACKUP_DIR, a)).mtimeMs;
    const statB = fs.statSync(path.join(BACKUP_DIR, b)).mtimeMs;
    return statB - statA;
  });

  const lastFile = sorted[0];
  const stat     = fs.statSync(path.join(BACKUP_DIR, lastFile));

  return sendSuccess(res, {
    lastBackup: stat.mtime.toISOString(),
    backupFile: lastFile,
    totalBackups: files.length,
  }, 'Last backup info retrieved');
});

// ─── POST /api/v1/admin/restore ──────────────────────────────────────────────
exports.restoreBackup = asyncHandler(async (req, res) => {
  if (!fs.existsSync(BACKUP_DIR)) {
    return sendError(res, 'No backup directory found', 404);
  }

  const { backupId } = req.body;

  let targetFile;
  if (backupId) {
    targetFile = path.join(BACKUP_DIR, `${backupId}.json`);
    if (!fs.existsSync(targetFile)) {
      return sendNotFound(res, `Backup ${backupId}`);
    }
  } else {
    // Use most recent backup
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
    if (!files.length) return sendError(res, 'No backups found to restore', 404);
    const sorted = files.sort((a, b) =>
      fs.statSync(path.join(BACKUP_DIR, b)).mtimeMs -
      fs.statSync(path.join(BACKUP_DIR, a)).mtimeMs
    );
    targetFile = path.join(BACKUP_DIR, sorted[0]);
  }

  // NOTE: Full restore requires careful transactional handling.
  // This validates and reads the backup — actual data write is left
  // as a 501 stub to avoid accidental production data loss.
  let backupData;
  try {
    backupData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
  } catch (err) {
    return sendError(res, `Could not read backup file: ${err.message}`, 500);
  }

  await AuditLog.create({
    action:    'ADMIN_RESTORE_ATTEMPTED',
    actorId:   req.user?.id,
    actorRole: req.user?.role,
    details:   { targetFile },
    ipAddress: req.ip,
  });

  return res.status(501).json({
    success: false,
    message: 'Full data restore is not yet implemented. Backup file is valid.',
    meta: {
      backupTimestamp: backupData.timestamp,
      counts: {
        users:     backupData.users?.length,
        degrees:   backupData.degrees?.length,
        documents: backupData.documents?.length,
      },
    },
  });
});

// ─── GET /api/v1/admin/export ─────────────────────────────────────────────────
// FIX-4,5,6,7: replaced all Sequelize findAll() calls
exports.exportData = asyncHandler(async (req, res) => {
  const [usersRes, degreesRes, docsRes, auditRes] = await Promise.all([
    User.findMany({ limit: 9999 }),
    Degree.findMany({ limit: 9999 }),
    Document.findAll({ limit: 9999 }), // FIX: Document model has findAll(), not findMany()
    AuditLog.findMany({ limit: 9999 }),
  ]);

  const exportData = {
    users:     usersRes.data,
    degrees:   degreesRes.data,
    documents: docsRes.data,
    auditLogs: auditRes.data,
    exportedAt: new Date().toISOString(),
    version:    '1.0',
  };

  const filename = `data_export_${Date.now()}.json`;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  return res.status(200).json(exportData);
});

// ─── POST /api/v1/admin/import ────────────────────────────────────────────────
// FIX-14 (NEW): BACKEND/middleware/uploadMiddleware.js's `uploadImport` is
// configured with multer.diskStorage (it writes the file to
// uploads/temp/import-<uuid>.json and gives you req.file.path) — NOT
// memoryStorage, which is the only kind of multer config that populates
// req.file.buffer. Every single import attempt was throwing
// "Cannot read properties of undefined (reading 'toString')" because
// req.file.buffer is always undefined here. Read from req.file.path
// instead, and clean up the temp file afterward either way.
exports.importData = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendError(res, 'No file uploaded. Use multipart/form-data with field "data".', 400);
  }

  let importData;
  try {
    const fileContents = fs.readFileSync(req.file.path, 'utf8'); // FIX-14: was req.file.buffer
    importData = JSON.parse(fileContents);
  } catch (err) {
    return sendError(res, `Invalid JSON file: ${err.message}`, 400);
  } finally {
    // Always remove the temp upload, whether parsing succeeded or not.
    fs.unlink(req.file.path, (err) => {
      if (err) console.warn(`[adminController] Failed to clean up ${req.file.path}: ${err.message}`);
    });
  }

  if (!importData.users || !importData.degrees) {
    return sendError(res, 'Invalid backup format: missing users or degrees array', 400);
  }

  await AuditLog.create({
    action:    'ADMIN_IMPORT_ATTEMPTED',
    actorId:   req.user?.id,
    actorRole: req.user?.role,
    details:   { importedAt: importData.exportedAt || importData.timestamp },
    ipAddress: req.ip,
  });

  return res.status(501).json({
    success: false,
    message: 'Full data import is not yet implemented. File validated successfully.',
    meta: {
      exportedAt: importData.exportedAt || importData.timestamp,
      counts: {
        users:     importData.users?.length,
        degrees:   importData.degrees?.length,
        documents: importData.documents?.length,
      },
    },
  });
});

// ─── DELETE /api/v1/admin/cleanup ────────────────────────────────────────────
// FIX-8: replaced Document.destroy({ where: { createdAt: { [Op.lt]: cutoff } } })
exports.cleanupOldDocuments = asyncHandler(async (req, res) => {
  const days   = Math.max(1, parseInt(req.query.days) || 90);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString();

  const supabase = getSupabaseAdmin();

  // Get IDs of documents to delete before deleting (for audit log count)
  const { data: toDelete, error: fetchErr } = await supabase
    .from('documents')
    .select('id')
    .lt('created_at', cutoffIso);

  if (fetchErr) {
    return sendError(res, `Cleanup query failed: ${fetchErr.message}`, 500);
  }

  const count = toDelete?.length || 0;

  if (count > 0) {
    const { error: delErr } = await supabase
      .from('documents')
      .delete()
      .lt('created_at', cutoffIso);

    if (delErr) {
      return sendError(res, `Cleanup delete failed: ${delErr.message}`, 500);
    }
  }

  await AuditLog.create({
    action:    'ADMIN_CLEANUP_DOCUMENTS',
    actorId:   req.user?.id,
    actorRole: req.user?.role,
    details:   { days, deletedCount: count, cutoff: cutoffIso },
    ipAddress: req.ip,
  });

  logger.info(`[Admin] Cleanup: deleted ${count} documents older than ${days} days`);

  return sendSuccess(res, { deletedCount: count, cutoff: cutoffIso }, `Deleted ${count} old document(s)`);
});

// ─── DELETE /api/v1/admin/reset ──────────────────────────────────────────────
exports.resetData = asyncHandler(async (req, res) => {
  // Safety guard — only allow in development
  if (process.env.NODE_ENV === 'production') {
    return sendError(res, 'Data reset is disabled in production', 403);
  }

  await AuditLog.create({
    action:    'ADMIN_RESET_ATTEMPTED',
    actorId:   req.user?.id,
    actorRole: req.user?.role,
    details:   { env: process.env.NODE_ENV },
    ipAddress: req.ip,
  });

  return res.status(501).json({
    success: false,
    message: 'Full data reset is not implemented to prevent accidental data loss.',
  });
});