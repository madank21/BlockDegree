import React, { useState, useEffect } from 'react';
import apiClient, { adminApi, ApiError } from '../api/api'; // FIX: was `{ store }` from '../store'

// FIXES applied (verified against the current store.ts and adminApi):
//   FIX-1: Every handler previously called store.getStorageStats() /
//          store.verifyDataIntegrity() / store.createDataBackup() /
//          store.restoreFromBackup() / store.exportAllData() /
//          store.importData() / store.clearOldDocuments() — every one of
//          those is a deliberate no-op stub in store.ts ("Local backup is
//          disabled. All data is stored on the backend."). The whole page
//          was cosmetic: every button showed a "success" message while
//          doing nothing. Replaced with real calls to adminApi, which hits
//          BACKEND/controllers/adminController.js and actually queries
//          Supabase.
//   FIX-2: Restore / Import are honestly reported as "not implemented yet"
//          (adminController.js returns 501 for both, deliberately, rather
//          than silently pretending to succeed at a destructive operation
//          it never built) — shown as an info message, not an error.
//   FIX-3: Export now actually downloads a JSON file (the backend returns
//          the export payload directly; this builds a Blob + triggers a
//          download instead of just claiming success).
//   FIX-4: "Reset All Data" no longer calls the old store.resetData()
//          (which really did wipe local browser storage — the one stub
//          that WASN'T a no-op, despite every neighboring button doing
//          nothing). It now calls the backend's reset endpoint, which is
//          also intentionally not implemented (501) for safety.

