import React, { useMemo } from 'react';

export default function SeasonalEffects() {
  const month = new Date().getMonth() + 1;

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

  if (month >= 3 && month <= 5) {
    // Spring: Cherry blossoms
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {particles.map(p => (
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
      </div>
    );
  } else if (month >= 6 && month <= 8) {
    // Summer: Waves
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute bottom-0 left-0 w-full h-[120px] sm:h-[150px]">
          <div className="wave"></div>
          <div className="wave"></div>
        </div>
      </div>
    );
  } else if (month >= 9 && month <= 11) {
    // Autumn: Leaves
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {particles.map(p => (
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
      </div>
    );
  } else {
    // Winter: Snow
    const snowParticles = [...particles, ...particles.map(p => ({...p, id: p.id + 100, left: `${Math.random() * 100}vw`}))];
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {snowParticles.map(p => (
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
        ))}
      </div>
    );
  }
}
