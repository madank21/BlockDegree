// FRONTEND/src/App.tsx
//
// FIXES applied (Audit Report §7):
//   FIX-1: Added 'data-management' page to PAGE_ACCESS with role ['admin']
//   FIX-2: Added DataManagement import and case in renderPage() switch
//   FIX-3: Added 'university' to PAGE_ACCESS roles where appropriate
//   FIX-4: University role redirects to 'degree-management' dashboard on login
//   FIX-5: Added 'university' to all appropriate PAGE_ACCESS role lists

import { useState, useEffect } from 'react';
import { useStore } from './useStore';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Layout';
import StudentDashboard from './pages/StudentDashboard';
import DocumentUpload from './pages/DocumentUpload';
import FaceVerification from './pages/FaceVerification';
import ApplyDegree from './pages/ApplyDegree';
import MyDegrees from './pages/MyDegrees';
import VerifyDegree from './pages/VerifyDegree';
import AdminDashboard from './pages/AdminDashboard';
import StudentsManagement from './pages/StudentsManagement';
import DegreeManagement from './pages/DegreeManagement';
import BlockchainView from './pages/BlockchainView';
import FraudDetection from './pages/FraudDetection';
import AuditLogs from './pages/AuditLogs';
import EmployerDashboard from './pages/EmployerDashboard';
import Profile from './pages/Profile';
// FIX-2: Import the DataManagement page (was missing, causing it to be unreachable)
import DataManagement from './pages/DataManagement';
import { AlertTriangle } from 'lucide-react';
import { UserRole } from './types';

// FIX-1 & FIX-3: Updated PAGE_ACCESS with 'university' role and 'data-management' page
const PAGE_ACCESS: Record<string, UserRole[]> = {
  // Student pages
  dashboard:           ['student'],
  documents:           ['student', 'university'],
  'face-verify':       ['student'],
  'apply-degree':      ['student'],
  'my-degrees':        ['student'],

  // Shared pages
  verify:              ['student', 'admin', 'employer', 'university'],
  profile:             ['student', 'admin', 'employer', 'university'],

  // Admin pages
  'admin-dashboard':   ['admin'],
  students:            ['admin'],
  'degree-management': ['admin', 'university'],
  blockchain:          ['admin', 'university'],
  fraud:               ['admin'],
  audit:               ['admin'],
  // FIX-1: data-management page added and restricted to admin
  'data-management':   ['admin'],

  // Employer pages
  'employer-dashboard': ['employer'],
};

export default function App() {
  const { currentUser } = useStore();
  const [page, setPage] = useState('landing');

  // Redirect to the appropriate dashboard after login / logout
  useEffect(() => {
    if (currentUser && (page === 'landing' || page === 'login' || page === 'register')) {
      setPage(dashboardForRole(currentUser.role));
    }
    if (!currentUser && !['landing', 'login', 'register'].includes(page)) {
      setPage('landing');
    }
  }, [currentUser]);

  // Public pages (no auth required)
  if (page === 'landing') return <Landing onNavigate={setPage} />;
  if (page === 'login')   return <Login   onNavigate={setPage} />;
  if (page === 'register') return <Register onNavigate={setPage} />;

  // Must be logged in to see anything below
  if (!currentUser) return <Landing onNavigate={setPage} />;

  // FIX-4: University role gets its own landing page (degree-management)
  function dashboardForRole(role: UserRole): string {
    if (role === 'admin')      return 'admin-dashboard';
    if (role === 'employer')   return 'employer-dashboard';
    if (role === 'university') return 'degree-management';
    return 'dashboard';
  }

  const renderPage = () => {
    const allowedRoles = PAGE_ACCESS[page];

    // Page not in the access map → redirect to the user's own dashboard
    if (!allowedRoles) {
      const dest = dashboardForRole(currentUser.role);
      // Avoid infinite loop if dashboard itself is unknown
      if (dest !== page) {
        setPage(dest);
        return null;
      }
      return <StudentDashboard onNavigate={setPage} />;
    }

    // Role not authorised for this page
    if (!allowedRoles.includes(currentUser.role)) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-md text-center">
            <AlertTriangle className="mx-auto mb-4 h-14 w-14 text-red-400" />
            <h2 className="text-xl font-bold text-red-400">Access Denied</h2>
            <p className="mt-2 text-sm text-gray-400">Your account role cannot open this page.</p>
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
      // Student pages
      case 'dashboard':           return <StudentDashboard onNavigate={setPage} />;
      case 'documents':           return <DocumentUpload />;
      case 'face-verify':         return <FaceVerification />;
      case 'apply-degree':        return <ApplyDegree onNavigate={setPage} />;
      case 'my-degrees':          return <MyDegrees />;

      // Shared pages
      case 'verify':              return <VerifyDegree />;
      case 'profile':             return <Profile />;

      // Admin pages
      case 'admin-dashboard':     return <AdminDashboard onNavigate={setPage} />;
      case 'students':            return <StudentsManagement />;
      case 'degree-management':   return <DegreeManagement />;
      case 'blockchain':          return <BlockchainView />;
      case 'fraud':               return <FraudDetection />;
      case 'audit':               return <AuditLogs />;
      // FIX-2: DataManagement page is now reachable
      case 'data-management':     return <DataManagement />;

      // Employer pages
      case 'employer-dashboard':  return <EmployerDashboard onNavigate={setPage} />;

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