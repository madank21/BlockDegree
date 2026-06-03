import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Blocks, LayoutDashboard, GraduationCap, Shield, Search, FileWarning,
  ScrollText, LogOut, Menu, X, FileCheck, Users, Activity
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { currentUser, logout } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!currentUser) return null;

  type NavItem = { id: string; label: string; icon: React.ReactNode; roles: string[] };

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['admin', 'university', 'student', 'employer'] },
    { id: 'degrees', label: 'Degrees', icon: <GraduationCap className="w-5 h-5" />, roles: ['admin', 'university', 'student'] },
    { id: 'issue', label: 'Issue Degree', icon: <FileCheck className="w-5 h-5" />, roles: ['university'] },
    { id: 'verify', label: 'Verify Degree', icon: <Search className="w-5 h-5" />, roles: ['employer', 'admin'] },
    { id: 'ocr-verify', label: 'OCR Verification', icon: <Shield className="w-5 h-5" />, roles: ['employer'] },
    { id: 'fraud', label: 'Fraud Detection', icon: <FileWarning className="w-5 h-5" />, roles: ['admin', 'employer'] },
    { id: 'blockchain', label: 'Blockchain', icon: <Blocks className="w-5 h-5" />, roles: ['admin', 'university'] },
    { id: 'audit', label: 'Audit Logs', icon: <ScrollText className="w-5 h-5" />, roles: ['admin'] },
    { id: 'users', label: 'Users', icon: <Users className="w-5 h-5" />, roles: ['admin'] },
    { id: 'analytics', label: 'Analytics', icon: <Activity className="w-5 h-5" />, roles: ['admin'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(currentUser.role));

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    university: 'University',
    student: 'Student',
    employer: 'Employer',
  };

  const roleBadgeColors: Record<string, string> = {
    admin: 'bg-red-500/20 text-red-400',
    university: 'bg-blue-500/20 text-blue-400',
    student: 'bg-green-500/20 text-green-400',
    employer: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
        {/* Logo */}
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center">
                <Blocks className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">BlockDegree</h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Verification System</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNav.map(item => (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                currentPage === item.id
                  ? 'bg-cyan-500/15 text-cyan-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${roleBadgeColors[currentUser.role]}`}>
                {roleLabels[currentUser.role]}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-16 bg-gray-900/80 border-b border-gray-800 flex items-center px-4 lg:px-8 backdrop-blur sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 mr-4 cursor-pointer">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white capitalize">
              {navItems.find(n => n.id === currentPage)?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Ethereum Connected
            </div>
            <div className="text-xs text-gray-600 font-mono hidden md:block">
              {currentUser.walletAddress.slice(0, 6)}...{currentUser.walletAddress.slice(-4)}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
