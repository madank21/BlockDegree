import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, CheckCircle, XCircle, AlertTriangle, Loader2, Blocks } from 'lucide-react';

export default function VerifyDegree() {
  const { currentUser, verifyDegreeByHash, degrees } = useApp();
  const [hash, setHash] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof verifyDegreeByHash> | null>(null);
  const [step, setStep] = useState(0);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setResult(null);
    setStep(1);

    // Simulate multi-step blockchain verification
    await new Promise(r => setTimeout(r, 800));
    setStep(2);
    await new Promise(r => setTimeout(r, 800));
    setStep(3);
    await new Promise(r => setTimeout(r, 800));
    setStep(4);

    const res = verifyDegreeByHash(hash.trim(), currentUser?.name || 'Unknown Employer');
    setResult(res);
    setIsVerifying(false);
  };

  const quickVerify = (degreeHash: string) => {
    setHash(degreeHash);
  };

  const steps = [
    'Connecting to Ethereum node...',
    'Querying DegreeRegistry smart contract...',
    'Verifying SHA-256 hash on blockchain...',
    'Fetching verification result...',
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-8 backdrop-blur">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Verify Degree on Blockchain</h2>
            <p className="text-sm text-gray-400">Enter degree hash to verify against smart contract records</p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Degree Hash (SHA-256)</label>
            <input
              type="text"
              required
              value={hash}
              onChange={e => setHash(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900/80 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition font-mono text-sm"
              placeholder="0x..."
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying || !hash.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-400 hover:to-emerald-500 transition shadow-lg shadow-green-500/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Blocks className="w-5 h-5" />
                Verify on Blockchain
              </>
            )}
          </button>
        </form>

        {/* Quick Select */}
        <div className="mt-6 pt-4 border-t border-gray-700/50">
          <p className="text-xs text-gray-500 mb-3">Quick select a degree hash to verify:</p>
          <div className="space-y-2">
            {degrees.slice(0, 5).map(d => (
              <button
                key={d.id}
                onClick={() => quickVerify(d.degreeHash)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-900/50 hover:bg-gray-900/80 transition text-left cursor-pointer"
              >
                <span className={`w-2 h-2 rounded-full ${d.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{d.studentName} - {d.program}</p>
                  <p className="text-xs text-gray-600 font-mono truncate">{d.degreeHash}</p>
                </div>
                <span className={`text-xs font-medium ${d.status === 'ACTIVE' ? 'text-green-500' : 'text-red-500'}`}>{d.status}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Verification Steps */}
      {isVerifying && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
          <h3 className="text-sm font-semibold text-white mb-4">Blockchain Verification Process</h3>
          <div className="space-y-3">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                {step > i + 1 ? (
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                ) : step === i + 1 ? (
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-gray-700 shrink-0" />
                )}
                <span className={`text-sm ${step > i ? 'text-gray-300' : 'text-gray-600'}`}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-2xl p-6 backdrop-blur border ${
          result.result === 'VALID'
            ? 'bg-green-500/10 border-green-500/30'
            : result.result === 'REVOKED'
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-orange-500/10 border-orange-500/30'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {result.result === 'VALID' ? (
              <CheckCircle className="w-8 h-8 text-green-400" />
            ) : result.result === 'REVOKED' ? (
              <AlertTriangle className="w-8 h-8 text-red-400" />
            ) : (
              <XCircle className="w-8 h-8 text-orange-400" />
            )}
            <div>
              <h3 className={`text-xl font-bold ${
                result.result === 'VALID' ? 'text-green-400' : result.result === 'REVOKED' ? 'text-red-400' : 'text-orange-400'
              }`}>
                Degree is {result.result}
              </h3>
              <p className="text-sm text-gray-400">Verified at {new Date(result.timestamp).toLocaleString()}</p>
            </div>
          </div>

          {result.studentName && (
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div className="p-3 bg-gray-900/60 rounded-xl">
                <p className="text-xs text-gray-500">Student</p>
                <p className="text-sm text-white font-medium">{result.studentName}</p>
              </div>
              <div className="p-3 bg-gray-900/60 rounded-xl">
                <p className="text-xs text-gray-500">Program</p>
                <p className="text-sm text-white font-medium">{result.program}</p>
              </div>
              <div className="p-3 bg-gray-900/60 rounded-xl">
                <p className="text-xs text-gray-500">University</p>
                <p className="text-sm text-white font-medium">{result.university}</p>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-gray-900/60 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Verified Hash</p>
            <code className="text-xs text-cyan-400 font-mono break-all">{result.degreeHash}</code>
          </div>
        </div>
      )}
    </div>
  );
}
