import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../useStore';
import { QRCodeSVG } from 'qrcode.react';
import {
  GraduationCap, Printer, Share2, CheckCircle2, Link2,
  X, Copy, Eye
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import DegreeCertificate from '../components/DegreeCertificate';

export default function MyDegrees() {
  const { currentUser, degreeApplications } = useStore();
  const [selectedDegree, setSelectedDegree] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!currentUser) return null;

  const myDegrees = degreeApplications.filter(d => d.studentId === currentUser.id);
  const activeDegree = myDegrees.find(d => d.id === selectedDegree);

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };
  
    const downloadPDF = async (degree: any) => {
      try {
        const element = document.getElementById(`degree-certificate-${degree.id}`);
        if (!element) return;

        // Create canvas from the certificate HTML
        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          allowTaint: true,
          logging: false,
        });

        // Create PDF from canvas
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'px',
          format: [canvas.width / 2, canvas.height / 2],
        });

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
        pdf.save(`${degree.degreeId}_Certificate.pdf`);
      } catch (err) {
        console.error('PDF download error:', err);
        alert('Failed to download PDF. Please try again.');
      }
    };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Degrees</h2>
        <p className="text-gray-400 mt-1">View, download, share, and verify your cryptographically attested degrees</p>
      </div>

      {myDegrees.length === 0 ? (
        <div className="text-center py-16">
          <GraduationCap className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400">No Degrees Yet</h3>
          <p className="text-sm text-gray-500 mt-1">Apply for a degree to see it here</p>
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
                  <button className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm flex items-center justify-center gap-1.5 transition text-white" onClick={e => { e.stopPropagation(); handlePrint(); }}>
                    <Printer className="w-4 h-4" /> Print
                  </button>
                    <button className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm flex items-center justify-center gap-1.5 transition text-white" onClick={e => { e.stopPropagation(); downloadPDF(deg); }}>
                      <Printer className="w-4 h-4" /> Download
                    </button>
                    <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm flex items-center justify-center gap-1.5 transition text-white" onClick={e => { e.stopPropagation(); copyHash(deg.blockchainHash || ''); }}>
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Degree Certificate Modal */}
      <AnimatePresence>
        {activeDegree && activeDegree.status === 'issued' && (
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
              {/* Certificate */}
              <div className="bg-gradient-to-b from-amber-50 to-amber-100 rounded-xl p-1 shadow-2xl" id="degree-certificate">
                  <DegreeCertificate degree={activeDegree} user={currentUser} />
                </div>

                {/* Modal Footer */}
                <div className="flex gap-3 mt-4 justify-center">
                  <button
                    onClick={() => downloadPDF(activeDegree)}
                    className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium text-white transition flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" /> Download PDF
                  </button>
                  <button
                    onClick={() => handlePrint()}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white transition flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <button
                    onClick={() => setSelectedDegree(null)}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-white transition flex items-center gap-2"
                  >
                    <X className="w-4 h-4" /> Close
                  </button>
                </div>

                    <p className="text-sm text-amber-700">Registration No: {activeDegree.registrationNumber}</p>
                  </div>

                  <p className="text-amber-700 mb-2">has successfully completed the requirements for the degree of</p>

                  <h3 className="text-xl lg:text-2xl font-serif font-bold text-amber-900 my-4">{activeDegree.degreeTitle}</h3>

                  <p className="text-amber-700 text-sm mb-1">from the Department of {activeDegree.department}</p>
                  <p className="text-amber-700 text-sm">with a Cumulative Grade Point Average of <strong className="text-amber-900">{activeDegree.cgpa}</strong></p>
                  <p className="text-amber-700 text-sm mt-2">Graduated in the year <strong className="text-amber-900">{activeDegree.graduationYear}</strong></p>

                  <div className="w-32 h-px bg-amber-800/30 mx-auto my-6" />

                  {/* Bottom details */}
                  <div className="grid grid-cols-3 gap-4 text-center mb-6">
                    <div>
                      <div className="w-24 h-px bg-amber-800/30 mx-auto mb-2" />
                      <p className="text-xs text-amber-600">Vice Chancellor</p>
                    </div>
                    <div>
                      <div className="w-24 h-px bg-amber-800/30 mx-auto mb-2" />
                      <p className="text-xs text-amber-600">Registrar</p>
                    </div>
                    <div>
                      <div className="w-24 h-px bg-amber-800/30 mx-auto mb-2" />
                      <p className="text-xs text-amber-600">Controller of Examinations</p>
                    </div>
                  </div>

                  {/* QR and Blockchain */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 rounded-lg p-4">
                    <div>
                      <QRCodeSVG
                        value={activeDegree.qrCodeData || activeDegree.degreeId || ''}
                        size={80}
                        level="H"
                        includeMargin
                        bgColor="transparent"
                      />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-xs text-amber-600 font-medium">Cryptographically Attested</p>
                      <p className="text-[10px] text-amber-500 font-mono break-all mt-1">ID: {activeDegree.degreeId}</p>
                      <p className="text-[10px] text-amber-500 font-mono break-all mt-0.5">Hash: {activeDegree.blockchainHash?.substring(0, 42)}...</p>
                    </div>
                    <div className="flex items-center gap-1 bg-green-100 px-3 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-green-700 font-medium">VALID</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-gray-900 rounded-b-xl p-4 flex flex-wrap gap-3 justify-between items-center border-t border-gray-800">
                <div className="flex gap-2">
                  <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition text-white">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <button onClick={() => copyHash(activeDegree.blockchainHash || '')} className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition text-white">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy Hash'}
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition text-white">
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                </div>
                <button onClick={() => setSelectedDegree(null)} className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition text-white">
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
