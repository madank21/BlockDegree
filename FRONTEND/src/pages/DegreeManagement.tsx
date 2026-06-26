// FRONTEND/src/pages/DegreeManagement.tsx
//
// STATUS: PARTIALLY BROKEN
//   - import api from '@/api/api'  — @/ alias may not be configured
//   - handleIssue: api.request(`/degrees/${id}/issue`, { method: 'POST' })
//       api.request() does not match the function signature — crashes at call time
//   - deg.blockchainHash  — backend returns blockchainTxHash (renamed field)
//
// FIXES:
//   [1] import { degreesApi } from '../api/api'   (relative path, no alias needed)
//   [2] handleIssue: degreesApi.issue_existing(id) → POST /degrees/:id/issue
//   [3] deg.blockchainHash  →  deg.blockchainTxHash || deg.blockchain_tx_hash
//   [4] Filter by status tab added (pending / approved / issued / revoked / all)
//   [5] Fraud score label: backend sends 0-1 float, displayed as percentage

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Clock, Link2, AlertTriangle,
  Loader2, XCircle, Shield, RefreshCw, GraduationCap, Search,
} from 'lucide-react';
import { degreesApi } from '../api/api';

interface Degree {
  id: string;
  degreeTitle?:        string;
  degree_title?:       string;
  studentName?:        string;
  student_name?:       string;
  registrationNumber?: string;
  registration_number?: string;
  department?:         string;
  cgpa?:               number;
  graduationYear?:     string | number;
  graduation_year?:    string | number;
  fraudScore?:         number;
  fraud_score?:        number;
  status:              'pending' | 'processing' | 'approved' | 'issued' | 'revoked';
  // FIX [3]: support both field names
  blockchainTxHash?:   string;
  blockchain_tx_hash?: string;
  blockchainHash?:     string;  // old name (kept as fallback)
  degreeId?:           string;
  certificateNumber?:  string;
  certificate_number?: string;
}

// Normalise camelCase or snake_case fields from backend
function normaliseDegree(raw: any): Degree {
  return {
    ...raw,
    degreeTitle:        raw.degreeTitle        || raw.degree_title,
    studentName:        raw.studentName        || raw.student_name,
    registrationNumber: raw.registrationNumber || raw.registration_number,
    graduationYear:     raw.graduationYear     || raw.graduation_year,
    fraudScore:         raw.fraudScore         ?? raw.fraud_score,
    // FIX [3]: unify all blockchain hash field names
    blockchainTxHash:   raw.blockchainTxHash   || raw.blockchain_tx_hash || raw.blockchainHash,
    certificateNumber:  raw.certificateNumber  || raw.certificate_number,
  };
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  pending:    { icon: Clock,         color: 'text-yellow-400', bgColor: 'bg-yellow-400/10 border-yellow-400/20' },
  processing: { icon: Loader2,       color: 'text-blue-400',   bgColor: 'bg-blue-400/10   border-blue-400/20'   },
  approved:   { icon: CheckCircle2,  color: 'text-blue-400',   bgColor: 'bg-blue-400/10   border-blue-400/20'   },
  issued:     { icon: Shield,        color: 'text-green-400',  bgColor: 'bg-green-400/10  border-green-400/20'  },
  revoked:    { icon: XCircle,       color: 'text-red-400',    bgColor: 'bg-red-400/10    border-red-400/20'    },
};

