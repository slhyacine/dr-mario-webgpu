import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trophy, Clock } from 'lucide-react';
import type { GameResult } from '../types';

interface Props {
    onBack: () => void;
}

const HistoryView: React.FC<Props> = ({ onBack }) => {
    const [history, setHistory] = useState<GameResult[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('dr_mario_history');
        if (saved) {
            try {
                setHistory(JSON.parse(saved).reverse()); // Newest first
            } catch (e) {
                console.error("Failed to load history", e);
            }
        }
    }, []);

    return (
        <div className="flex flex-col h-full w-full p-8 max-w-4xl mx-auto">
            <div className="flex items-center mb-8">
                <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 mr-4">
                    <ArrowLeft size={20} /> Back
                </button>
                <h1 className="text-3xl font-bold neon-text">Match History</h1>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {history.length === 0 ? (
                    <div className="text-center text-gray-500 mt-20">
                        <p className="text-xl">No games played yet.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {history.map((game) => (
                            <div key={game.id} className="glass-panel p-6 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-sm text-gray-400 mb-1">{new Date(game.date).toLocaleString()}</span>
                                    <span className="text-xl font-bold text-[--primary]">
                                        {game.mode === 'SOLO' ? 'Solo Run' : 'Versus Battle'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs text-gray-400 uppercase">P1 Score</span>
                                        <span className="text-2xl font-mono">{game.scoreP1}</span>
                                    </div>

                                    {game.mode === 'MULTIPLAYER' && (
                                        <>
                                            <div className="text-gray-500 font-bold">VS</div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs text-gray-400 uppercase">P2 Score</span>
                                                <span className="text-2xl font-mono">{game.scoreP2}</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex flex-col items-end min-w-[100px]">
                                    {game.mode === 'MULTIPLAYER' ? (
                                        <div className="flex items-center gap-2 text-[--accent]">
                                            <Trophy size={16} />
                                            <span className="font-bold">{game.winner === 'P1' ? 'P1 Won' : game.winner === 'P2' ? 'P2 Won' : 'Draw'}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Clock size={16} />
                                            <span>{Math.floor(game.durationSeconds / 60)}:{(game.durationSeconds % 60).toString().padStart(2, '0')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryView;
