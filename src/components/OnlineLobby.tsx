import React, { useState, useEffect } from 'react';
import { NetworkManager } from '../engine/NetworkManager';
import { Copy, ArrowLeft, Globe } from 'lucide-react';
import { GameAudio } from '../engine/AudioManager';

interface Props {
    onBack: () => void;
    onGameStart: (manager: NetworkManager, isHost: boolean) => void;
}

const OnlineLobby: React.FC<Props> = ({ onBack, onGameStart }) => {
    const [subMode, setSubMode] = useState<'SELECT' | 'HOST' | 'JOIN'>('SELECT');
    const [manager, setManager] = useState<NetworkManager | null>(null);
    const [myId, setMyId] = useState<string>('');
    const [hostId, setHostId] = useState<string>('');
    const [status, setStatus] = useState<string>('');

    const managerRef = React.useRef<NetworkManager | null>(null);
    const statusRef = React.useRef<string>('');

    useEffect(() => {
        managerRef.current = manager;
    }, [manager]);

    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    // Cleanup on unmount if not starting game
    useEffect(() => {
        return () => {
            if (managerRef.current && statusRef.current !== 'CONNECTED') {
                managerRef.current.destroy();
            }
        };
    }, []);

    const startHost = () => {
        GameAudio.playClick();
        const net = new NetworkManager();
        setManager(net);
        setSubMode('HOST');
        setStatus('Initializing...');

        net.host((id) => {
            setMyId(id);
            setStatus('Waiting for opponent...');
        });

        net.onConnect = () => {
            setStatus('CONNECTED');
            setTimeout(() => {
                onGameStart(net, true);
            }, 500);
        };
    };

    const startJoin = () => {
        GameAudio.playClick();
        setSubMode('JOIN');
    };

    const connectToHost = () => {
        GameAudio.playClick();
        if (!hostId) return;
        const net = new NetworkManager();
        setManager(net);
        setStatus('Connecting...');

        net.join(hostId, () => {
            setStatus('CONNECTED');
            setTimeout(() => {
                onGameStart(net, false);
            }, 500);
        });
    };

    const copyToClipboard = () => {
        GameAudio.playClick();
        navigator.clipboard.writeText(myId);
        // Could add toast here
    };

    return (
        <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center text-slate-100">
            <div className="w-full max-w-md bg-[#1a1d23] border border-slate-700 p-8 rounded-xl shadow-2xl relative">
                <button onClick={() => { GameAudio.playClick(); onBack(); }} className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft />
                </button>

                <h2 className="text-3xl font-bold mb-8 flex items-center justify-center gap-3">
                    <Globe className="text-blue-500" /> Online Play
                </h2>

                {subMode === 'SELECT' && (
                    <div className="flex flex-col gap-4">
                        <button onClick={startHost} className="matte-button bg-indigo-600 hover:bg-indigo-500 text-lg py-4">
                            Host Game
                        </button>
                        <button onClick={startJoin} className="matte-button bg-slate-700 hover:bg-slate-600 text-lg py-4">
                            Join Game
                        </button>
                    </div>
                )}

                {subMode === 'HOST' && (
                    <div className="flex flex-col gap-6">
                        <div className="text-slate-400">Share this ID with your friend:</div>

                        {myId ? (
                            <div className="flex items-center gap-2 bg-black/50 p-4 rounded border border-slate-700">
                                <code className="flex-1 font-mono text-xl text-yellow-500 tracking-wider">
                                    {myId}
                                </code>
                                <button onClick={copyToClipboard} className="p-2 hover:bg-white/10 rounded" title="Copy">
                                    <Copy size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="animate-pulse text-slate-500">Generating ID...</div>
                        )}

                        <div className="text-sm font-mono text-slate-400 mt-4 border-t border-slate-800 pt-4">
                            Status: <span className={status === 'CONNECTED' ? "text-green-500" : "text-blue-400"}>{status}</span>
                        </div>
                        {status === 'CONNECTED' && <div className="text-green-400 font-bold animate-pulse">Starting Game...</div>}
                    </div>
                )}

                {subMode === 'JOIN' && (
                    <div className="flex flex-col gap-6">
                        <div className="text-slate-400">Enter Host ID:</div>
                        <input
                            value={hostId}
                            onChange={(e) => setHostId(e.target.value)}
                            className="bg-black/50 border border-slate-600 rounded p-4 text-xl font-mono text-center text-white focus:border-blue-500 outline-none"
                            placeholder="e.g. 12ab34-..."
                        />
                        <button
                            onClick={connectToHost}
                            disabled={!hostId || status === 'Connecting...'}
                            className="matte-button bg-indigo-600 hover:bg-indigo-500 text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'Connecting...' ? 'Connecting...' : 'Connect'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OnlineLobby;
