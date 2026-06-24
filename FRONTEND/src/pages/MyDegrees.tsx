import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../useStore';
import {
  GraduationCap, Printer, Link2,
  X, Eye
} from 'lucide-react';
import DegreeCertificate from '../components/DegreeCertificate';
import { degreesApi } from '../api/api'; // new import

export default function MyDegrees() {
  const { currentUser } = useStore();
  const [degrees, setDegrees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDegree, setSelectedDegree] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch degrees on mount
  useEffect(() => {
    const fetchDegrees = async () => {
      try {
        const data = await degreesApi.list();
        // data.data is the array
        setDegrees(data.data || []);
      } catch (err) {
        console.error('Failed to fetch degrees:', err);
        setDegrees([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDegrees();
  }, []);

  if (!currentUser) return null;

  // Filter degrees: search and status (backend already constrains scoping to current user)
  const myDegrees = degrees
    .filter(d =>
      d.degreeTitle?.toLowerCase().includes(search.toLowerCase()) ||
      d.department?.toLowerCase().includes(search.toLowerCase())
    )
    .filter(d =>
      statusFilter === 'all' ? true : d.status === statusFilter
    );

  const activeDegree = myDegrees.find(d => d.id === selectedDegree);

  // Helper: generate public verification URL
  const getVerificationUrl = (degreeId: string) =>
    `${window.location.origin}/verify/${degreeId}`;

  // Print certificate function (unchanged)
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

  // Statistics
  const totalDegrees = myDegrees.length;
  const issuedCount = myDegrees.filter(d => d.status === 'issued').length;
  const pendingCount = myDegrees.filter(d => d.status === 'pending').length;
  const verifiedCount = myDegrees.filter(d => d.blockchainHash || d.blockchainTxHash || d.blockchain_tx_hash).length;

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">My Degrees</h2>
        <p className="text-gray-400 mt-1">
          View, download, share, and verify your cryptographically attested degrees
        </p>
      </div>

      {/* Statistics Cards (unchanged) */}
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

      {/* Search & Filter (unchanged) */}
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

      {/* Degree List (unchanged except using myDegrees) */}
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
              {/* Card content unchanged */}
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

              {(deg.blockchainHash || deg.blockchainTxHash || deg.blockchain_tx_hash) && (
                <div className="mt-3 flex items-center gap-2 bg-gray-800/30 rounded-lg px-3 py-2">
                  <Link2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-xs text-gray-400 truncate font-mono">{deg.blockchainHash || deg.blockchainTxHash || deg.blockchain_tx_hash}</span>
                </div>
              )}

              {deg.status === 'issued' && (
                <div className="mt-4 flex gap-2">
                  <button
                    className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm flex items-center justify-center gap-1.5 transition text-white"
                    onClick={e => { e.stopPropagation(); setSelectedDegree(deg.id); }}
                  >
                    <Eye className="w-4 h-4" /> View
                  </button>
                  <button
                    className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm flex items-center justify-center gap-1.5 transition text-white"
                    onClick={e => { e.stopPropagation(); printCertificate(deg.id); }}
                  >
                    <Printer className="w-4 h-4" /> Print
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal (unchanged) */}
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

              {activeDegree.status === 'revoked' && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-4">
                  <p className="text-red-400 font-semibold">Degree Revoked</p>
                  <p className="text-sm text-gray-400">This certificate is no longer valid.</p>
                </div>
              )}

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
                      {activeDegree.blockchainHash || activeDegree.blockchainTxHash || activeDegree.blockchain_tx_hash || 'Not yet recorded'}
                    </p>
                  </div>
                </div>
              </div>

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