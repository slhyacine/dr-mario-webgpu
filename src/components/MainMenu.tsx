import React from 'react';
import type { GameMode } from '../types';
import { Gamepad2, Users, History, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { GameAudio } from '../engine/AudioManager';

interface Props {
    onSelectMode: (mode: GameMode) => void;
    initialLevel: number;
    onLevelChange: (level: number) => void;
}

const MainMenu: React.FC<Props> = ({ onSelectMode, initialLevel, onLevelChange }) => {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: "backOut" }}
                className="mb-12"
            >
                <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter neon-text mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[--primary] to-[--secondary]"
                    style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)' }}>
                    DR. MARIO
                </h1>
                <h2 className="text-2xl font-light tracking-widest uppercase text-[--accent] neon-text-secondary">
                    WebGPU Edition
                </h2>
            </motion.div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col gap-6 w-full max-w-md"
            >
                <motion.button
                    variants={itemVariants}
                    onClick={() => { GameAudio.playClick(); onSelectMode('SOLO'); }}
                    className="group relative overflow-hidden p-6 glass-panel hover:bg-[--glass-border] transition-all"
                >
                    <div className="flex items-center justify-center gap-4 relative z-10">
                        <Gamepad2 className="w-8 h-8 group-hover:text-[--primary] transition-colors" />
                        <span className="text-xl">Solo Game</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[--primary] to-transparent opacity-0 group-hover:opacity-10 transition-opacity" />
                </motion.button>

                <motion.button
                    variants={itemVariants}
                    onClick={() => { GameAudio.playClick(); onSelectMode('MULTIPLAYER'); }}
                    className="group relative overflow-hidden p-6 glass-panel hover:bg-[--glass-border] transition-all"
                >
                    <div className="flex items-center justify-center gap-4 relative z-10">
                        <Users className="w-8 h-8 group-hover:text-[--secondary] transition-colors" />
                        <span className="text-xl">VS Player</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[--secondary] to-transparent opacity-0 group-hover:opacity-10 transition-opacity" />
                </motion.button>

                <motion.button
                    variants={itemVariants}
                    onClick={() => { GameAudio.playClick(); onSelectMode('ONLINE_LOBBY'); }}
                    className="group relative overflow-hidden p-6 glass-panel hover:bg-[--glass-border] transition-all"
                >
                    <div className="flex items-center justify-center gap-4 relative z-10">
                        <Globe className="w-8 h-8 group-hover:text-green-500 transition-colors" />
                        <span className="text-xl">Online Play</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-transparent opacity-0 group-hover:opacity-10 transition-opacity" />
                </motion.button>

                <motion.button
                    variants={itemVariants}
                    onClick={() => { GameAudio.playClick(); onSelectMode('HISTORY'); }}
                    className="group relative overflow-hidden p-6 glass-panel hover:bg-[--glass-border] transition-all"
                >
                    <div className="flex items-center justify-center gap-4 relative z-10">
                        <History className="w-8 h-8 group-hover:text-[--accent] transition-colors" />
                        <span className="text-xl">Match History</span>
                    </div>
                </motion.button>

                <div className="mt-4 p-4 glass-panel border-slate-700">
                    <div className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase mb-4">Virus Level</div>
                    <div className="flex items-center justify-center gap-6">
                        <button
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 transition-colors text-xl font-bold border border-white/5 shadow-lg active:scale-95"
                            onClick={() => { GameAudio.playClick(); onLevelChange(Math.max(0, initialLevel - 1)); }}
                        >
                            -
                        </button>
                        <div className="relative">
                            <div className="text-4xl font-black italic tracking-tighter text-[--primary] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] min-w-[3rem]">
                                {initialLevel}
                            </div>
                            <div className="absolute -top-1 -right-4 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ff0000]" />
                        </div>
                        <button
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 transition-colors text-xl font-bold border border-white/5 shadow-lg active:scale-95"
                            onClick={() => { GameAudio.playClick(); onLevelChange(Math.min(20, initialLevel + 1)); }}
                        >
                            +
                        </button>
                    </div>
                    <div className="mt-4 flex gap-1 justify-center px-8">
                        {Array.from({ length: 21 }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= initialLevel ? 'bg-[--primary]' : 'bg-slate-800'}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="mt-8 text-left text-sm text-gray-400 bg-black/40 p-4 rounded-lg backdrop-blur-sm border border-white/5">
                    <h3 className="text-white font-bold mb-2 text-center">CONTROLS</h3>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <span className="text-[--primary] font-bold block mb-1">PLAYER 1</span>
                            <p>Move: W A S D</p>
                            <p>Rotate: J / K</p>
                        </div>
                        <div>
                            <span className="text-[--secondary] font-bold block mb-1">PLAYER 2</span>
                            <p>Move: ARROWS</p>
                            <p>Rotate: NUM 1 / 2</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 1 }}
                className="absolute bottom-8 text-sm"
            >
                Powered by WebGPU & React
            </motion.div>
        </div>
    );
};

export default MainMenu;
