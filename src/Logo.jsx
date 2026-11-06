// Melkeruten-merket «Nordlysbue»: et fly som stiger ut av nordlysbånd.
const PLANE = 'M0 -9 L1.6 -3.2 L8.5 1.2 L8.5 3.2 L1.6 1.3 L1.1 6.2 L3.2 8 L3.2 9.2 L0 8.4 L-3.2 9.2 L-3.2 8 L-1.1 6.2 L-1.6 1.3 L-8.5 3.2 L-8.5 1.2 L-1.6 -3.2 Z';

export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="mr-aurora" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#22D3C5" />
          <stop offset="0.6" stopColor="#3DF5A6" />
          <stop offset="1" stopColor="#C9FBE2" />
        </linearGradient>
      </defs>
      <path d="M10 62 C26 40 44 60 62 40" fill="none" stroke="#3DF5A6" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 86 C36 62 58 88 86 52" fill="none" stroke="#8B7CF6" strokeOpacity="0.8" strokeWidth="4" strokeLinecap="round" />
      <path d="M12 75 C32 46 52 78 76 38" fill="none" stroke="url(#mr-aurora)" strokeWidth="7" strokeLinecap="round" />
      <path transform="translate(81 30) rotate(32) scale(1.2)" fill="#FFFFFF" d={PLANE} />
    </svg>
  );
}
