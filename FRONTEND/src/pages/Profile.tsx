import { useStore } from '../useStore';
import { User, Mail, Hash, Building, BookOpen, Calendar, Award, Shield, CheckCircle2 } from 'lucide-react';

export default function Profile() {
  const { currentUser } = useStore();
  if (!currentUser) return null;

  const fields = [
    { label: 'Full Name', value: currentUser.name, icon: User },
    { label: 'Email', value: currentUser.email, icon: Mail },
    { label: 'Registration Number', value: currentUser.registrationNumber, icon: Hash },
    { label: 'Role', value: currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1), icon: Shield },
    { label: 'Department', value: currentUser.department || '—', icon: Building },
    { label: 'Program', value: currentUser.program || '—', icon: BookOpen },
    { label: 'CNIC Number', value: currentUser.cnicNumber || '—', icon: Hash },
    { label: 'Father Name', value: currentUser.fatherName || '—', icon: User },
    { label: 'CGPA', value: currentUser.cgpa?.toString() || '—', icon: Award },
    { label: 'Admission Year', value: currentUser.admissionYear?.toString() || '—', icon: Calendar },
    { label: 'Graduation Year', value: currentUser.graduationYear?.toString() || '—', icon: Calendar },
    { label: 'Registered On', value: new Date(currentUser.createdAt).toLocaleDateString(), icon: Calendar },
  ];

  const statusColor: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    documents_uploaded: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    ocr_verified: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    face_verified: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    approved: 'text-green-400 bg-green-400/10 border-green-400/20',
    rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{currentUser.name}</h1>
            <p className="text-gray-400">{currentUser.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${statusColor[currentUser.verificationStatus]}`}>
                {currentUser.verificationStatus === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                {currentUser.verificationStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
              <span className="text-xs text-gray-500 capitalize">{currentUser.role}</span>
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
      </div>
    </div>
  );
}
