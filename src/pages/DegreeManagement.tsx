import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../useStore';
import {
  CheckCircle2, Clock, Link2, AlertTriangle,
  Loader2, XCircle, Shield
} from 'lucide-react';

export default function DegreeManagement() {
  const { degreeApplications, approveDegree, issueDegree, revokeDegree } = useStore();
  const [processing, setProcessing] = useState<string | null>(null);

  const handleIssueDegree = async (id: string) => {
    setProcessing(id);
    await new Promise(r => setTimeout(r, 2000));
    issueDegree(id);
    setProcessing(null);
  };

  const statusConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
    pending: { icon: Clock, color: 'text-yellow-400', bgColor: 'bg-yellow-400/10 border-yellow-400/20' },
    processing: { icon: Loader2, color: 'text-blue-400', bgColor: 'bg-blue-400/10 border-blue-400/20' },
    approved: { icon: CheckCircle2, color: 'text-blue-400', bgColor: 'bg-blue-400/10 border-blue-400/20' },
    issued: { icon: Shield, color: 'text-green-400', bgColor: 'bg-green-400/10 border-green-400/20' },
    revoked: { icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-400/10 border-red-400/20' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Degree Management</h2>
        <p className="text-gray-400 mt-1">Review, approve, and issue blockchain-backed degrees</p>
      </div>

      <div className="space-y-4">
        {degreeApplications.map(deg => {
          const config = statusConfig[deg.status] || statusConfig.pending;
          const isProcessingThis = processing === deg.id;

          return (
            <motion.div
              key={deg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.bgColor} border shrink-0`}>
                    <config.icon className={`w-6 h-6 ${config.color} ${deg.status === 'processing' ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold">{deg.degreeTitle}</h4>
                    <p className="text-sm text-gray-400">{deg.studentName} • Reg #{deg.registrationNumber}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                      <span>Dept: {deg.department}</span>
                      <span>CGPA: {deg.cgpa}</span>
                      <span>Year: {deg.graduationYear}</span>
                      <span className={`${deg.fraudScore >= 71 ? 'text-green-400' : deg.fraudScore >= 41 ? 'text-yellow-400' : 'text-red-400'}`}>
                        Safety: {deg.fraudScore}/100
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${config.bgColor} ${config.color}`}>
                    {deg.status.charAt(0).toUpperCase() + deg.status.slice(1)}
                  </span>

                  {deg.status === 'pending' && (
                    <button
                      onClick={() => approveDegree(deg.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition flex items-center gap-1.5 text-white"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                  )}
                  {deg.status === 'approved' && (
                    <button
                      onClick={() => handleIssueDegree(deg.id)}
                      disabled={isProcessingThis}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg text-sm font-medium transition flex items-center gap-1.5 disabled:opacity-50 text-white"
                    >
                      {isProcessingThis ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Issuing...</>
                      ) : (
                        <><Link2 className="w-4 h-4" /> Issue on Blockchain</>
                      )}
                    </button>
                  )}
                  {deg.status === 'issued' && (
                    <button
                      onClick={() => revokeDegree(deg.id)}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-sm font-medium text-red-400 transition flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-4 h-4" /> Revoke
                    </button>
                  )}
                </div>
              </div>

              {deg.blockchainHash && (
                <div className="mt-4 flex items-center gap-2 bg-gray-800/30 rounded-lg px-4 py-2.5">
                  <Link2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">Blockchain Hash</p>
                    <p className="text-xs text-gray-300 font-mono truncate">{deg.blockchainHash}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {deg.degreeId}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
