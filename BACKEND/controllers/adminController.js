// BACKEND/controllers/adminController.js
const Degree = require('../models/Degree');
const Document = require('../models/Document');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { supabase } = require('../database/supabase');
const fs = require('fs');
const path = require('path');

// GET /api/v1/admin/stats
exports.getStats = async (req, res) => {
  try {
    // Example: count documents, users, degrees, and compute storage used
    const [totalDocs, totalUsers, totalDegrees] = await Promise.all([
      Document.count(),
      User.count(),
      Degree.count(),
    ]);
    // For disk usage, you might query Supabase storage or use fs if local
    // This is just a placeholder; adjust to your actual data source
    const stats = {
      total: 100 * 1024 * 1024, // placeholder: 100 MB total
      used: 45 * 1024 * 1024,   // placeholder: 45 MB used
      documents: totalDocs,
      users: totalUsers,
      degrees: totalDegrees,
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/v1/admin/integrity
exports.checkIntegrity = async (req, res) => {
  try {
    const errors = [];
    // Example: check if any degree has a null hash
    const invalidDegrees = await Degree.findAll({ where: { degreeHash: null } });
    if (invalidDegrees.length) {
      errors.push(`${invalidDegrees.length} degrees have missing hash.`);
    }
    // Add more checks as needed (orphaned documents, mismatched blockchain status, etc.)
    const valid = errors.length === 0;
    res.json({ valid, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/v1/admin/backup
exports.createBackup = async (req, res) => {
  try {
    // Fetch all relevant data
    const [users, degrees, documents, auditLogs] = await Promise.all([
      User.findAll(),
      Degree.findAll(),
      Document.findAll(),
      AuditLog.findAll(),
    ]);
    const backupData = { users, degrees, documents, auditLogs, timestamp: new Date().toISOString() };
    const backupId = `backup_${Date.now()}`;
    const backupPath = path.join(__dirname, '../backups', `${backupId}.json`);
    // Ensure backups directory exists
    if (!fs.existsSync(path.dirname(backupPath))) {
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    }
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    // Optionally store backup info in a separate table (e.g., BackupLog)
    // Return the backup ID so frontend can reference it
    res.json({ backupId, message: 'Backup created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/v1/admin/backup/last
exports.getLastBackupInfo = async (req, res) => {
  try {
    // Read the backups directory and return the most recent backup's timestamp
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      return res.json({ lastBackup: null });
    }
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
      return res.json({ lastBackup: null });
    }
    // Sort by modification time descending
    const sorted = files.sort((a, b) => {
      return fs.statSync(path.join(backupDir, b)).mtimeMs - fs.statSync(path.join(backupDir, a)).mtimeMs;
    });
    const lastFile = sorted[0];
    const stats = fs.statSync(path.join(backupDir, lastFile));
    res.json({ lastBackup: stats.mtime.toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/v1/admin/restore
exports.restoreBackup = async (req, res) => {
  try {
    // You need to decide which backup to restore. Could accept a backupId in body.
    // For simplicity, restore the most recent backup.
    const backupDir = path.join(__dirname, '../backups');
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
      return res.status(404).json({ error: 'No backup found' });
    }
    const sorted = files.sort((a, b) => {
      return fs.statSync(path.join(backupDir, b)).mtimeMs - fs.statSync(path.join(backupDir, a)).mtimeMs;
    });
    const latestBackup = sorted[0];
    const backupData = JSON.parse(fs.readFileSync(path.join(backupDir, latestBackup), 'utf8'));
    // Wipe existing data and insert backup data
    // This is a DANGEROUS operation – use transactions and confirm
    // For simplicity, we use Supabase's upsert or truncate+insert
    // You'll need to implement careful re-insertion with correct foreign keys
    // Consider using a transaction
    // Placeholder: just return success
    res.json({ message: 'Restore initiated (not fully implemented)' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/v1/admin/export
exports.exportData = async (req, res) => {
  try {
    const [users, degrees, documents, auditLogs] = await Promise.all([
      User.findAll(),
      Degree.findAll(),
      Document.findAll(),
      AuditLog.findAll(),
    ]);
    const exportData = { users, degrees, documents, auditLogs, exportedAt: new Date().toISOString() };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=data_export_${Date.now()}.json`);
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/v1/admin/import
exports.importData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileContent = req.file.buffer.toString('utf8');
    const importData = JSON.parse(fileContent);
    // Validate structure and insert into DB
    // Again, this is a destructive operation – implement carefully
    res.json({ message: 'Import completed (not fully implemented)' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/v1/admin/cleanup?days=90
exports.cleanupOldDocuments = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    // Example: delete documents older than cutoff
    const deleted = await Document.destroy({
      where: { createdAt: { [Op.lt]: cutoff } }
    });
    res.json({ deletedCount: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/v1/admin/reset
exports.resetData = async (req, res) => {
  try {
    // WARNING: This will wipe all data. Use only in development.
    // For production, you might want to require a special token or second confirmation.
    // Implementation: truncate all tables (order matters due to foreign keys)
    // Using Supabase raw SQL or truncate operations.
    res.json({ message: 'Data reset (not implemented)' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};