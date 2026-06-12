import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../useStore';
import { QRCodeSVG } from 'qrcode.react';
import {
  GraduationCap, Printer, Share2, CheckCircle2, Link2,
  X, Copy, Eye, Download, FileJson, QrCode
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import DegreeCertificate from '../components/DegreeCertificate';

export default function MyDegrees() {
  const { currentUser, degreeApplications } = useStore();
  const [selectedDegree, setSelectedDegree] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  if (!currentUser) return null;

  // Filter degrees based on search and status
  const myDegrees = degreeApplications
    .filter(d => d.studentId === currentUser.id)
    .filter(d =>
      d.degreeTitle.toLowerCase().includes(search.toLowerCase()) ||
      d.department.toLowerCase().includes(search.toLowerCase())
    )
    .filter(d =>
      statusFilter === 'all' ? true : d.status === statusFilter
    );

  const activeDegree = myDegrees.find(d => d.id === selectedDegree);

  // Helper: generate public verification URL
  const getVerificationUrl = (degreeId: string) =>
    `${window.location.origin}/verify/${degreeId}`;

  // Copy blockchain hash to clipboard
  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Print only the certificate (opens new window)
  const printCertificate = (id: string) => {
    const element = document.getElementById(`degree-certificate-${id}`);
    if (!element) {
      alert('Certificate element not found');
      return;
    }
    const win = window.open('', '_blank');
    win?.document.write(`
      <html>
        <head>
          <title>Degree Certificate</title>
          <style>
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            * { print-color-adjust: exact; }
          </style>
        </head>
        <body>${element.innerHTML}</body>
      </html>
    `);
    win?.document.close();
    win?.print();
  };

  // Download PDF with improved quality (scale 4)
  const downloadPDF = async (degree: any) => {
    const element = document.getElementById(`degree-certificate-${degree.id}`);
    if (!element) {
      alert('Certificate not found');
      return;
    }
    try {
      const canvas = await html2canvas(element, {
        scale: 4,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`${degree.degreeId}_Certificate.pdf`);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to download PDF. Please try again.');
    }
  };

  // Share degree using Web Share API or clipboard
  const shareDegree = async (degree: any) => {
    const url = getVerificationUrl(degree.degreeId);
    try {
      if (navigator.share) {
        await navigator.share({
          title: degree.degreeTitle,
          text: 'Verify this blockchain degree',
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Verification link copied to clipboard');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  // Export degree data as JSON
  const exportJson = (degree: any) => {
    const blob = new Blob([JSON.stringify(degree, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${degree.degreeId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download QR code as SVG
  const downloadQR = () => {
    const svg = document.querySelector('#degreeQR svg');
    if (!svg) {
      alert('QR code not found');
      return;
    }
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'degree-qr.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Statistics counts
  const totalDegrees = myDegrees.length;
  const issuedCount = myDegrees.filter(d => d.status === 'issued').length;
  const pendingCount = myDegrees.filter(d => d.status === 'pending').length;
  const verifiedCount = myDegrees.filter(d => d.blockchainHash).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">My Degrees</h2>
        <p className="text-gray-400 mt-1">
          View, download, share, and verify your cryptographically attested degrees
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Total Degrees</p>
          <h3 className="text-2xl font-bold">{totalDegrees}</h3>
        </div>
        <div className="bg-green-500/10 rounded-xl p-4">
          <p className="text-green-400 text-sm">Issued</p>
          <h3 className="text-2xl font-bold">{issuedCount}</h3>
        </div>
        <div className="bg-yellow-500/10 rounded-xl p-4">
          <p className="text-yellow-400 text-sm">Pending</p>
          <h3 className="text-2xl font-bold">{pendingCount}</h3>
        </div>
        <div className="bg-blue-500/10 rounded-xl p-4">
          <p className="text-blue-400 text-sm">On Blockchain</p>
          <h3 className="text-2xl font-bold">{verifiedCount}</h3>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by degree title or department..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg bg-gray-900 border border-gray-800 focus:outline-none focus:border-blue-500"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-800 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="issued">Issued</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>

      {/* Degree List */}
      {myDegrees.length === 0 ? (
        <div className="text-center py-16">
          <GraduationCap className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400">No Degrees Found</h3>
          <p className="text-sm text-gray-500 mt-1">
            {search || statusFilter !== 'all'
              ? 'Try changing your search or filter'
              : 'Apply for a degree to see it here'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {myDegrees.map(deg => (
            <motion.div
              key={deg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-gray-900/50 border rounded-xl p-6 transition cursor-pointer hover:shadow-lg ${
                deg.status === 'issued' ? 'border-green-500/20 hover:border-green-500/40' :
                deg.status === 'revoked' ? 'border-red-500/20' :
                'border-gray-800 hover:border-gray-700'
              }`}
              onClick={() => setSelectedDegree(deg.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    deg.status === 'issued' ? 'bg-green-500/10' : 'bg-gray-800'
                  }`}>
                    <GraduationCap className={`w-6 h-6 ${deg.status === 'issued' ? 'text-green-400' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold">{deg.degreeTitle}</h4>
                    <p className="text-sm text-gray-400">{deg.department}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                  deg.status === 'issued' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                  deg.status === 'approved' ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' :
                  deg.status === 'pending' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                  deg.status === 'revoked' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                  'text-gray-400 bg-gray-400/10 border-gray-400/20'
                }`}>
                  {deg.status.charAt(0).toUpperCase() + deg.status.slice(1)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Degree ID:</span> <span className="text-white">{deg.degreeId || 'Pending'}</span></div>
                <div><span className="text-gray-500">CGPA:</span> <span className="text-white">{deg.cgpa}</span></div>
                <div><span className="text-gray-500">Year:</span> <span className="text-white">{deg.graduationYear}</span></div>
                <div><span className="text-gray-500">Fraud Score:</span> <span className={deg.fraudScore >= 71 ? 'text-green-400' : deg.fraudScore >= 41 ? 'text-yellow-400' : 'text-red-400'}>{deg.fraudScore}/100</span></div>
              </div>

              {deg.blockchainHash && (
                <div className="mt-3 flex items-center gap-2 bg-gray-800/30 rounded-lg px-3 py-2">
                  <Link2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-xs text-gray-400 truncate font-mono">{deg.blockchainHash}</span>
                </div>
              )}

              {deg.status === 'issued' && (
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm flex items-center justify-center gap-1.5 transition text-white" onClick={e => { e.stopPropagation(); setSelectedDegree(deg.id); }}>
                    <Eye className="w-4 h-4" /> View
                  </button>
                  <button className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm flex items-center justify-center gap-1.5 transition text-white" onClick={e => { e.stopPropagation(); printCertificate(deg.id); }}>
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <button className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm flex items-center justify-center gap-1.5 transition text-white" onClick={e => { e.stopPropagation(); downloadPDF(deg); }}>
                    <Download className="w-4 h-4" /> Download
                  </button>
                  <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm flex items-center justify-center gap-1.5 transition text-white" onClick={e => { e.stopPropagation(); shareDegree(deg); }}>
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Degree Modal (supports issued & revoked) */}
      <AnimatePresence>
        {activeDegree && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedDegree(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Certificate / Revoked Panel */}
              {activeDegree.status === 'issued' ? (
                <div
                  className="bg-gradient-to-b from-amber-50 to-amber-100 rounded-xl p-1 shadow-2xl"
                  id={`degree-certificate-${activeDegree.id}`}
                >
                  <DegreeCertificate degree={activeDegree} user={currentUser} />
                </div>
              ) : (
                <div className="bg-gray-900 rounded-xl p-6 text-center">
                  <GraduationCap className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">{activeDegree.degreeTitle}</h3>
                  <p className="text-gray-400">{activeDegree.department}</p>
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 font-semibold">Degree Revoked</p>
                    <p className="text-sm text-gray-400">This certificate is no longer valid.</p>
                  </div>
                </div>
              )}

              {/* Revoked Warning (also shown inside issued modal if status revoked – but above covers it) */}
              {activeDegree.status === 'revoked' && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-4">
                  <p className="text-red-400 font-semibold">Degree Revoked</p>
                  <p className="text-sm text-gray-400">This certificate is no longer valid.</p>
                </div>
              )}

              {/* Blockchain Information Panel */}
              <div className="bg-gray-900 rounded-xl p-4 mt-4">
                <h4 className="font-semibold mb-3">Blockchain Information</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400">Degree ID:</span>
                    <p className="text-white break-all">{activeDegree.degreeId || 'Not issued'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Verification URL:</span>
                    <p className="text-blue-400 break-all">
                      {activeDegree.degreeId ? getVerificationUrl(activeDegree.degreeId) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Blockchain Hash:</span>
                    <p className="font-mono text-xs break-all text-white">
                      {activeDegree.blockchainHash || 'Not yet recorded'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex flex-wrap gap-3 mt-4 justify-center">
                {activeDegree.status === 'issued' && (
                  <button
                    onClick={() => printCertificate(activeDegree.id)}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white transition flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" /> Print
                  </button>
                )}
                <button
                  onClick={() => setSelectedDegree(null)}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-white transition flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> Close
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