export default function DegreeManagement() {
  const [degrees,    setDegrees]    = useState<Degree[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter,     setFilter]     = useState<string>('all');
  const [search,     setSearch]     = useState('');

  // ── Fetch degrees ───────────────────────────────────────────────────────────
  const fetchDegrees = async () => {
  try {
    setLoading(true);
    // Use a safer limit and include page to satisfy pagination requirements
    const data = await degreesApi.list({ page: 1, limit: 100 });
    const raw  = data.data || [];
    setDegrees(raw.map(normaliseDegree));
    setError(null);
  } catch (err: any) {
    // Log the full error response for debugging
    console.error('Failed to fetch degrees:', err);
    // If the error has a response body, show it
    const detail = err.response?.data?.message || err.message || 'Failed to load degrees';
    setError(detail);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { fetchDegrees(); }, []);

  // ── Approve (pending → approved) ───────────────────────────────────────────
  const handleApprove = async (id: string) => {
    try {
      setProcessing(id + '_approve');
      await degreesApi.update(id, { status: 'approved' });
      await fetchDegrees();
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  // ── Issue blockchain attestation (approved → issued) ───────────────────────
  // FIX [2]: degreesApi.issue_existing(id) replaces api.request(`/degrees/${id}/issue`, ...)
  const handleIssue = async (id: string) => {
    try {
      setProcessing(id + '_issue');
      await degreesApi.issue_existing(id);
      await fetchDegrees();
    } catch (err: any) {
      alert(`Issuance failed: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  // ── Revoke (issued → revoked) ───────────────────────────────────────────────
  const handleRevoke = async (id: string) => {
    const reason = prompt('Enter the reason for revoking this degree (minimum 10 characters):');
    if (reason === null) return;
    if (reason.trim().length < 10) {
      alert('Reason must be at least 10 characters.');
      return;
    }
    if (!confirm(`Revoke this degree?\n\nReason: "${reason.trim()}"`)) return;
    try {
      setProcessing(id + '_revoke');
      await degreesApi.revoke(id, reason.trim());
      await fetchDegrees();
    } catch (err: any) {
      alert(`Revocation failed: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  // ── Local filtering ─────────────────────────────────────────────────────────
  const displayed = degrees.filter(deg => {
    if (filter !== 'all' && deg.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const titleMatch = deg.degreeTitle?.toLowerCase().includes(q);
      const nameMatch  = deg.studentName?.toLowerCase().includes(q);
      const regMatch   = deg.registrationNumber?.toLowerCase().includes(q);
      if (!titleMatch && !nameMatch && !regMatch) return false;
    }
    return true;
  });

  const countFor = (s: string) =>
    s === 'all' ? degrees.length : degrees.filter(d => d.status === s).length;

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-red-400">
        <p>{error}</p>
        <button onClick={fetchDegrees} className="mt-2 text-sm underline flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-purple-400" /> Degree Management
          </h2>
          <p className="text-gray-400 mt-1">Review, approve, and issue cryptographic degree attestations</p>
        </div>
        <button
          onClick={fetchDegrees}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-400 transition"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Search + filter tabs */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, student, or reg number…"
            className="w-full pl-11 pr-4 py-2.5 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'approved', 'issued', 'revoked'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition capitalize ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f}
              <span className="ml-1.5 text-[10px] opacity-70">({countFor(f)})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Degree cards */}
      {displayed.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-900/50 border border-gray-800 rounded-xl">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No degrees found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map(deg => {
            const config           = STATUS_CONFIG[deg.status] || STATUS_CONFIG.pending;
            const isApprovingThis  = processing === deg.id + '_approve';
            const isIssuingThis    = processing === deg.id + '_issue';
            const isRevokingThis   = processing === deg.id + '_revoke';
            const isProcessingThis = isApprovingThis || isIssuingThis || isRevokingThis;

            // FIX [5]: fraudScore is 0-1 float — show as safety score (1 - fraudScore) * 100
            const rawFraud    = deg.fraudScore ?? 0;
            const safetyScore = Math.round((1 - Math.min(rawFraud, 1)) * 100);
            const safetyColor =
              safetyScore >= 70 ? 'text-green-400' :
              safetyScore >= 40 ? 'text-yellow-400' : 'text-red-400';

            // FIX [3]: correct blockchain hash field
            const txHash = deg.blockchainTxHash || deg.blockchain_tx_hash || deg.blockchainHash;

            return (
              <motion.div
                key={deg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: info */}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${config.bgColor}`}>
                      <config.icon
                        className={`w-6 h-6 ${config.color} ${deg.status === 'processing' ? 'animate-spin' : ''}`}
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold">{deg.degreeTitle || 'Untitled Degree'}</h4>
                      <p className="text-sm text-gray-400">
                        {deg.studentName || 'Unknown'} • Reg #{deg.registrationNumber || '—'}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        {deg.department    && <span>Dept: {deg.department}</span>}
                        {deg.cgpa          && <span>CGPA: {deg.cgpa}</span>}
                        {deg.graduationYear && <span>Year: {deg.graduationYear}</span>}
                        {deg.certificateNumber && (
                          <span className="text-gray-400 font-mono">Cert: {deg.certificateNumber}</span>
                        )}
                        <span className={safetyColor}>Safety: {safetyScore}/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: status + actions */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize ${config.bgColor} ${config.color}`}>
                      {deg.status}
                    </span>

                    {/* Pending → Approve */}
                    {deg.status === 'pending' && (
                      <button
                        onClick={() => handleApprove(deg.id)}
                        disabled={isProcessingThis}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition flex items-center gap-1.5 text-white disabled:opacity-50"
                      >
                        {isApprovingThis
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Approving…</>
                          : <><CheckCircle2 className="w-4 h-4" /> Approve</>}
                      </button>
                    )}

                    {/* Approved → Issue on Blockchain */}
                    {deg.status === 'approved' && (
                      <button
                        onClick={() => handleIssue(deg.id)}
                        disabled={isProcessingThis}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg text-sm font-medium transition flex items-center gap-1.5 disabled:opacity-50 text-white"
                      >
                        {isIssuingThis
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Issuing…</>
                          : <><Link2 className="w-4 h-4" /> Issue Attestation</>}
                      </button>
                    )}

                    {/* Issued → Revoke */}
                    {deg.status === 'issued' && (
                      <button
                        onClick={() => handleRevoke(deg.id)}
                        disabled={isProcessingThis}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-sm font-medium text-red-400 transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isRevokingThis
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Revoking…</>
                          : <><AlertTriangle className="w-4 h-4" /> Revoke</>}
                      </button>
                    )}
                  </div>
                </div>

                {/* Blockchain hash row — FIX [3] uses correct field */}
                {txHash && (
                  <div className="mt-4 flex items-center gap-2 bg-gray-800/30 rounded-lg px-4 py-2.5">
                    <Link2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Blockchain Transaction Hash</p>
                      <p className="text-xs text-gray-300 font-mono truncate">{txHash}</p>
                    </div>
                    {deg.degreeId && (
                      <span className="text-xs text-gray-500 shrink-0">ID: {deg.degreeId}</span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}