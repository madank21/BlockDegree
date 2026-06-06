import { motion } from 'framer-motion';
import { useStore } from '../useStore';
import {
  GraduationCap, FileText, ScanFace, CheckCircle2, Clock, AlertTriangle,
  Shield, Link2, ArrowRight, XCircle
} from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

export default function StudentDashboard({ onNavigate }: Props) {
  const { currentUser, degreeApplications } = useStore();
  if (!currentUser) return null;

  const myDegrees = degreeApplications.filter(d => d.studentId === currentUser.id);
  const issuedDegrees = myDegrees.filter(d => d.status === 'issued');

  const verificationSteps = [
    { label: 'Account Created', done: true, icon: CheckCircle2 },
    { label: 'Documents Uploaded', done: ['documents_uploaded', 'ocr_verified', 'face_verified', 'approved'].includes(currentUser.verificationStatus), icon: FileText },
    { label: 'OCR Verified', done: ['ocr_verified', 'face_verified', 'approved'].includes(currentUser.verificationStatus), icon: FileText },
    { label: 'Face Verified', done: ['face_verified', 'approved'].includes(currentUser.verificationStatus), icon: ScanFace },
    { label: 'Approved', done: currentUser.verificationStatus === 'approved', icon: Shield },
  ];

  const statusColor: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    documents_uploaded: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    ocr_verified: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    face_verified: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    approved: 'text-green-400 bg-green-400/10 border-green-400/20',
    rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
  };

  const cards = [
    {
      title: 'Verification Status',
      value: currentUser.verificationStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      icon: currentUser.verificationStatus === 'approved' ? CheckCircle2 : currentUser.verificationStatus === 'rejected' ? XCircle : Clock,
      gradient: 'from-blue-600 to-cyan-600',
      color: currentUser.verificationStatus === 'approved' ? 'text-green-400' : currentUser.verificationStatus === 'rejected' ? 'text-red-400' : 'text-yellow-400',
    },
    {
      title: 'Documents',
      value: currentUser.documents?.length || 0,
      icon: FileText,
      gradient: 'from-purple-600 to-pink-600',
      color: 'text-purple-400',
    },
    {
      title: 'Degrees Issued',
      value: issuedDegrees.length,
      icon: GraduationCap,
      gradient: 'from-green-600 to-emerald-600',
      color: 'text-green-400',
    },
    {
      title: 'Attestation Records',
      value: issuedDegrees.filter(d => d.blockchainHash).length,
      icon: Link2,
      gradient: 'from-orange-600 to-red-600',
      color: 'text-orange-400',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-800/30 rounded-2xl p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {currentUser.name} 👋</h1>
            <p className="text-gray-400 mt-1">Registration #{currentUser.registrationNumber} • {currentUser.department || 'Department Pending'}</p>
          </div>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium ${statusColor[currentUser.verificationStatus]}`}>
            {currentUser.verificationStatus === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {currentUser.verificationStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">{card.title}</span>
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Verification Progress */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6">Verification Progress</h3>
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-0">
          {verificationSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-3 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                step.done ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'
              }`}>
                <step.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${step.done ? 'text-green-400' : 'text-gray-500'}`}>{step.label}</p>
              </div>
              {i < verificationSteps.length - 1 && (
                <div className={`hidden lg:block flex-1 h-px mx-4 ${step.done ? 'bg-green-500/30' : 'bg-gray-800'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {currentUser.verificationStatus !== 'approved' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={() => onNavigate('documents')}
            className="bg-gray-900/50 border border-gray-800 hover:border-blue-500/30 rounded-xl p-6 text-left group transition"
          >
            <FileText className="w-8 h-8 text-blue-400 mb-3" />
            <h4 className="font-semibold mb-1">Upload Documents</h4>
            <p className="text-sm text-gray-400 mb-3">Submit your CNIC, marksheets, and certificates</p>
            <span className="text-sm text-blue-400 flex items-center gap-1">
              Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </motion.button>
        )}
        {currentUser.verificationStatus !== 'approved' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={() => onNavigate('face-verify')}
            className="bg-gray-900/50 border border-gray-800 hover:border-purple-500/30 rounded-xl p-6 text-left group transition"
          >
            <ScanFace className="w-8 h-8 text-purple-400 mb-3" />
            <h4 className="font-semibold mb-1">Face Verification</h4>
            <p className="text-sm text-gray-400 mb-3">Complete live selfie verification with CNIC photo</p>
            <span className="text-sm text-purple-400 flex items-center gap-1">
              Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </motion.button>
        )}
        {currentUser.verificationStatus === 'approved' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={() => onNavigate('apply-degree')}
            className="bg-gray-900/50 border border-gray-800 hover:border-green-500/30 rounded-xl p-6 text-left group transition"
          >
            <GraduationCap className="w-8 h-8 text-green-400 mb-3" />
            <h4 className="font-semibold mb-1">Apply for Degree</h4>
            <p className="text-sm text-gray-400 mb-3">Submit your degree application</p>
            <span className="text-sm text-green-400 flex items-center gap-1">
              Apply Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={() => onNavigate('my-degrees')}
          className="bg-gray-900/50 border border-gray-800 hover:border-cyan-500/30 rounded-xl p-6 text-left group transition"
        >
          <Shield className="w-8 h-8 text-cyan-400 mb-3" />
          <h4 className="font-semibold mb-1">My Degrees</h4>
          <p className="text-sm text-gray-400 mb-3">View, download, share, and verify your degrees</p>
          <span className="text-sm text-cyan-400 flex items-center gap-1">
            View <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </motion.button>
      </div>

      {/* Recent Degree Applications */}
      {myDegrees.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Applications</h3>
          <div className="space-y-3">
            {myDegrees.map(deg => (
              <div key={deg.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-800/30 rounded-lg p-4">
                <div>
                  <p className="font-medium">{deg.degreeTitle}</p>
                  <p className="text-sm text-gray-400">{deg.degreeId || 'ID Pending'} • Applied {new Date(deg.appliedAt).toLocaleDateString()}</p>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${
                  deg.status === 'issued' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                  deg.status === 'approved' ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' :
                  deg.status === 'pending' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                  'text-red-400 bg-red-400/10 border-red-400/20'
                }`}>
                  {deg.status === 'issued' ? <CheckCircle2 className="w-3 h-3" /> : deg.status === 'revoked' ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {deg.status.charAt(0).toUpperCase() + deg.status.slice(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
