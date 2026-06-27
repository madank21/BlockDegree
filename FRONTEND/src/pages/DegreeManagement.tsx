// FRONTEND/src/pages/DegreeManagement.tsx
//
// FIXES:
//   [1] Removed `limit: 100` from applicationsApi.list (type mismatch)
//   [2] Changed `student.full_name` → `student.name` (backend returns `name`)

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Clock, Link2, AlertTriangle,
  Loader2, XCircle, Shield, RefreshCw, GraduationCap, Search,
  FileText,
} from 'lucide-react';
import { degreesApi, applicationsApi } from '../api/api';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Degree {
  id: string;
  type: 'degree';
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
  blockchainTxHash?:   string;
  blockchain_tx_hash?: string;
  blockchainHash?:     string;
  degreeId?:           string;
  certificateNumber?:  string;
  certificate_number?: string;
}

interface Application {
  id: string;
  type: 'application';
  student_id: string;
  degree_title: string;
  field_of_study: string;
  graduation_date: string;
  gpa: number;
  honors: boolean;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  student?: {
    id: string;
    name: string;       // ✅ changed from full_name
    email: string;
    registration_number?: string;
  };
}

type UnifiedItem = (Degree & { type: 'degree' }) | (Application & { type: 'application' });

// ─── Normalise degree ──────────────────────────────────────────────────────────
function normaliseDegree(raw: any): Degree {
  return {
    ...raw,
    type: 'degree',
    degreeTitle:        raw.degreeTitle        || raw.degree_title,
    studentName:        raw.studentName        || raw.student_name,
    registrationNumber: raw.registrationNumber || raw.registration_number,
    graduationYear:     raw.graduationYear     || raw.graduation_year,
    fraudScore:         raw.fraudScore         ?? raw.fraud_score,
    blockchainTxHash:   raw.blockchainTxHash   || raw.blockchain_tx_hash || raw.blockchainHash,
    certificateNumber:  raw.certificateNumber  || raw.certificate_number,
  };
}

// ─── Normalise application ──────────────────────────────────────────────────────
function normaliseApplication(raw: any): Application {
  return {
    ...raw,
    type: 'application',
    student: raw.student || null,
  };
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  pending:    { icon: Clock,         color: 'text-yellow-400', bgColor: 'bg-yellow-400/10 border-yellow-400/20' },
  processing: { icon: Loader2,       color: 'text-blue-400',   bgColor: 'bg-blue-400/10   border-blue-400/20'   },
  approved:   { icon: CheckCircle2,  color: 'text-blue-400',   bgColor: 'bg-blue-400/10   border-blue-400/20'   },
  issued:     { icon: Shield,        color: 'text-green-400',  bgColor: 'bg-green-400/10  border-green-400/20'  },
  revoked:    { icon: XCircle,       color: 'text-red-400',    bgColor: 'bg-red-400/10    border-red-400/20'    },
};

