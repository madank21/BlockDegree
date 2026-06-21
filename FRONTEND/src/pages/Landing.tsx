import { motion } from 'framer-motion';
import {
  Shield, GraduationCap, Fingerprint, FileSearch, Link2, QrCode,
  ArrowRight, CheckCircle2, Lock, Database,
  Zap, Users
} from 'lucide-react';

interface LandingProps {
  onNavigate: (page: string) => void;
}

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

export default function Landing({ onNavigate }: LandingProps) {
  const features = [
    { icon: Fingerprint, title: 'Identity Verification', desc: 'OCR extraction, document-quality checks, and live camera capture support student verification.', color: 'from-blue-500 to-cyan-500' },
    { icon: Link2, title: 'Cryptographic Attestation', desc: 'Every issued degree is hashed into a verifiable local attestation record.', color: 'from-purple-500 to-pink-500' },
    { icon: FileSearch, title: 'Document Validation', desc: 'Browser-based document analysis checks layout, resolution, lighting, and text-density signals.', color: 'from-orange-500 to-red-500' },
    { icon: QrCode, title: 'Instant QR Verification', desc: 'Each issued degree contains a unique QR code for fast employer verification.', color: 'from-green-500 to-emerald-500' },
    { icon: Database, title: 'Browser Persistence', desc: 'Local storage keeps demo records available between sessions on the same browser.', color: 'from-yellow-500 to-orange-500' },
    { icon: Lock, title: 'Fraud Detection', desc: 'Rule-based fraud checks catch duplicate CNICs, missing documents, and academic data anomalies.', color: 'from-red-500 to-rose-500' },
  ];

  const stats = [
    { value: '15,234+', label: 'Degrees Issued', icon: GraduationCap },
    { value: '99.7%', label: 'Fraud Prevention', icon: Shield },
    { value: '<2s', label: 'Verification Time', icon: Zap },
    { value: '100%', label: 'Hash Attested', icon: Link2 },
  ];

  const steps = [
    { step: '01', title: 'Register', desc: 'Sign up with your official university email', icon: Users },
    { step: '02', title: 'Verify Identity', desc: 'Upload documents and complete face verification', icon: Fingerprint },
    { step: '03', title: 'Apply for Degree', desc: 'Submit your degree application after approval', icon: FileSearch },
    { step: '04', title: 'Attestation Issuance', desc: 'Your degree is hashed into a verification record', icon: Link2 },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">BlockDegree</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#how-it-works" className="hover:text-white transition">How it Works</a>
            <a href="#tech" className="hover:text-white transition">Technology</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => onNavigate('login')} className="px-4 py-2 text-sm text-gray-300 hover:text-white transition">
              Sign In
            </button>
            <button onClick={() => onNavigate('register')} className="px-5 py-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg font-medium transition">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16 min-h-screen flex items-center">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 via-gray-950 to-gray-950" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px]" />
          {/* Animated grid */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div {...fadeUp}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Browser-based degree attestation demo
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold leading-tight mb-6">
              <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">Secure Your</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">Academic Legacy</span>
            </h1>
            <p className="text-lg text-gray-400 mb-8 max-w-lg leading-relaxed">
              AI-assisted degree attestation, identity verification, and digital degree management with verifiable hashes and QR lookup.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => onNavigate('register')} className="group px-8 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2">
                Start Verification <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => onNavigate('login')} className="px-8 py-3.5 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-xl font-medium transition">
                Verify a Degree
              </button>
            </div>

            <div className="flex items-center gap-6 mt-10">
              {[
                'SHA-256 Encrypted',
                'OCR Extracted',
                'Rule Checked',
              ].map((badge, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  {badge}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl" />
              <div className="relative bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-3 text-xs text-gray-500 font-mono">attestation.ts</span>
                </div>
                <pre className="text-sm font-mono text-gray-400 leading-relaxed overflow-hidden">
                  <code>{`function createAttestation(degree) {
  const degreeId =
    \`IQRA-\${degree.departmentCode}-\${degree.year}\`;

  const payload = JSON.stringify({
    degreeId,
    studentName: degree.studentName,
    registrationNumber: degree.registrationNumber,
    program: degree.program,
    cgpa: degree.cgpa,
  });

  return {
    degreeId,
    degreeHash: sha256(payload),
    qrCodeData: \`/verify/\${degreeId}\`,
  };
}`}</code>
                </pre>
              </div>

              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-6 -right-6 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-2 backdrop-blur"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400 font-medium">Verified ✓</span>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -bottom-4 -left-6 bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-2 backdrop-blur"
              >
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-400 font-medium">Block #15,234</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <s.icon className="w-8 h-8 text-blue-400 mx-auto mb-3" />
              <p className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-blue-400 text-sm font-medium uppercase tracking-wider">Core Features</span>
            <h2 className="text-4xl lg:text-5xl font-bold mt-3 mb-4">Enterprise-Grade Security</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Multi-layered verification combining OCR, browser checks, fraud rules, and cryptographic hashes for degree authentication.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group bg-gray-900/50 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-purple-400 text-sm font-medium uppercase tracking-wider">Process</span>
            <h2 className="text-4xl lg:text-5xl font-bold mt-3 mb-4">How It Works</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">From registration to degree attestation in four streamlined steps.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-blue-500/50 to-transparent z-0" />
                )}
                <div className="relative bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center hover:border-blue-500/30 transition">
                  <div className="text-4xl font-bold text-blue-500/20 mb-2">{s.step}</div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                    <s.icon className="w-7 h-7 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-400">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section id="tech" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-cyan-400 text-sm font-medium uppercase tracking-wider">Technology</span>
            <h2 className="text-4xl lg:text-5xl font-bold mt-3 mb-4">Built with the Best</h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Ethereum', desc: 'Blockchain', icon: '⟠' },
              { name: 'Solidity', desc: 'Smart Contracts', icon: '📝' },
              { name: 'React.js', desc: 'Frontend', icon: '⚛️' },
              { name: 'Node.js', desc: 'Backend', icon: '🟢' },
              { name: 'SupaBase', desc: 'Database', icon: '🍃' },
              { name: 'YOLOv8', desc: 'Document AI', icon: '👁️' },
              { name: 'DeepFace', desc: 'Face Recognition', icon: '🧑' },
              { name: 'Tesseract', desc: 'OCR Engine', icon: '📖' },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 text-center hover:border-gray-700 transition group"
              >
                <div className="text-3xl mb-2">{t.icon}</div>
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-gray-500">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl blur-3xl" />
              <div className="relative bg-gray-900/80 border border-gray-800 rounded-3xl p-12 lg:p-16">
                <GraduationCap className="w-16 h-16 text-blue-400 mx-auto mb-6" />
                <h2 className="text-3xl lg:text-4xl font-bold mb-4">Ready to Secure Your Credentials?</h2>
                <p className="text-gray-400 mb-8 max-w-lg mx-auto">Manage academic credentials with hash-based verification, QR lookup, and a clear path to production integrations.</p>
                <div className="flex flex-wrap justify-center gap-4">
                  <button onClick={() => onNavigate('register')} className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2">
                    Get Started Now <ArrowRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => onNavigate('login')} className="px-8 py-3.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-medium transition">
                    Sign In
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">BlockDegree</span>
            </div>
            <p className="text-sm text-gray-500">© 2026 BlockDegree — AI-Enhanced Blockchain Degree Attestation System</p>
            <div className="flex gap-6 text-sm text-gray-500">
              <span>Iqra University</span>
              <span>CCP Project</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
