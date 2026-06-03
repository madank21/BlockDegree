import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import LoginPage from './components/LoginPage';
import Layout from './components/Layout';
import AdminDashboard from './components/dashboards/AdminDashboard';
import UniversityDashboard from './components/dashboards/UniversityDashboard';
import StudentDashboard from './components/dashboards/StudentDashboard';
import EmployerDashboard from './components/dashboards/EmployerDashboard';
import IssueDegree from './components/pages/IssueDegree';
import VerifyDegree from './components/pages/VerifyDegree';
import OCRVerification from './components/pages/OCRVerification';
import DegreesPage from './components/pages/DegreesPage';
import FraudDetection from './components/pages/FraudDetection';
import BlockchainPage from './components/pages/BlockchainPage';
import AuditLogs from './components/pages/AuditLogs';
import UsersPage from './components/pages/UsersPage';
import AnalyticsPage from './components/pages/AnalyticsPage';

function AppContent() {
  const { currentUser } = useApp();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!currentUser) {
    return <LoginPage />;
  }

  const renderDashboard = () => {
    switch (currentUser.role) {
      case 'admin': return <AdminDashboard />;
      case 'university': return <UniversityDashboard />;
      case 'student': return <StudentDashboard />;
      case 'employer': return <EmployerDashboard onNavigate={setCurrentPage} />;
      default: return <AdminDashboard />;
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return renderDashboard();
      case 'degrees': return <DegreesPage />;
      case 'issue': return <IssueDegree />;
      case 'verify': return <VerifyDegree />;
      case 'ocr-verify': return <OCRVerification />;
      case 'fraud': return <FraudDetection />;
      case 'blockchain': return <BlockchainPage />;
      case 'audit': return <AuditLogs />;
      case 'users': return <UsersPage />;
      case 'analytics': return <AnalyticsPage />;
      default: return renderDashboard();
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
