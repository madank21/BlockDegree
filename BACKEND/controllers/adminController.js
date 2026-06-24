// BACKEND/controllers/adminController.js
//
// WHAT WAS BROKEN (original file had ALL of these):
//   1. Document.count()  — does not exist on the Supabase Document model. Crashed immediately.
//   2. User.count()      — exists on User model ✓ but was called without await in Promise.all context.
//   3. Degree.count()    — does not exist on the Supabase Degree model. Crashed immediately.
//   4. Degree.findAll()  — Sequelize ORM method. Does not exist. Used in createBackup, exportData.
//   5. User.findAll()    — Sequelize ORM method. Does not exist. Used in createBackup, exportData.
//   6. Document.findAll()— Sequelize ORM method. Exists on Document model BUT takes different args.
//   7. AuditLog.findAll()— Sequelize ORM method. AuditLog has findMany, not findAll.
//   8. Degree.findAll({ where: { degreeHash: null } }) — Sequelize WHERE syntax. Does not work.
//   9. Document.destroy({ where: {...} }) — Sequelize method. Does not exist on Document model.
//  10. const { supabase } = require('../database/supabase') — wrong export name.
//      supabase.js exports getSupabaseAdmin / getSupabaseAnon, not a named `supabase`.
//  11. No asyncHandler → unhandled promise rejections hung requests.
//  12. No sendSuccess/sendError helpers → inconsistent raw res.json responses.
//
// VERIFIED CORRECT METHOD SIGNATURES:
//   User.count()         → exists, returns number                         ✓
//   User.findMany()      → { data, total }                                ✓
//   Degree.findMany()    → { data, total }                                ✓
//   Document.findAll()   → { data, total } (exists, correct name)         ✓
//   AuditLog.findMany()  → { data, total }                                ✓
//   AuditLog.getTodayCount() → number                                     ✓
//   getSupabaseAdmin()   → supabase client instance                       ✓

'use strict';

const { asyncHandler }    = require('../middleware/errorMiddleware');
const {
  sendSuccess,
  sendError,
  sendNotFound,
}                          = require('../src/utils/response');
const Degree               = require('../models/Degree');
const Document             = require('../models/Document');
const User                 = require('../models/User');
const AuditLog             = require('../models/AuditLog');
// FIX 10: correct import — supabase.js exports getSupabaseAdmin, not { supabase }
const { getSupabaseAdmin } = require('../database/supabase');
const { logger }           = require('../src/utils/logger');
const fs                   = require('fs');
const path                 = require('path');

const BACKUP_DIR = path.join(__dirname, '../backups');

// ─── Ensure backup directory exists ──────────────────────────────────────────
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// ─── Compute uploads disk usage ───────────────────────────────────────────────
function getUploadsSize() {
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) return 0;
  let size = 0;
  const walk = (dir) => {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      try {
        const stat = fs.statSync(full);
        size += stat.isDirectory() ? walk(full) : stat.size;
      } catch { /* skip unreadable */ }
    }
  };
  walk(uploadsDir);
  return size;
}

// ─── GET /api/v1/admin/stats ──────────────────────────────────────────────────
// FIX 1, 2, 3: Degree.count() and Document.count() don't exist.
//   → Use Degree.findMany / Document.findAll with limit:1 to get total counts.
//   → User.count() DOES exist on the User model and is used correctly.
exports.getStats = asyncHandler(async (req, res) => {
  const [
    userCount,
    degreeResult,
    docResult,
    auditToday,
  ] = await Promise.all([
    User.count(),                                      // FIX 2: exists ✓
    Degree.findMany({ page: 1, limit: 1 }),            // FIX 3: use findMany, read .total
    Document.findAll({ page: 1, limit: 1 }),           // FIX 1: findAll exists, read .total
    AuditLog.getTodayCount().catch(() => 0),           // non-fatal
  ]);

  const diskUsed  = getUploadsSize();
  const diskTotal = 100 * 1024 * 1024; // 100 MB

  return sendSuccess(res, {
    total:          diskTotal,
    used:           diskUsed,
    documents:      docResult.total,
    users:          userCount,
    degrees:        degreeResult.total,
    auditLogsToday: auditToday,
  }, 'Admin stats retrieved');
});

