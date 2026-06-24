// FRONTEND/src/pages/DataManagement.tsx
//
// STATUS: Was COMPLETELY BROKEN — called store.getStorageStats(), store.createDataBackup(),
// store.restoreFromBackup(), store.verifyDataIntegrity(), store.resetData() etc.
// None of these methods exist on the store object.
//
// FIX: Full rewrite. Every call now hits the real backend via adminApi.
//   adminApi.stats()         → GET /api/v1/admin/stats
//   adminApi.integrity()     → GET /api/v1/admin/integrity
//   adminApi.createBackup()  → POST /api/v1/admin/backup
//   adminApi.lastBackup()    → GET /api/v1/admin/backup/last
//   adminApi.restoreBackup() → POST /api/v1/admin/restore
//   adminApi.export()        → GET /api/v1/admin/export (triggers download)
//   adminApi.cleanup()       → DELETE /api/v1/admin/cleanup?days=90
//   adminApi.reset()         → DELETE /api/v1/admin/reset

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Database, HardDrive, Shield, Download, Upload,
  RefreshCw, Trash2, AlertTriangle, CheckCircle2,
  Loader2, Server, FileJson, RotateCcw,
} from 'lucide-react';
import { adminApi } from '../api/api';

interface StorageStats {
  total: number;
  used: number;
  documents: number;
  users?: number;
  degrees?: number;
}

interface IntegrityResult {
  valid: boolean;
  errors: string[];
}

interface BackupInfo {
  lastBackup: string | null;
  backupId?: string;
  totalFiles?: number;
}

type MsgType = 'success' | 'error' | 'info';
interface Msg { type: MsgType; text: string }

