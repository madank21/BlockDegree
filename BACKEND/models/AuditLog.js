// FRONTEND/src/pages/AuditLogs.tsx
//
// STATUS: BROKEN
//   - import api from '@/api/api'  — @/ alias may not be configured
//   - api.request<{ logs }>('/audit-logs')  — api.request() signature mismatch
//   - search: log.details.toLowerCase() — details can be an object, not always string
//
// FIXES:
//   [1] import { auditApi } from '../api/api'   (relative, no alias)
//   [2] auditApi.list()  replaces  api.request('/audit-logs')
//   [3] Details safely stringified before search / display
//   [4] Pagination support added (load more)
//   [5] Handles both log.timestamp and log.createdAt (backend uses both field names)

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, RefreshCw, ClipboardList, ChevronDown } from 'lucide-react';
import { auditApi } from '../api/api';

interface AuditLog {
  id: string;
  action: string;
  details?: string | Record<string, unknown>;
  category?: string;
  userName?: string;
  userId?: string;
  actorId?: string;
  timestamp?: string;
  createdAt?: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  auth:         'bg-blue-400',
  verification: 'bg-purple-400',
  degree:       'bg-green-400',
  blockchain:   'bg-cyan-400',
  fraud:        'bg-red-400',
  admin:        'bg-yellow-400',
};

const CATEGORY_TEXT: Record<string, string> = {
  auth:         'text-blue-400',
  verification: 'text-purple-400',
  degree:       'text-green-400',
  blockchain:   'text-cyan-400',
  fraud:        'text-red-400',
  admin:        'text-yellow-400',
};

// Safely stringify details field (can be string or object)
function detailsToString(details: string | Record<string, unknown> | undefined): string {
  if (!details) return '';
  if (typeof details === 'string') return details;
  try { return JSON.stringify(details); } catch { return '[object]'; }
}

export default function AuditLogs() {
  const [logs,        setLogs]        = useState<AuditLog[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [filter,      setFilter]      = useState('all');
  const [search,      setSearch]      = useState('');

  const LIMIT = 50;

  // FIX [2]: auditApi.list() replaces api.request('/audit-logs')
  const fetchLogs = async (reset = true) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 1 : page + 1;
      const data = await auditApi.list({ page: currentPage, limit: LIMIT });

      const incoming: AuditLog[] = data.logs || [];
      setTotal(data.total ?? incoming.length);

      if (reset) {
        setLogs(incoming);
      } else {
        setLogs(prev => [...prev, ...incoming]);
        setPage(currentPage);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const categories = ['all', 'auth', 'verification', 'degree', 'blockchain', 'fraud', 'admin'];

  // FIX [3]: detailsToString before toLowerCase
  const filtered = logs.filter(log => {
    if (filter !== 'all' && log.category !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const actionMatch   = log.action?.toLowerCase().includes(q);
      const detailsMatch  = detailsToString(log.details).toLowerCase().includes(q);
      const userMatch     = (log.userName || log.userId || '').toLowerCase().includes(q);
      if (!actionMatch && !detailsMatch && !userMatch) return false;
    }
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
        <button
          onClick={() => fetchLogs()}
          className="mt-2 text-sm underline flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-cyan-400" /> Audit Logs
          </h2>
          <p className="text-gray-400 mt-1">
            Complete activity trail — {total.toLocaleString()} total entries
          </p>
        </div>
        <button
          onClick={() => fetchLogs()}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-400 transition"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by action, details, or user…"
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

      {/* Log list */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <span className="text-sm text-gray-400">
            Showing {filtered.length} of {total.toLocaleString()} entries
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No audit logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50 max-h-[600px] overflow-y-auto">
            {filtered.map((log, i) => {
              // FIX [5]: handle both timestamp and createdAt
              const ts = log.timestamp || log.createdAt;
              // FIX [3]: safe details
              const detailsStr = detailsToString(log.details);
              const actor = log.userName || log.userId || log.actorId || 'System';
              const cat   = log.category || 'admin';

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-gray-800/20 transition"
                >
                  {/* Category dot */}
                  <div
                    className={`w-2 h-2 rounded-full mt-2 shrink-0 ${CATEGORY_COLORS[cat] || 'bg-gray-400'}`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{log.action}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize font-medium ${CATEGORY_TEXT[cat] || 'text-gray-400'} bg-gray-800`}>
                        {cat}
                      </span>
                      {log.resourceType && (
                        <span className="text-[10px] text-gray-600">
                          {log.resourceType}
                          {log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ''}
                        </span>
                      )}
                    </div>
                    {detailsStr && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{detailsStr}</p>
                    )}
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {actor}
                      {log.ipAddress && ` • ${log.ipAddress}`}
                      {ts && ` • ${new Date(ts).toLocaleString()}`}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Load more */}
      {logs.length < total && (
        <div className="text-center">
          <button
            onClick={() => fetchLogs(false)}
            disabled={loadingMore}
            className="flex items-center gap-2 mx-auto px-6 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition disabled:opacity-50"
          >
            {loadingMore
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
              : <><ChevronDown className="w-4 h-4" /> Load More ({total - logs.length} remaining)</>}
          </button>
        </div>
      )}
    </div>
  );
}