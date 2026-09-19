import React from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
}

export const QRCode: React.FC<QRCodeProps> = ({ value, size = 200 }) => {
  // Deterministic 21x21 grid pattern generator based on value hash
  const getGrid = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }

    const size = 21;
    const grid: boolean[][] = Array(size).fill(false).map(() => Array(size).fill(false));

    // Corner Finder Patterns (7x7)
    const drawFinder = (startX: number, startY: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 || // Outer ring
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)     // Inner 3x3 solid
          ) {
            grid[startY + r][startX + c] = true;
          }
        }
      }
    };

    drawFinder(0, 0);       // Top-Left
    drawFinder(size - 7, 0); // Top-Right
    drawFinder(0, size - 7); // Bottom-Left

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Data bits with pseudo-random seed distribution
    let curHash = Math.abs(hash);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip finders
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c >= size - 8) ||
          (r >= size - 8 && c < 8) ||
          r === 6 || c === 6
        ) {
          continue;
        }
        curHash = (curHash * 1103515245 + 12345) & 0x7fffffff;
        grid[r][c] = (curHash % 100) > 42;
      }
    }

    return grid;
  };

  const grid = getGrid(value);
  const cellSize = size / 21;

  return (
    <div className="inline-flex p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rounded-lg"
      >
        {grid.map((row, r) =>
          row.map((active, c) =>
            active ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#0f172a"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};
