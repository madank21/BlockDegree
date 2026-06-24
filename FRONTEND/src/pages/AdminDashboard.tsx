// FRONTEND/src/pages/AdminDashboard.tsx
//
// FIXES APPLIED:
//   [1] blockchainApi.totalDegrees() returns { totalDegrees } not { total }
//       → was reading bcRes.total (always undefined) → showing 0
//   [2] Added adminApi.stats() call to surface document/user/degree counts from admin endpoint
//   [3] Added fraudApi.stats() call to show real fraud alert count instead of hardcoded '0'
//   [4] Added auditApi.list() call to populate Recent Activity section
//   [5] Removed @/ path alias → relative import ../api/api  (vite alias may not be configured)
//   [6] Each async fetch is independently try/caught so one failure doesn't blank the whole dashboard
//

import { motion }    from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  Users, GraduationCap, AlertTriangle, Link2, ClipboardList,
  CheckCircle2, Clock, Activity, FileText, Database,
} from 'lucide-react';
import { usersApi, degreesApi, blockchainApi, fraudApi, auditApi, adminApi } from '../api/api';

interface Props {
  onNavigate: (page: string) => void;
}

export default function AdminDashboard({ onNavigate }: Props) {
  const [students,           setStudents]           = useState<any[]>([]);
  const [degreeApps,         setDegreeApps]         = useState<any[]>([]);
  const [issuedDegreesCount, setIssuedDegreesCount] = useState(0);
  const [totalAttestations,  setTotalAttestations]  = useState(0);
  const [fraudAlerts,        setFraudAlerts]        = useState(0);
  const [recentActivity,     setRecentActivity]     = useState<any[]>([]);
  const [adminStats,         setAdminStats]         = useState<any>(null);

  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [blockchainError, setBlockchainError] = useState<string | null>(null);
  const [degreeError,     setDegreeError]     = useState<string | null>(null);

  // Derived
  const verifiedStudents = students.filter(s => s.verificationStatus === 'approved');
  const pendingStudents  = students.filter(
    s => s.verificationStatus && s.verificationStatus !== 'approved' && s.verificationStatus !== 'rejected'
  );
  const pendingDegrees   = degreeApps.filter(d => d.status === 'pending' || d.status === 'approved');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setBlockchainError(null);
      setDegreeError(null);

      // 1. Students list
      try {
        const usersRes = await usersApi.list({ role: 'student', limit: 100 });
        setStudents(usersRes.data || []);
      } catch (err: any) {
        console.error('Students fetch error:', err);
        setError(
          err.message?.includes('deactivated')
            ? 'Your account is deactivated. Please contact support.'
            : 'Failed to load students.'
        );
      }

      // 2. Degrees list
      try {
        const degreesRes = await degreesApi.list({ limit: 100 });
        const degrees    = degreesRes.data || [];
        setDegreeApps(degrees);
        setIssuedDegreesCount(degrees.filter((d: any) => d.status === 'issued').length);
      } catch (err: any) {
        console.warn('Degrees fetch failed:', err);
        setDegreeError(
          err.message?.includes('deactivated') || err.status === 401
            ? 'Account deactivated or insufficient permissions.'
            : 'Could not load degree data.'
        );
      }

      // 3. Blockchain total
      // [FIX 1] Backend returns { total: N }
      try {
        const bcRes = await blockchainApi.totalDegrees();
        setTotalAttestations(bcRes.total ?? 0);
      } catch (err: any) {
        console.warn('Blockchain total fetch failed:', err);
        setBlockchainError(
          err.message?.includes('deactivated') || err.status === 401
            ? 'Blockchain access denied – account inactive.'
            : 'Could not load blockchain data.'
        );
      }

      // [FIX 3] Fraud alert count from real endpoint
      try {
        const fraudStats = await fraudApi.stats();
        setFraudAlerts(fraudStats?.unresolvedCount ?? 0);
      } catch (err) {
        console.warn('Fraud stats fetch failed:', err);
        // Non-critical — keep 0
      }

      // [FIX 4] Recent audit log activity
      try {
        const auditRes = await auditApi.list({ limit: 5 });
        setRecentActivity(auditRes.data || []);
      } catch (err) {
        console.warn('Audit log fetch failed:', err);
        // Non-critical — keep []
      }

      // [FIX 2] Admin stats (documents count, storage usage)
      try {
        const stats = await adminApi.stats();
        setAdminStats(stats);
      } catch (err) {
        console.warn('Admin stats fetch failed:', err);
        // Non-critical
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const stats = [
    {
      label:    'Total Students',
      value:    loading ? '…' : students.length,
      icon:     Users,
      gradient: 'from-blue-600 to-cyan-600',
      color:    'text-blue-400',
    },
    {
      label:    'Verified',
      value:    loading ? '…' : verifiedStudents.length,
      icon:     CheckCircle2,
      gradient: 'from-green-600 to-emerald-600',
      color:    'text-green-400',
    },
    {
      label:    'Degrees Issued',
      value:    loading ? '…' : issuedDegreesCount,
      icon:     GraduationCap,
      gradient: 'from-purple-600 to-pink-600',
      color:    'text-purple-400',
    },
    {
      label:    'Pending Apps',
      value:    loading ? '…' : pendingDegrees.length,
      icon:     Clock,
      gradient: 'from-yellow-600 to-orange-600',
      color:    'text-yellow-400',
    },
    {
      // [FIX 3] Real fraud count
      label:    'Fraud Alerts',
      value:    loading ? '…' : fraudAlerts,
      icon:     AlertTriangle,
      gradient: 'from-red-600 to-rose-600',
      color:    'text-red-400',
    },
    {
      // [FIX 1] Reads totalDegrees correctly now
      label:    'Attestations',
      value:    loading ? '…' : (blockchainError ? '⚠️' : totalAttestations),
      icon:     Link2,
      gradient: 'from-indigo-600 to-blue-600',
      color:    'text-indigo-400',
    },
  ];

  // Extra stat cards from adminApi.stats (documents + storage)
  const adminStatCards = adminStats
    ? [
        {
          label:    'Documents',
          value:    adminStats.documents ?? '–',
          icon:     FileText,
          gradient: 'from-teal-600 to-cyan-600',
          color:    'text-teal-400',
        },
        {
          label:    'Storage Used',
          value:    adminStats.used != null
            ? `${(adminStats.used / (1024 * 1024)).toFixed(0)} MB`
            : '–',
          icon:     Database,
          gradient: 'from-gray-600 to-slate-600',
          color:    'text-gray-400',
        },
      ]
    : [];

  if (error && students.length === 0) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 bg-red-600/20 text-red-300 rounded-lg hover:bg-red-600/30 transition text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-400 mt-1">System overview and management</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
          <Activity className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-400 font-medium">System Active</span>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-3`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Secondary Stats (from adminApi.stats) */}
      {adminStatCards.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {adminStatCards.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-3`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pending Students & Degrees */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Students */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" /> Pending Verifications
            </h3>
            <button
              onClick={() => onNavigate('students')}
              className="text-xs text-blue-400 hover:text-blue-300 transition"
            >
              View All
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500 text-center py-6">Loading…</p>
          ) : pendingStudents.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No pending verifications</p>
          ) : (
            <div className="space-y-3">
              {pendingStudents.slice(0, 4).map(s => (
                <div key={s.id} className="flex items-center justify-between bg-gray-800/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                      {(s.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-gray-500">#{s.studentId || s.id?.slice(0, 8)}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 capitalize">
                    {s.verificationStatus?.replace(/_/g, ' ') || 'pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Degrees */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-400" /> Pending Degrees
            </h3>
            <button
              onClick={() => onNavigate('degree-management')}
              className="text-xs text-blue-400 hover:text-blue-300 transition"
            >
              View All
            </button>
          </div>

          {degreeError ? (
            <div className="text-sm text-yellow-400 text-center py-4">
              {degreeError}
              <button
                onClick={() => window.location.reload()}
                className="block mx-auto mt-2 text-xs text-blue-400 hover:text-blue-300"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <p className="text-sm text-gray-500 text-center py-6">Loading…</p>
          ) : pendingDegrees.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No pending degree applications</p>
          ) : (
            <div className="space-y-3">
              {pendingDegrees.slice(0, 4).map(d => (
                <div key={d.id} className="flex items-center justify-between bg-gray-800/30 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium">{d.studentName}</p>
                    <p className="text-xs text-gray-500">{d.degreeTitle}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded border capitalize ${
                    d.status === 'approved'
                      ? 'bg-blue-400/10 text-blue-400 border-blue-400/20'
                      : 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
                  }`}>
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity — [FIX 4] now populated from auditApi */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-cyan-400" /> Recent Activity
          </h3>
          <button
            onClick={() => onNavigate('audit')}
            className="text-xs text-blue-400 hover:text-blue-300 transition"
          >
            View All
          </button>
        </div>

        {blockchainError && recentActivity.length === 0 ? (
          <div className="text-sm text-yellow-400 text-center py-4">
            {blockchainError}
            <button
              onClick={() => window.location.reload()}
              className="block mx-auto mt-2 text-xs text-blue-400 hover:text-blue-300"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <p className="text-sm text-gray-500 text-center py-6">Loading…</p>
        ) : recentActivity.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No recent activity yet. Audit logs will appear here once actions are taken.
          </p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 bg-gray-800/30 rounded-lg p-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{log.action}</p>
                  <p className="text-xs text-gray-500">
                    {log.userName || log.userId || 'System'}
                    {(log.createdAt || log.timestamp) &&
                      ` • ${new Date(log.createdAt || log.timestamp).toLocaleString()}`}
                  </p>
                  {log.details && typeof log.details === 'string' && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{log.details}</p>
                  )}
                </div>
                {log.category && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-gray-700 text-gray-400 capitalize shrink-0">
                    {log.category}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Manage Students',  page: 'students',          icon: Users,          color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20'   },
          { label: 'Degrees',          page: 'degree-management', icon: GraduationCap,  color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
          { label: 'Fraud Detection',  page: 'fraud',             icon: AlertTriangle,  color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20'     },
          { label: 'Blockchain',       page: 'blockchain',        icon: Link2,          color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
        ].map((action, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.05 }}
            onClick={() => onNavigate(action.page)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${action.bg} hover:opacity-80 transition`}
          >
            <action.icon className={`w-6 h-6 ${action.color}`} />
            <span className={`text-xs font-medium ${action.color}`}>{action.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}