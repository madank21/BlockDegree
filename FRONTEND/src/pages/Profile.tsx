import { useStore } from '../useStore';
import { User, Mail, Hash, Building, BookOpen, Calendar, Award, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Profile() {
  const { currentUser } = useStore();
  if (!currentUser) return null;

  // Map backend fields to display labels
  // currentUser comes from the auth response (with snake_case properties)
  // We'll use optional chaining and provide fallbacks
  const user = currentUser;

  // Determine verification status display
  const verificationStatus = user.verificationStatus || 'pending';

  const fields = [
    { label: 'Full Name', value: user.name || '—', icon: User },
    { label: 'Email', value: user.email || '—', icon: Mail },
    { label: 'Registration Number', value: user.studentId || user.student_id || '—', icon: Hash },
    { label: 'Role', value: user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '—', icon: Shield },
    { label: 'Department', value: user.department || '—', icon: Building },
    { label: 'Program', value: user.program || '—', icon: BookOpen },
    { label: 'CNIC Number', value: user.cnicNumber || user.cnic_number || '—', icon: Hash },
    { label: 'Father Name', value: user.fatherName || user.father_name || '—', icon: User },
    { label: 'CGPA', value: user.cgpa?.toString() || '—', icon: Award },
    { label: 'Admission Year', value: user.admissionYear || user.admission_year || '—', icon: Calendar },
    { label: 'Graduation Year', value: user.graduationYear || user.graduation_year || '—', icon: Calendar },
    { label: 'Registered On', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—', icon: Calendar },
  ];

  const statusColor: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    documents_uploaded: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    ocr_verified: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    face_verified: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    approved: 'text-green-400 bg-green-400/10 border-green-400/20',
    rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
  };

  const statusDisplay = verificationStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white">
            {user.name ? user.name.charAt(0) : '?'}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.name || 'User'}</h1>
            <p className="text-gray-400">{user.email || 'No email'}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${statusColor[verificationStatus] || 'text-gray-400 bg-gray-800/50 border-gray-700'}`}>
                {verificationStatus === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                {statusDisplay}
              </span>
              <span className="text-xs text-gray-500 capitalize">{user.role || 'student'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Profile Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-800/30 rounded-lg p-3">
              <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                <f.icon className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">{f.label}</p>
                <p className="text-sm font-medium">{f.value}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Show note if some fields are missing */}
        {fields.some(f => f.value === '—') && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2 text-xs text-yellow-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Some profile fields are missing. Please complete your profile or contact support.</span>
          </div>
        )}
      </div>
    </div>
  );
}