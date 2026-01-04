'use client';

import { useEffect, useState, useMemo } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  rotation: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
}

interface ConfettiProps {
  onComplete?: () => void;
  duration?: number;
}

const COLORS = [
  '#22c55e', // green
  '#eab308', // yellow
  '#3b82f6', // blue
  '#ec4899', // pink
  '#f97316', // orange
  '#8b5cf6', // purple
  '#14b8a6', // teal
];

export function Confetti({ onComplete, duration = 3000 }: ConfettiProps) {
  const [visible, setVisible] = useState(true);

  const pieces = useMemo(() => {
    const newPieces: ConfettiPiece[] = [];
    const numPieces = 80;

    for (let i = 0; i < numPieces; i++) {
      newPieces.push({
        id: i,
        x: Math.random() * 100,
        rotation: Math.random() * 360,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 8 + Math.random() * 8,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
      });
    }

    return newPieces;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.x}%`,
            top: '-20px',
            width: `${piece.size}px`,
            height: `${piece.size * 0.6}px`,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            animationDuration: `${piece.duration}s`,
            animationDelay: `${piece.delay}s`,
          }}
        />
      ))}

      {/* Trophy animation in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="animate-bounce-in">
          <div className="relative">
            <div className="absolute inset-0 animate-ping bg-yellow-400/30 rounded-full" />
            <div className="relative bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full p-6 shadow-2xl">
              <svg
                className="h-16 w-16 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Celebration text */}
      <div className="absolute inset-x-0 bottom-1/3 flex justify-center">
        <div className="animate-slide-up-fade text-center">
          <h2 className="text-4xl font-bold text-white drop-shadow-lg mb-2">
            Goal Achieved!
          </h2>
          <p className="text-xl text-white/80 drop-shadow-md">
            Congratulations on hitting your target!
          </p>
        </div>
      </div>
    </div>
  );
}
