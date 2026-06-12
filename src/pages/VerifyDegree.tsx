import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../useStore';

import { QRCodeSVG } from 'qrcode.react';
import { Search, CheckCircle2, XCircle, Link2, Shield, Loader2, AlertTriangle } from 'lucide-react';

import type { DegreeApplication } from '../types';

type VerifyStrictResult = (DegreeApplication & {
  valid: boolean;
  validationErrors: string[];
}) & {
  status: 'issued' | 'invalid';
};

export default function VerifyDegree() {
  const { verifyDegreeStrict } = useStore();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<VerifyStrictResult | null>(null);



  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSearched(false);
    await new Promise(r => setTimeout(r, 1500));
    const res = verifyDegreeStrict(query.trim());
    if (!res) {
      setResult(null);
      setSearched(true);
      setLoading(false);
      return;
    }

    // Strict verification result wiring:
    // - valid  => VALID
    // - invalid => INVALID (show mismatch/missing reasons)
    setResult({ ...(res as any), status: res.valid ? 'issued' : 'invalid' } as any);



    setSearched(true);
    setLoading(false);
  };

  const presetQueries = [
    { label: 'IQRA-CS-2026-70618', value: 'IQRA-CS-2026-70618' },
    { label: 'Sample Hash', value: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold">Verify a Degree</h2>
        <p className="text-gray-400 mt-1">Enter a Degree ID or attestation hash to verify authenticity</p>
      </div>

      <form onSubmit={handleVerify} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Enter Degree ID or attestation hash..."
            className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-sm font-mono"
            required
          />
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-xs text-gray-500">Quick test:</span>
          {presetQueries.map(q => (
            <button
              key={q.label}
              type="button"
              onClick={() => setQuery(q.value)}
              className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded transition"
            >
              {q.label}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="w-full mt-4 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-white"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Verifying attestation...</>
          ) : (
            <><Shield className="w-5 h-5" /> Verify Degree</>
          )}
        </button>
      </form>

      {/* Results */}
      {searched && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {result && result.status === 'issued' ? (
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl overflow-hidden">
              <div className="bg-green-500/10 px-6 py-4 flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
                <div>
                  <h3 className="text-lg font-bold text-green-400">VALID — Degree Verified</h3>
                  <p className="text-sm text-green-400/70">This degree matches a recorded cryptographic attestation</p>
                </div>
              </div>

              <div className="p-6 space-y-4">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Student Name</p>
                      <p className="font-semibold">{result.studentName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Registration Number</p>
                      <p className="font-semibold">{result.registrationNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Degree Title</p>
                      <p className="font-semibold">{result.degreeTitle}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Department</p>
                      <p className="font-semibold">{result.department}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">CGPA</p>
                      <p className="font-semibold">{result.cgpa}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Graduation Year</p>
                      <p className="font-semibold">{result.graduationYear}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Degree ID</p>
                      <p className="font-semibold font-mono text-sm">{result.degreeId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Fraud Score</p>
                      <p className={`font-semibold ${result.fraudScore >= 71 ? 'text-green-400' : 'text-yellow-400'}`}>{result.fraudScore}/100 — Safe</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium">Attestation Record</span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono break-all">{result.blockchainHash}</p>
                </div>

                {result.qrCodeData && (
                  <div className="flex items-center justify-center bg-white rounded-lg p-4 w-fit mx-auto">
                    <QRCodeSVG value={result.qrCodeData} size={120} level="H" />
                  </div>
                )}
              </div>
            </div>
          ) : result && result.status === 'revoked' ? (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-red-400">REVOKED — Degree Revoked</h3>
              <p className="text-sm text-gray-400 mt-1">This degree has been revoked by the issuing authority</p>
            </div>
          ) : (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-8">
              <div className="flex items-start gap-3">
                <XCircle className="w-12 h-12 text-red-400 mt-1 shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-red-400">INVALID — Verification Failed</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {result?.validationErrors?.length
                      ? 'Degree does not match required documents (OCR/validation mismatch).'
                      : 'No valid attestation record found for this Degree ID / hash.'}
                  </p>

                  {Array.isArray(result?.validationErrors) && result.validationErrors.length > 0 && (
                    <div className="mt-4 bg-gray-900/50 rounded-lg p-4 border border-red-500/20">
                      <p className="text-xs text-gray-400 uppercase font-medium">Reasons</p>
                      <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-gray-300">
                        {result.validationErrors.map((err: string, idx: number) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </motion.div>
      )}
    </div>
  );
}
