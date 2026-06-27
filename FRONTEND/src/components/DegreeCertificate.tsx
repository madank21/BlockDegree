/**
 * DegreeCertificate.tsx
 *
 * SETUP — run once in the FRONTEND directory:
 *   npm install qr-code-styling
 *
 * The QR seal uses qr-code-styling (same library as the HTML reference):
 *   - dotsOptions:          type "rounded",       color #8B5CF6 (purple)
 *   - cornersSquareOptions: type "extra-rounded",  color #8B5CF6
 *   - cornersDotOptions:    type "dot",            color #8B5CF6
 *   - white rounded-rect card behind the QR
 *   - purple circle container with 3 camera-shutter white lines (exactly as in the HTML)
 *
 * PRINT FIX — usePrintStyle():
 *   Injects @page { size: A4 landscape; margin: 0 } + @media print rules
 *   so the 960×680 canvas always prints on exactly one page.
 */

import { useEffect, useRef } from 'react';
import { DegreeApplication, User } from '../types';
import universityLogo from '../assets/logo.jpeg';

// qr-code-styling is CJS — Vite pre-bundles it automatically, no config needed.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import QRCodeStyling from 'qr-code-styling';

interface Props {
  degree: DegreeApplication;
  user: User;
}

// ─── Print style ──────────────────────────────────────────────────────────────
const PRINT_STYLE_ID = 'degree-cert-print-style';