// ─── GET /api/v1/admin/integrity ─────────────────────────────────────────────
// FIX 8: Was Degree.findAll({ where: { degreeHash: null } }) — Sequelize.
//         Replaced with direct Supabase query using .is('degree_hash', null).
exports.checkIntegrity = asyncHandler(async (req, res) => {
  const supabase = getSupabaseAdmin();
  const errors   = [];

  // Check 1: degrees with no hash
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
    errors.push(`Hash integrity check failed: ${err.message}`);
  }

  // Check 2: issued degrees with no blockchain tx hash
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
    errors.push(`Blockchain transaction check failed: ${err.message}`);
  }

  // Check 3: documents referencing non-existent degrees
  try {
    const { data: orphanDocs, error: odErr } = await supabase
      .from('documents')
      .select('id, degree_id')
      .not('degree_id', 'is', null);

    if (odErr) throw odErr;

    if (orphanDocs?.length) {
      const { data: degreeIds } = await supabase.from('degrees').select('id');
      const validIds = new Set((degreeIds || []).map(d => d.id));
      const orphans  = orphanDocs.filter(doc => !validIds.has(doc.degree_id));
      if (orphans.length) {
        errors.push(`${orphans.length} document(s) reference non-existent degrees.`);
      }
    }
  } catch (err) {
    errors.push(`Orphan document check failed: ${err.message}`);
  }

  return sendSuccess(res, {
    valid:      errors.length === 0,
    errors,
    checkedAt:  new Date().toISOString(),
  }, 'Integrity check completed');
});

