// FRONTEND/src/App.tsx
// ─────────────────────────────────────────────────────────────────────────────
// FIXES:
//   - DataManagement page added to routing (was unreachable — missing case)
//   - 'university' added to PAGE_ACCESS roles throughout
//   - 'data-management' added to PAGE_ACCESS with roles ['admin']
//   - DataManagement import added
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useStore }            from './useStore';
import Landing                 from './pages/Landing';
import Login                   from './pages/Login';
import Register                from './pages/Register';
import Layout                  from './components/Layout';
import StudentDashboard        from './pages/StudentDashboard';
import DocumentUpload          from './pages/DocumentUpload';
import FaceVerification        from './pages/FaceVerification';
import ApplyDegree             from './pages/ApplyDegree';
import MyDegrees               from './pages/MyDegrees';
import VerifyDegree            from './pages/VerifyDegree';
import AdminDashboard          from './pages/AdminDashboard';
import StudentsManagement      from './pages/StudentsManagement';
import DegreeManagement        from './pages/DegreeManagement';
import BlockchainView          from './pages/BlockchainView';
import FraudDetection          from './pages/FraudDetection';
import AuditLogs               from './pages/AuditLogs';
import EmployerDashboard       from './pages/EmployerDashboard';
import Profile                 from './pages/Profile';
import DataManagement          from './pages/DataManagement'; // FIX: was missing
import { AlertTriangle }       from 'lucide-react';
import { UserRole }            from './types';

// ─── Page access map ──────────────────────────────────────────────────────────
// FIX: 'university' role added wherever applicable
// FIX: 'data-management' added (was missing — page was unreachable)
const PAGE_ACCESS: Record<string, UserRole[]> = {
  // Student pages
  'dashboard':        ['student'],
  'documents':        ['student', 'university'],
  'face-verify':      ['student'],
  'apply-degree':     ['student'],
  'my-degrees':       ['student'],

  // Shared pages
  'verify':           ['student', 'admin', 'employer', 'university'],
  'profile':          ['student', 'admin', 'employer', 'university'],

  // Admin pages
  'admin-dashboard':  ['admin'],
  'students':         ['admin', 'university'],
  'degree-management':['admin', 'university'],
  'blockchain':       ['admin', 'university'],
  'fraud':            ['admin'],
  'audit':            ['admin'],
  'data-management':  ['admin'],           // FIX: was missing entirely

  // Employer page
  'employer-dashboard': ['employer'],
};

// ─── Default dashboard per role ────────────────────────────────────────────────
function dashboardForRole(role: UserRole): string {
  if (role === 'admin')      return 'admin-dashboard';
  if (role === 'employer')   return 'employer-dashboard';
  if (role === 'university') return 'degree-management'; // universities land on degree mgmt
  return 'dashboard';
}

export default function App() {
  const { currentUser } = useStore();
  const [page, setPage] = useState('landing');

  // Redirect to appropriate dashboard on login / logout
  useEffect(() => {
    if (currentUser && ['landing', 'login', 'register'].includes(page)) {
      setPage(dashboardForRole(currentUser.role));
    }
    if (!currentUser && !['landing', 'login', 'register'].includes(page)) {
      setPage('landing');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Public pages
  if (page === 'landing')  return <Landing  onNavigate={setPage} />;
  if (page === 'login')    return <Login    onNavigate={setPage} />;
  if (page === 'register') return <Register onNavigate={setPage} />;

  // Unauthenticated fallback
  if (!currentUser) return <Landing onNavigate={setPage} />;

  // ─── Protected page renderer ───────────────────────────────────────────────
  const renderPage = () => {
    const allowedRoles = PAGE_ACCESS[page];

    // Unknown page — redirect to role dashboard
    if (!allowedRoles) {
      return renderDashboardForRole(currentUser.role);
    }

    // Role check
    if (!allowedRoles.includes(currentUser.role)) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-md text-center">
            <AlertTriangle className="mx-auto mb-4 h-14 w-14 text-red-400" />
            <h2 className="text-xl font-bold text-red-400">Access Denied</h2>
            <p className="mt-2 text-sm text-gray-400">
              Your account role cannot access this page.
            </p>
            <button
              onClick={() => setPage(dashboardForRole(currentUser.role))}
              className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }

    // FIX: Added 'data-management' case
    switch (page) {
      case 'dashboard':          return <StudentDashboard   onNavigate={setPage} />;
      case 'documents':          return <DocumentUpload />;
      case 'face-verify':        return <FaceVerification />;
      case 'apply-degree':       return <ApplyDegree        onNavigate={setPage} />;
      case 'my-degrees':         return <MyDegrees />;
      case 'verify':             return <VerifyDegree />;
      case 'admin-dashboard':    return <AdminDashboard     onNavigate={setPage} />;
      case 'students':           return <StudentsManagement />;
      case 'degree-management':  return <DegreeManagement />;
      case 'blockchain':         return <BlockchainView />;
      case 'fraud':              return <FraudDetection />;
      case 'audit':              return <AuditLogs />;
      case 'employer-dashboard': return <EmployerDashboard  onNavigate={setPage} />;
      case 'profile':            return <Profile />;
      case 'data-management':    return <DataManagement />;   // FIX: added
      default:
        return renderDashboardForRole(currentUser.role);
    }
  };

  function renderDashboardForRole(role: UserRole) {
    if (role === 'admin')      return <AdminDashboard    onNavigate={setPage} />;
    if (role === 'employer')   return <EmployerDashboard onNavigate={setPage} />;
    if (role === 'university') return <DegreeManagement />;
    return <StudentDashboard onNavigate={setPage} />;
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  );
}