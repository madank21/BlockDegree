import { useApp } from '../../context/AppContext';
import { Users, Shield, GraduationCap, Building, Briefcase } from 'lucide-react';

export default function UsersPage() {
  const { users } = useApp();

  const roleIcons: Record<string, React.ReactNode> = {
    admin: <Shield className="w-5 h-5 text-red-400" />,
    university: <Building className="w-5 h-5 text-blue-400" />,
    student: <GraduationCap className="w-5 h-5 text-green-400" />,
    employer: <Briefcase className="w-5 h-5 text-purple-400" />,
  };

  const roleBgColors: Record<string, string> = {
    admin: 'from-red-500/10 to-red-600/10 border-red-500/30',
    university: 'from-blue-500/10 to-blue-600/10 border-blue-500/30',
    student: 'from-green-500/10 to-green-600/10 border-green-500/30',
    employer: 'from-purple-500/10 to-purple-600/10 border-purple-500/30',
  };

  const grouped = {
    admin: users.filter(u => u.role === 'admin'),
    university: users.filter(u => u.role === 'university'),
    student: users.filter(u => u.role === 'student'),
    employer: users.filter(u => u.role === 'employer'),
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(grouped).map(([role, list]) => (
          <div key={role} className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 backdrop-blur">
            <div className="flex items-center gap-2 mb-2">
              {roleIcons[role]}
              <span className="text-sm font-medium text-gray-300 capitalize">{role}s</span>
            </div>
            <p className="text-2xl font-bold text-white">{list.length}</p>
          </div>
        ))}
      </div>

      {/* User Cards */}
      {Object.entries(grouped).map(([role, list]) => (
        <div key={role}>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            {roleIcons[role]}
            {role}s ({list.length})
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {list.map(user => (
              <div key={user.id} className={`bg-gradient-to-br ${roleBgColors[role]} border rounded-2xl p-5`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold text-sm">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Wallet</span>
                    <span className="text-gray-400 font-mono">{user.walletAddress.slice(0, 10)}...{user.walletAddress.slice(-6)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Role</span>
                    <span className="text-gray-400 capitalize">{user.role}</span>
                  </div>
                  {user.organization && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Organization</span>
                      <span className="text-gray-400">{user.organization}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Access Control Matrix */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          RBAC Access Control Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700/50">
                <th className="text-left py-2 px-3">Permission</th>
                <th className="text-center py-2 px-3">Admin</th>
                <th className="text-center py-2 px-3">University</th>
                <th className="text-center py-2 px-3">Student</th>
                <th className="text-center py-2 px-3">Employer</th>
              </tr>
            </thead>
            <tbody>
              {[
                { perm: 'View Dashboard', admin: true, uni: true, stu: true, emp: true },
                { perm: 'Issue Degree', admin: false, uni: true, stu: false, emp: false },
                { perm: 'Revoke Degree', admin: true, uni: true, stu: false, emp: false },
                { perm: 'Verify Degree', admin: true, uni: false, stu: false, emp: true },
                { perm: 'OCR Verification', admin: false, uni: false, stu: false, emp: true },
                { perm: 'View Fraud Reports', admin: true, uni: false, stu: false, emp: true },
                { perm: 'View Blockchain', admin: true, uni: true, stu: false, emp: false },
                { perm: 'View Audit Logs', admin: true, uni: false, stu: false, emp: false },
                { perm: 'Manage Users', admin: true, uni: false, stu: false, emp: false },
              ].map(row => (
                <tr key={row.perm} className="border-b border-gray-800/50">
                  <td className="py-2 px-3 text-gray-300">{row.perm}</td>
                  <td className="text-center py-2">{row.admin ? '✅' : '❌'}</td>
                  <td className="text-center py-2">{row.uni ? '✅' : '❌'}</td>
                  <td className="text-center py-2">{row.stu ? '✅' : '❌'}</td>
                  <td className="text-center py-2">{row.emp ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
