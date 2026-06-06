import { useState } from 'react';
import { useStore } from '../useStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, GraduationCap, Menu, X, LogOut, User, ChevronDown,
  LayoutDashboard, FileText, ScanFace, CheckCircle, Link2, AlertTriangle,
  ClipboardList, Search, Users
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { currentUser, logout } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const studentLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'documents', label: 'Document Upload', icon: FileText },
    { id: 'face-verify', label: 'Face Verification', icon: ScanFace },
    { id: 'apply-degree', label: 'Apply for Degree', icon: GraduationCap },
    { id: 'my-degrees', label: 'My Degrees', icon: CheckCircle },
    { id: 'verify', label: 'Verify Degree', icon: Search },
  ];

  const adminLinks = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'degree-management', label: 'Degree Management', icon: GraduationCap },
    { id: 'blockchain', label: 'Blockchain', icon: Link2 },
    { id: 'fraud', label: 'Fraud Detection', icon: AlertTriangle },
    { id: 'audit', label: 'Audit Logs', icon: ClipboardList },
    { id: 'verify', label: 'Verify Degree', icon: Search },
  ];

  const employerLinks = [
    { id: 'employer-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'verify', label: 'Verify Degree', icon: Search },
  ];

  const links = currentUser?.role === 'admin' ? adminLinks : currentUser?.role === 'employer' ? employerLinks : studentLinks;

  const handleLogout = () => {
    logout();
    onNavigate('landing');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800 transform transition-transform duration-300 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 p-6 border-b border-gray-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">BlockDegree</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Blockchain Attestation</p>
          </div>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {links.map(link => (
            <button
              key={link.id}
              onClick={() => { onNavigate(link.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                currentPage === link.id
                  ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-400 border border-blue-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-4 border border-blue-800/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-medium">Blockchain Active</span>
            </div>
            <p className="text-[11px] text-gray-500">Ethereum Private Network</p>
            <p className="text-[11px] text-gray-500">Block #15,234</p>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-gray-800 rounded-lg">
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div>
                <h2 className="font-semibold text-white capitalize">{currentPage.replace(/-/g, ' ')}</h2>
                <p className="text-xs text-gray-500">Iqra University Degree Attestation System</p>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-800/50 transition"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                  {currentUser?.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium">{currentUser?.name}</p>
                  <p className="text-[10px] text-gray-500 uppercase">{currentUser?.role}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden"
                  >
                    <div className="p-4 border-b border-gray-800">
                      <p className="font-medium text-sm">{currentUser?.name}</p>
                      <p className="text-xs text-gray-500">{currentUser?.email}</p>
                    </div>
                    <div className="p-2">
                      <button onClick={() => { onNavigate('profile'); setProfileOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
                        <User className="w-4 h-4" /> Profile
                      </button>
                      <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition">
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
