import { motion } from 'framer-motion';
import { useStore } from '../useStore';
import { Search, CheckCircle2, Shield, QrCode } from 'lucide-react';
import { useState } from 'react';
import QRScanner from '../components/QRScanner';

interface Props {
  onNavigate: (page: string) => void;
}

export default function EmployerDashboard({ onNavigate }: Props) {
  const { currentUser, verificationRequests } = useStore();
  const [showQRScanner, setShowQRScanner] = useState(false);

  const handleQRScanned = (result: string) => {
    setShowQRScanner(false);
    // Parse QR data and extract degree ID
    console.log('QR Code scanned:', result);
    if (result.startsWith('http')) {
      window.open(result, '_blank');
    } else {
      alert(`Scanned Code: ${result}`);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-800/30 rounded-2xl p-6 lg:p-8">
        <h1 className="text-2xl font-bold">Employer Verification Portal</h1>
        <p className="text-gray-400 mt-1">Verify academic credentials using Degree ID, attestation hash, or QR Code</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/50 border border-gray-800 rounded-xl p-5"
        >
          <Search className="w-8 h-8 text-blue-400 mb-3" />
          <p className="text-2xl font-bold text-blue-400">{verificationRequests.length}</p>
          <p className="text-sm text-gray-400">Total Verifications</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-900/50 border border-gray-800 rounded-xl p-5"
        >
          <CheckCircle2 className="w-8 h-8 text-green-400 mb-3" />
          <p className="text-2xl font-bold text-green-400">{verificationRequests.filter(v => v.result === 'valid').length}</p>
          <p className="text-sm text-gray-400">Valid Degrees</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900/50 border border-gray-800 rounded-xl p-5"
        >
          <Shield className="w-8 h-8 text-purple-400 mb-3" />
          <p className="text-2xl font-bold text-purple-400">{verificationRequests.filter(v => v.blockchainVerified).length}</p>
          <p className="text-sm text-gray-400">Attested Records</p>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={() => onNavigate('verify')}
          className="bg-gray-900/50 border border-gray-800 hover:border-blue-500/30 rounded-xl p-8 text-center group transition"
        >
          <Search className="w-12 h-12 text-blue-400 mx-auto mb-4 group-hover:scale-110 transition" />
          <h3 className="text-lg font-semibold mb-2">Search by ID / Hash</h3>
          <p className="text-sm text-gray-400">Enter a Degree ID or attestation hash to verify credentials</p>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          className="bg-gray-900/50 border border-gray-800 hover:border-purple-500/30 rounded-xl p-8 text-center group transition"
          onClick={() => {
              setShowQRScanner(true);
            }}
        >
          <QrCode className="w-12 h-12 text-purple-400 mx-auto mb-4 group-hover:scale-110 transition" />
          <h3 className="text-lg font-semibold mb-2">QR Code Scan</h3>
          <p className="text-sm text-gray-400">Scan the QR code on a degree certificate for instant verification</p>
        </motion.button>
      </div>

      {/* Verification History */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Verification History</h3>
        {verificationRequests.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">No verifications yet</p>
        ) : (
          <div className="space-y-3">
            {verificationRequests.map(v => (
              <div key={v.id} className="flex items-center justify-between bg-gray-800/30 rounded-lg p-4">
                <div>
                  <p className="text-sm font-medium">Degree: {v.degreeId}</p>
                  <p className="text-xs text-gray-500">{new Date(v.verifiedAt || v.verified_at || '').toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  {v.blockchainVerified && (
                    <span className="text-xs px-2 py-1 bg-blue-400/10 text-blue-400 border border-blue-400/20 rounded">Attested</span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded border font-medium ${
                    v.result === 'valid' ? 'bg-green-400/10 text-green-400 border-green-400/20' :
                    v.result === 'revoked' ? 'bg-red-400/10 text-red-400 border-red-400/20' :
                    'bg-red-400/10 text-red-400 border-red-400/20'
                  } uppercase`}>
                    {v.result}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showQRScanner && (
        <QRScanner
          onScan={handleQRScanned}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
}