export default function DataManagement() {
  const [stats,           setStats]           = useState<StorageStats>({ total: 0, used: 0, documents: 0 });
  const [integrityResult, setIntegrityResult] = useState<IntegrityResult | null>(null);
  const [backupInfo,      setBackupInfo]      = useState<BackupInfo>({ lastBackup: null });
  const [loading,         setLoading]         = useState(false);
  const [pageLoading,     setPageLoading]     = useState(true);
  const [msg,             setMsg]             = useState<Msg | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const showMsg = (type: MsgType, text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 6000);
  };

  // ── Load stats + integrity + backup info ────────────────────────────────────
  const loadAll = async () => {
    setPageLoading(true);
    try {
      const [statsData, integrityData, backupData] = await Promise.allSettled([
        adminApi.stats(),
        adminApi.integrity(),
        adminApi.lastBackup(),
      ]);

      if (statsData.status === 'fulfilled' && statsData.value) {
        const s = statsData.value as any;
        setStats({
          total:     s.storage?.total    ?? s.total     ?? 100 * 1024 * 1024,
          used:      s.storage?.used     ?? s.used      ?? 0,
          documents: s.totalDocuments    ?? s.documents ?? 0,
          users:     s.totalUsers        ?? s.users,
          degrees:   s.totalDegrees      ?? s.degrees,
        });
      }

      if (integrityData.status === 'fulfilled' && integrityData.value) {
        setIntegrityResult(integrityData.value as IntegrityResult);
      }

      if (backupData.status === 'fulfilled' && backupData.value) {
        setBackupInfo(backupData.value as BackupInfo);
      }
    } catch (err) {
      console.error('loadAll error:', err);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // ── Run integrity check ─────────────────────────────────────────────────────
  const runIntegrityCheck = async () => {
    setLoading(true);
    try {
      const result = await adminApi.integrity();
      setIntegrityResult(result as IntegrityResult);
      showMsg(result.valid ? 'success' : 'error',
        result.valid ? 'Integrity check passed — all data is valid.' : `Integrity issues found: ${result.errors?.join('; ')}`
      );
    } catch (err: any) {
      showMsg('error', `Integrity check failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Create backup ───────────────────────────────────────────────────────────
  const handleBackup = async () => {
    setLoading(true);
    try {
      const result = await adminApi.backup();
      setBackupInfo({
        lastBackup: result.timestamp ?? new Date().toISOString(),
        backupId:   result.backupId,
      });
      showMsg('success', `Backup created: ${result.backupId ?? 'OK'}`);
    } catch (err: any) {
      showMsg('error', `Backup failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Restore most recent backup ──────────────────────────────────────────────
  const handleRestore = async () => {
    if (!confirm('Restoring will overwrite current data from the last backup. Are you sure?')) return;
    setLoading(true);
    try {
      const result = await adminApi.restore();
      showMsg('success', result.message ?? 'Restore acknowledged by server.');
      await loadAll();
    } catch (err: any) {
      showMsg('error', `Restore failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Export all data as JSON download ────────────────────────────────────────
  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await adminApi.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `blockdegree_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMsg('success', 'Data exported successfully.');
    } catch (err: any) {
      showMsg('error', `Export failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Import data from JSON file ───────────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      showMsg('error', 'Only .json files are accepted.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // POST /admin/import — multipart (file upload)
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1'}/admin/import`,
        {
          method:  'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body:    formData,
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || 'Import failed');
      showMsg('success', json.data?.message ?? 'Import validated by server.');
      await loadAll();
    } catch (err: any) {
      showMsg('error', `Import failed: ${err.message}`);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  // ── Clean up old unverified documents ──────────────────────────────────────
  const handleCleanup = async () => {
    if (!confirm('Delete unverified documents older than 90 days? This cannot be undone.')) return;
    setLoading(true);
    try {
      const result = await adminApi.cleanup(90);
      showMsg('info', `Cleanup complete — ${result.deletedCount ?? 0} document(s) removed.`);
      await loadAll();
    } catch (err: any) {
      showMsg('error', `Cleanup failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Reset all data (dev only) ──────────────────────────────────────────────
  const handleReset = async () => {
    if (!confirm('⚠️ DANGER: This will delete ALL degrees, documents, and audit logs. This cannot be undone. Are you absolutely sure?')) return;
    if (!confirm('Final confirmation: Reset all data?')) return;
    setLoading(true);
    try {
      const result = await adminApi.reset();
      showMsg('info', result.message ?? 'Data reset complete.');
      await loadAll();
    } catch (err: any) {
      showMsg('error', `Reset failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived display values ─────────────────────────────────────────────────
  const pctUsed    = stats.total > 0 ? Math.min(100, (stats.used / stats.total) * 100) : 0;
  const usedMB     = (stats.used  / 1024 / 1024).toFixed(1);
  const totalMB    = (stats.total / 1024 / 1024).toFixed(0);
  const barColor   = pctUsed > 85 ? 'bg-red-500' : pctUsed > 60 ? 'bg-yellow-500' : 'bg-blue-500';

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Data Management</h2>
          <p className="text-gray-400 mt-1">Backup, restore, integrity checks, and storage overview</p>
        </div>
        <button
          onClick={loadAll}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Alert message */}
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-3 p-4 rounded-xl border ${
            msg.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
            msg.type === 'error'   ? 'bg-red-500/10   border-red-500/20   text-red-400'   :
                                     'bg-blue-500/10  border-blue-500/20  text-blue-400'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> :
           msg.type === 'error'   ? <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" /> :
                                    <Server className="w-5 h-5 shrink-0 mt-0.5" />}
          <p className="text-sm">{msg.text}</p>
          <button onClick={() => setMsg(null)} className="ml-auto text-current opacity-50 hover:opacity-100 text-lg leading-none">×</button>
        </motion.div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Documents', value: stats.documents, icon: FileJson,  color: 'text-blue-400',   bg: 'bg-blue-500/10' },
          { label: 'Users',     value: stats.users ?? '–', icon: Database, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Degrees',   value: stats.degrees ?? '–', icon: Shield,  color: 'text-green-400',  bg: 'bg-green-500/10' },
          { label: 'Storage',   value: `${usedMB} MB`, icon: HardDrive, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        ].map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-gray-900/50 border border-gray-800 rounded-xl p-4"
          >
            <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Main panels */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Storage Usage */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold">Storage Usage</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{usedMB} MB used</span>
              <span className="text-gray-500">{totalMB} MB total</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${pctUsed}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{pctUsed.toFixed(1)}% of quota used</p>
            {pctUsed > 85 && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-red-400 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Storage nearly full — run cleanup
              </div>
            )}
          </div>
        </div>

        {/* Data Integrity */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-green-400" />
            <h3 className="font-semibold">Data Integrity</h3>
          </div>
          {integrityResult ? (
            <div className="space-y-3">
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                integrityResult.valid
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}>
                {integrityResult.valid
                  ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                  : <AlertTriangle className="w-5 h-5 text-red-400" />}
                <span className={`text-sm font-medium ${integrityResult.valid ? 'text-green-400' : 'text-red-400'}`}>
                  {integrityResult.valid ? 'All data valid' : 'Issues detected'}
                </span>
              </div>
              {!integrityResult.valid && integrityResult.errors.length > 0 && (
                <div className="bg-red-500/5 rounded-lg p-3 max-h-28 overflow-y-auto space-y-1">
                  {integrityResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-400">• {e}</p>
                  ))}
                </div>
              )}
              <button
                onClick={runIntegrityCheck}
                disabled={loading}
                className="text-xs text-blue-400 hover:text-blue-300 transition disabled:opacity-50 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Run again
              </button>
            </div>
          ) : (
            <button
              onClick={runIntegrityCheck}
              disabled={loading}
              className="w-full py-3 border-2 border-dashed border-gray-700 hover:border-green-500/30 rounded-lg text-sm text-gray-500 hover:text-green-400 transition disabled:opacity-50"
            >
              {loading ? 'Checking…' : 'Run Integrity Check'}
            </button>
          )}
        </div>

        {/* Backup & Restore */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <RotateCcw className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold">Backup & Restore</h3>
          </div>
          <div className="space-y-3">
            <div className="bg-gray-800/30 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Last Backup</p>
              <p className="text-sm font-medium">
                {backupInfo.lastBackup
                  ? new Date(backupInfo.lastBackup).toLocaleString()
                  : 'Never'}
              </p>
              {backupInfo.backupId && (
                <p className="text-xs text-gray-500 font-mono mt-1">{backupInfo.backupId}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBackup}
                disabled={loading}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Backup
              </button>
              <button
                onClick={handleRestore}
                disabled={loading || !backupInfo.lastBackup}
                className="flex-1 py-2.5 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 rounded-lg text-sm font-medium text-yellow-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Restore
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Actions */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-cyan-400" /> Advanced Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          {/* Export */}
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/20 rounded-lg text-sm text-green-400 font-medium transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export All Data (JSON)
          </button>

          {/* Import */}
          <button
            onClick={() => importRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/20 rounded-lg text-sm text-indigo-400 font-medium transition disabled:opacity-50"
          >
            <Upload className="w-4 h-4" /> Import Data
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />

          {/* Cleanup */}
          <button
            onClick={handleCleanup}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/20 rounded-lg text-sm text-orange-400 font-medium transition disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> Clear Old Documents (90 days)
          </button>

          {/* Reset (danger) */}
          <button
            onClick={handleReset}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/20 rounded-lg text-sm text-red-400 font-medium transition disabled:opacity-50"
          >
            <AlertTriangle className="w-4 h-4" /> Reset All Data
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-3">
          Reset is only available in development environments and cannot be undone.
        </p>
      </div>
    </div>
  );
}