export default function DegreeManagement() {
  const [items,       setItems]       = useState<UnifiedItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [processing,  setProcessing]  = useState<string | null>(null);
  const [filter,      setFilter]      = useState<string>('all');
  const [search,      setSearch]      = useState('');

  // ── Fetch both degrees and applications ────────────────────────────────────
  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch degrees
      const degRes = await degreesApi.list({ page: 1, limit: 100 });
      const degrees = (degRes.data || []).map(normaliseDegree);

      // 2. Fetch pending applications (only if needed)
      let applications: Application[] = [];
      if (filter === 'all' || filter === 'pending') {
        try {
          const appRes = await applicationsApi.list({ status: 'pending' }); // ✅ removed `limit: 100`
          applications = (appRes.data || []).map(normaliseApplication);
        } catch (err) {
          console.warn('Failed to fetch applications:', err);
        }
      }

      const merged: UnifiedItem[] = [...degrees, ...applications];
      setItems(merged);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    try {
      setProcessing(id + '_approve');
      await applicationsApi.updateStatus(id, 'approved');
      await fetchAll();
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleIssue = async (id: string) => {
    try {
      setProcessing(id + '_issue');
      await degreesApi.issue_existing(id);
      await fetchAll();
    } catch (err: any) {
      alert(`Issuance failed: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

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
      await fetchAll();
    } catch (err: any) {
      alert(`Revocation failed: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  // ── Local filtering ─────────────────────────────────────────────────────────
  const displayed = items.filter(item => {
    if (filter !== 'all' && item.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const title = item.type === 'degree'
        ? (item.degreeTitle || '')
        : (item.degree_title || '');
      const name = item.type === 'degree'
        ? (item.studentName || '')
        : (item.student?.name || '');        // ✅ changed from full_name
      const reg = item.type === 'degree'
        ? (item.registrationNumber || '')
        : (item.student?.registration_number || '');
      if (!title.toLowerCase().includes(q) && !name.toLowerCase().includes(q) && !reg.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const countFor = (s: string) => {
    if (s === 'all') return items.length;
    return items.filter(item => item.status === s).length;
  };

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
        <button onClick={fetchAll} className="mt-2 text-sm underline flex items-center gap-1">
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
          onClick={fetchAll}
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

      {/* Cards */}
      {displayed.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-900/50 border border-gray-800 rounded-xl">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No items found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map(item => {
            const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
            const isProcessingThis = processing === item.id + '_approve' ||
                                     processing === item.id + '_issue' ||
                                     processing === item.id + '_revoke';

            // ─── Application card ─────────────────────────────────────────────
            if (item.type === 'application') {
              const app = item as Application;
              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${config.bgColor}`}>
                        <FileText className={`w-6 h-6 ${config.color}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold">{app.degree_title}</h4>
                        <p className="text-sm text-gray-400">
                          {app.student?.name || 'Unknown'} • Reg #{app.student?.registration_number || '—'} {/* ✅ changed */}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                          <span>Field: {app.field_of_study}</span>
                          <span>GPA: {app.gpa}</span>
                          <span>Graduation: {new Date(app.graduation_date).toLocaleDateString()}</span>
                          {app.honors && <span className="text-yellow-400">Honors</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize ${config.bgColor} ${config.color}`}>
                        {app.status}
                      </span>
                      {app.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(app.id)}
                          disabled={isProcessingThis}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition flex items-center gap-1.5 text-white disabled:opacity-50"
                        >
                          {processing === app.id + '_approve'
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Approving…</>
                            : <><CheckCircle2 className="w-4 h-4" /> Approve & Issue</>}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 bg-gray-800/30 rounded-lg px-4 py-2.5">
                    <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                    <span className="text-xs text-gray-500">Submitted: {new Date(app.created_at).toLocaleString()}</span>
                  </div>
                </motion.div>
              );
            }

            // ─── Degree card ──────────────────────────────────────────────────
            const deg = item as Degree;
            const rawFraud    = deg.fraudScore ?? 0;
            const safetyScore = Math.round((1 - Math.min(rawFraud, 1)) * 100);
            const safetyColor =
              safetyScore >= 70 ? 'text-green-400' :
              safetyScore >= 40 ? 'text-yellow-400' : 'text-red-400';
            const txHash = deg.blockchainTxHash || deg.blockchain_tx_hash || deg.blockchainHash;

            return (
              <motion.div
                key={deg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize ${config.bgColor} ${config.color}`}>
                      {deg.status}
                    </span>

                    {deg.status === 'approved' && (
                      <button
                        onClick={() => handleIssue(deg.id)}
                        disabled={isProcessingThis}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg text-sm font-medium transition flex items-center gap-1.5 disabled:opacity-50 text-white"
                      >
                        {processing === deg.id + '_issue'
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Issuing…</>
                          : <><Link2 className="w-4 h-4" /> Issue Attestation</>}
                      </button>
                    )}

                    {deg.status === 'issued' && (
                      <button
                        onClick={() => handleRevoke(deg.id)}
                        disabled={isProcessingThis}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-sm font-medium text-red-400 transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {processing === deg.id + '_revoke'
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Revoking…</>
                          : <><AlertTriangle className="w-4 h-4" /> Revoke</>}
                      </button>
                    )}
                  </div>
                </div>

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