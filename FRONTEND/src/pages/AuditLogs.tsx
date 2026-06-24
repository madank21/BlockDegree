import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2 } from 'lucide-react';
import { auditApi } from '../api/api';

interface AuditLog {
  id: string;
  action: string;
  details: string;
  category: string;
  userName: string;
  timestamp: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await auditApi.list();
      setLogs(res.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const categories = ['all', 'auth', 'verification', 'degree', 'blockchain', 'fraud', 'admin'];
  const categoryColors: Record<string, string> = {
    auth: 'bg-blue-400',
    verification: 'bg-purple-400',
    degree: 'bg-green-400',
    blockchain: 'bg-cyan-400',
    fraud: 'bg-red-400',
    admin: 'bg-yellow-400',
  };

  const filtered = [...logs].reverse().filter(log => {
    if (filter !== 'all' && log.category !== filter) return false;
    if (search && !log.action.toLowerCase().includes(search.toLowerCase()) && !log.details.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-red-400">
        <p>{error}</p>
        <button onClick={fetchLogs} className="mt-2 text-sm underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Audit Logs</h2>
        <p className="text-gray-400 mt-1">Complete activity trail for all system operations</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="w-full pl-11 pr-4 py-2.5 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition capitalize ${
                filter === c ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <span className="text-sm text-gray-400">{filtered.length} entries</span>
        </div>
        <div className="divide-y divide-gray-800/50 max-h-[600px] overflow-y-auto">
          {filtered.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.03, 0.5) }}
              className="flex items-start gap-3 px-4 py-3 hover:bg-gray-800/20 transition"
            >
              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${categoryColors[log.category] || 'bg-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{log.action}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${categoryColors[log.category]?.replace('bg-', 'text-').replace('400', '400') || 'text-gray-400'} bg-opacity-10`}>
                    {log.category}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{log.details}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">{log.userName} • {new Date(log.timestamp).toLocaleString()}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}