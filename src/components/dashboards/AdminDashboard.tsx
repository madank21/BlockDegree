import { useApp } from '../../context/AppContext';
import {
  GraduationCap, Search, FileWarning, Ban, Blocks, Users, TrendingUp, ShieldCheck
} from 'lucide-react';

export default function AdminDashboard() {
  const { degrees, verifications, fraudReports, transactions, auditLogs, users } = useApp();

  const activeDegrees = degrees.filter(d => d.status === 'ACTIVE').length;
  const revokedDegrees = degrees.filter(d => d.status === 'REVOKED').length;
  const validVerifications = verifications.filter(v => v.result === 'VALID').length;
  const invalidVerifications = verifications.filter(v => v.result === 'INVALID').length;

  const stats = [
    { label: 'Total Degrees', value: degrees.length, icon: <GraduationCap className="w-6 h-6" />, color: 'from-blue-500 to-blue-600', sub: `${activeDegrees} Active` },
    { label: 'Verifications', value: verifications.length, icon: <Search className="w-6 h-6" />, color: 'from-green-500 to-green-600', sub: `${validVerifications} Valid` },
    { label: 'Fraud Reports', value: fraudReports.length, icon: <FileWarning className="w-6 h-6" />, color: 'from-orange-500 to-orange-600', sub: 'AI Detected' },
    { label: 'Revoked', value: revokedDegrees, icon: <Ban className="w-6 h-6" />, color: 'from-red-500 to-red-600', sub: 'On Blockchain' },
    { label: 'Transactions', value: transactions.length, icon: <Blocks className="w-6 h-6" />, color: 'from-purple-500 to-purple-600', sub: 'On-chain' },
    { label: 'Users', value: users.length, icon: <Users className="w-6 h-6" />, color: 'from-cyan-500 to-cyan-600', sub: '4 Roles' },
  ];

  const recentLogs = [...auditLogs].reverse().slice(0, 8);

  const actionColors: Record<string, string> = {
    DEGREE_ISSUED: 'text-blue-400 bg-blue-500/10',
    DEGREE_VERIFIED: 'text-green-400 bg-green-500/10',
    DEGREE_REVOKED: 'text-red-400 bg-red-500/10',
    FRAUD_DETECTED: 'text-orange-400 bg-orange-500/10',
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 backdrop-blur">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white mb-3`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-400">{stat.label}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* System Overview */}
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            System Overview
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Valid Verifications</span>
                <span className="text-green-400">{validVerifications}/{verifications.length}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full" style={{ width: `${verifications.length ? (validVerifications / verifications.length) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Invalid Verifications</span>
                <span className="text-red-400">{invalidVerifications}/{verifications.length}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full" style={{ width: `${verifications.length ? (invalidVerifications / verifications.length) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Active Degrees</span>
                <span className="text-blue-400">{activeDegrees}/{degrees.length}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" style={{ width: `${degrees.length ? (activeDegrees / degrees.length) * 100 : 0}%` }} />
              </div>
            </div>

            {/* Smart Contract Status */}
            <div className="mt-6 pt-4 border-t border-gray-700/50">
              <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Smart Contracts
              </h4>
              <div className="space-y-2">
                {['DegreeRegistry.sol', 'AccessControl.sol', 'AuditLog.sol'].map(name => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 font-mono text-xs">{name}</span>
                    <span className="flex items-center gap-1.5 text-xs text-green-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Deployed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ScrollIcon />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {recentLogs.map(log => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-900/50">
                <span className={`text-xs px-2 py-1 rounded-lg font-medium whitespace-nowrap ${actionColors[log.action] || 'text-gray-400 bg-gray-700/50'}`}>
                  {log.action.replace('_', ' ')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{log.target}</p>
                  <p className="text-xs text-gray-500">{log.actor} • {new Date(log.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScrollIcon() {
  return (
    <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