// ─── POST /api/v1/admin/backup ────────────────────────────────────────────────
// FIX 4, 5, 6, 7: All findAll() Sequelize calls replaced with correct Supabase model methods.
exports.createBackup = asyncHandler(async (req, res) => {
  ensureBackupDir();

  // FIX 4, 5, 6, 7: use the correct method per model
  const [usersRes, degreesRes, docsRes, auditRes] = await Promise.all([
    User.findMany({ limit: 9999 }),     // FIX 5: was User.findAll()
    Degree.findMany({ limit: 9999 }),   // FIX 4: was Degree.findAll()
    Document.findAll({ limit: 9999 }),  // FIX 6: Document.findAll() exists ✓
    AuditLog.findMany({ limit: 9999 }), // FIX 7: was AuditLog.findAll()
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
    details:   {
      backupId,
      counts: {
        users:     usersRes.total,
        degrees:   degreesRes.total,
        documents: docsRes.total,
        auditLogs: auditRes.total,
      },
    },
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
  if (!files.length) {
    return sendSuccess(res, { lastBackup: null }, 'No backups found');
  }

  const sorted = files.sort((a, b) =>
    fs.statSync(path.join(BACKUP_DIR, b)).mtimeMs -
    fs.statSync(path.join(BACKUP_DIR, a)).mtimeMs
  );

  const lastFile = sorted[0];
  const stat     = fs.statSync(path.join(BACKUP_DIR, lastFile));

  return sendSuccess(res, {
    lastBackup:   stat.mtime.toISOString(),
    backupFile:   lastFile,
    totalBackups: files.length,
  }, 'Last backup info retrieved');
});

// ─── POST /api/v1/admin/restore ──────────────────────────────────────────────
exports.restoreBackup = asyncHandler(async (req, res) => {
  if (!fs.existsSync(BACKUP_DIR)) {
    return sendError(res, 'No backup directory found.', 404);
  }

  const { backupId } = req.body;
  let targetFile;

  if (backupId) {
    targetFile = path.join(BACKUP_DIR, `${backupId}.json`);
    if (!fs.existsSync(targetFile)) {
      return sendNotFound(res, `Backup ${backupId}`);
    }
  } else {
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
    if (!files.length) return sendError(res, 'No backups found to restore.', 404);
    const sorted = files.sort((a, b) =>
      fs.statSync(path.join(BACKUP_DIR, b)).mtimeMs -
      fs.statSync(path.join(BACKUP_DIR, a)).mtimeMs
    );
    targetFile = path.join(BACKUP_DIR, sorted[0]);
  }

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

  // Full data restore is intentionally not auto-executed to prevent accidental data loss.
  // The file is validated and the admin is shown what it contains.
  return res.status(501).json({
    success: false,
    message: 'Full data restore requires manual confirmation. Backup file validated successfully.',
    meta: {
      backupTimestamp: backupData.timestamp,
      counts: {
        users:     backupData.users?.length     || 0,
        degrees:   backupData.degrees?.length   || 0,
        documents: backupData.documents?.length || 0,
      },
    },
  });
});

// ─── GET /api/v1/admin/export ─────────────────────────────────────────────────
// FIX 4, 5, 6, 7: Same Sequelize findAll fixes as createBackup.
exports.exportData = asyncHandler(async (req, res) => {
  const [usersRes, degreesRes, docsRes, auditRes] = await Promise.all([
    User.findMany({ limit: 9999 }),
    Degree.findMany({ limit: 9999 }),
    Document.findAll({ limit: 9999 }),
    AuditLog.findMany({ limit: 9999 }),
  ]);

  const exportData = {
    users:      usersRes.data,
    degrees:    degreesRes.data,
    documents:  docsRes.data,
    auditLogs:  auditRes.data,
    exportedAt: new Date().toISOString(),
    version:    '1.0',
  };

  const filename = `data_export_${Date.now()}.json`;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  return res.status(200).json(exportData);
});

// ─── POST /api/v1/admin/import ────────────────────────────────────────────────
exports.importData = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendError(res, 'No file uploaded. Use multipart/form-data with field "data".', 400);
  }

  let importData;
  try {
    importData = JSON.parse(req.file.buffer.toString('utf8'));
  } catch (err) {
    return sendError(res, `Invalid JSON file: ${err.message}`, 400);
  }

  if (!Array.isArray(importData.users) || !Array.isArray(importData.degrees)) {
    return sendError(res, 'Invalid backup format — missing users or degrees arrays.', 400);
  }

  await AuditLog.create({
    action:    'ADMIN_IMPORT_ATTEMPTED',
    actorId:   req.user?.id,
    actorRole: req.user?.role,
    details:   { exportedAt: importData.exportedAt || importData.timestamp },
    ipAddress: req.ip,
  });

  return res.status(501).json({
    success: false,
    message: 'Full data import requires manual confirmation. File validated successfully.',
    meta: {
      exportedAt: importData.exportedAt || importData.timestamp,
      counts: {
        users:     importData.users?.length     || 0,
        degrees:   importData.degrees?.length   || 0,
        documents: importData.documents?.length || 0,
      },
    },
  });
});

// ─── DELETE /api/v1/admin/cleanup?days=90 ────────────────────────────────────
// FIX 9: Was Document.destroy({ where: { createdAt: { [Op.lt]: cutoff } } }) — Sequelize.
//         Replaced with direct Supabase delete query.
exports.cleanupOldDocuments = asyncHandler(async (req, res) => {
  const days    = Math.max(1, parseInt(req.query.days, 10) || 90);
  const cutoff  = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString();

  // FIX 9: use Supabase directly — Document has no destroy() method
  const supabase = getSupabaseAdmin();

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

  logger.info(`[Admin] Cleanup: deleted ${count} documents older than ${days} days.`);

  return sendSuccess(
    res,
    { deletedCount: count, cutoff: cutoffIso },
    `Deleted ${count} old document(s)`
  );
});

// ─── DELETE /api/v1/admin/reset ──────────────────────────────────────────────
exports.resetData = asyncHandler(async (req, res) => {
  // Hard block in production to prevent data loss
  if (process.env.NODE_ENV === 'production') {
    return sendError(res, 'Data reset is disabled in production.', 403);
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