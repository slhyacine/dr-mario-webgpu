import type { PlayerInput } from '../types';

export class InputManager {
    p1: PlayerInput = { up: false, down: false, left: false, right: false, rotateCW: false, rotateCCW: false };
    p2: PlayerInput = { up: false, down: false, left: false, right: false, rotateCW: false, rotateCCW: false };

    // Virtual Controller State (for Mobile)
    private vP1: PlayerInput = { up: false, down: false, left: false, right: false, rotateCW: false, rotateCCW: false };

    private keysPressed: Set<string> = new Set();

    constructor() {
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    }

    destroy() {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    }

    // Called by UI buttons
    setVirtualState(player: 1 | 2, input: Partial<PlayerInput>) {
        if (player === 1) {
            this.vP1 = { ...this.vP1, ...input };
        }
        // In mobile solo, we map everything to "Player 2" conceptually if that's what SOLO mode uses,
        // but let's stick to standardizing on p2 vs p1 in engine.
        // Actually GameEngine uses p2 for SOLO input.
        // So for mobile solo we should map to P2.

        this.updateInputs();
    }

    private onKeyDown = (e: KeyboardEvent) => {
        this.keysPressed.add(e.code);
        this.updateInputs();
    };

    private onKeyUp = (e: KeyboardEvent) => {
        this.keysPressed.delete(e.code);
        this.updateInputs();
    };

    private updateInputs() {
        // Player 1: WASD + J/K
        this.p1.up = this.keysPressed.has('KeyW') || this.vP1.up;
        this.p1.down = this.keysPressed.has('KeyS') || this.vP1.down;
        this.p1.left = this.keysPressed.has('KeyA') || this.vP1.left;
        this.p1.right = this.keysPressed.has('KeyD') || this.vP1.right;
        this.p1.rotateCW = this.keysPressed.has('KeyK') || this.vP1.rotateCW;
        this.p1.rotateCCW = this.keysPressed.has('KeyJ') || this.vP1.rotateCCW;

        // Player 2: Arrows + Numpad
        // For mobile "SOLO", we will map vP1 input to p2 as well if user is playing solo on phone
        this.p2.up = this.keysPressed.has('ArrowUp') || this.vP1.up;
        this.p2.down = this.keysPressed.has('ArrowDown') || this.vP1.down;
        this.p2.left = this.keysPressed.has('ArrowLeft') || this.vP1.left;
        this.p2.right = this.keysPressed.has('ArrowRight') || this.vP1.right;
        this.p2.rotateCW = this.keysPressed.has('Numpad2') || this.keysPressed.has('Period') || this.keysPressed.has('ArrowUp') || this.vP1.rotateCW;
        this.p2.rotateCCW = this.keysPressed.has('Numpad1') || this.keysPressed.has('Comma') || this.vP1.rotateCCW;
    }

    // Helper to get ephemeral "just pressed" state if needed, 
    // but for now we expose current state and GameEngine handles "pressed once" logic
}
