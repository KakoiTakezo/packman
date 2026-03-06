/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, Play, Heart } from 'lucide-react';

// --- Constants & Types ---

const GRID_SIZE = 20;
const CELL_SIZE = 24;
const PACMAN_SPEED = 0.15;
const GHOST_SPEED = 0.1;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null;

const MAZE = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1],
  [0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0],
  [1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1],
  [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1],
  [0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0],
  [1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const COLS = MAZE[0].length;
const ROWS = MAZE.length;

class Ghost {
  x: number;
  y: number;
  color: string;
  dir: Direction;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.dir = 'UP';
  }

  update() {
    const possibleDirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    const validDirs = possibleDirs.filter(d => {
      const next = this.getNextPos(d);
      return !MAZE[Math.round(next.y)][Math.round(next.x)];
    });

    // Change direction if at an intersection or hitting a wall
    if (validDirs.length > 2 || !validDirs.includes(this.dir)) {
      this.dir = validDirs[Math.floor(Math.random() * validDirs.length)];
    }

    const next = this.getNextPos(this.dir);
    this.x = next.x;
    this.y = next.y;
  }

  getNextPos(dir: Direction): Point {
    let nx = this.x;
    let ny = this.y;
    if (dir === 'UP') ny -= GHOST_SPEED;
    if (dir === 'DOWN') ny += GHOST_SPEED;
    if (dir === 'LEFT') nx -= GHOST_SPEED;
    if (dir === 'RIGHT') nx += GHOST_SPEED;

    // Wrap around
    if (nx < 0) nx = COLS - 1;
    if (nx >= COLS) nx = 0;
    
    return { x: nx, y: ny };
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER' | 'WIN'>('START');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [pellets, setPellets] = useState<Point[]>([]);
  
  const pacmanRef = useRef({ x: 9, y: 15, dir: null as Direction, nextDir: null as Direction, mouth: 0 });
  const ghostsRef = useRef<Ghost[]>([
    new Ghost(9, 9, '#FF0000'), // Blinky
    new Ghost(8, 9, '#FFB8FF'), // Pinky
    new Ghost(10, 9, '#00FFFF'), // Inky
    new Ghost(9, 8, '#FFB852'), // Clyde
  ]);

  // Initialize pellets
  useEffect(() => {
    const newPellets: Point[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAZE[r][c] === 0) {
          newPellets.push({ x: c, y: r });
        }
      }
    }
    setPellets(newPellets);
  }, []);

  const resetGame = () => {
    setScore(0);
    setLives(3);
    pacmanRef.current = { x: 9, y: 15, dir: null, nextDir: null, mouth: 0 };
    ghostsRef.current = [
      new Ghost(9, 9, '#FF0000'),
      new Ghost(8, 9, '#FFB8FF'),
      new Ghost(10, 9, '#00FFFF'),
      new Ghost(9, 8, '#FFB852'),
    ];
    const newPellets: Point[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAZE[r][c] === 0) {
          newPellets.push({ x: c, y: r });
        }
      }
    }
    setPellets(newPellets);
    setGameState('PLAYING');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') pacmanRef.current.nextDir = 'UP';
      if (key === 's') pacmanRef.current.nextDir = 'DOWN';
      if (key === 'a') pacmanRef.current.nextDir = 'LEFT';
      if (key === 'd') pacmanRef.current.nextDir = 'RIGHT';
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const update = () => {
      const pac = pacmanRef.current;

      // Try to turn if nextDir is set
      if (pac.nextDir) {
        const canTurn = !MAZE[Math.round(pac.y + (pac.nextDir === 'UP' ? -1 : pac.nextDir === 'DOWN' ? 1 : 0))][Math.round(pac.x + (pac.nextDir === 'LEFT' ? -1 : pac.nextDir === 'RIGHT' ? 1 : 0))];
        // Only turn if we are centered in a cell
        if (Math.abs(pac.x - Math.round(pac.x)) < 0.1 && Math.abs(pac.y - Math.round(pac.y)) < 0.1) {
           if (canTurn) {
             pac.dir = pac.nextDir;
             pac.nextDir = null;
           }
        }
      }

      // Move Pacman
      if (pac.dir) {
        let nx = pac.x;
        let ny = pac.y;
        if (pac.dir === 'UP') ny -= PACMAN_SPEED;
        if (pac.dir === 'DOWN') ny += PACMAN_SPEED;
        if (pac.dir === 'LEFT') nx -= PACMAN_SPEED;
        if (pac.dir === 'RIGHT') nx += PACMAN_SPEED;

        // Wrap around
        if (nx < 0) nx = COLS - 1;
        if (nx >= COLS) nx = 0;

        // Wall collision
        const gridX = Math.round(nx);
        const gridY = Math.round(ny);
        
        if (!MAZE[gridY][gridX]) {
          pac.x = nx;
          pac.y = ny;
        } else {
          // Stop if hitting wall
          pac.dir = null;
          pac.x = Math.round(pac.x);
          pac.y = Math.round(pac.y);
        }
      }

      // Pellet collection
      setPellets(prev => {
        const filtered = prev.filter(p => {
          const dist = Math.sqrt(Math.pow(p.x - pac.x, 2) + Math.pow(p.y - pac.y, 2));
          if (dist < 0.5) {
            setScore(s => s + 10);
            return false;
          }
          return true;
        });
        if (filtered.length === 0) setGameState('WIN');
        return filtered;
      });

      // Update Ghosts
      ghostsRef.current.forEach(g => {
        g.update();
        // Collision with Pacman
        const dist = Math.sqrt(Math.pow(g.x - pac.x, 2) + Math.pow(g.y - pac.y, 2));
        if (dist < 0.6) {
          setLives(l => {
            if (l <= 1) {
              setGameState('GAMEOVER');
              return 0;
            }
            // Reset positions
            pacmanRef.current = { x: 9, y: 15, dir: null, nextDir: null, mouth: 0 };
            ghostsRef.current = [
              new Ghost(9, 9, '#FF0000'),
              new Ghost(8, 9, '#FFB8FF'),
              new Ghost(10, 9, '#00FFFF'),
              new Ghost(9, 8, '#FFB852'),
            ];
            return l - 1;
          });
        }
      });

      pac.mouth = (pac.mouth + 0.2) % (Math.PI / 2);
    };

    const draw = () => {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Maze
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (MAZE[r][c] === 1) {
            ctx.fillStyle = '#1e40af';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#3b82f6';
            ctx.fillRect(c * CELL_SIZE + 2, r * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            ctx.shadowBlur = 0;
          }
        }
      }

      // Draw Pellets
      ctx.fillStyle = '#fde68a';
      pellets.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x * CELL_SIZE + CELL_SIZE / 2, p.y * CELL_SIZE + CELL_SIZE / 2, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Pacman
      const pac = pacmanRef.current;
      ctx.fillStyle = '#fbbf24';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#fbbf24';
      ctx.beginPath();
      const centerX = pac.x * CELL_SIZE + CELL_SIZE / 2;
      const centerY = pac.y * CELL_SIZE + CELL_SIZE / 2;
      
      let startAngle = 0;
      let endAngle = Math.PI * 2;
      
      if (pac.dir === 'RIGHT') { startAngle = pac.mouth; endAngle = Math.PI * 2 - pac.mouth; }
      else if (pac.dir === 'LEFT') { startAngle = Math.PI + pac.mouth; endAngle = Math.PI - pac.mouth; }
      else if (pac.dir === 'UP') { startAngle = Math.PI * 1.5 + pac.mouth; endAngle = Math.PI * 1.5 - pac.mouth; }
      else if (pac.dir === 'DOWN') { startAngle = Math.PI * 0.5 + pac.mouth; endAngle = Math.PI * 0.5 - pac.mouth; }
      
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, CELL_SIZE / 2 - 2, startAngle, endAngle);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Ghosts
      ghostsRef.current.forEach(g => {
        ctx.fillStyle = g.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = g.color;
        
        const gx = g.x * CELL_SIZE + CELL_SIZE / 2;
        const gy = g.y * CELL_SIZE + CELL_SIZE / 2;
        
        ctx.beginPath();
        ctx.arc(gx, gy - 2, CELL_SIZE / 2 - 4, Math.PI, 0);
        ctx.lineTo(gx + CELL_SIZE / 2 - 4, gy + CELL_SIZE / 2 - 4);
        ctx.lineTo(gx - CELL_SIZE / 2 + 4, gy + CELL_SIZE / 2 - 4);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(gx - 4, gy - 4, 3, 0, Math.PI * 2);
        ctx.arc(gx + 4, gy - 4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(gx - 4, gy - 4, 1.5, 0, Math.PI * 2);
        ctx.arc(gx + 4, gy - 4, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
      });
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, pellets]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center font-sans overflow-hidden">
      {/* HUD */}
      <div className="w-full max-w-md flex justify-between items-end mb-6 px-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-1">Score</p>
          <p className="text-3xl font-mono font-bold tracking-tighter">{score.toString().padStart(5, '0')}</p>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: lives }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-yellow-400"
            >
              <Heart size={20} fill="currentColor" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Game Board */}
      <div className="relative p-1 bg-blue-900/20 rounded-lg border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.1)]">
        <canvas
          ref={canvasRef}
          width={COLS * CELL_SIZE}
          height={ROWS * CELL_SIZE}
          className="rounded-sm"
        />

        {/* Overlays */}
        <AnimatePresence>
          {gameState !== 'PLAYING' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-center items-center justify-center rounded-sm z-10"
            >
              <div className="text-center p-8">
                {gameState === 'START' && (
                  <motion.div
                    initial={{ y: 20 }}
                    animate={{ y: 0 }}
                  >
                    <h1 className="text-5xl font-black italic tracking-tighter mb-2 text-yellow-400 uppercase">
                      Neon<br/>Pac-Man
                    </h1>
                    <p className="text-blue-300 text-xs tracking-widest uppercase mb-8 opacity-70">Use WASD to Move</p>
                    <button
                      onClick={() => setGameState('PLAYING')}
                      className="group relative px-8 py-3 bg-yellow-400 text-black font-bold uppercase tracking-widest rounded-full hover:bg-yellow-300 transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Play size={18} fill="currentColor" />
                      Start Game
                    </button>
                  </motion.div>
                )}

                {gameState === 'GAMEOVER' && (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                  >
                    <h2 className="text-5xl font-black tracking-tighter mb-2 text-red-500 uppercase">Game Over</h2>
                    <p className="text-white/60 mb-8">Final Score: {score}</p>
                    <button
                      onClick={resetGame}
                      className="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest rounded-full hover:bg-gray-200 transition-colors flex items-center gap-2 mx-auto"
                    >
                      <RotateCcw size={18} />
                      Try Again
                    </button>
                  </motion.div>
                )}

                {gameState === 'WIN' && (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                  >
                    <Trophy className="mx-auto mb-4 text-yellow-400" size={64} />
                    <h2 className="text-5xl font-black tracking-tighter mb-2 text-emerald-400 uppercase">You Win!</h2>
                    <p className="text-white/60 mb-8">Score: {score}</p>
                    <button
                      onClick={resetGame}
                      className="px-8 py-3 bg-emerald-400 text-black font-bold uppercase tracking-widest rounded-full hover:bg-emerald-300 transition-colors flex items-center gap-2 mx-auto"
                    >
                      <RotateCcw size={18} />
                      Play Again
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center opacity-40">
        <div className="flex gap-4 justify-center mb-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 flex items-center justify-center border border-white/20 rounded text-xs font-mono">W</span>
            <span className="w-8 h-8 flex items-center justify-center border border-white/20 rounded text-xs font-mono">A</span>
            <span className="w-8 h-8 flex items-center justify-center border border-white/20 rounded text-xs font-mono">S</span>
            <span className="w-8 h-8 flex items-center justify-center border border-white/20 rounded text-xs font-mono">D</span>
          </div>
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em]">Movement Controls</p>
      </div>
    </div>
  );
}
