import { useApp } from '../../context/AppContext';
import { GraduationCap, CheckCircle, QrCode, Shield, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function StudentDashboard() {
  const { currentUser, degrees, verifications } = useApp();
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const myDegrees = degrees.filter(d => d.studentName === currentUser?.name);
  const myVerifications = verifications.filter(v => myDegrees.some(d => d.degreeHash === v.degreeHash));

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash).catch(() => {});
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 backdrop-blur">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white mb-3">
            <GraduationCap className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-white">{myDegrees.length}</p>
          <p className="text-sm text-gray-400">My Degrees</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 backdrop-blur">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white mb-3">
            <CheckCircle className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-white">{myVerifications.length}</p>
          <p className="text-sm text-gray-400">Verifications</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 backdrop-blur col-span-2 md:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-white">{myDegrees.filter(d => d.status === 'ACTIVE').length}</p>
          <p className="text-sm text-gray-400">Active Degrees</p>
        </div>
      </div>

      {/* Degree Cards */}
      <div className="space-y-4">
        {myDegrees.map(degree => (
          <div key={degree.id} className="bg-gray-800/60 border border-gray-700/50 rounded-2xl overflow-hidden backdrop-blur">
            <div className={`h-1.5 ${degree.status === 'ACTIVE' ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-gradient-to-r from-red-500 to-red-600'}`} />
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">{degree.program}</h3>
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${degree.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {degree.status}
                    </span>
                  </div>
                  <p className="text-gray-400">{degree.university}</p>
                  <p className="text-sm text-gray-500 mt-1">Graduated: {degree.graduationDate}</p>
                  <p className="text-sm text-gray-500">Student ID: {degree.studentId}</p>

                  {/* Hash */}
                  <div className="mt-4 p-3 bg-gray-900/60 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Degree Hash (SHA-256)</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-cyan-400 font-mono break-all flex-1">{degree.degreeHash}</code>
                      <button
                        onClick={() => copyHash(degree.degreeHash)}
                        className="text-gray-400 hover:text-white transition shrink-0 cursor-pointer"
                      >
                        {copiedHash === degree.degreeHash ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 p-3 bg-gray-900/60 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Blockchain Tx Hash</p>
                    <code className="text-xs text-purple-400 font-mono break-all">{degree.blockchainTxHash}</code>
                  </div>
                </div>

                {/* QR Code Placeholder */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-32 h-32 bg-white rounded-xl flex items-center justify-center p-2">
                    <div className="w-full h-full bg-gray-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                      <QrCode className="w-12 h-12 text-gray-800" />
                      <p className="text-[8px] text-gray-500 mt-1 font-mono">QR VERIFY</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Scan to verify</p>
                </div>
              </div>

              {/* Verification History */}
              {myVerifications.filter(v => v.degreeHash === degree.degreeHash).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Verification History</h4>
                  <div className="space-y-2">
                    {myVerifications.filter(v => v.degreeHash === degree.degreeHash).map(v => (
                      <div key={v.id} className="flex items-center gap-3 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.result === 'VALID' ? 'bg-green-500/10 text-green-400' : v.result === 'REVOKED' ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'}`}>
                          {v.result}
                        </span>
                        <span className="text-gray-400">by {v.employer}</span>
                        <span className="text-gray-600 text-xs">{new Date(v.timestamp).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
