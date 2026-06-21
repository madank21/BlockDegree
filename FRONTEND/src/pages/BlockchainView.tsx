import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  Link2, CheckCircle2, Clock, Hash, Cpu, Fuel, Wallet
} from 'lucide-react';
import { blockchainApi } from '@/api/api';

interface Transaction {
  id: string;
  degreeId: string;
  degreeHash: string;
  txHash: string;
  issuerAddress: string;
  timestamp: string;
  blockNumber: number;
  gasUsed: number;
  status: string;
  studentRegNo?: string;
}

export default function BlockchainView() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [totalDegrees, setTotalDegrees] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [txData, netData, totalData] = await Promise.all([
          blockchainApi.transactions(),
          blockchainApi.network(),
          blockchainApi.totalDegrees(),
        ]);
        setTransactions(txData.transactions || []);
        setNetworkInfo(netData);
        setTotalDegrees(totalData.total || 0);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch blockchain data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400">
        <p>Error loading blockchain data: {error}</p>
      </div>
    );
  }

  // Derive latest block from transactions or fallback
  const latestBlock = transactions.length > 0
    ? Math.max(...transactions.map(t => t.blockNumber))
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Attestation Ledger</h2>
        <p className="text-gray-400 mt-1">View cryptographic degree attestations and verification hashes</p>
      </div>

      {/* Network Info */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Network',
            value: networkInfo?.chainId ? `Chain ${networkInfo.chainId}` : 'Unknown',
            icon: Link2,
            color: 'text-blue-400'
          },
          {
            label: 'Total Degrees',
            value: totalDegrees,
            icon: Hash,
            color: 'text-purple-400'
          },
          {
            label: 'Latest Block',
            value: `#${latestBlock.toLocaleString()}`,
            icon: Cpu,
            color: 'text-cyan-400'
          },
          {
            label: 'Gas Price',
            value: networkInfo?.gasPrice ? `${(parseInt(networkInfo.gasPrice) / 1e9).toFixed(1)} Gwei` : 'N/A',
            icon: Fuel,
            color: 'text-green-400'
          },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-gray-900/50 border border-gray-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <item.icon className={`w-4 h-4 ${item.color}`} />
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Attestation Schema */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-green-400" /> Attestation Schema
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-800/30 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2">Actions</p>
            <div className="space-y-2">
              {['createDegreeId(application)', 'hashDegreePayload(payload)', 'createAttestation(record)', 'verifyDegree(idOrHash)'].map((fn, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <code className="text-green-400 font-mono text-xs">{fn}</code>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2">Recorded Fields</p>
            <div className="space-y-2">
              {['degreeId', 'degreeHash', 'txHash', 'issuerAddress', 'timestamp'].map((ev, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <code className="text-purple-400 font-mono text-xs">{ev}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-semibold">Attestation History</h3>
        </div>
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No attestation records yet</div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {transactions.map((tx, i) => (
              <motion.div
                key={tx.id || i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="p-4 hover:bg-gray-800/20 transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      tx.status === 'confirmed' ? 'bg-green-500/10' : tx.status === 'pending' ? 'bg-yellow-500/10' : 'bg-red-500/10'
                    }`}>
                      {tx.status === 'confirmed' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> :
                       tx.status === 'pending' ? <Clock className="w-5 h-5 text-yellow-400" /> :
                       <Link2 className="w-5 h-5 text-red-400" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Degree Attestation — {tx.degreeId}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Student: {tx.studentRegNo || 'N/A'}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> Block #{tx.blockNumber.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Fuel className="w-3 h-3" /> Gas: {tx.gasUsed?.toLocaleString() || 'N/A'}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(tx.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                    tx.status === 'confirmed' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                    tx.status === 'pending' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                    'text-red-400 bg-red-400/10 border-red-400/20'
                  }`}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600 w-16 shrink-0">TX HASH</span>
                    <code className="text-xs text-gray-400 font-mono truncate">{tx.txHash}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600 w-16 shrink-0">DEG HASH</span>
                    <code className="text-xs text-gray-400 font-mono truncate">{tx.degreeHash}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600 w-16 shrink-0">ISSUER</span>
                    <code className="text-xs text-gray-400 font-mono truncate">{tx.issuerAddress}</code>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}