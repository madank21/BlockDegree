/**
 * Root Application Component
 * Path: FRONTEND/src/App.tsx
 *
 * FIXES vs original:
 *  1. Added 'university' role throughout — login, redirect, PAGE_ACCESS.
 *  2. Added 'data-management' page import, route, and PAGE_ACCESS entry.
 *  3. University users redirect to 'degree-management' (their primary page).
 *  4. University users can access degree-management, blockchain, profile, documents, face-verify.
 *  5. Added 'university' to verify page access (employers can verify, so can universities).
 *  6. Handles unknown route gracefully per role (no infinite loop on unknown page key).
 */

import { useState, useEffect } from 'react';
import { useStore }             from './useStore';
import Landing                  from './pages/Landing';
import Login                    from './pages/Login';
import Register                 from './pages/Register';
import Layout                   from './components/Layout';
import StudentDashboard         from './pages/StudentDashboard';
import DocumentUpload           from './pages/DocumentUpload';
import FaceVerification         from './pages/FaceVerification';
import ApplyDegree              from './pages/ApplyDegree';
import MyDegrees                from './pages/MyDegrees';
import VerifyDegree             from './pages/VerifyDegree';
import AdminDashboard           from './pages/AdminDashboard';
import StudentsManagement       from './pages/StudentsManagement';
import DegreeManagement         from './pages/DegreeManagement';
import BlockchainView           from './pages/BlockchainView';
import FraudDetection           from './pages/FraudDetection';
import AuditLogs                from './pages/AuditLogs';
import EmployerDashboard        from './pages/EmployerDashboard';
import Profile                  from './pages/Profile';
import DataManagement           from './pages/DataManagement';   // FIXED: was never imported
import { AlertTriangle }        from 'lucide-react';
import { UserRole }             from './types';

// ─── Page access control ──────────────────────────────────────────────────────
// Maps page key → which roles may access it.
// FIXED: Added 'university' role; added 'data-management'; updated several pages.
const PAGE_ACCESS: Record<string, UserRole[]> = {
  // Student pages
  'dashboard':          ['student'],
  'documents':          ['student', 'university'],
  'face-verify':        ['student', 'university'],
  'apply-degree':       ['student'],
  'my-degrees':         ['student'],

  // Shared pages
  'verify':             ['student', 'admin', 'employer', 'university'],
  'profile':            ['student', 'admin', 'employer', 'university'],

  // Admin pages
  'admin-dashboard':    ['admin'],
  'students':           ['admin'],
  'degree-management':  ['admin', 'university'],   // FIXED: university can manage degrees
  'blockchain':         ['admin', 'university'],   // FIXED: university can view blockchain
  'fraud':              ['admin'],
  'audit':              ['admin'],
  'data-management':    ['admin'],                  // FIXED: new page added

  // Employer pages
  'employer-dashboard': ['employer'],
};

// ─── Default page per role ────────────────────────────────────────────────────
function dashboardForRole(role: UserRole): string {
  if (role === 'admin')      return 'admin-dashboard';
  if (role === 'employer')   return 'employer-dashboard';
  if (role === 'university') return 'degree-management';  // FIXED: university → degree management
  return 'dashboard';
}

// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const { currentUser } = useStore();
  const [page, setPage]   = useState('landing');

  // Redirect on login / logout
  useEffect(() => {
    if (currentUser && ['landing', 'login', 'register'].includes(page)) {
      setPage(dashboardForRole(currentUser.role));
    }
    if (!currentUser && !['landing', 'login', 'register'].includes(page)) {
      setPage('landing');
    }
  }, [currentUser]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public pages ─────────────────────────────────────────────────────────
  if (page === 'landing')  return <Landing  onNavigate={setPage} />;
  if (page === 'login')    return <Login    onNavigate={setPage} />;
  if (page === 'register') return <Register onNavigate={setPage} />;

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (!currentUser) return <Landing onNavigate={setPage} />;

  // ── Render page ───────────────────────────────────────────────────────────
  const renderPage = () => {
    const allowedRoles = PAGE_ACCESS[page];

    // Unknown page key → send to home
    if (!allowedRoles) {
      setPage(dashboardForRole(currentUser.role));
      return null;
    }

    // Role not allowed → show access denied
    if (!allowedRoles.includes(currentUser.role)) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-md text-center">
            <AlertTriangle className="mx-auto mb-4 h-14 w-14 text-red-400" />
            <h2 className="text-xl font-bold text-red-400">Access Denied</h2>
            <p className="mt-2 text-sm text-gray-400">
              Your account role (<span className="font-semibold capitalize">{currentUser.role}</span>)
              cannot open this page.
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

    switch (page) {
      // Student
      case 'dashboard':          return <StudentDashboard   onNavigate={setPage} />;
      case 'documents':          return <DocumentUpload />;
      case 'face-verify':        return <FaceVerification />;
      case 'apply-degree':       return <ApplyDegree        onNavigate={setPage} />;
      case 'my-degrees':         return <MyDegrees />;

      // Shared
      case 'verify':             return <VerifyDegree />;
      case 'profile':            return <Profile />;

      // Admin
      case 'admin-dashboard':    return <AdminDashboard     onNavigate={setPage} />;
      case 'students':           return <StudentsManagement />;
      case 'degree-management':  return <DegreeManagement />;
      case 'blockchain':         return <BlockchainView />;
      case 'fraud':              return <FraudDetection />;
      case 'audit':              return <AuditLogs />;
      case 'data-management':    return <DataManagement />;    // FIXED: now routed

      // Employer
      case 'employer-dashboard': return <EmployerDashboard  onNavigate={setPage} />;

      default:
        return <StudentDashboard onNavigate={setPage} />;
    }
  };

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  );
}