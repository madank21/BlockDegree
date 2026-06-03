import { useApp } from '../../context/AppContext';
import { Ban, CheckCircle, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function DegreesPage() {
  const { currentUser, degrees, revokeDegree } = useApp();
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'revoked'>('all');
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);

  let displayDegrees = degrees;

  // Filter by role
  if (currentUser?.role === 'university') {
    displayDegrees = displayDegrees.filter(d => d.issuedBy === currentUser.id);
  } else if (currentUser?.role === 'student') {
    displayDegrees = displayDegrees.filter(d => d.studentName === currentUser.name);
  }

  // Filter by status
  if (filter !== 'all') {
    displayDegrees = displayDegrees.filter(d => d.status === filter.toUpperCase());
  }

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash).catch(() => {});
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleRevoke = (id: string) => {
    revokeDegree(id);
    setRevokeConfirm(null);
  };

  const canRevoke = currentUser?.role === 'admin' || currentUser?.role === 'university';

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3">
        {(['all', 'active', 'revoked'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
              filter === f ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-gray-800/60 text-gray-400 border border-gray-700/50 hover:text-gray-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({
              f === 'all' ? displayDegrees.length :
              degrees.filter(d => {
                let base = degrees;
                if (currentUser?.role === 'university') base = base.filter(dd => dd.issuedBy === currentUser.id);
                if (currentUser?.role === 'student') base = base.filter(dd => dd.studentName === currentUser.name);
                return base.includes(d) && d.status === f.toUpperCase();
              }).length
            })
          </button>
        ))}
      </div>

      {/* Degrees Table */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700/50 bg-gray-900/30">
                <th className="text-left py-3 px-4 font-medium">Student</th>
                <th className="text-left py-3 px-4 font-medium">Program</th>
                <th className="text-left py-3 px-4 font-medium">University</th>
                <th className="text-left py-3 px-4 font-medium">Date</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-left py-3 px-4 font-medium">Hash</th>
                {canRevoke && <th className="text-left py-3 px-4 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {displayDegrees.map(deg => (
                <tr key={deg.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-white font-medium">{deg.studentName}</p>
                      <p className="text-xs text-gray-500">{deg.studentId}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-300">{deg.program}</td>
                  <td className="py-3 px-4 text-gray-400">{deg.university}</td>
                  <td className="py-3 px-4 text-gray-400">{deg.graduationDate}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                      deg.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {deg.status === 'ACTIVE' ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                      {deg.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => copyHash(deg.degreeHash)}
                      className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-mono transition cursor-pointer"
                    >
                      {deg.degreeHash.slice(0, 12)}...
                      {copiedHash === deg.degreeHash ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </td>
                  {canRevoke && (
                    <td className="py-3 px-4">
                      {deg.status === 'ACTIVE' && (
                        revokeConfirm === deg.id ? (
                          <div className="flex gap-2">
                            <button onClick={() => handleRevoke(deg.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded-lg cursor-pointer">Confirm</button>
                            <button onClick={() => setRevokeConfirm(null)} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-lg cursor-pointer">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setRevokeConfirm(deg.id)} className="px-3 py-1 bg-red-500/10 text-red-400 text-xs rounded-lg hover:bg-red-500/20 transition cursor-pointer">
                            Revoke
                          </button>
                        )
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