function usePrintStyle() {
  useEffect(() => {
    if (document.getElementById(PRINT_STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = PRINT_STYLE_ID;
    el.textContent = `
      @page { size: A4 landscape; margin: 0; }
      @media print {
        html, body {
          margin: 0 !important; padding: 0 !important;
          width: 100% !important; height: 100% !important;
          overflow: hidden !important;
          background: #fdf8ef !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body > *:not(#degree-cert-print-root) { display: none !important; }
        #degree-cert-print-root {
          display: block !important;
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important; height: 100vh !important;
          overflow: hidden !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        #degree-cert-print-root > div {
          transform: scale(var(--cert-print-scale, 1)) !important;
          transform-origin: top left !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      }
    `;
    document.head.appendChild(el);
    return () => { document.getElementById(PRINT_STYLE_ID)?.remove(); };
  }, []);
}

// ─── Styled QR seal (mirrors the HTML reference exactly) ─────────────────────
interface SealProps { value: string; }

function QRSeal({ value }: SealProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!qrRef.current || !value) return;

    // Clear any previous render (strict mode / value change)
    qrRef.current.innerHTML = '';

    const qr = new QRCodeStyling({
      width: 150,
      height: 150,
      type: 'svg',
      data: value,
      margin: 0,
      qrOptions: { errorCorrectionLevel: 'H' },
      dotsOptions: {
        color: '#8B5CF6',
        type: 'rounded',          // ← rounded dots like the reference
      },
      cornersSquareOptions: {
        type: 'extra-rounded',    // ← large rounded finder squares
        color: '#8B5CF6',
      },
      cornersDotOptions: {
        type: 'dot',              // ← small dot inside finder square
        color: '#8B5CF6',
      },
      backgroundOptions: {
        color: '#ffffff',
      },
    });

    qr.append(qrRef.current);
  }, [value]);

  // Circle diameter — matches the HTML .qr-background 300px scaled to fit cert
  const circleSize = 160;
  const cardSize   = 124; // white card inside circle
  const qrSize     = 150; // rendered QR (clips to card)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* ── Purple circle with camera-shutter lines (exact replica of HTML) ── */}
      <div
        style={{
          position: 'relative',
          width:  `${circleSize}px`,
          height: `${circleSize}px`,
          borderRadius: '50%',
          background: '#8B5CF6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 4px 18px rgba(139,92,246,0.5), 0 1px 4px rgba(139,92,246,0.3)',
        }}
      >
        {/* Camera shutter — 3 white bars rotated 0°, 60°, 120° */}
        {[0, 60, 120].map((deg) => (
          <div
            key={deg}
            style={{
              position: 'absolute',
              width: `${circleSize}px`,
              height: '5px',
              background: 'rgba(255,255,255,0.35)',
              left: '50%',
              top: '50%',
              transformOrigin: 'left center',
              transform: `translate(-50%, -50%) rotate(${deg}deg)`,
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* White rounded card behind QR */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            width:  `${cardSize}px`,
            height: `${cardSize}px`,
            background: '#ffffff',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            padding: '6px',
          }}
        >
          {/* qr-code-styling mounts here */}
          <div
            ref={qrRef}
            style={{
              width:  `${qrSize}px`,
              height: `${qrSize}px`,
              // Scale down the 150px QR to fit the 112px inner area
              transform: `scale(${(cardSize - 12) / qrSize})`,
              transformOrigin: 'center',
              flexShrink: 0,
            }}
          />
        </div>
      </div>

      {/* Label below the seal */}
      <p
        style={{
          marginTop: '5px',
          fontSize: '7px',
          fontFamily: 'monospace',
          color: '#8B5CF6',
          letterSpacing: '0.12em',
          fontWeight: 700,
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
      >
        Blockchain Verified
      </p>
    </div>
  );
}

// ─── Placeholder seal when QR value not yet available ────────────────────────
function QRSealPlaceholder() {
  return (
    <div
      style={{
        width: '140px', height: '140px',
        borderRadius: '50%',
        background: '#8B5CF6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 18px rgba(139,92,246,0.4)',
      }}
    >
      <div
        style={{
          width: '108px', height: '108px',
          background: '#fff',
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <p style={{ fontSize: '8px', color: '#8B5CF6', fontFamily: 'monospace', textAlign: 'center', padding: '6px' }}>
          Hash pending…
        </p>
      </div>
    </div>
  );
}

// ─── Main certificate ─────────────────────────────────────────────────────────
export default function DegreeCertificate({ degree, user }: Props) {
  usePrintStyle();

  const qrValue =
    degree.qrCodeData   ||
    degree.blockchainTxHash ||
    degree.degreeHash    ||
    degree.degreeId      ||
    '';

  // Scale 960×680 → A4 landscape (1122×794 at 96 dpi)
  const printScale = Math.min(1122 / 960, 794 / 680).toFixed(4); // ≈ 1.167

  return (
    <div id="degree-cert-print-root">
      <div
        id={`degree-certificate-${degree.id}`}
        className="relative overflow-hidden bg-[#fdf8ef] text-black"
        style={{
          width: '960px',
          height: '680px',
          fontFamily: "'Georgia', 'Times New Roman', serif",
          ['--cert-print-scale' as string]: printScale,
        }}
      >
        {/* Triple border */}
        <div className="absolute inset-0 border-[6px] border-[#6b4c11]" />
        <div className="absolute inset-[7px] border-[2px] border-[#a07830]" />
        <div className="absolute inset-[11px] border-[1px] border-[#c49a40]" />

        {/* Corner ornaments */}
        {['top-[14px] left-[14px]','top-[14px] right-[14px]','bottom-[14px] left-[14px]','bottom-[14px] right-[14px]'].map((pos, i) => (
          <div key={i} className={`absolute ${pos} w-7 h-7`}>
            <svg viewBox="0 0 28 28" fill="none">
              <path d="M2 2 L12 2 L2 12 Z" fill="#8B5E0A" />
              <path d="M14 14 L26 14 L26 26 Z" fill="#C49A40" opacity="0.5" />
              <circle cx="14" cy="14" r="3" fill="#8B5E0A" />
            </svg>
          </div>
        ))}

        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.045 }}>
          <img src={universityLogo} alt="" className="w-72 h-72 object-contain" />
        </div>

        {/* ── Content ── */}
        <div className="relative h-full flex flex-col px-16 pt-7 pb-5">

          {/* Serial / Reg row */}
          <div className="flex justify-between text-[10px] tracking-wide text-[#4a3000] mb-2 font-mono">
            <span>Serial No. {degree.certificateNumber || (degree.degreeId ? degree.degreeId.slice(0,6).toUpperCase() : '------')}</span>
            <span>Registration No. {user.registrationNumber || user.studentId || user.student_id || '---'}</span>
          </div>

          {/* Rule 1 */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#8B5E0A] to-[#C49A40]" />
            <div className="w-1.5 h-1.5 rotate-45 bg-[#8B5E0A]" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#8B5E0A] to-[#C49A40]" />
          </div>

          {/* Logo + name */}
          <div className="flex flex-col items-center mb-2">
            <img
              src={universityLogo}
              alt="Iqra University"
              className="w-14 h-14 object-contain mb-1.5"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(107,76,17,0.3))' }}
            />
            <h1
              className="text-[32px] text-[#2c1a00] tracking-wide leading-none mb-0.5"
              style={{ fontFamily: "'Palatino Linotype','Book Antiqua',Palatino,Georgia,serif", fontWeight: 400 }}
            >
              Iqra University
            </h1>
            <p className="text-[10px] text-[#6b4c11] uppercase" style={{ letterSpacing: '0.22em' }}>
              Islamic Republic of Pakistan
            </p>
          </div>

          {/* Rule 2 */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-[#c49a40]" />
            <svg width="14" height="14" viewBox="0 0 16 16" fill="#8B5E0A">
              <polygon points="8,0 10,6 16,6 11,10 13,16 8,12 3,16 5,10 0,6 6,6" />
            </svg>
            <div className="flex-1 h-px bg-[#c49a40]" />
          </div>

          {/* Certificate body */}
          <div className="flex-1 flex flex-col items-center text-center">
            <p className="text-[11px] tracking-[0.15em] text-[#4a3000] mb-1.5 italic">
              Be it known that
            </p>

            <h2
              className="text-[27px] text-[#1a0d00] leading-tight mb-1"
              style={{ fontFamily: "'Palatino Linotype','Book Antiqua',Palatino,Georgia,serif", fontStyle: 'italic', fontWeight: 700 }}
            >
              {user.name}
            </h2>

            {user.fatherName && (
              <p className="text-[11px] text-[#4a3000] italic mb-2">
                S/o or D/o{' '}
                <span className="font-bold not-italic" style={{ fontFamily: "'Palatino Linotype',Palatino,Georgia,serif" }}>
                  {user.fatherName}
                </span>
              </p>
            )}

            <p className="text-[11px] text-[#3a2800] italic mb-1">
              having satisfied in full the requirements for the degree of
            </p>

            <h3
              className="text-[21px] text-[#1a0d00] leading-tight mb-1.5 px-4"
              style={{ fontFamily: "'Palatino Linotype','Book Antiqua',Palatino,Georgia,serif", fontStyle: 'italic', fontWeight: 700 }}
            >
              {degree.degreeTitle}
            </h3>

            <p className="text-[10px] text-[#4a3000] mb-2 tracking-wide">
              {degree.program && <span className="italic">{degree.program}</span>}
              {degree.program && degree.department && ' — '}
              {degree.department && <span>Department of {degree.department}</span>}
            </p>

            <p className="text-[11px] text-[#3a2800] italic mb-1">
              has been admitted to that degree on{' '}
              <span className="font-semibold not-italic">
                {degree.graduation_date
                  ? new Date(degree.graduation_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
                  : degree.graduationYear ? `${degree.graduationYear}` : '—'}
              </span>
            </p>

            <p className="text-[10px] text-[#4a3000] italic mb-1">
              with all the rights, privileges, and honours pertaining thereto.
            </p>

            {degree.cgpa ? (
              <p className="text-[10px] text-[#6b4c11] font-mono tracking-wider">
                CGPA: {degree.cgpa}{degree.department ? ` — ${degree.department}` : ''}
              </p>
            ) : null}

            <p className="text-[10px] text-[#3a2800] italic mt-2">
              In witness whereof, this degree is granted bearing the following signatures and the seal of the University.
            </p>

            <p className="text-[11px] text-[#3a2800] mt-2 italic">
              Given this{' '}
              <span className="font-semibold not-italic">
                {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </p>
          </div>

          {/* ── Footer: signatures + QR seal ── */}
          <div className="mt-3 flex items-end justify-between">

            <div className="text-center w-36">
              <div className="h-9 mb-1 flex items-end justify-center">
                <div className="w-28 h-px bg-[#4a3000]" />
              </div>
              <p className="text-[10px] text-[#3a2800] tracking-wide">Chancellor</p>
            </div>

            <div className="text-center w-36">
              <div className="h-9 mb-1 flex items-end justify-center">
                <div className="w-28 h-px bg-[#4a3000]" />
              </div>
              <p className="text-[10px] text-[#3a2800] tracking-wide">Registrar</p>
            </div>

            <div className="text-center w-36">
              <div className="h-9 mb-1 flex items-end justify-center">
                <div className="w-28 h-px bg-[#4a3000]" />
              </div>
              <p className="text-[10px] text-[#3a2800] tracking-wide">President</p>
            </div>

            {/* QR seal — bottom-right, replacing the gold embossed circle */}
            <div className="flex items-end pb-1">
              {qrValue ? <QRSeal value={qrValue} /> : <QRSealPlaceholder />}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}