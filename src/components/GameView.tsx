import React, { useRef, useEffect, useState } from 'react';
import type { GameResult } from '../types';
import { GameEngine } from '../engine/GameEngine';
import type { NetworkManager } from '../engine/NetworkManager';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Target, Award, Keyboard } from 'lucide-react';
import MobileControls from './MobileControls';
import { GameAudio } from '../engine/AudioManager';

interface Props {
    mode: 'SOLO' | 'MULTIPLAYER';
    onBack: () => void;
    isOnline?: boolean;
    isHost?: boolean;
    networkManager?: NetworkManager;
    level?: number;
}

interface GameState {
    scores: number[];
    virusesLeft: number[];
    nextPills: Array<{ c1: number; c2: number }>;
}

const GameView: React.FC<Props> = ({ mode, onBack, isHost, networkManager, level = 5 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<GameEngine | null>(null);
    const [gameOver, setGameOver] = useState<GameResult | null>(null);
    const [state, setState] = useState<GameState>({ scores: [0, 0], virusesLeft: [0, 0], nextPills: [] });
    const [engineInput, setEngineInput] = useState<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (!canvasRef.current) return;

        const engine = new GameEngine(
            canvasRef.current,
            mode,
            (result) => {
                setGameOver(result);
                setIsPlaying(false);
            },
            networkManager,
            isHost,
            level
        );

        // Expose input manager for UI controls
        setEngineInput(engine.input);

        engine.onStateUpdate = (newState: GameState) => {
            setState(newState);
        };

        engine.init(); // Don't auto-start
        engineRef.current = engine;

        return () => engine.destroy();
    }, [mode]);

    const togglePause = () => {
        if (!engineRef.current) return;
        GameAudio.playClick();

        if (isPlaying) {
            engineRef.current.running = false;
            setIsPlaying(false);
            GameAudio.stopMusic();
        } else {
            // Only start if not running to avoid double loops
            if (!engineRef.current.running) {
                engineRef.current.start();
                setIsPlaying(true);
                GameAudio.playMusic();
            }
        }
    };

    // Mobile detection
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768 || 'ontouchstart' in window);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="relative w-full h-full flex items-center justify-center bg-[#0f1115] overflow-hidden p-6 touch-none">

            {/* Top Navigation */}
            <div className="absolute top-4 left-4 z-20 flex gap-4">
                <button onClick={() => { GameAudio.playClick(); onBack(); }} className="matte-button flex items-center gap-2 text-sm px-4 py-2">
                    <ArrowLeft size={16} /> Back
                </button>
                <button
                    onClick={togglePause}
                    className={`matte-button flex items-center gap-2 text-sm px-4 py-2 ${isPlaying ? 'bg-slate-700' : 'bg-[#6366f1] text-white'}`}
                >
                    {isPlaying ? 'Pause' : 'Start Game'}
                </button>
            </div>

            {/* ... rest of render ... */}

            <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6 w-full max-w-7xl h-full">

                {/* Mobile Stats Bar */}
                <div className="flex lg:hidden w-full justify-between items-center bg-slate-900/80 p-3 rounded-xl border border-white/10 backdrop-blur-md z-10 mx-4 max-w-md shrink-0">
                    <div className="flex gap-6">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Score</span>
                            <span className="font-mono font-bold text-lg leading-tight">{state.scores[0] || 0}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Viruses</span>
                            <span className="font-mono font-bold text-lg text-red-400 leading-tight">{state.virusesLeft[0] || 0}</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mb-1">Next</span>
                        <div className="flex items-center justify-center bg-black/40 rounded-full p-0.5 border border-slate-800">
                            {state.nextPills && state.nextPills[0] ? (
                                <div className="flex">
                                    <div className="w-4 h-4 rounded-l-md shadow-sm" style={{ background: getMatteGradient(state.nextPills[0].c1) }} />
                                    <div className="w-4 h-4 rounded-r-md shadow-sm" style={{ background: getMatteGradient(state.nextPills[0].c2) }} />
                                </div>
                            ) : (
                                <div className="w-8 h-4" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Left Sidebar: P1 Stats & Controls */}
                <div className="hidden lg:flex flex-col gap-3 w-52 shrink-0">
                    <div className="matte-panel p-3 border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-bold text-slate-500 tracking-widest uppercase">Player 1</span>
                            <Award size={14} className="text-yellow-500" />
                        </div>
                        <div className="text-3xl font-mono text-slate-100 font-bold">{state.scores[0] || 0}</div>
                    </div>

                    <div className="matte-panel p-3 border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-bold text-slate-500 tracking-widest uppercase">Viruses</span>
                            <Target size={14} className="text-red-500" />
                        </div>
                        <div className="text-2xl font-mono text-slate-100 font-bold">{state.virusesLeft[0] || 0}</div>
                    </div>

                    {/* Next Pill Preview */}
                    <div className="matte-panel p-3 border-slate-800">
                        <div className="text-[9px] font-bold text-slate-500 tracking-widest uppercase mb-3 text-center">Next Pill</div>
                        <div className="flex h-7 items-center justify-center bg-black/40 rounded-full p-0.5 border border-slate-900 shadow-inner">
                            {state.nextPills && state.nextPills[0] ? (
                                <>
                                    <div className="w-6 h-6 rounded-l-md shadow-sm" style={{ background: getMatteGradient(state.nextPills[0].c1) }} />
                                    <div className="w-6 h-6 rounded-r-md shadow-sm" style={{ background: getMatteGradient(state.nextPills[0].c2) }} />
                                </>
                            ) : (
                                <div className="w-12 h-6 flex items-center justify-center text-[8px] text-slate-600">Loading...</div>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="matte-panel p-3 border-slate-800">
                        <div className="flex items-center gap-2 mb-2 text-slate-400">
                            <Keyboard size={12} />
                            <span className="text-[9px] font-bold tracking-widest uppercase">Controls</span>
                        </div>
                        <div className="flex flex-col gap-1.5 text-[11px]">
                            <div className="flex justify-between items-center text-slate-300">
                                <span>Move</span>
                                <div className="flex gap-0.5">
                                    <span className="control-key text-[10px]">{mode === 'SOLO' ? '←' : 'A'}</span>
                                    <span className="control-key text-[10px]">{mode === 'SOLO' ? '→' : 'D'}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-slate-300">
                                <span>Drop</span>
                                <span className="control-key text-[10px]">{mode === 'SOLO' ? '↓' : 'S'}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-300">
                                <span>Rotate</span>
                                <span className="control-key text-[10px]">{mode === 'SOLO' ? '↑' : 'K'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center: Game Canvas */}
                <div className="flex flex-col items-center gap-3 shrink-1 min-h-0">
                    <div className="board-container flex justify-center items-center max-w-full">
                        <canvas
                            ref={canvasRef}
                            width={mode === 'MULTIPLAYER' ? 720 : 360}
                            height={600}
                            className="rounded-sm max-w-full h-auto max-h-[70vh] lg:max-h-[85vh] object-contain"
                        />
                    </div>
                    {mode === 'MULTIPLAYER' && (
                        <div className="text-[9px] font-bold tracking-[0.3em] text-slate-600 uppercase">Versus Mode</div>
                    )}
                </div>

                {/* Right Sidebar: P2 Stats & Controls (Multiplayer Only) */}
                {mode === 'MULTIPLAYER' ? (
                    <div className="hidden lg:flex flex-col gap-3 w-52 shrink-0">
                        <div className="matte-panel p-3 border-slate-800">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-bold text-slate-500 tracking-widest uppercase">Player 2</span>
                                <Award size={14} className="text-blue-500" />
                            </div>
                            <div className="text-3xl font-mono text-slate-100 font-bold">{state.scores[1] || 0}</div>
                        </div>

                        <div className="matte-panel p-3 border-slate-800">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-bold text-slate-500 tracking-widest uppercase">Viruses</span>
                                <Target size={14} className="text-red-500" />
                            </div>
                            <div className="text-2xl font-mono text-slate-100 font-bold">{state.virusesLeft[1] || 0}</div>
                        </div>

                        <div className="matte-panel p-3 border-slate-800">
                            <div className="text-[9px] font-bold text-slate-500 tracking-widest uppercase mb-3 text-center">Next Pill</div>
                            <div className="flex h-7 items-center justify-center bg-black/40 rounded-full p-0.5 border border-slate-900 shadow-inner">
                                {state.nextPills && state.nextPills[1] ? (
                                    <>
                                        <div className="w-6 h-6 rounded-l-md shadow-sm" style={{ background: getMatteGradient(state.nextPills[1].c1) }} />
                                        <div className="w-6 h-6 rounded-r-md shadow-sm" style={{ background: getMatteGradient(state.nextPills[1].c2) }} />
                                    </>
                                ) : (
                                    <div className="w-12 h-6 flex items-center justify-center text-[8px] text-slate-600">Loading...</div>
                                )}
                            </div>
                        </div>

                        <div className="matte-panel p-3 border-slate-800">
                            <div className="flex items-center gap-2 mb-2 text-slate-400">
                                <Keyboard size={12} />
                                <span className="text-[9px] font-bold tracking-widest uppercase">Controls</span>
                            </div>
                            <div className="flex flex-col gap-1.5 text-[11px]">
                                <div className="flex justify-between items-center text-slate-300">
                                    <span>Move</span>
                                    <div className="flex gap-0.5">
                                        <span className="control-key text-[10px]">←</span>
                                        <span className="control-key text-[10px]">→</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-slate-300">
                                    <span>Drop</span>
                                    <span className="control-key text-[10px]">↓</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-300">
                                    <span>Rotate</span>
                                    <span className="control-key text-[10px]">1</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="hidden lg:block w-52" /> // Spacer for centering
                )}
            </div>

            {/* Mobile Controls Overlay */}
            {isMobile && engineInput && (
                <MobileControls engineInput={engineInput} />
            )}

            {/* Game Over Modal */}
            <AnimatePresence>
                {gameOver && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                            className="matte-panel p-8 text-center max-w-md w-full mx-4 border-slate-700"
                        >
                            <h2 className="text-2xl font-bold mb-1 text-slate-100 uppercase tracking-tight">Game Over</h2>
                            <div className="h-[1px] w-16 bg-[#6366f1] mx-auto mb-6" />

                            <div className="mb-6">
                                {mode === 'MULTIPLAYER' ? (
                                    <div className="text-xl font-bold text-yellow-400 mb-2">
                                        {gameOver.winner === 'P1' ? '🏆 Player 1 Wins!' : '🏆 Player 2 Wins!'}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <div className="text-sm text-slate-400">Final Score</div>
                                        <div className="text-3xl font-mono text-slate-100 font-bold">{gameOver.scoreP1}</div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => { GameAudio.playClick(); onBack(); }} className="matte-button bg-slate-800 text-slate-300 py-3">Menu</button>
                                <button onClick={() => { GameAudio.playClick(); window.location.reload(); }} className="matte-button bg-[#6366f1] text-white py-3">Rematch</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const getMatteGradient = (colorIndex: number) => {
    const glColors = [
        ['#e11d48', '#be123c'], // Red
        ['#eab308', '#ca8a04'], // Yellow
        ['#2563eb', '#1d4ed8'], // Blue
    ];
    const [c1, c2] = glColors[colorIndex] || glColors[0];
    return `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 25%), linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
};

export default GameView;
