import { useApp } from '../../context/AppContext';
import { Search, CheckCircle, XCircle, AlertTriangle, FileWarning } from 'lucide-react';

export default function EmployerDashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { currentUser, verifications, fraudReports } = useApp();

  const myVerifications = verifications.filter(v => v.employer === currentUser?.name);
  const valid = myVerifications.filter(v => v.result === 'VALID').length;
  const invalid = myVerifications.filter(v => v.result === 'INVALID').length;
  const revoked = myVerifications.filter(v => v.result === 'REVOKED').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 backdrop-blur">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white mb-3">
            <Search className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-white">{myVerifications.length}</p>
          <p className="text-sm text-gray-400">Total Verifications</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 backdrop-blur">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white mb-3">
            <CheckCircle className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-white">{valid}</p>
          <p className="text-sm text-gray-400">Valid</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 backdrop-blur">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white mb-3">
            <XCircle className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-white">{invalid + revoked}</p>
          <p className="text-sm text-gray-400">Invalid / Revoked</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 backdrop-blur">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white mb-3">
            <FileWarning className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-white">{fraudReports.length}</p>
          <p className="text-sm text-gray-400">Fraud Reports</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('verify')}
          className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-6 text-left hover:border-cyan-500/50 transition cursor-pointer group"
        >
          <Search className="w-8 h-8 text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-white font-semibold mb-1">Verify by Hash</h3>
          <p className="text-sm text-gray-400">Enter degree hash to verify on blockchain</p>
        </button>
        <button
          onClick={() => onNavigate('ocr-verify')}
          className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-6 text-left hover:border-purple-500/50 transition cursor-pointer group"
        >
          <AlertTriangle className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-white font-semibold mb-1">OCR Verification</h3>
          <p className="text-sm text-gray-400">Upload degree image for AI-powered verification</p>
        </button>
        <button
          onClick={() => onNavigate('fraud')}
          className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-2xl p-6 text-left hover:border-orange-500/50 transition cursor-pointer group"
        >
          <FileWarning className="w-8 h-8 text-orange-400 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-white font-semibold mb-1">Fraud Detection</h3>
          <p className="text-sm text-gray-400">YOLO-powered document authenticity check</p>
        </button>
      </div>

      {/* Recent Verifications */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-4">Your Verification History</h3>
        {myVerifications.length === 0 ? (
          <p className="text-gray-500 text-sm">No verifications yet. Start by verifying a degree.</p>
        ) : (
          <div className="space-y-3">
            {[...myVerifications].reverse().map(v => (
              <div key={v.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-900/50">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${v.result === 'VALID' ? 'bg-green-500/20' : v.result === 'REVOKED' ? 'bg-red-500/20' : 'bg-orange-500/20'}`}>
                  {v.result === 'VALID' ? <CheckCircle className="w-5 h-5 text-green-400" /> : v.result === 'REVOKED' ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <XCircle className="w-5 h-5 text-orange-400" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    {v.studentName || 'Unknown'} - {v.program || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">{v.university || 'Unknown University'} • {new Date(v.timestamp).toLocaleDateString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${v.result === 'VALID' ? 'bg-green-500/10 text-green-400' : v.result === 'REVOKED' ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'}`}>
                  {v.result}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
