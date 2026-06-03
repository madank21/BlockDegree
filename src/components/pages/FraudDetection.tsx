import { useApp } from '../../context/AppContext';
import { FileWarning, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function FraudDetection() {
  const { fraudReports } = useApp();

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 backdrop-blur">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white mb-3">
            <FileWarning className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-white">{fraudReports.length}</p>
          <p className="text-sm text-gray-400">Total Fraud Reports</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 backdrop-blur">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-white">{fraudReports.filter(f => f.riskScore >= 70).length}</p>
          <p className="text-sm text-gray-400">High Risk</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 backdrop-blur">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-white">{fraudReports.filter(f => f.riskScore < 30).length}</p>
          <p className="text-sm text-gray-400">Low Risk</p>
        </div>
      </div>

      {/* Fraud Scoring Engine Explanation */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          🎯 YOLO Fraud Scoring Engine
        </h3>
        <div className="grid md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-gray-900/60 rounded-xl text-center">
            <p className="text-2xl font-bold text-red-400">30</p>
            <p className="text-xs text-gray-400">Missing Logo</p>
          </div>
          <div className="p-3 bg-gray-900/60 rounded-xl text-center">
            <p className="text-2xl font-bold text-red-400">30</p>
            <p className="text-xs text-gray-400">Missing Stamp</p>
          </div>
          <div className="p-3 bg-gray-900/60 rounded-xl text-center">
            <p className="text-2xl font-bold text-orange-400">20</p>
            <p className="text-xs text-gray-400">Missing Signature</p>
          </div>
          <div className="p-3 bg-gray-900/60 rounded-xl text-center">
            <p className="text-2xl font-bold text-yellow-400">20</p>
            <p className="text-xs text-gray-400">Missing QR Code</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
            <p className="text-sm font-bold text-green-400">0 – 30</p>
            <p className="text-xs text-gray-400">LOW RISK</p>
          </div>
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center">
            <p className="text-sm font-bold text-yellow-400">31 – 69</p>
            <p className="text-xs text-gray-400">MEDIUM RISK</p>
          </div>
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
            <p className="text-sm font-bold text-red-400">70 – 100</p>
            <p className="text-xs text-gray-400">HIGH RISK</p>
          </div>
        </div>
      </div>

      {/* Reports */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-4">Fraud Reports</h3>
        {fraudReports.length === 0 ? (
          <p className="text-gray-500 text-sm">No fraud reports yet.</p>
        ) : (
          <div className="space-y-4">
            {[...fraudReports].reverse().map(report => (
              <div key={report.id} className="p-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`w-5 h-5 ${report.riskScore >= 70 ? 'text-red-400' : report.riskScore >= 30 ? 'text-yellow-400' : 'text-green-400'}`} />
                    <div>
                      <p className="text-white font-medium">{report.fileName}</p>
                      <p className="text-xs text-gray-500">{new Date(report.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-sm font-bold ${
                    report.riskScore >= 70 ? 'bg-red-500/20 text-red-400' : report.riskScore >= 30 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    Risk: {report.riskScore}/100
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-3">{report.reason}</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Logo', detected: report.details.logoDetected },
                    { label: 'Stamp', detected: report.details.stampDetected },
                    { label: 'Signature', detected: report.details.signatureDetected },
                    { label: 'QR Code', detected: report.details.qrDetected },
                  ].map(item => (
                    <div key={item.label} className={`p-2 rounded-lg text-center text-xs font-medium ${item.detected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {item.detected ? '✅' : '❌'} {item.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
