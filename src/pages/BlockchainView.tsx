import { motion } from 'framer-motion';
import { useStore } from '../useStore';
import {
  Link2, CheckCircle2, Clock, Hash, Cpu, Fuel, Wallet
} from 'lucide-react';

export default function BlockchainView() {
  const { blockchainTransactions } = useStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Blockchain Explorer</h2>
        <p className="text-gray-400 mt-1">View all degree attestation transactions on the Ethereum private network</p>
      </div>

      {/* Network Info */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Network', value: 'Ethereum Private', icon: Link2, color: 'text-blue-400' },
          { label: 'Total Transactions', value: blockchainTransactions.length, icon: Hash, color: 'text-purple-400' },
          { label: 'Latest Block', value: `#${Math.max(...blockchainTransactions.map(t => t.blockNumber), 15234).toLocaleString()}`, icon: Cpu, color: 'text-cyan-400' },
          { label: 'Contract', value: 'DegreeRegistry.sol', icon: Wallet, color: 'text-green-400' },
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

      {/* Smart Contract */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-green-400" /> Smart Contract — DegreeRegistry.sol
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-800/30 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2">Functions</p>
            <div className="space-y-2">
              {['issueDegree(string, bytes32)', 'verifyDegree(string)', 'getDegree(string)', 'revokeDegree(string)'].map((fn, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <code className="text-green-400 font-mono text-xs">{fn}</code>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2">Events</p>
            <div className="space-y-2">
              {['DegreeIssued(string, bytes32, uint256)', 'DegreeVerified(string, address)', 'DegreeRevoked(string, uint256)'].map((ev, i) => (
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
          <h3 className="font-semibold">Transaction History</h3>
        </div>
        {blockchainTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No blockchain transactions yet</div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {blockchainTransactions.map((tx, i) => (
              <motion.div
                key={tx.id}
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
                      <p className="text-xs text-gray-500 mt-0.5">Student: {tx.studentRegNo}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> Block #{tx.blockNumber.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Fuel className="w-3 h-3" /> Gas: {tx.gasUsed.toLocaleString()}</span>
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
