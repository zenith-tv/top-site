import { cn } from '@/lib/utils';

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 400 200"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-primary", className)}
      {...props}
    >
      <style>
        {`
          .heavy-font {
            font-family: 'Archivo', sans-serif;
            font-weight: 900;
            fill: white;
            letter-spacing: -2px;
          }
          .light-font {
            font-family: 'Archivo', sans-serif;
            font-weight: 500;
            fill: white;
          }
          .exclamation-mark {
            font-family: 'Archivo', sans-serif;
            font-weight: 900;
            fill: currentColor;
          }
          .arrow-shape {
            fill: currentColor;
          }
          .dot-shape {
            fill: currentColor;
          }
        `}
      </style>
      <g transform="translate(10, 20)">
        <text x="120" y="45" className="light-font" fontSize="40">LE</text>
        <path d="M 20 80 L 150 50 L 150 110 L 20 80 Z" className="arrow-shape" />
        <text x="50" y="100" className="heavy-font" fontSize="60">TOP</text>
        <text x="140" y="150" className="heavy-font" fontSize="80">ZEN</text>
        <g transform="translate(260, 80)">
            <text className="exclamation-mark" fontSize="80">!</text>
        </g>
        <text x="295" y="150" className="heavy-font" fontSize="80">TH</text>
      </g>
    </svg>
  );
}
