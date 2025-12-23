import { useState } from 'react';
import './App.css';
import MainMenu from './components/MainMenu';
import GameView from './components/GameView';
import HistoryView from './components/HistoryView';
import OnlineLobby from './components/OnlineLobby';
import type { GameMode } from './types';
import type { NetworkManager } from './engine/NetworkManager';

function App() {
  const [mode, setMode] = useState<GameMode>('MENU');
  const [level, setLevel] = useState(5);
  const [networkManager, setNetworkManager] = useState<NetworkManager | null>(null);
  const [isHost, setIsHost] = useState(false);

  const handleGameStart = (manager: NetworkManager, host: boolean) => {
    setNetworkManager(manager);
    setIsHost(host);
    setMode('ONLINE_GAME');
  };

  const handleBack = () => {
    if (networkManager) {
      networkManager.destroy();
      setNetworkManager(null);
    }
    setMode('MENU');
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#050510] to-[#100515]" />

      {/* Background Animated Effect (CSS based or simple canvas can go here, but stick to CSS for now) */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, #00f3ff 0%, transparent 50%), radial-gradient(circle at 80% 20%, #ff00ff 0%, transparent 40%)',
          filter: 'blur(100px)',
        }}
      />

      <div className="z-10 w-full h-full flex flex-col">
        {mode === 'MENU' && <MainMenu onSelectMode={setMode} initialLevel={level} onLevelChange={setLevel} />}
        {(mode === 'SOLO' || mode === 'MULTIPLAYER') && <GameView mode={mode} level={level} onBack={handleBack} />}
        {mode === 'ONLINE_LOBBY' && <OnlineLobby onBack={handleBack} onGameStart={handleGameStart} />}
        {mode === 'ONLINE_GAME' && networkManager && (
          <GameView
            mode="MULTIPLAYER"
            isOnline={true}
            isHost={isHost}
            networkManager={networkManager}
            level={level}
            onBack={handleBack}
          />
        )}
        {mode === 'HISTORY' && <HistoryView onBack={handleBack} />}
      </div>
    </div>
  );
}

export default App;
