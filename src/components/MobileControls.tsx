import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RotateCw, RotateCcw } from 'lucide-react';
import { InputManager } from '../engine/InputManager';

interface Props {
    engineInput?: InputManager;
}

const MobileControls: React.FC<Props> = ({ engineInput }) => {
    // We update the engine input directly on touch events

    const handleTouchStart = (key: string) => {
        if (!engineInput) return;
        const update: any = {};
        update[key] = true;
        engineInput.setVirtualState(1, update);
    };

    const handleTouchEnd = (key: string) => {
        if (!engineInput) return;
        const update: any = {};
        update[key] = false;
        engineInput.setVirtualState(1, update);
    };

    // Helper for buttons
    const Btn = ({ icon: Icon, action, color = "bg-slate-700" }: any) => (
        <button
            className={`${color} w-14 h-14 rounded-full flex items-center justify-center text-white active:scale-90 active:bg-opacity-80 transition-all shadow-lg border border-white/10`}
            onTouchStart={(e) => { e.preventDefault(); handleTouchStart(action); }}
            onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd(action); }}
            onMouseDown={(e) => { e.preventDefault(); handleTouchStart(action); }}
            onMouseUp={(e) => { e.preventDefault(); handleTouchEnd(action); }}
            onMouseLeave={() => handleTouchEnd(action)}
        >
            <Icon size={28} />
        </button>
    );

    if (!engineInput) return null;

    return (
        <div className="absolute bottom-4 left-0 right-0 px-6 pb-2 z-50 flex items-end justify-between pointer-events-none">
            {/* D-Pad */}
            <div className="pointer-events-auto flex flex-col items-center gap-1">
                <Btn icon={ChevronUp} action="up" />
                <div className="flex gap-4">
                    <Btn icon={ChevronLeft} action="left" />
                    <Btn icon={ChevronDown} action="down" />
                    <Btn icon={ChevronRight} action="right" />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="pointer-events-auto flex gap-4 mb-2">
                <Btn icon={RotateCcw} action="rotateCCW" color="bg-red-600" />
                <Btn icon={RotateCw} action="rotateCW" color="bg-blue-600" />
            </div>
        </div>
    );
};

export default MobileControls;
