import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FileCheck, CheckCircle, Loader2 } from 'lucide-react';

export default function IssueDegree() {
  const { currentUser, issueDegree } = useApp();
  const [form, setForm] = useState({
    studentName: '',
    studentId: '',
    program: '',
    graduationDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ hash: string; txHash: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(null);

    // Simulate blockchain delay
    await new Promise(r => setTimeout(r, 2000));

    const degree = issueDegree({
      ...form,
      university: currentUser?.organization || currentUser?.name || 'Unknown',
      issuedBy: currentUser?.id || '',
    });

    setSuccess({ hash: degree.degreeHash, txHash: degree.blockchainTxHash });
    setIsSubmitting(false);
    setForm({ studentName: '', studentId: '', program: '', graduationDate: '' });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-8 backdrop-blur">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Issue New Degree</h2>
            <p className="text-sm text-gray-400">Issue and record degree on blockchain</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Student Name</label>
              <input
                type="text"
                required
                value={form.studentName}
                onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-900/80 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
                placeholder="e.g., Ali Ahmed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Student ID</label>
              <input
                type="text"
                required
                value={form.studentId}
                onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-900/80 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
                placeholder="e.g., STU-2024-004"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Program</label>
            <input
              type="text"
              required
              value={form.program}
              onChange={e => setForm(f => ({ ...f, program: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-900/80 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
              placeholder="e.g., BS Computer Science"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Graduation Date</label>
            <input
              type="date"
              required
              value={form.graduationDate}
              onChange={e => setForm(f => ({ ...f, graduationDate: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-900/80 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition"
            />
          </div>

          <div className="p-4 bg-gray-900/60 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Issuing University</p>
            <p className="text-sm text-white font-medium">{currentUser?.organization || currentUser?.name}</p>
            <p className="text-xs text-gray-500 mt-1">Wallet: {currentUser?.walletAddress.slice(0, 10)}...{currentUser?.walletAddress.slice(-8)}</p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-xs text-blue-400">
              <strong>Process:</strong> Form data → SHA-256 Hash → Smart Contract Call (issueDegree) → Blockchain Record → MongoDB Metadata
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition shadow-lg shadow-cyan-500/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Recording on Blockchain...
              </>
            ) : (
              <>
                <FileCheck className="w-5 h-5" />
                Issue Degree on Blockchain
              </>
            )}
          </button>
        </form>
      </div>

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 backdrop-blur">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <h3 className="text-lg font-semibold text-green-400">Degree Issued Successfully!</h3>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-gray-900/60 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Degree Hash</p>
              <code className="text-xs text-cyan-400 font-mono break-all">{success.hash}</code>
            </div>
            <div className="p-3 bg-gray-900/60 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Transaction Hash</p>
              <code className="text-xs text-purple-400 font-mono break-all">{success.txHash}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
