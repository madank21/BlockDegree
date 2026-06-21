import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Eye,
  UserCheck, UserX, FileText
} from 'lucide-react';
import api from '@/api/api';

interface Student {
  id: string;
  name: string;
  email: string;
  registrationNumber: string;
  department?: string;
  verificationStatus: string;
  documents?: any[];
  cnicNumber?: string;
  fatherName?: string;
  program?: string;
  cgpa?: number;
  createdAt: string;
}

export default function StudentsManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // Assuming backend has GET /users?role=student
      const data = await api.request<{ users: Student[] }>('/users?role=student');
      setStudents(data.users || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.request(`/users/${id}/approve`, { method: 'PATCH' });
      await fetchStudents();
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.request(`/users/${id}/reject`, { method: 'PATCH' });
      await fetchStudents();
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    }
  };

  const filtered = students.filter(s => {
    if (filter !== 'all' && s.verificationStatus !== filter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.registrationNumber.includes(search)) return false;
    return true;
  });

  const selected = students.find(s => s.id === selectedStudent);

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      pending: { color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', label: 'Pending' },
      documents_uploaded: { color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', label: 'Docs Uploaded' },
      ocr_verified: { color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20', label: 'OCR Verified' },
      face_verified: { color: 'text-purple-400 bg-purple-400/10 border-purple-400/20', label: 'Face Verified' },
      approved: { color: 'text-green-400 bg-green-400/10 border-green-400/20', label: 'Approved' },
      rejected: { color: 'text-red-400 bg-red-400/10 border-red-400/20', label: 'Rejected' },
    };
    const s = map[status] || map.pending;
    return <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${s.color}`}>{s.label}</span>;
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
        <p>{error}</p>
        <button onClick={fetchStudents} className="mt-2 text-sm underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Student Management</h2>
          <p className="text-gray-400 mt-1">Review and approve student verifications</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">{filtered.length} students</span>
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
            placeholder="Search by name or reg number..."
            className="w-full pl-11 pr-4 py-2.5 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'documents_uploaded', 'face_verified', 'approved', 'rejected'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Student List */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Student</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Reg #</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Department</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Docs</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-800/20 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{s.registrationNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{s.department || '—'}</td>
                  <td className="px-6 py-4">{statusBadge(s.verificationStatus)}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{s.documents?.length || 0}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setSelectedStudent(s.id)} className="p-1.5 hover:bg-gray-700 rounded-lg transition" title="View">
                        <Eye className="w-4 h-4 text-gray-400" />
                      </button>
                      {s.verificationStatus !== 'approved' && s.verificationStatus !== 'rejected' && (
                        <>
                          <button onClick={() => handleApprove(s.id)} className="p-1.5 hover:bg-green-900/30 rounded-lg transition" title="Approve">
                            <UserCheck className="w-4 h-4 text-green-400" />
                          </button>
                          <button onClick={() => handleReject(s.id)} className="p-1.5 hover:bg-red-900/30 rounded-lg transition" title="Reject">
                            <UserX className="w-4 h-4 text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Detail */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/50 border border-gray-800 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Student Details — {selected.name}</h3>
            <button onClick={() => setSelectedStudent(null)} className="text-xs text-gray-500 hover:text-white transition">Close</button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800/30 rounded-lg p-3">
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium">{selected.email}</p>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-3">
              <p className="text-xs text-gray-500">CNIC</p>
              <p className="text-sm font-medium">{selected.cnicNumber || '—'}</p>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-3">
              <p className="text-xs text-gray-500">Father Name</p>
              <p className="text-sm font-medium">{selected.fatherName || '—'}</p>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-3">
              <p className="text-xs text-gray-500">Program</p>
              <p className="text-sm font-medium">{selected.program || '—'}</p>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-3">
              <p className="text-xs text-gray-500">CGPA</p>
              <p className="text-sm font-medium">{selected.cgpa || '—'}</p>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-3">
              <p className="text-xs text-gray-500">Registration Date</p>
              <p className="text-sm font-medium">{new Date(selected.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {selected.documents && selected.documents.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Uploaded Documents</h4>
              <div className="space-y-2">
                {selected.documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between bg-gray-800/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <div>
                        <p className="text-sm">{doc.fileName}</p>
                        <p className="text-xs text-gray-500 capitalize">{doc.type.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${doc.ocrStatus === 'verified' ? 'text-green-400' : 'text-yellow-400'}`}>
                        OCR: {doc.ocrStatus}
                      </span>
                      <span className={`text-xs ${doc.yoloStatus === 'valid' ? 'text-green-400' : 'text-yellow-400'}`}>
                        YOLO: {doc.yoloStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selected.verificationStatus !== 'approved' && selected.verificationStatus !== 'rejected' && (
            <div className="flex gap-3 mt-6">
              <button onClick={() => { handleApprove(selected.id); setSelectedStudent(null); }} className="px-6 py-2.5 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-medium transition flex items-center gap-2 text-white">
                <UserCheck className="w-4 h-4" /> Approve Student
              </button>
              <button onClick={() => { handleReject(selected.id); setSelectedStudent(null); }} className="px-6 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-xl text-sm font-medium text-red-400 transition flex items-center gap-2">
                <UserX className="w-4 h-4" /> Reject
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}