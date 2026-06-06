import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../useStore';
import { GraduationCap, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

export default function ApplyDegree({ onNavigate }: Props) {
  const { currentUser, applyForDegree } = useStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    department: currentUser?.department || '',
    program: currentUser?.program || '',
    degreeTitle: '',
    cgpa: currentUser?.cgpa || 0,
    admissionYear: currentUser?.admissionYear || 2022,
    graduationYear: currentUser?.graduationYear || 2026,
  });

  if (!currentUser) return null;

  const isApproved = currentUser.verificationStatus === 'approved';

  const departments = ['Computer Science', 'Software Engineering', 'Artificial Intelligence', 'Data Science', 'Electrical Engineering', 'Business Administration'];
  const programs: Record<string, string[]> = {
    'Computer Science': ['BS Computer Science', 'MS Computer Science', 'PhD Computer Science'],
    'Software Engineering': ['BS Software Engineering', 'MS Software Engineering'],
    'Artificial Intelligence': ['BS Artificial Intelligence', 'MS Artificial Intelligence'],
    'Data Science': ['BS Data Science', 'MS Data Science'],
    'Electrical Engineering': ['BS Electrical Engineering', 'MS Electrical Engineering'],
    'Business Administration': ['BBA', 'MBA', 'PhD Business Administration'],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));

    applyForDegree({
      studentId: currentUser.id,
      studentName: currentUser.name,
      registrationNumber: currentUser.registrationNumber,
      department: form.department,
      program: form.program,
      degreeTitle: form.degreeTitle || `Bachelor of Science in ${form.department}`,
      cgpa: form.cgpa,
      admissionYear: form.admissionYear,
      graduationYear: form.graduationYear,
    });

    setLoading(false);
    setSuccess(true);
  };

  if (!isApproved) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-yellow-400" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Verification Required</h2>
        <p className="text-gray-400 mb-6">You must complete identity verification before applying for a degree.</p>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-left space-y-2 mb-6">
          <p className="text-sm text-gray-300">Required Steps:</p>
          <ul className="space-y-1.5">
            {['Upload CNIC & Academic Documents', 'Pass OCR Verification', 'Complete Face Verification', 'Receive Admin Approval'].map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-400">
                <span className="w-5 h-5 rounded-full bg-gray-800 text-gray-500 flex items-center justify-center text-xs">{i + 1}</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <button onClick={() => onNavigate('documents')} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition text-white">
          Start Verification
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto text-center py-16"
      >
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold mb-3 text-green-400">Application Submitted!</h2>
        <p className="text-gray-400 mb-6">Your degree application has been submitted successfully. It will be reviewed by the university administration.</p>
        <button onClick={() => onNavigate('my-degrees')} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition text-white">
          View My Degrees
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Apply for Degree</h2>
        <p className="text-gray-400 mt-1">Submit your degree application for blockchain attestation</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Student Name</label>
            <input type="text" value={currentUser.name} disabled className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-400 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Registration Number</label>
            <input type="text" value={currentUser.registrationNumber} disabled className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-400 cursor-not-allowed" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-300 mb-1.5 block">Department</label>
          <select
            value={form.department}
            onChange={e => setForm({ ...form, department: e.target.value, program: '' })}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition"
            required
          >
            <option value="">Select Department</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-300 mb-1.5 block">Degree Program</label>
          <select
            value={form.program}
            onChange={e => setForm({ ...form, program: e.target.value })}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition"
            required
          >
            <option value="">Select Program</option>
            {(programs[form.department] || []).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-300 mb-1.5 block">Degree Title</label>
          <input
            type="text"
            value={form.degreeTitle}
            onChange={e => setForm({ ...form, degreeTitle: e.target.value })}
            placeholder={`e.g. Bachelor of Science in ${form.department || 'Computer Science'}`}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">CGPA</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="4"
              value={form.cgpa}
              onChange={e => setForm({ ...form, cgpa: parseFloat(e.target.value) })}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Admission Year</label>
            <input
              type="number"
              value={form.admissionYear}
              onChange={e => setForm({ ...form, admissionYear: parseInt(e.target.value) })}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Graduation Year</label>
            <input
              type="number"
              value={form.graduationYear}
              onChange={e => setForm({ ...form, graduationYear: parseInt(e.target.value) })}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>
        </div>

        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-400 font-medium">Important Notice</p>
              <p className="text-xs text-gray-400 mt-1">Once submitted, your degree application will be reviewed by the administration. If approved, a blockchain-backed degree certificate will be generated with a unique QR verification code.</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-white"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <GraduationCap className="w-5 h-5" /> Submit Application
            </>
          )}
        </button>
      </form>
    </div>
  );
}
