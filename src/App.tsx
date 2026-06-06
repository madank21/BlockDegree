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
import { AlertTriangle } from 'lucide-react';
import { UserRole } from './types';

const PAGE_ACCESS: Record<string, UserRole[]> = {
  dashboard: ['student'],
  documents: ['student'],
  'face-verify': ['student'],
  'apply-degree': ['student'],
  'my-degrees': ['student'],
  verify: ['student', 'admin', 'employer'],
  profile: ['student', 'admin', 'employer'],
  'admin-dashboard': ['admin'],
  students: ['admin'],
  'degree-management': ['admin'],
  blockchain: ['admin'],
  fraud: ['admin'],
  audit: ['admin'],
  'employer-dashboard': ['employer'],
};

export default function App() {
  const { currentUser } = useStore();
  const [page, setPage] = useState('landing');

  // Redirect to appropriate dashboard on login state change
  useEffect(() => {
    if (currentUser && (page === 'landing' || page === 'login' || page === 'register')) {
      if (currentUser.role === 'admin') setPage('admin-dashboard');
      else if (currentUser.role === 'employer') setPage('employer-dashboard');
      else setPage('dashboard');
    }
    if (!currentUser && !['landing', 'login', 'register'].includes(page)) {
      setPage('landing');
    }
  }, [currentUser]);

  // Public pages
  if (page === 'landing') return <Landing onNavigate={setPage} />;
  if (page === 'login') return <Login onNavigate={setPage} />;
  if (page === 'register') return <Register onNavigate={setPage} />;

  // Protected pages
  if (!currentUser) return <Landing onNavigate={setPage} />;

  const dashboardForRole = (role: UserRole) => {
    if (role === 'admin') return 'admin-dashboard';
    if (role === 'employer') return 'employer-dashboard';
    return 'dashboard';
  };

  const renderPage = () => {
    const allowedRoles = PAGE_ACCESS[page];

    if (!allowedRoles) {
      if (currentUser.role === 'admin') return <AdminDashboard onNavigate={setPage} />;
      if (currentUser.role === 'employer') return <EmployerDashboard onNavigate={setPage} />;
      return <StudentDashboard onNavigate={setPage} />;
    }

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
      case 'dashboard': return <StudentDashboard onNavigate={setPage} />;
      case 'documents': return <DocumentUpload />;
      case 'face-verify': return <FaceVerification />;
      case 'apply-degree': return <ApplyDegree onNavigate={setPage} />;
      case 'my-degrees': return <MyDegrees />;
      case 'verify': return <VerifyDegree />;
      case 'admin-dashboard': return <AdminDashboard onNavigate={setPage} />;
      case 'students': return <StudentsManagement />;
      case 'degree-management': return <DegreeManagement />;
      case 'blockchain': return <BlockchainView />;
      case 'fraud': return <FraudDetection />;
      case 'audit': return <AuditLogs />;
      case 'employer-dashboard': return <EmployerDashboard onNavigate={setPage} />;
      case 'profile': return <Profile />;
      default: return <StudentDashboard onNavigate={setPage} />;
    }
  };

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  );
}
