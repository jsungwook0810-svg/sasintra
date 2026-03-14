import React, { useMemo } from 'react';

const InkWashTree = ({ season }: { season: 'spring' | 'summer' | 'autumn' | 'winter' }) => {
  const isSpring = season === 'spring';
  const isSummer = season === 'summer';
  const isAutumn = season === 'autumn';
  const isWinter = season === 'winter';

  return (
    <svg viewBox="0 0 200 200" className="fixed -bottom-4 -right-4 w-48 h-48 sm:w-72 sm:h-72 opacity-60 pointer-events-none z-0" style={{ filter: 'drop-shadow(0px 10px 10px rgba(0,0,0,0.05))' }}>
      <defs>
        <filter id="ink-wash" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" result="displaced" />
          <feGaussianBlur in="displaced" stdDeviation="1.5" result="blurred" />
          <feMerge>
            <feMergeNode in="blurred" />
            <feMergeNode in="SourceGraphic" opacity="0.4" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#ink-wash)">
        {/* Trunk - Ink brush style */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M100,190 Q95,140 100,100 Q105,70 120,40" stroke="#3f3f46" strokeWidth="7" opacity="0.85"/>
          <path d="M98,150 Q80,120 50,90" stroke="#3f3f46" strokeWidth="5" opacity="0.8"/>
          <path d="M100,120 Q120,100 140,80" stroke="#3f3f46" strokeWidth="4" opacity="0.75"/>
          <path d="M80,130 Q60,110 40,120" stroke="#3f3f46" strokeWidth="3" opacity="0.7"/>
          <path d="M110,90 Q130,70 150,60" stroke="#3f3f46" strokeWidth="2.5" opacity="0.65"/>
          <path d="M65,105 Q55,85 70,70" stroke="#3f3f46" strokeWidth="2" opacity="0.6"/>
          <path d="M125,90 Q140,100 155,95" stroke="#3f3f46" strokeWidth="2" opacity="0.6"/>
        </g>

        {/* Foliage - Watercolor style */}
        {isSpring && (
          <g style={{ mixBlendMode: 'multiply' }}>
            <circle cx="120" cy="40" r="28" fill="#fbcfe8" opacity="0.7" />
            <circle cx="100" cy="50" r="35" fill="#f9a8d4" opacity="0.6" />
            <circle cx="140" cy="60" r="22" fill="#f472b6" opacity="0.5" />
            <circle cx="50" cy="90" r="28" fill="#fbcfe8" opacity="0.7" />
            <circle cx="70" cy="75" r="25" fill="#f9a8d4" opacity="0.6" />
            <circle cx="145" cy="85" r="24" fill="#fbcfe8" opacity="0.7" />
            <circle cx="40" cy="120" r="18" fill="#f9a8d4" opacity="0.6" />
            <circle cx="85" cy="30" r="20" fill="#fbcfe8" opacity="0.6" />
          </g>
        )}
        {isSummer && (
          <g style={{ mixBlendMode: 'multiply' }}>
            <circle cx="120" cy="40" r="32" fill="#86efac" opacity="0.7" />
            <circle cx="100" cy="50" r="40" fill="#4ade80" opacity="0.6" />
            <circle cx="140" cy="60" r="28" fill="#22c55e" opacity="0.5" />
            <circle cx="50" cy="90" r="32" fill="#86efac" opacity="0.7" />
            <circle cx="70" cy="75" r="30" fill="#4ade80" opacity="0.6" />
            <circle cx="145" cy="85" r="28" fill="#86efac" opacity="0.7" />
            <circle cx="40" cy="120" r="22" fill="#4ade80" opacity="0.6" />
            <circle cx="85" cy="30" r="25" fill="#86efac" opacity="0.6" />
          </g>
        )}
        {isAutumn && (
          <g style={{ mixBlendMode: 'multiply' }}>
            <circle cx="120" cy="40" r="28" fill="#fdba74" opacity="0.7" />
            <circle cx="100" cy="50" r="35" fill="#fb923c" opacity="0.6" />
            <circle cx="140" cy="60" r="22" fill="#f97316" opacity="0.5" />
            <circle cx="50" cy="90" r="28" fill="#fdba74" opacity="0.7" />
            <circle cx="70" cy="75" r="25" fill="#fb923c" opacity="0.6" />
            <circle cx="145" cy="85" r="24" fill="#fdba74" opacity="0.7" />
            <circle cx="40" cy="120" r="18" fill="#fb923c" opacity="0.6" />
            <circle cx="85" cy="30" r="20" fill="#fdba74" opacity="0.6" />
          </g>
        )}
        {isWinter && (
          <g>
            <path d="M110,35 Q120,35 125,40" stroke="#e0f2fe" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.9"/>
            <path d="M85,45 Q95,45 105,55" stroke="#e0f2fe" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.9"/>
            <path d="M40,85 Q50,85 55,90" stroke="#e0f2fe" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.9"/>
            <path d="M130,75 Q140,75 145,80" stroke="#e0f2fe" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.9"/>
            <path d="M60,65 Q70,65 75,70" stroke="#e0f2fe" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.9"/>
          </g>
        )}
      </g>
    </svg>
  );
};

export default function SeasonalEffects() {
  const month = new Date().getMonth() + 1;

  const getSeason = () => {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  };

  const season = getSeason();

  const particles = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}vw`,
      animationDurationFall: `${Math.random() * 10 + 10}s`,
      animationDelayFall: `-${Math.random() * 20}s`,
      animationDurationSway: `${Math.random() * 3 + 2}s`,
      animationDelaySway: `-${Math.random() * 5}s`,
      size: `${Math.random() * 8 + 6}px`,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <InkWashTree season={season} />
      {season === 'spring' && particles.map(p => (
        <div
          key={p.id}
          className="petal"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            top: '-10%',
            animation: `fall ${p.animationDurationFall} linear infinite ${p.animationDelayFall}, sway ${p.animationDurationSway} ease-in-out infinite alternate ${p.animationDelaySway}`
          }}
        />
      ))}
      {month >= 6 && month <= 8 && (
        <div className="absolute bottom-0 left-0 w-full h-[120px] sm:h-[150px]">
          <div className="wave"></div>
          <div className="wave"></div>
        </div>
      )}
      {month >= 9 && month <= 11 && particles.map(p => (
        <div
          key={p.id}
          className="leaf"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            top: '-10%',
            animation: `fall ${p.animationDurationFall} linear infinite ${p.animationDelayFall}, spin ${p.animationDurationSway} linear infinite ${p.animationDelaySway}`
          }}
        />
      ))}
      {month < 3 || month > 11 ? [...particles, ...particles.map(p => ({...p, id: p.id + 100, left: `${Math.random() * 100}vw`}))].map(p => (
        <div
          key={p.id}
          className="snow"
          style={{
            left: p.left,
            width: `${parseFloat(p.size) * 0.8}px`,
            height: `${parseFloat(p.size) * 0.8}px`,
            top: '-10%',
            animation: `fall ${p.animationDurationFall} linear infinite ${p.animationDelayFall}, sway ${p.animationDurationSway} ease-in-out infinite alternate ${p.animationDelaySway}`
          }}
        />
      )) : null}
    </div>
  );
}
