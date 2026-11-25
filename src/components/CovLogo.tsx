/**
 * CoV 확정 로고(2026-11-25). 원본: cov-team/cov-web docs/brand/
 * 형태를 고치지 않는다. 색은 className의 text-* 로 한 가지만 준다(부분 색 변경 금지).
 * 크기 규칙(cov-web docs/brand/LOGO.md): 글자+모양은 SVG 높이 49px 이상, 글자는 41px 이상.
 */
type LogoProps = { className?: string };

/** 글자+모양(combination). 넓은 화면 헤더용 */
export function CovLogoCombination({ className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-221.67 -71.08 523.48 242.11"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <g fill="currentColor"><g transform="translate(-228.68 -65.46) scale(0.5921)"><path d="M265.22 85.17A120.00 120.00 0 1 0 308.71 272.09L289.38 233.96A82.00 83.90 0 1 1 246.67 116.83Z"/><path d="M237.05 251.73L333.27 87.47L290.99 87.47L220.73 207.40L199.95 166.38L159.06 166.38L203.37 253.86A58.60 60.50 0 0 0 237.05 251.73Z"/></g><path d="M81.22 9.04A51.50 51.50 0 1 0 82.69 89.79A42.50 42.50 0 0 1 76.06 67.00L73.94 67.00A29.00 30.12 0 1 1 72.16 30.57Z"/><path fillRule="evenodd" d="M153.06 67.00A34.50 34.50 0 1 0 84.06 67.00A34.50 34.50 0 1 0 153.06 67.00ZM132.56 67.00A14.00 15.03 0 1 0 104.56 67.00A14.00 15.03 0 1 0 132.56 67.00Z"/><path d="M200.86 100.00L251.52 0.00L227.30 0.00L190.90 71.85L173.43 37.36L149.21 37.36L180.95 100.00Z"/></g>
    </svg>
  );
}

/** 글자(wordmark). 휴대폰 헤더처럼 폭이 좁은 자리용 */
export function CovLogoWordmark({ className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-51.52 -51.5 353.04 203"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <g fill="currentColor"><path d="M81.22 9.04A51.50 51.50 0 1 0 82.69 89.79A42.50 42.50 0 0 1 76.06 67.00L73.94 67.00A29.00 30.12 0 1 1 72.16 30.57Z"/><path fillRule="evenodd" d="M153.06 67.00A34.50 34.50 0 1 0 84.06 67.00A34.50 34.50 0 1 0 153.06 67.00ZM132.56 67.00A14.00 15.03 0 1 0 104.56 67.00A14.00 15.03 0 1 0 132.56 67.00Z"/><path d="M200.86 100.00L251.52 0.00L227.30 0.00L190.90 71.85L173.43 37.36L149.21 37.36L180.95 100.00Z"/></g>
    </svg>
  );
}
