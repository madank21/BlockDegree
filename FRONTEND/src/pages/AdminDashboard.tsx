import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  Users, GraduationCap, AlertTriangle, Link2, ClipboardList,
  CheckCircle2, Clock, Activity
} from 'lucide-react';
import { usersApi, degreesApi, blockchainApi } from '@/api/api';

interface Props {
  onNavigate: (page: string) => void;
}

export default function AdminDashboard({ onNavigate }: Props) {
  const [students, setStudents] = useState<any[]>([]);
  const [degreeApps, setDegreeApps] = useState<any[]>([]);
  const [issuedDegreesCount, setIssuedDegreesCount] = useState(0);
  const [totalAttestations, setTotalAttestations] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockchainError, setBlockchainError] = useState<string | null>(null);
  const [degreeError, setDegreeError] = useState<string | null>(null);

  // Derived
  const verifiedStudents = students.filter(s => s.verificationStatus === 'approved');
  const pendingStudents = students.filter(s => s.verificationStatus && s.verificationStatus !== 'approved' && s.verificationStatus !== 'rejected');
  const pendingDegrees = degreeApps.filter(d => d.status === 'pending' || d.status === 'approved');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setBlockchainError(null);
        setDegreeError(null);

        // 1. Fetch students – works with auth but may not check is_active
        try {
          const usersRes = await usersApi.list({ role: 'student' });
          setStudents(usersRes.users || []);
        } catch (err: any) {
          console.error('Students fetch error:', err);
          if (err.message?.includes('deactivated')) {
            setError('Your account is deactivated. Please contact support.');
          } else {
            setError('Failed to load students.');
          }
        }

        // 2. Fetch degrees – requires admin + active
        try {
          const degreesRes = await degreesApi.list();
          const degrees = degreesRes.degrees || [];
          setDegreeApps(degrees);
          const issued = degrees.filter((d: any) => d.status === 'issued').length;
          setIssuedDegreesCount(issued);
        } catch (err: any) {
          console.warn('Degrees fetch failed:', err);
          if (err.message?.includes('deactivated') || err.status === 401) {
            setDegreeError('Account deactivated or insufficient permissions.');
          } else {
            setDegreeError('Could not load degree data.');
          }
          // Keep existing count (if any)
        }

        // 3. Fetch blockchain total – requires admin + active
        try {
          const bcRes = await blockchainApi.totalDegrees();
          setTotalAttestations(bcRes.total || 0);
        } catch (err: any) {
          console.warn('Blockchain total fetch failed:', err);
          if (err.message?.includes('deactivated') || err.status === 401) {
            setBlockchainError('Blockchain access denied – account inactive.');
          } else {
            setBlockchainError('Could not load blockchain data.');
          }
        }

      } catch (err: any) {
        console.error('Dashboard fetch error:', err);
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    { label: 'Total Students', value: students.length, icon: Users, gradient: 'from-blue-600 to-cyan-600', color: 'text-blue-400' },
    { label: 'Verified', value: verifiedStudents.length, icon: CheckCircle2, gradient: 'from-green-600 to-emerald-600', color: 'text-green-400' },
    { label: 'Degrees Issued', value: loading ? '…' : issuedDegreesCount, icon: GraduationCap, gradient: 'from-purple-600 to-pink-600', color: 'text-purple-400' },
    { label: 'Pending Apps', value: pendingDegrees.length, icon: Clock, gradient: 'from-yellow-600 to-orange-600', color: 'text-yellow-400' },
    { label: 'Fraud Alerts', value: '0', icon: AlertTriangle, gradient: 'from-red-600 to-rose-600', color: 'text-red-400' },
    { label: 'Attestations', value: loading ? '…' : (blockchainError ? '⚠️' : totalAttestations), icon: Link2, gradient: 'from-indigo-600 to-blue-600', color: 'text-indigo-400' },
  ];

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 bg-red-600/20 text-red-300 rounded-lg hover:bg-red-600/30 transition"
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

      {/* Stats Grid */}
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

      {/* Pending Students & Degrees */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Students */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" /> Pending Verifications
            </h3>
            <button onClick={() => onNavigate('students')} className="text-xs text-blue-400 hover:text-blue-300 transition">View All</button>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-6">Loading...</p>
          ) : pendingStudents.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No pending verifications</p>
          ) : (
            <div className="space-y-3">
              {pendingStudents.slice(0, 4).map(s => (
                <div key={s.id} className="flex items-center justify-between bg-gray-800/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-gray-500">#{s.studentId || s.id.slice(0, 8)}</p>
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
            <button onClick={() => onNavigate('degree-management')} className="text-xs text-blue-400 hover:text-blue-300 transition">View All</button>
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
            <p className="text-sm text-gray-500 text-center py-6">Loading...</p>
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
                  <span className={`text-xs px-2 py-1 rounded border ${
                    d.status === 'approved' ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' :
                    'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
                  } capitalize`}>
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-cyan-400" /> Recent Activity
          </h3>
          <button onClick={() => onNavigate('audit')} className="text-xs text-blue-400 hover:text-blue-300 transition">View All</button>
        </div>
        {blockchainError ? (
          <div className="text-sm text-yellow-400 text-center py-4">
            {blockchainError}
            <button
              onClick={() => window.location.reload()}
              className="block mx-auto mt-2 text-xs text-blue-400 hover:text-blue-300"
            >
              Retry
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-6">Audit logs will appear here once the backend is ready.</p>
        )}
      </div>
    </div>
  );
}