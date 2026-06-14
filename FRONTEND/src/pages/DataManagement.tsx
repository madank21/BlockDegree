import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../useStore';
import { Download, Upload, RefreshCw, Trash2, HardDrive, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function DataManagement() {
  const { getStorageStats, getStorageWarning, createDataBackup, restoreFromBackup, exportAllData, importData, clearOldDocuments, verifyDataIntegrity } = useStore();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = getStorageStats();
  const warning = getStorageWarning();
  const storagePercentage = Math.round((stats.totalSize / (5 * 1024 * 1024)) * 100);
  const integrity = verifyDataIntegrity();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleBackup = () => {
    setLoading(true);
    const result = createDataBackup();
    if (result.success) {
      setMessage({ type: 'success', text: `✓ Backup created successfully (${formatBytes(result.size)})` });
    } else {
      setMessage({ type: 'error', text: 'Failed to create backup' });
    }
    setLoading(false);
  };

  const handleRestore = () => {
    if (confirm('⚠️  This will overwrite current data. Are you sure?')) {
      setLoading(true);
      const success = restoreFromBackup();
      if (success) {
        setMessage({ type: 'success', text: '✓ Data restored from backup' });
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: 'Failed to restore backup' });
      }
      setLoading(false);
    }
  };

  const handleExport = () => {
    setLoading(true);
    exportAllData();
    setMessage({ type: 'success', text: '✓ Data exported to JSON file' });
    setLoading(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const success = await importData(file);
    if (success) {
      setMessage({ type: 'success', text: '✓ Data imported successfully' });
      window.location.reload();
    } else {
      setMessage({ type: 'error', text: 'Failed to import data' });
    }
    setLoading(false);
  };

  const handleClearOldDocuments = () => {
    if (confirm('Delete documents older than 90 days?')) {
      setLoading(true);
      const deleted = clearOldDocuments(90);
      setMessage({ type: 'success', text: `✓ Deleted ${deleted} old documents` });
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Data Management</h2>
        <p className="text-gray-400 mt-1">Backup, restore, and manage your account data safely</p>
      </div>

      {/* Storage Status */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-400" />
            Storage Usage
          </h3>
          <span className="text-sm text-gray-400">{storagePercentage}% used</span>
        </div>

        <div className="space-y-3">
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full transition-all ${
                storagePercentage > 90 ? 'bg-red-500' : 
                storagePercentage > 70 ? 'bg-yellow-500' : 
                'bg-blue-500'
              }`}
              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-gray-400">User Data</p>
              <p className="font-semibold">{formatBytes(stats.userDataSize)}</p>
            </div>
            <div>
              <p className="text-gray-400">Documents</p>
              <p className="font-semibold">{formatBytes(stats.documentDataSize)}</p>
            </div>
            <div>
              <p className="text-gray-400">Degrees</p>
              <p className="font-semibold">{formatBytes(stats.degreeDataSize)}</p>
            </div>
          </div>

          {warning && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-400">{warning}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Data Integrity */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold mb-3">Data Integrity</h3>
        <div className={`p-3 rounded-lg border ${
          integrity.isValid 
            ? 'bg-green-500/10 border-green-500/20' 
            : 'bg-red-500/10 border-red-500/20'
        }`}>
          <div className="flex items-center gap-2">
            {integrity.isValid ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            )}
            <span className={integrity.isValid ? 'text-green-400' : 'text-red-400'}>
              {integrity.isValid ? '✓ All data is valid and consistent' : '✗ Data integrity issues detected'}
            </span>
          </div>
          {integrity.errors.length > 0 && (
            <div className="mt-2 space-y-1">
              {integrity.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-400">{err}</p>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Backup & Restore Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleBackup}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl p-6 transition flex flex-col items-center gap-2"
        >
          <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
          <span className="font-medium">Create Backup</span>
          <span className="text-xs text-blue-200">{stats.lastBackup ? `Last: ${new Date(stats.lastBackup).toLocaleDateString()}` : 'No backup yet'}</span>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleRestore}
          disabled={loading || !stats.lastBackup}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl p-6 transition flex flex-col items-center gap-2"
        >
          <Upload className="w-6 h-6" />
          <span className="font-medium">Restore Backup</span>
          <span className="text-xs text-purple-200">Overwrites current data</span>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleExport}
          disabled={loading}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl p-6 transition flex flex-col items-center gap-2"
        >
          <Download className="w-6 h-6" />
          <span className="font-medium">Export to JSON</span>
          <span className="text-xs text-green-200">Save as file</span>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleImportClick}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl p-6 transition flex flex-col items-center gap-2"
        >
          <Upload className="w-6 h-6" />
          <span className="font-medium">Import from JSON</span>
          <span className="text-xs text-indigo-200">Load file</span>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleClearOldDocuments}
          disabled={loading}
          className="col-span-1 md:col-span-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl p-4 transition flex items-center justify-center gap-2"
        >
          <Trash2 className="w-5 h-5" />
          <span className="font-medium">Clear Old Documents (90+ days)</span>
        </motion.button>
      </div>

      {/* File Input (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* Messages */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          {message.text}
        </motion.div>
      )}

      {/* Information */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-sm text-gray-400">
        <h4 className="font-semibold text-white mb-2">Data Management Tips</h4>
        <ul className="space-y-1 list-disc list-inside">
          <li>Regular backups protect against data loss</li>
          <li>Export data before clearing old documents</li>
          <li>Data is stored locally in your browser's localStorage</li>
          <li>Maximum storage: ~5MB per domain</li>
          <li>Clearing browser data will erase all stored information</li>
        </ul>
      </div>
    </div>
  );
}
