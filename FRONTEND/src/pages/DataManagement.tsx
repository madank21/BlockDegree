import React, { useState, useEffect } from 'react';
import { store } from '../store'; // ✅ fixed import

const DataManagement: React.FC = () => {
  const [stats, setStats] = useState<{ total: number; used: number; documents: number }>({
    total: 0,
    used: 0,
    documents: 0,
  });
  const [integrityResult, setIntegrityResult] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [backupInfo, setBackupInfo] = useState<{ lastBackup: string | null }>({ lastBackup: null });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [dataSizes, setDataSizes] = useState({
    userDataSize: 0,
    documentDataSize: 0,
    degreeDataSize: 0,
  });

  const refreshStats = () => {
    const storageStats = store.getStorageStats();
    setStats(storageStats);

    const state = store.getState();
    const userStr = JSON.stringify(state.users);
    // ✅ added type annotation to prevent implicit any
    const docStr = JSON.stringify(state.users.flatMap((u: any) => u.documents || []));
    const degreeStr = JSON.stringify(state.degreeApplications);

    setDataSizes({
      userDataSize: new Blob([userStr]).size,
      documentDataSize: new Blob([docStr]).size,
      degreeDataSize: new Blob([degreeStr]).size,
    });

    const lastBackup = localStorage.getItem('last_backup_time') || null;
    setBackupInfo({ lastBackup });
  };

  const runIntegrityCheck = () => {
    const result = store.verifyDataIntegrity();
    if (result) {
      setIntegrityResult(result);
    } else {
      setIntegrityResult({ valid: false, errors: ['Integrity check returned null'] });
    }
  };

  const handleBackup = () => {
    setLoading(true);
    try {
      const backup = store.createDataBackup();
      if (backup) {
        localStorage.setItem('last_backup_time', new Date().toISOString());
        setBackupInfo({ lastBackup: new Date().toISOString() });
        setMessage({ type: 'success', text: 'Backup created successfully!' });
        refreshStats();
      } else {
        setMessage({ type: 'error', text: 'Failed to create backup.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${(error as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = () => {
    if (window.confirm('Restoring will overwrite current data. Are you sure?')) {
      setLoading(true);
      try {
        const restored = store.restoreFromBackup();
        if (restored) {
          setMessage({ type: 'success', text: 'Data restored successfully!' });
          refreshStats();
          runIntegrityCheck();
        } else {
          setMessage({ type: 'error', text: 'No backup found to restore.' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: `Error: ${(error as Error).message}` });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleExport = () => {
    try {
      store.exportAllData();
      setMessage({ type: 'success', text: 'Data exported successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: `Export failed: ${(error as Error).message}` });
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      store.importData(file);
      setMessage({ type: 'success', text: 'Data imported successfully!' });
      refreshStats();
      runIntegrityCheck();
    } catch (error) {
      setMessage({ type: 'error', text: `Import failed: ${(error as Error).message}` });
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleClearOldDocs = () => {
    if (window.confirm('Delete documents older than 90 days?')) {
      const count = store.clearOldDocuments(90);
      setMessage({ type: 'info', text: `Removed ${count} old document(s).` });
      refreshStats();
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
                <span className="font-semibold">{(dataSizes.userDataSize / 1024).toFixed(1)} KB</span>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <span className="block text-gray-600">Documents</span>
                <span className="font-semibold">{(dataSizes.documentDataSize / 1024).toFixed(1)} KB</span>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <span className="block text-gray-600">Degrees</span>
                <span className="font-semibold">{(dataSizes.degreeDataSize / 1024).toFixed(1)} KB</span>
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
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
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
            />
          </label>
          <button
            onClick={handleClearOldDocs}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Clear Old Documents (90 days)
          </button>
          <button
            onClick={() => {
              if (window.confirm('Reset all data? This cannot be undone!')) {
                store.resetData();
                refreshStats();
                runIntegrityCheck();
                setMessage({ type: 'info', text: 'Data has been reset.' });
              }
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
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