const DataManagement: React.FC = () => {
  const [stats, setStats] = useState<{ total: number; used: number; documents: number; users?: number; degrees?: number }>({
    total: 0,
    used: 0,
    documents: 0,
  });
  const [integrityResult, setIntegrityResult] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [backupInfo, setBackupInfo] = useState<{ lastBackup: string | null }>({ lastBackup: null });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // FIX-1: real counts from the backend now, not a Blob-size estimate of
  // whatever happens to still be in localStorage.
  const refreshStats = async () => {
    try {
      const data = await adminApi.stats();
      setStats({
        total: data.total ?? 0,
        used: data.used ?? 0,
        documents: data.documents ?? 0,
        users: data.users,
        degrees: data.degrees,
      });
    } catch (err) {
      console.error('Failed to load storage stats:', err);
    }

    try {
      const info = await adminApi.lastBackup();
      setBackupInfo({ lastBackup: info?.lastBackup ?? null });
    } catch (err) {
      console.error('Failed to load last backup info:', err);
    }
  };

  const runIntegrityCheck = async () => {
    try {
      const result = await adminApi.integrity();
      setIntegrityResult(result);
    } catch (err: any) {
      setIntegrityResult({ valid: false, errors: [err.message || 'Integrity check failed'] });
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      const result = await adminApi.createBackup();
      setMessage({ type: 'success', text: result.message || 'Backup created successfully!' });
      await refreshStats();
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm('Restoring will overwrite current data. Are you sure?')) return;
    setLoading(true);
    try {
      await adminApi.restoreBackup();
      setMessage({ type: 'success', text: 'Data restored successfully!' });
      await refreshStats();
      await runIntegrityCheck();
    } catch (error: any) {
      // FIX-2: the backend deliberately returns 501 for this — show it as
      // an honest "not available yet" notice, not a generic error.
      const isNotImplemented = error instanceof ApiError && error.status === 501;
      setMessage({
        type: isNotImplemented ? 'info' : 'error',
        text: error.message || 'Restore failed.',
      });
    } finally {
      setLoading(false);
    }
  };

  // FIX-3: actually downloads the export as a JSON file.
  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await adminApi.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blockdegree_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Data exported successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: `Export failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('data', file); // field name must match BACKEND uploadImport.single('data')
      await apiClient.postForm('/admin/import', formData);
      setMessage({ type: 'success', text: 'Data imported successfully!' });
      await refreshStats();
      await runIntegrityCheck();
    } catch (error: any) {
      const isNotImplemented = error instanceof ApiError && error.status === 501;
      setMessage({
        type: isNotImplemented ? 'info' : 'error',
        text: error.message || 'Import failed.',
      });
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleClearOldDocs = async () => {
    if (!window.confirm('Delete documents older than 90 days?')) return;
    setLoading(true);
    try {
      const result = await adminApi.cleanup(90);
      setMessage({ type: 'info', text: `Removed ${result.deletedCount} old document(s).` });
      await refreshStats();
    } catch (error: any) {
      setMessage({ type: 'error', text: `Cleanup failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all data? This cannot be undone!')) return;
    setLoading(true);
    try {
      await adminApi.reset();
      setMessage({ type: 'info', text: 'Data has been reset.' });
      await refreshStats();
      await runIntegrityCheck();
    } catch (error: any) {
      // FIX-4: also intentionally 501 on the backend for safety.
      const isNotImplemented = error instanceof ApiError && error.status === 501;
      setMessage({
        type: isNotImplemented ? 'info' : 'error',
        text: error.message || 'Reset failed.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStats();
    runIntegrityCheck();
  }, []);

  const percentageUsed = stats.total > 0 ? (stats.used / stats.total) * 100 : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Data Management</h1>

      {message && (
        <div
          className={`mb-4 p-4 rounded-md ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-300'
              : message.type === 'error'
              ? 'bg-red-100 text-red-800 border border-red-300'
              : 'bg-blue-100 text-blue-800 border border-blue-300'
          }`}
        >
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="float-right text-gray-600 hover:text-gray-900"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Storage Usage */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Storage Usage</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Used: {(stats.used / 1024 / 1024).toFixed(2)} MB</span>
                <span>Total: {(stats.total / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                <div
                  className={`h-2.5 rounded-full ${percentageUsed > 80 ? 'bg-red-600' : 'bg-blue-600'}`}
                  style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">{stats.documents} documents stored</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="bg-gray-50 p-2 rounded text-center">
                <span className="block text-gray-600">Users</span>
                <span className="font-semibold">{stats.users ?? '—'}</span>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <span className="block text-gray-600">Documents</span>
                <span className="font-semibold">{stats.documents}</span>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <span className="block text-gray-600">Degrees</span>
                <span className="font-semibold">{stats.degrees ?? '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Integrity */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Data Integrity</h2>
          {integrityResult ? (
            <div>
              <div className="flex items-center mb-3">
                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${integrityResult.valid ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-medium">
                  {integrityResult.valid ? '✓ Data is valid' : '✗ Integrity check failed'}
                </span>
              </div>
              {!integrityResult.valid && integrityResult.errors.length > 0 && (
                <div className="bg-red-50 p-3 rounded border border-red-200 text-sm text-red-700 max-h-32 overflow-auto">
                  {integrityResult.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}
              <button
                onClick={runIntegrityCheck}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800"
              >
                Run check again
              </button>
            </div>
          ) : (
            <p className="text-gray-500">No integrity data available.</p>
          )}
        </div>

        {/* Backup Info */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Backup & Restore</h2>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Last backup:{' '}
              {backupInfo.lastBackup
                ? new Date(backupInfo.lastBackup).toLocaleString()
                : 'Never'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleBackup}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Working...' : 'Create Backup'}
              </button>
              <button
                onClick={handleRestore}
                disabled={loading}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
              >
                Restore Backup
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Actions */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Advanced Actions</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <button
            onClick={handleExport}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Export All Data (JSON)
          </button>
          <label className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 cursor-pointer">
            Import Data
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              disabled={loading}
            />
          </label>
          <button
            onClick={handleClearOldDocs}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Clear Old Documents (90 days)
          </button>
          <button
            onClick={handleReset}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            Reset All Data
          </button>
        </div>
      </div>

      {percentageUsed > 80 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-800">
          ⚠️ Storage is {percentageUsed.toFixed(0)}% full. Consider clearing old documents or exporting data.
        </div>
      )}
    </div>
  );
};

export default DataManagement;