import { useApp } from '../../context/AppContext';
import { Blocks, ArrowRight } from 'lucide-react';

export default function BlockchainPage() {
  const { transactions } = useApp();

  const sortedTxs = [...transactions].sort((a, b) => b.blockNumber - a.blockNumber);

  return (
    <div className="space-y-6">
      {/* Contract Info */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { name: 'DegreeRegistry.sol', addr: '0xDegreeRegistry...a1b2', functions: ['issueDegree()', 'verifyDegree()', 'getDegree()', 'revokeDegree()'] },
          { name: 'AccessControl.sol', addr: '0xAccessControl...c3d4', functions: ['grantRole()', 'revokeRole()', 'hasRole()', 'getRoleAdmin()'] },
          { name: 'AuditLog.sol', addr: '0xAuditLog...e5f6', functions: ['logAction()', 'getLog()', 'getLogs()'] },
        ].map(contract => (
          <div key={contract.name} className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 backdrop-blur">
            <div className="flex items-center gap-2 mb-3">
              <Blocks className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">{contract.name}</h3>
            </div>
            <p className="text-xs text-gray-500 font-mono mb-3">{contract.addr}</p>
            <div className="space-y-1">
              {contract.functions.map(fn => (
                <div key={fn} className="text-xs text-gray-400 font-mono px-2 py-1 bg-gray-900/50 rounded-lg">
                  {fn}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-xs text-green-400">Deployed (Ganache/Hardhat)</span>
            </div>
          </div>
        ))}
      </div>

      {/* Transaction List */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Blocks className="w-5 h-5 text-cyan-400" />
          Blockchain Transactions
        </h3>

        <div className="space-y-3">
          {sortedTxs.map(tx => (
            <div key={tx.hash} className="p-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-lg font-mono">
                    Block #{tx.blockNumber}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-lg font-medium ${
                    tx.action.includes('issue') ? 'bg-blue-500/20 text-blue-400' :
                    tx.action.includes('revoke') ? 'bg-red-500/20 text-red-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {tx.action}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-mono">{tx.from.slice(0, 10)}...</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="font-mono">{tx.to}</span>
                </div>

                <div className="md:ml-auto flex items-center gap-4 text-xs text-gray-500">
                  <span>Gas: {tx.gasUsed.toLocaleString()}</span>
                  <span>{new Date(tx.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600 font-mono break-all">
                Tx: {tx.hash}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Network Info */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
        <h3 className="text-sm font-semibold text-white mb-3">Network Configuration</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { label: 'Network', value: 'Private Ethereum (Ganache)' },
            { label: 'Chain ID', value: '1337' },
            { label: 'RPC URL', value: 'http://127.0.0.1:8545' },
            { label: 'Block Gas Limit', value: '30,000,000' },
            { label: 'Total Blocks', value: `${sortedTxs.length > 0 ? Math.max(...sortedTxs.map(t => t.blockNumber)) : 1000}` },
            { label: 'Consensus', value: 'Proof of Authority (Ganache)' },
          ].map(item => (
            <div key={item.label} className="flex justify-between p-3 bg-gray-900/50 rounded-xl">
              <span className="text-xs text-gray-500">{item.label}</span>
              <span className="text-xs text-white font-mono">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
