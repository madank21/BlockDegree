// BACKEND/controllers/adminController.js
// ─────────────────────────────────────────────────────────────────────────────
// Admin Controller — fully rewritten to use Supabase model methods
// (replaces all Sequelize calls: findAll, findByPk, destroy, count)
// ─────────────────────────────────────────────────────────────────────────────

const Degree    = require('../models/Degree');
const Document  = require('../models/Document');
const User      = require('../models/User');
const AuditLog  = require('../models/AuditLog');
const { getSupabaseAdmin } = require('../database/supabase');
const fs   = require('fs');
const path = require('path');

// ── GET /api/v1/admin/stats ───────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    // Use Supabase model methods (count / findMany with count)
    const [userCount, degreeStats, docResult] = await Promise.all([
      User.count(),
      Degree.getStats(),                         // returns { total, issued, pending, revoked, … }
      Document.findAll({ page: 1, limit: 1 }),   // we only need .total
    ]);

    const stats = {
      totalUsers:    userCount,
      totalDegrees:  degreeStats.total,
      totalDocuments: docResult.total,
      degreesByStatus: {
        issued:  degreeStats.issued,
        pending: degreeStats.pending,
        revoked: degreeStats.revoked,
      },
      // Storage placeholders — update if you track actual disk usage
      storage: {
        total: 100 * 1024 * 1024,
        used:   45 * 1024 * 1024,
      },
    };

    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('[Admin] getStats error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── GET /api/v1/admin/integrity ───────────────────────────────────────────────
exports.checkIntegrity = async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const errors   = [];

    // 1. Degrees with a null degree_hash
    const { data: nullHashDegrees, error: e1 } = await supabase
      .from('degrees')
      .select('id')
      .is('degree_hash', null);

    if (e1) throw new Error(e1.message);
    if (nullHashDegrees?.length) {
      errors.push(`${nullHashDegrees.length} degree(s) have a missing hash.`);
    }

    // 2. Issued degrees with no blockchain tx hash
    const { data: unconfirmed, error: e2 } = await supabase
      .from('degrees')
      .select('id')
      .eq('status', 'issued')
      .is('blockchain_tx_hash', null);

    if (e2) throw new Error(e2.message);
    if (unconfirmed?.length) {
      errors.push(`${unconfirmed.length} issued degree(s) have no blockchain transaction hash.`);
    }

    // 3. Documents with no linked user
    const { data: orphanedDocs, error: e3 } = await supabase
      .from('documents')
      .select('id')
      .is('user_id', null);

    if (e3) throw new Error(e3.message);
    if (orphanedDocs?.length) {
      errors.push(`${orphanedDocs.length} document(s) have no associated user.`);
    }

    const valid = errors.length === 0;
    res.json({ success: true, data: { valid, errors } });
  } catch (err) {
    console.error('[Admin] checkIntegrity error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── POST /api/v1/admin/backup ─────────────────────────────────────────────────
exports.createBackup = async (req, res) => {
  try {
    // Fetch all data using proper Supabase model methods
    const [usersResult, degreesResult, docsResult] = await Promise.all([
      User.findMany({ page: 1, limit: 10000 }),
      Degree.findMany({ page: 1, limit: 10000 }),
      Document.findAll({ page: 1, limit: 10000 }),
    ]);

    // AuditLog uses raw supabase (no findMany method exposed)
    const supabase = getSupabaseAdmin();
    const { data: auditRows } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000);

    const backupData = {
      users:     usersResult.data,
      degrees:   degreesResult.data,
      documents: docsResult.data,
      auditLogs: auditRows || [],
      timestamp: new Date().toISOString(),
      version:   '1.0.0',
    };

    const backupId   = `backup_${Date.now()}`;
    const backupDir  = path.join(__dirname, '../backups');
    const backupPath = path.join(backupDir, `${backupId}.json`);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

    res.json({
      success: true,
      data: {
        backupId,
        message: 'Backup created successfully',
        timestamp: backupData.timestamp,
        counts: {
          users:     usersResult.data.length,
          degrees:   degreesResult.data.length,
          documents: docsResult.data.length,
          auditLogs: (auditRows || []).length,
        },
      },
    });
  } catch (err) {
    console.error('[Admin] createBackup error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── GET /api/v1/admin/backup/last ─────────────────────────────────────────────
exports.getLastBackupInfo = async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../backups');

    if (!fs.existsSync(backupDir)) {
      return res.json({ success: true, data: { lastBackup: null } });
    }

    const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json'));

    if (files.length === 0) {
      return res.json({ success: true, data: { lastBackup: null } });
    }

    const sorted = files.sort((a, b) => {
      return (
        fs.statSync(path.join(backupDir, b)).mtimeMs -
        fs.statSync(path.join(backupDir, a)).mtimeMs
      );
    });

    const lastFile = sorted[0];
    const stats    = fs.statSync(path.join(backupDir, lastFile));

    res.json({
      success: true,
      data: {
        lastBackup: stats.mtime.toISOString(),
        backupId:   lastFile.replace('.json', ''),
        totalFiles: files.length,
      },
    });
  } catch (err) {
    console.error('[Admin] getLastBackupInfo error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── POST /api/v1/admin/restore ────────────────────────────────────────────────
exports.restoreBackup = async (req, res) => {
  try {
    const { backupId } = req.body;
    const backupDir    = path.join(__dirname, '../backups');

    let targetFile;

    if (backupId) {
      targetFile = path.join(backupDir, `${backupId}.json`);
      if (!fs.existsSync(targetFile)) {
        return res.status(404).json({ success: false, error: `Backup ${backupId} not found` });
      }
    } else {
      // Restore most recent
      if (!fs.existsSync(backupDir)) {
        return res.status(404).json({ success: false, error: 'No backups found' });
      }
      const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json'));
      if (!files.length) {
        return res.status(404).json({ success: false, error: 'No backup files found' });
      }
      const sorted = files.sort((a, b) => {
        return (
          fs.statSync(path.join(backupDir, b)).mtimeMs -
          fs.statSync(path.join(backupDir, a)).mtimeMs
        );
      });
      targetFile = path.join(backupDir, sorted[0]);
    }

    // NOTE: Full restore is destructive — log and return info for safety.
    // A production restore should be done via a dedicated migration script.
    const backupMeta = JSON.parse(fs.readFileSync(targetFile, 'utf8'));

    res.json({
      success: true,
      data: {
        message: 'Restore acknowledged. Run the restore migration script to apply.',
        backupTimestamp: backupMeta.timestamp,
        counts: {
          users:     (backupMeta.users     || []).length,
          degrees:   (backupMeta.degrees   || []).length,
          documents: (backupMeta.documents || []).length,
          auditLogs: (backupMeta.auditLogs || []).length,
        },
      },
    });
  } catch (err) {
    console.error('[Admin] restoreBackup error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── GET /api/v1/admin/export ─────────────────────────────────────────────────
exports.exportData = async (req, res) => {
  try {
    // Use proper Supabase model methods (not findAll Sequelize)
    const [usersResult, degreesResult, docsResult] = await Promise.all([
      User.findMany({ page: 1, limit: 10000 }),
      Degree.findMany({ page: 1, limit: 10000 }),
      Document.findAll({ page: 1, limit: 10000 }),
    ]);

    const supabase = getSupabaseAdmin();
    const { data: auditRows } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      users:      usersResult.data,
      degrees:    degreesResult.data,
      documents:  docsResult.data,
      auditLogs:  auditRows || [],
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="blockdegree_export_${Date.now()}.json"`
    );
    res.json(exportPayload);
  } catch (err) {
    console.error('[Admin] exportData error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── POST /api/v1/admin/import ─────────────────────────────────────────────────
exports.importData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    let importPayload;
    try {
      importPayload = JSON.parse(req.file.buffer.toString('utf8'));
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid JSON file' });
    }

    if (!importPayload.users && !importPayload.degrees) {
      return res.status(400).json({ success: false, error: 'Unrecognised import format' });
    }

    // Return import summary — full import requires careful ordering due to FK constraints
    res.json({
      success: true,
      data: {
        message: 'Import validated. Use migration scripts to apply to database.',
        preview: {
          users:     (importPayload.users     || []).length,
          degrees:   (importPayload.degrees   || []).length,
          documents: (importPayload.documents || []).length,
          auditLogs: (importPayload.auditLogs || []).length,
          exportedAt: importPayload.exportedAt || 'unknown',
        },
      },
    });
  } catch (err) {
    console.error('[Admin] importData error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── DELETE /api/v1/admin/cleanup?days=90 ─────────────────────────────────────
exports.cleanupOldDocuments = async (req, res) => {
  try {
    const days   = parseInt(req.query.days) || 90;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const supabase = getSupabaseAdmin();

    // Find old un-verified documents first
    const { data: toDelete, error: findErr } = await supabase
      .from('documents')
      .select('id, file_path')
      .lt('created_at', cutoff)
      .eq('is_verified', false);

    if (findErr) throw new Error(findErr.message);

    if (!toDelete || toDelete.length === 0) {
      return res.json({ success: true, data: { deletedCount: 0 } });
    }

    const ids = toDelete.map((d) => d.id);

    // Delete from DB
    const { error: delErr } = await supabase.from('documents').delete().in('id', ids);
    if (delErr) throw new Error(delErr.message);

    // Optionally delete files from disk
    toDelete.forEach(({ file_path }) => {
      if (file_path) {
        const abs = path.join(__dirname, '..', file_path);
        if (fs.existsSync(abs)) {
          try { fs.unlinkSync(abs); } catch (_) { /* ignore individual file errors */ }
        }
      }
    });

    res.json({
      success: true,
      data: { deletedCount: ids.length, cutoffDate: cutoff },
    });
  } catch (err) {
    console.error('[Admin] cleanupOldDocuments error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── DELETE /api/v1/admin/reset ────────────────────────────────────────────────
exports.resetData = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Data reset is disabled in production',
      });
    }

    // Development only — truncate non-user tables
    const supabase = getSupabaseAdmin();
    await supabase.from('verification_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('fraud_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('blockchain_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('degrees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    res.json({ success: true, data: { message: 'Data reset completed (development only)' } });
  } catch (err) {
    console.error('[Admin] resetData error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};