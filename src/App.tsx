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

  const renderPage = () => {
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
