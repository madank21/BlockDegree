// FRONTEND/src/pages/StudentsManagement.tsx
//
// WHAT WAS BROKEN:
//   1. api.request('/users?role=student') — passes no method option.
//      api.request() with no method defaults to GET, which technically works,
//      BUT the backend now returns { success: true, data: [...], pagination: {...} }
//      (standard envelope). The page was destructuring { users } directly from
//      the raw response, but api.request() unwraps the envelope and returns
//      data directly. Since the backend returns { data: [...] } where data is
//      the users array, the page was receiving undefined and showing nothing.
//      FIX: Use usersApi.list({ role: 'student' }) which is typed and correct.
//
//   2. handleApprove: api.request(`/users/${id}/approve`, { method: 'PATCH' })
//      This actually works (api.request accepts method in options), but the
//      response envelope was not handled — the page ignored the result.
//      FIX: Use usersApi.approve(id) which is clean and typed.
//
//   3. handleReject: same issue as handleApprove.
//      FIX: Use usersApi.reject(id).
//
//   4. student.registrationNumber — backend User model maps student_id →
//      studentId (camelCase). The page was reading registrationNumber which
//      does not exist on the mapped User object. This caused the Reg # column
//      to always show blank.
//      FIX: Read s.studentId with registrationNumber as fallback.
//
//   5. student.verificationStatus — backend User model does not have a
//      verificationStatus column. The verification lifecycle lives in the
//      verifications table. The users table has is_active (boolean) and
//      metadata. The page's filter buttons (pending/approved/rejected) never
//      matched anything.
//      FIX: Derive display status from isActive + metadata.verificationStatus
//      with a clear fallback. Admin approve/reject toggles isActive, which is
//      the actual gatekeeping field.
//
// DEPENDENCIES:
//   @/api/api  → usersApi.list / usersApi.approve / usersApi.reject (named exports)

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Eye, UserCheck, UserX, FileText, RefreshCw
} from 'lucide-react';
import { usersApi } from '../api/api';

