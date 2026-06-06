import { motion } from 'framer-motion';
import { useStore } from '../useStore';
import {
  Users, GraduationCap, AlertTriangle, Link2, ClipboardList,
  CheckCircle2, Clock, Activity
} from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

export default function AdminDashboard({ onNavigate }: Props) {
  const { users, degreeApplications, blockchainTransactions, auditLogs, fraudReports } = useStore();

  const students = users.filter(u => u.role === 'student');
  const verifiedStudents = students.filter(s => s.verificationStatus === 'approved');
  const pendingStudents = students.filter(s => s.verificationStatus !== 'approved' && s.verificationStatus !== 'rejected');
  const issuedDegrees = degreeApplications.filter(d => d.status === 'issued');
  const pendingDegrees = degreeApplications.filter(d => d.status === 'pending' || d.status === 'approved');
  const unresolvedFraud = fraudReports.filter(f => !f.resolved);

  const stats = [
    { label: 'Total Students', value: students.length, icon: Users, gradient: 'from-blue-600 to-cyan-600', color: 'text-blue-400' },
    { label: 'Verified', value: verifiedStudents.length, icon: CheckCircle2, gradient: 'from-green-600 to-emerald-600', color: 'text-green-400' },
    { label: 'Degrees Issued', value: issuedDegrees.length, icon: GraduationCap, gradient: 'from-purple-600 to-pink-600', color: 'text-purple-400' },
    { label: 'Pending Apps', value: pendingDegrees.length, icon: Clock, gradient: 'from-yellow-600 to-orange-600', color: 'text-yellow-400' },
    { label: 'Fraud Alerts', value: unresolvedFraud.length, icon: AlertTriangle, gradient: 'from-red-600 to-rose-600', color: 'text-red-400' },
    { label: 'Blockchain Txs', value: blockchainTransactions.length, icon: Link2, gradient: 'from-indigo-600 to-blue-600', color: 'text-indigo-400' },
  ];

  const recentLogs = [...auditLogs].reverse().slice(0, 8);

  return (
    <div className="space-y-6">
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

      {/* Grid: Pending Students + Pending Degrees */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Students */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" /> Pending Verifications
            </h3>
            <button onClick={() => onNavigate('students')} className="text-xs text-blue-400 hover:text-blue-300 transition">View All</button>
          </div>
          {pendingStudents.length === 0 ? (
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
                      <p className="text-xs text-gray-500">#{s.registrationNumber}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 capitalize">
                    {s.verificationStatus.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Degree Applications */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-400" /> Pending Degrees
            </h3>
            <button onClick={() => onNavigate('degree-management')} className="text-xs text-blue-400 hover:text-blue-300 transition">View All</button>
          </div>
          {pendingDegrees.length === 0 ? (
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

      {/* Recent Audit Logs */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-cyan-400" /> Recent Activity
          </h3>
          <button onClick={() => onNavigate('audit')} className="text-xs text-blue-400 hover:text-blue-300 transition">View All</button>
        </div>
        <div className="space-y-2">
          {recentLogs.map(log => (
            <div key={log.id} className="flex items-center gap-3 bg-gray-800/20 rounded-lg px-4 py-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                log.category === 'auth' ? 'bg-blue-400' :
                log.category === 'verification' ? 'bg-purple-400' :
                log.category === 'degree' ? 'bg-green-400' :
                log.category === 'blockchain' ? 'bg-cyan-400' :
                log.category === 'fraud' ? 'bg-red-400' :
                'bg-gray-400'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{log.action}</p>
                <p className="text-xs text-gray-500 truncate">{log.details}</p>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
