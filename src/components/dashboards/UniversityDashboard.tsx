import { useApp } from '../../context/AppContext';
import { GraduationCap, CheckCircle, Ban, Blocks } from 'lucide-react';

export default function UniversityDashboard() {
  const { currentUser, degrees, transactions } = useApp();

  const myDegrees = degrees.filter(d => d.issuedBy === currentUser?.id);
  const active = myDegrees.filter(d => d.status === 'ACTIVE').length;
  const revoked = myDegrees.filter(d => d.status === 'REVOKED').length;
  const myTxs = transactions.filter(t => t.from === currentUser?.walletAddress);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<GraduationCap className="w-6 h-6" />} label="Total Issued" value={myDegrees.length} color="from-blue-500 to-blue-600" />
        <StatCard icon={<CheckCircle className="w-6 h-6" />} label="Active" value={active} color="from-green-500 to-green-600" />
        <StatCard icon={<Ban className="w-6 h-6" />} label="Revoked" value={revoked} color="from-red-500 to-red-600" />
        <StatCard icon={<Blocks className="w-6 h-6" />} label="Transactions" value={myTxs.length} color="from-purple-500 to-purple-600" />
      </div>

      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-4">Recently Issued Degrees</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700/50">
                <th className="text-left py-3 px-4">Student</th>
                <th className="text-left py-3 px-4">Program</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Tx Hash</th>
              </tr>
            </thead>
            <tbody>
              {[...myDegrees].reverse().map(deg => (
                <tr key={deg.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-3 px-4 text-white font-medium">{deg.studentName}</td>
                  <td className="py-3 px-4 text-gray-300">{deg.program}</td>
                  <td className="py-3 px-4 text-gray-400">{deg.graduationDate}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${deg.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {deg.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 font-mono text-xs">{deg.blockchainTxHash.slice(0, 14)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 backdrop-blur">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}