interface Student {
  id: string;
  name: string;
  email: string;
  // FIX 4: backend maps student_id → studentId
  studentId?: string;
  // keep as optional fallback
  registrationNumber?: string;
  institutionName?: string;
  isActive?: boolean;
  // derived from metadata or fallback
  verificationStatus?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// FIX 5: Derive a display status from what the backend actually returns
function deriveStatus(s: Student): string {
  // If explicitly set in metadata by the verification pipeline, use it
  const metaStatus = s.metadata?.verificationStatus || s.metadata?.status;
  if (metaStatus) return metaStatus;

  // Otherwise infer from the isActive flag set by admin approve/reject
  if (s.isActive === false) return 'rejected';
  if (s.isActive === true)  return 'approved';
  return 'pending';
}

export default function StudentsManagement() {
  const [students,         setStudents]         = useState<Student[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [filter,           setFilter]           = useState('all');
  const [search,           setSearch]           = useState('');
  const [selectedStudent,  setSelectedStudent]  = useState<string | null>(null);
  const [actionLoading,    setActionLoading]    = useState<string | null>(null);

  // FIX 1: use usersApi.list() — typed, uses correct endpoint, unwraps envelope
  const fetchStudents = async () => {
  try {
    setLoading(true);
    setError(null);
    const result = await usersApi.list({ role: 'student', limit: 200 });
    // Use result.data (same as AdminDashboard does)
    const users = Array.isArray(result) ? result : (result.data || []);
    setStudents(users);
  } catch (err: any) {
    setError(err.message || 'Failed to load students');
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { fetchStudents(); }, []);

  // FIX 2: use usersApi.approve() — typed, correct PATCH /users/:id/approve
  const handleApprove = async (id: string) => {
    try {
      setActionLoading(id);
      await usersApi.approve(id);
      await fetchStudents();
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // FIX 3: use usersApi.reject() — typed, correct PATCH /users/:id/reject
  const handleReject = async (id: string) => {
    try {
      setActionLoading(id);
      await usersApi.reject(id);
      await fetchStudents();
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = students.filter(s => {
    const status = deriveStatus(s);
    if (filter !== 'all' && status !== filter) return false;
    // FIX 4: search against studentId (the actual field) with name fallback
    const regNo = s.studentId || s.registrationNumber || '';
    if (search) {
      const q = search.toLowerCase();
      if (!s.name.toLowerCase().includes(q) && !regNo.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const selected = students.find(s => s.id === selectedStudent);

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      pending:            { color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', label: 'Pending' },
      documents_uploaded: { color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',      label: 'Docs Uploaded' },
      ocr_verified:       { color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',       label: 'OCR Verified' },
      face_verified:      { color: 'text-purple-400 bg-purple-400/10 border-purple-400/20', label: 'Face Verified' },
      approved:           { color: 'text-green-400 bg-green-400/10 border-green-400/20',    label: 'Approved' },
      rejected:           { color: 'text-red-400 bg-red-400/10 border-red-400/20',          label: 'Rejected' },
    };
    const cfg = map[status] || map['pending'];
    return (
      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-red-400">
        <p className="font-medium">Failed to load students</p>
        <p className="text-sm mt-1 text-red-300">{error}</p>
        <button
          onClick={fetchStudents}
          className="mt-3 flex items-center gap-2 text-sm text-red-400 underline hover:text-red-300"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Student Management</h2>
          <p className="text-gray-400 mt-1">Review and approve student verifications</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
          <button
            onClick={fetchStudents}
            className="p-2 hover:bg-gray-800 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or reg number..."
            className="w-full pl-11 pr-4 py-2.5 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'documents_uploaded', 'face_verified', 'approved', 'rejected'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Student</th>
                {/* FIX 4: header now says "Student ID" to match the actual field */}
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Student ID</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Institution</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                    {search || filter !== 'all' ? 'No students match your filters.' : 'No students found.'}
                  </td>
                </tr>
              )}
              {filtered.map(s => {
                const status = deriveStatus(s);
                // FIX 4: use studentId (actual mapped field)
                const regNo  = s.studentId || s.registrationNumber || '—';
                const isActionLoading = actionLoading === s.id;

                return (
                  <tr key={s.id} className="hover:bg-gray-800/20 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-gray-500">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 font-mono">{regNo}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{s.institutionName || '—'}</td>
                    <td className="px-6 py-4">{statusBadge(status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedStudent(s.id)}
                          className="p-1.5 hover:bg-gray-700 rounded-lg transition"
                          title="View details"
                        >
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                        {status !== 'approved' && (
                          <button
                            onClick={() => handleApprove(s.id)}
                            disabled={isActionLoading}
                            className="p-1.5 hover:bg-green-900/30 rounded-lg transition disabled:opacity-40"
                            title="Approve"
                          >
                            {isActionLoading
                              ? <div className="w-4 h-4 border border-green-400 border-t-transparent rounded-full animate-spin" />
                              : <UserCheck className="w-4 h-4 text-green-400" />
                            }
                          </button>
                        )}
                        {status !== 'rejected' && (
                          <button
                            onClick={() => handleReject(s.id)}
                            disabled={isActionLoading}
                            className="p-1.5 hover:bg-red-900/30 rounded-lg transition disabled:opacity-40"
                            title="Reject"
                          >
                            {isActionLoading
                              ? <div className="w-4 h-4 border border-red-400 border-t-transparent rounded-full animate-spin" />
                              : <UserX className="w-4 h-4 text-red-400" />
                            }
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Detail Panel */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/50 border border-gray-800 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Student Details — {selected.name}</h3>
            <button
              onClick={() => setSelectedStudent(null)}
              className="text-xs text-gray-500 hover:text-white transition"
            >
              Close ✕
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Email',        value: selected.email },
              // FIX 4: use studentId
              { label: 'Student ID',   value: selected.studentId || selected.registrationNumber || '—' },
              { label: 'Institution',  value: selected.institutionName || '—' },
              { label: 'Status',       value: deriveStatus(selected) },
              { label: 'Joined',       value: new Date(selected.createdAt).toLocaleDateString() },
              { label: 'Account',      value: selected.isActive ? 'Active' : 'Inactive' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-800/30 rounded-lg p-3">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Metadata section — shows any extra fields stored per-student */}
          {selected.metadata && Object.keys(selected.metadata).length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" /> Additional Data
              </h4>
              <div className="bg-gray-800/30 rounded-lg p-3">
                <pre className="text-xs text-gray-400 overflow-auto">
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {deriveStatus(selected) !== 'approved' && deriveStatus(selected) !== 'rejected' && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { handleApprove(selected.id); setSelectedStudent(null); }}
                disabled={actionLoading === selected.id}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-medium transition flex items-center gap-2 text-white disabled:opacity-40"
              >
                <UserCheck className="w-4 h-4" /> Approve Student
              </button>
              <button
                onClick={() => { handleReject(selected.id); setSelectedStudent(null); }}
                disabled={actionLoading === selected.id}
                className="px-6 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-xl text-sm font-medium text-red-400 transition flex items-center gap-2 disabled:opacity-40"
              >
                <UserX className="w-4 h-4" /> Reject
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}