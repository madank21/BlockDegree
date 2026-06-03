import { useApp } from '../../context/AppContext';
import { ScrollText, Filter } from 'lucide-react';
import { useState } from 'react';

export default function AuditLogs() {
  const { auditLogs } = useApp();
  const [filter, setFilter] = useState<string>('all');

  const actionTypes = ['all', ...new Set(auditLogs.map(l => l.action))];

  const filtered = filter === 'all' ? auditLogs : auditLogs.filter(l => l.action === filter);
  const sorted = [...filtered].reverse();

  const actionColors: Record<string, string> = {
    DEGREE_ISSUED: 'bg-blue-500/10 text-blue-400',
    DEGREE_VERIFIED: 'bg-green-500/10 text-green-400',
    DEGREE_REVOKED: 'bg-red-500/10 text-red-400',
    FRAUD_DETECTED: 'bg-orange-500/10 text-orange-400',
  };

  const roleColors: Record<string, string> = {
    admin: 'text-red-400',
    university: 'text-blue-400',
    student: 'text-green-400',
    employer: 'text-purple-400',
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white">
              <ScrollText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Audit Logs</h2>
              <p className="text-sm text-gray-400">{auditLogs.length} total records</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Filter className="w-4 h-4 text-gray-500" />
          {actionTypes.map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                filter === type ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-gray-900/50 text-gray-400 border border-gray-700/50 hover:text-gray-300'
              }`}
            >
              {type === 'all' ? 'All' : type.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Logs */}
        <div className="space-y-2">
          {sorted.map(log => (
            <div key={log.id} className="flex items-start gap-4 p-4 rounded-xl bg-gray-900/50 hover:bg-gray-900/70 transition">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${actionColors[log.action] || 'bg-gray-700/50 text-gray-400'}`}>
                {log.action.replace('_', ' ')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300">{log.target}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-medium ${roleColors[log.role] || 'text-gray-500'}`}>{log.actor}</span>
                  <span className="text-xs text-gray-600">•</span>
                  <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                {log.txHash && (
                  <p className="text-xs text-gray-600 font-mono mt-1 truncate">Tx: {log.txHash}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
