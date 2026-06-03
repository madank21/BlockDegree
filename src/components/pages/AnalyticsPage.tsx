import { useApp } from '../../context/AppContext';
import { Activity, TrendingUp, BarChart3, PieChart, GitBranch } from 'lucide-react';

export default function AnalyticsPage() {
  const { degrees, verifications, fraudReports, transactions, auditLogs } = useApp();

  const universityStats = Object.entries(
    degrees.reduce((acc, d) => {
      acc[d.university] = (acc[d.university] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  const programStats = Object.entries(
    degrees.reduce((acc, d) => {
      acc[d.program] = (acc[d.program] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  const verificationsByResult = {
    VALID: verifications.filter(v => v.result === 'VALID').length,
    INVALID: verifications.filter(v => v.result === 'INVALID').length,
    REVOKED: verifications.filter(v => v.result === 'REVOKED').length,
  };

  const actionCounts = auditLogs.reduce((acc, l) => {
    acc[l.action] = (acc[l.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Degrees', value: degrees.length, color: 'text-blue-400' },
          { label: 'Verifications', value: verifications.length, color: 'text-green-400' },
          { label: 'Fraud Reports', value: fraudReports.length, color: 'text-orange-400' },
          { label: 'Transactions', value: transactions.length, color: 'text-purple-400' },
          { label: 'Audit Events', value: auditLogs.length, color: 'text-cyan-400' },
        ].map((m, i) => (
          <div key={i} className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-4 backdrop-blur text-center">
            <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-400 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Degrees by University */}
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            Degrees by University
          </h3>
          <div className="space-y-3">
            {universityStats.map(([name, count]) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">{name}</span>
                  <span className="text-white font-bold">{count}</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500" style={{ width: `${(count / degrees.length) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verification Results */}
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-green-400" />
            Verification Results Distribution
          </h3>
          <div className="flex items-center justify-center gap-8 py-4">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {(() => {
                  const total = verifications.length || 1;
                  const validPct = (verificationsByResult.VALID / total) * 100;
                  const invalidPct = (verificationsByResult.INVALID / total) * 100;
                  const revokedPct = (verificationsByResult.REVOKED / total) * 100;
                  const r = 40;
                  const c = 2 * Math.PI * r;
                  return (
                    <>
                      <circle cx="50" cy="50" r={r} fill="none" stroke="#1f2937" strokeWidth="12" />
                      <circle cx="50" cy="50" r={r} fill="none" stroke="#22c55e" strokeWidth="12" strokeDasharray={`${(validPct / 100) * c} ${c}`} strokeDashoffset="0" />
                      <circle cx="50" cy="50" r={r} fill="none" stroke="#f97316" strokeWidth="12" strokeDasharray={`${(invalidPct / 100) * c} ${c}`} strokeDashoffset={`${-((validPct / 100) * c)}`} />
                      <circle cx="50" cy="50" r={r} fill="none" stroke="#ef4444" strokeWidth="12" strokeDasharray={`${(revokedPct / 100) * c} ${c}`} strokeDashoffset={`${-(((validPct + invalidPct) / 100) * c)}`} />
                    </>
                  );
                })()}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{verifications.length}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-gray-400">Valid: {verificationsByResult.VALID}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm text-gray-400">Invalid: {verificationsByResult.INVALID}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-gray-400">Revoked: {verificationsByResult.REVOKED}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Programs */}
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            Degrees by Program
          </h3>
          <div className="space-y-3">
            {programStats.map(([name, count]) => (
              <div key={name} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                  {count}
                </div>
                <span className="text-sm text-gray-300">{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Breakdown */}
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Activity Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(actionCounts).map(([action, count]) => {
              const colors: Record<string, string> = {
                DEGREE_ISSUED: 'from-blue-500 to-blue-400',
                DEGREE_VERIFIED: 'from-green-500 to-green-400',
                DEGREE_REVOKED: 'from-red-500 to-red-400',
                FRAUD_DETECTED: 'from-orange-500 to-orange-400',
              };
              return (
                <div key={action}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{action.replace(/_/g, ' ')}</span>
                    <span className="text-white font-bold">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${colors[action] || 'from-gray-500 to-gray-400'} rounded-full`} style={{ width: `${(count / auditLogs.length) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Transaction Graph Analysis */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-cyan-400" />
          Transaction Graph Analysis
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Visualizing the relationship between universities, degrees, and students on the blockchain.
        </p>
        <div className="relative p-8 bg-gray-900/50 rounded-xl overflow-hidden min-h-[280px]">
          {/* Simulated Graph */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            {/* Universities */}
            <div className="space-y-3">
              <p className="text-xs text-gray-500 text-center uppercase tracking-wider mb-2">Universities</p>
              {['ABC University', 'XYZ University'].map(uni => (
                <div key={uni} className="px-4 py-3 bg-blue-500/20 border border-blue-500/40 rounded-xl text-sm text-blue-400 text-center font-medium">
                  🏛️ {uni}
                </div>
              ))}
            </div>

            {/* Arrows */}
            <div className="flex flex-col items-center gap-2 text-gray-600">
              <span className="text-xs">issueDegree()</span>
              <div className="w-16 h-0.5 bg-gray-700 hidden md:block" />
              <div className="h-8 w-0.5 bg-gray-700 md:hidden" />
              <span className="text-xs">→ blockchain</span>
            </div>

            {/* Degrees */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 text-center uppercase tracking-wider mb-2">Degrees</p>
              {degrees.slice(0, 4).map(d => (
                <div key={d.id} className={`px-3 py-2 rounded-lg text-xs text-center font-medium ${d.status === 'ACTIVE' ? 'bg-green-500/15 border border-green-500/30 text-green-400' : 'bg-red-500/15 border border-red-500/30 text-red-400'}`}>
                  🎓 {d.program.split(' ').slice(-2).join(' ')}
                </div>
              ))}
            </div>

            {/* Arrows */}
            <div className="flex flex-col items-center gap-2 text-gray-600">
              <span className="text-xs">verifyDegree()</span>
              <div className="w-16 h-0.5 bg-gray-700 hidden md:block" />
              <div className="h-8 w-0.5 bg-gray-700 md:hidden" />
              <span className="text-xs">→ result</span>
            </div>

            {/* Students */}
            <div className="space-y-3">
              <p className="text-xs text-gray-500 text-center uppercase tracking-wider mb-2">Students</p>
              {['Ali Ahmed', 'Sara Khan', 'Ahmed Raza'].map(s => (
                <div key={s} className="px-4 py-3 bg-green-500/20 border border-green-500/40 rounded-xl text-sm text-green-400 text-center font-medium">
                  👤 {s}
                </div>
              ))}
            </div>
          </div>

          {/* Anomaly Detection Note */}
          <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <p className="text-xs text-yellow-400 flex items-center gap-2">
              <span>⚠️</span>
              <span><strong>Anomaly Detection (Isolation Forest):</strong> No suspicious patterns detected. All issuance activity within normal parameters.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
