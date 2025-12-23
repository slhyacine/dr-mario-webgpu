import { WebGPURenderer, type RenderSprite } from './WebGPURenderer';
import { DrMarioGrid, CellType, ROWS, COLS, PillColor } from './DrMarioGrid';
import { InputManager } from './InputManager';
import type { GameResult, PlayerInput } from '../types';
import type { NetworkManager } from './NetworkManager';
import { GameAudio } from './AudioManager';

interface Pill {
    x: number;
    y: number;
    c1: PillColor;
    c2: PillColor;
    rotation: 0 | 90 | 180 | 270;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: number[];
    life: number;
    maxLife: number;
}

const COLORS = [
    [0.88, 0.11, 0.28, 1.0], // Red-matte
    [0.92, 0.70, 0.03, 1.0], // Yellow-matte
    [0.15, 0.39, 0.92, 1.0], // Blue-matte
];

// Rendering constants
let BOARD_OFFSET_X = 0;
const BOARD_OFFSET_Y = 100;
const CELL_SIZE = 36;

export class GameEngine {
    canvas: HTMLCanvasElement;
    renderer: WebGPURenderer;
    input: InputManager;

    running = false;
    lastTime = 0;

    mode: 'SOLO' | 'MULTIPLAYER';
    onGameOver: (result: GameResult) => void;
    onStateUpdate?: (state: any) => void;

    grids: DrMarioGrid[] = [];
    activePills: (Pill | null)[] = [];
    nextPills: Pill[] = [];
    particles: Particle[] = [];

    dropTimers: number[] = [0, 0];
    dropInterval = 0.8;

    // Game Logic State
    playerState: ('PLAYING' | 'RESOLVING' | 'GAMEOVER')[] = ['PLAYING', 'PLAYING'];
    resolveTimers: number[] = [0, 0];
    RESOLVE_DELAY = 0.15; // Speed of gravity/clearing animation

    lastInputTimes: number[][] = [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]];
    scores: number[] = [0, 0];
    virusesLeft: number[] = [0, 0];

    // Online
    networkManager?: NetworkManager;
    isHost: boolean = false;
    isOnline: boolean = false;
    // For Host: inputs received from client
    remoteInput: PlayerInput = { up: false, down: false, left: false, right: false, rotateCW: false, rotateCCW: false };

    level: number;

    constructor(
        canvas: HTMLCanvasElement,
        mode: 'SOLO' | 'MULTIPLAYER',
        onGameOver: (r: GameResult) => void,
        networkManager?: NetworkManager,
        isHost?: boolean,
        level: number = 5
    ) {
        this.canvas = canvas;
        this.mode = mode;
        this.onGameOver = onGameOver;
        this.networkManager = networkManager;
        this.isHost = !!isHost;
        this.isOnline = !!networkManager;
        this.level = level;

        this.renderer = new WebGPURenderer(canvas);
        this.input = new InputManager();

        GameAudio.playMusic(); // Attempt autoplay

        if (this.isOnline) {
            this.setupNetwork();
        }

        this.initGrids();
    }

    setupNetwork() {
        if (!this.networkManager) return;

        this.networkManager.onData = (data: any) => {
            if (this.isHost) {
                // Host receives Input from Client
                if (data.type === 'INPUT') {
                    this.remoteInput = data.payload;
                }
            } else {
                // Client receives State from Host
                if (data.type === 'STATE') {
                    this.applyRemoteState(data.payload);
                }
                if (data.type === 'GAMEOVER') {
                    this.finishGame(data.winner);
                }
            }
        };
    }

    applyRemoteState(payload: any) {
        // Deserialize Grids
        // payload.g1, payload.g2 are cell arrays
        if (payload.g1) this.grids[0].cells = payload.g1;
        if (payload.g2) this.grids[1].cells = payload.g2;

        this.activePills = payload.activePills;
        this.nextPills = payload.nextPills;
        this.scores = payload.scores;
        this.virusesLeft = payload.virusesLeft;
        // Particles could be synced but for now let's keep them local or just not sync them (client won't see particles unless we sync them or trigger them)
        // Ideally we send "events" like "MATCH_CLEARED" to trigger particles locally.
        // For now, simple state sync.
    }

    initGrids() {
        this.grids = [new DrMarioGrid()];
        this.grids[0].initLevel(this.level);
        this.virusesLeft[0] = this.countViruses(0);
        this.nextPills[0] = this.generatePill();
        this.activePills[0] = this.spawnPill(0);

        if (this.mode === 'MULTIPLAYER') {
            this.grids.push(new DrMarioGrid());
            this.grids[1].initLevel(this.level);
            this.virusesLeft[1] = this.countViruses(1);
            this.nextPills[1] = this.generatePill();
            this.activePills[1] = this.spawnPill(1);
        }
    }

    countViruses(pid: number) {
        let count = 0;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = this.grids[pid].cells[r][c];
                if (cell.type >= 1 && cell.type <= 3) count++;
            }
        }
        return count;
    }

    generatePill(): Pill {
        return {
            x: 3, y: 0,
            c1: Math.floor(Math.random() * 3) as PillColor,
            c2: Math.floor(Math.random() * 3) as PillColor,
            rotation: 0
        };
    }

    spawnPill(pid: number): Pill | null {
        if (this.playerState[pid] === 'GAMEOVER') return null;

        const pill = this.nextPills[pid];
        this.nextPills[pid] = this.generatePill();

        // Check if spawn position is blocked
        if (this.grids[pid].isOccupied(0, 3) || this.grids[pid].isOccupied(0, 4)) {
            this.finishGame(pid === 0 ? 'P2' : 'P1');
            return null;
        }
        return pill;
    }

    async init() {
        await this.renderer.init();
    }

    private isDestroyed = false;

    start() {
        if (this.isDestroyed) return;
        this.running = true;
        requestAnimationFrame(this.loop);
    }

    destroy() {
        this.running = false;
        this.isDestroyed = true;
        this.input.destroy();
        this.renderer.destroy();
        GameAudio.stopMusic();
    }

    loop = (time: number) => {
        if (!this.running) return;
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        this.update(dt, time);
        this.draw();

        if (this.onStateUpdate) {
            this.onStateUpdate({
                scores: this.scores,
                virusesLeft: this.virusesLeft,
                nextPills: this.nextPills
            });
        }

        requestAnimationFrame(this.loop);
    };

    update(dt: number, time: number) {
        // Update particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.life -= dt;
            return p.life > 0;
        });

        if (this.isOnline && !this.isHost) {
            // Client: Send Input, Skip Logic
            const localInput = this.mergeInput(this.input.p1, this.input.p2);
            this.networkManager?.send({ type: 'INPUT', payload: localInput });
            return;
        }

        // Host or Solo (Logic)
        // Player 1
        if (this.playerState[0] === 'RESOLVING') {
            this.updateResolve(0, dt);
        } else if (this.playerState[0] === 'PLAYING') {
            let p1Input = this.mode === 'SOLO' ? this.input.p2 : this.input.p1;
            if (this.isOnline) p1Input = this.mergeInput(this.input.p1, this.input.p2);
            this.updateGrid(0, dt, time, p1Input);
        }

        // Player 2
        if (this.mode === 'MULTIPLAYER') {
            if (this.playerState[1] === 'RESOLVING') {
                this.updateResolve(1, dt);
            } else if (this.playerState[1] === 'PLAYING') {
                let p2Input = this.input.p2;
                if (this.isOnline && this.isHost) p2Input = this.remoteInput;
                this.updateGrid(1, dt, time, p2Input);
            }
        }

        if (this.isOnline && this.isHost) {
            this.broadcastState();
        }
    }

    broadcastState() {
        if (!this.networkManager) return;
        const state = {
            type: 'STATE',
            payload: {
                scores: this.scores,
                virusesLeft: this.virusesLeft,
                // Simplify pill sending if needed, but sending objects is okay for now
                activePills: this.activePills,
                nextPills: this.nextPills,
                g1: this.grids[0].cells,
                g2: this.grids[1]?.cells
            }
        };
        this.networkManager.send(state);
    }

    mergeInput(i1: PlayerInput, i2: PlayerInput): PlayerInput {
        return {
            left: i1.left || i2.left,
            right: i1.right || i2.right,
            up: i1.up || i2.up,
            down: i1.down || i2.down,
            rotateCW: i1.rotateCW || i2.rotateCW,
            rotateCCW: i1.rotateCCW || i2.rotateCCW
        };
    }

    updateGrid(pid: number, dt: number, time: number, input: any) {
        const pill = this.activePills[pid];
        const grid = this.grids[pid];
        if (!pill) return;

        const tryMove = (dx: number, dy: number) => {
            if (this.canMove(grid, pill, dx, dy, pill.rotation)) {
                pill.x += dx;
                pill.y += dy;
                return true;
            }
            return false;
        };

        // Input Handle
        if (input.left && time - this.lastInputTimes[pid][0] > 120) { tryMove(-1, 0); this.lastInputTimes[pid][0] = time; }
        if (input.right && time - this.lastInputTimes[pid][1] > 120) { tryMove(1, 0); this.lastInputTimes[pid][1] = time; }

        // Rotation
        if ((input.rotateCW || input.up) && time - this.lastInputTimes[pid][3] > 180) {
            GameAudio.playClick();
            const newRot = (pill.rotation + 90) % 360 as any;
            if (this.canMove(grid, pill, 0, 0, newRot)) pill.rotation = newRot;
            else if (this.canMove(grid, pill, -1, 0, newRot)) { pill.x--; pill.rotation = newRot; }
            else if (this.canMove(grid, pill, 1, 0, newRot)) { pill.x++; pill.rotation = newRot; }
            this.lastInputTimes[pid][3] = time;
        }

        // Gravity
        this.dropTimers[pid] += dt;
        let interval = this.dropInterval;
        if (input.down) interval = 0.05;

        if (this.dropTimers[pid] > interval) {
            this.dropTimers[pid] = 0;
            if (!tryMove(0, 1)) {
                GameAudio.playLand();
                this.lockPill(pid);
            }
        }
    }

    updateResolve(pid: number, dt: number) {
        this.resolveTimers[pid] += dt;
        if (this.resolveTimers[pid] < this.RESOLVE_DELAY) return;
        this.resolveTimers[pid] = 0;

        // Step 1: Apply Gravity (One step only)
        if (this.applyOneGravityStep(pid)) {
            // Something moved, render this frame and wait for next delay
            // Optional: GameAudio.playLand(); // Maybe too noisy
            return;
        }

        // Step 2: Check Matches
        if (this.findAndClearMatches(pid)) {
            // Matches found and cleared, wait for next delay
            return;
        }

        // Step 3: Stable
        this.playerState[pid] = 'PLAYING';
        this.activePills[pid] = this.spawnPill(pid);
    }

    applyOneGravityStep(pid: number): boolean {
        const grid = this.grids[pid];
        let moved = false;

        // Scan bottom to top
        for (let r = ROWS - 2; r >= 0; r--) {
            for (let c = 0; c < COLS; c++) {
                const cell = grid.cells[r][c];
                if (cell.type === CellType.EMPTY || (cell.type >= 1 && cell.type <= 3)) continue;

                // Check linkage
                let isLinked = false;
                if (cell.type === CellType.PILL_L) { isLinked = grid.get(r, c + 1)?.type === CellType.PILL_R; }
                else if (cell.type === CellType.PILL_R) { isLinked = grid.get(r, c - 1)?.type === CellType.PILL_L; }
                else if (cell.type === CellType.PILL_T) { isLinked = grid.get(r + 1, c)?.type === CellType.PILL_B; }
                else if (cell.type === CellType.PILL_B) { isLinked = grid.get(r - 1, c)?.type === CellType.PILL_T; }

                if (!isLinked && cell.type !== CellType.PILL_DOT) {
                    // Break link
                    cell.type = CellType.PILL_DOT;
                    // We don't return true yet, we just broke it. It will fall in next iteration or this one if we process correctly.
                    // But strictly speaking, type change is a visual change.
                    moved = true;
                }

                // Try fall
                if (cell.type === CellType.PILL_DOT) {
                    if (!grid.isOccupied(r + 1, c)) {
                        grid.set(r + 1, c, cell);
                        grid.cells[r][c].type = CellType.EMPTY;
                        moved = true;
                    }
                }
                else if (cell.type === CellType.PILL_L && isLinked) {
                    // Horizontal
                    if (!grid.isOccupied(r + 1, c) && !grid.isOccupied(r + 1, c + 1)) {
                        const cellR = grid.cells[r][c + 1];
                        grid.set(r + 1, c, cell);
                        grid.set(r + 1, c + 1, cellR);
                        grid.cells[r][c].type = CellType.EMPTY;
                        grid.cells[r][c + 1].type = CellType.EMPTY;
                        moved = true;
                    }
                }
                else if (cell.type === CellType.PILL_B && isLinked) {
                    // Vertical (B on bottom)
                    if (!grid.isOccupied(r + 1, c)) {
                        const cellT = grid.cells[r - 1][c];
                        grid.set(r + 1, c, cell);
                        grid.set(r, c, cellT);
                        grid.cells[r - 1][c].type = CellType.EMPTY;
                        moved = true;
                    }
                }
            }
        }
        return moved;
    }

    findAndClearMatches(pid: number): boolean {
        const grid = this.grids[pid];
        const toClear = new Set<string>();

        // Check Horiz
        for (let r = 0; r < ROWS; r++) {
            let count = 1;
            for (let c = 1; c < COLS; c++) {
                if (grid.cells[r][c].type !== CellType.EMPTY && grid.cells[r][c].color === grid.cells[r][c - 1].color) {
                    count++;
                } else {
                    if (count >= 4) {
                        for (let k = 1; k <= count; k++) toClear.add(`${r},${c - k}`);
                    }
                    count = 1;
                }
            }
            if (count >= 4) {
                for (let k = 1; k <= count; k++) toClear.add(`${r},${COLS - k}`);
            }
        }

        // Check Vert
        for (let c = 0; c < COLS; c++) {
            let count = 1;
            for (let r = 1; r < ROWS; r++) {
                if (grid.cells[r][c].type !== CellType.EMPTY && grid.cells[r][c].color === grid.cells[r - 1][c].color) {
                    count++;
                } else {
                    if (count >= 4) {
                        for (let k = 1; k <= count; k++) toClear.add(`${r - k},${c}`);
                    }
                    count = 1;
                }
            }
            if (count >= 4) {
                for (let k = 1; k <= count; k++) toClear.add(`${ROWS - k},${c}`);
            }
        }

        if (toClear.size > 0) {
            GameAudio.playVirusDeath();
            let virusKilled = false;
            toClear.forEach(key => {
                const [r, c] = key.split(',').map(Number);
                const cell = grid.cells[r][c];

                // Spawn particles
                this.spawnExplosion(pid, c, r, cell.color);

                if (cell.type >= 1 && cell.type <= 3) {
                    this.scores[pid] += 100;
                    virusKilled = true;
                } else {
                    this.scores[pid] += 10;
                }
                grid.cells[r][c].type = CellType.EMPTY;
            });

            if (virusKilled) {
                this.virusesLeft[pid] = this.countViruses(pid);
                if (this.virusesLeft[pid] === 0) {
                    this.finishGame(pid === 0 ? 'P1' : 'P2');
                }
            }
            return true;
        }
        return false;
    }

    spawnExplosion(pid: number, c: number, r: number, colorIdx: number) {
        const offsetX = pid === 0 ? BOARD_OFFSET_X : BOARD_OFFSET_X + 600;
        const x = offsetX + c * CELL_SIZE + CELL_SIZE / 2;
        const y = BOARD_OFFSET_Y + r * CELL_SIZE + CELL_SIZE / 2;

        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                color: COLORS[colorIdx],
                life: 0.5 + Math.random() * 0.3,
                maxLife: 0.8
            });
        }
    }

    canMove(grid: DrMarioGrid, pill: Pill, dx: number, dy: number, rot: number) {
        const { x1, y1, x2, y2 } = this.getPillCoords(pill.x + dx, pill.y + dy, rot);
        return !grid.isOccupied(y1, x1) && !grid.isOccupied(y2, x2);
    }

    getPillCoords(x: number, y: number, rot: number) {
        let x1 = x, y1 = y;
        let x2 = x, y2 = y;
        if (rot === 0) { x2 = x + 1; }
        else if (rot === 90) { y2 = y - 1; }
        else if (rot === 180) { x2 = x - 1; }
        else if (rot === 270) { y2 = y + 1; }
        return { x1, y1, x2, y2 };
    }

    lockPill(pid: number) {
        const pill = this.activePills[pid];
        const grid = this.grids[pid];
        if (!pill) return;

        const { x1, y1, x2, y2 } = this.getPillCoords(pill.x, pill.y, pill.rotation);

        if (y1 < 0 || y2 < 0) {
            this.finishGame(pid === 0 ? 'P2' : 'P1');
            return;
        }

        // Map pill parts to correct types
        let t1 = CellType.PILL_DOT, t2 = CellType.PILL_DOT;
        if (pill.rotation === 0) { t1 = CellType.PILL_L; t2 = CellType.PILL_R; }
        else if (pill.rotation === 90) { t1 = CellType.PILL_B; t2 = CellType.PILL_T; }
        else if (pill.rotation === 180) { t1 = CellType.PILL_R; t2 = CellType.PILL_L; }
        else if (pill.rotation === 270) { t1 = CellType.PILL_T; t2 = CellType.PILL_B; }

        grid.set(y1, x1, { type: t1, color: pill.c1 });
        grid.set(y2, x2, { type: t2, color: pill.c2 });

        this.activePills[pid] = null;
        this.playerState[pid] = 'RESOLVING';
        this.resolveTimers[pid] = 0;
        // Trigger immediate check next frame
    }

    finishGame(winner: 'P1' | 'P2') {
        if (!this.running) return;
        this.running = false;
        GameAudio.playGameOver();
        this.playerState = ['GAMEOVER', 'GAMEOVER']; // Stop all processing
        const result: GameResult = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            mode: this.mode,
            winner,
            scoreP1: this.scores[0],
            scoreP2: this.scores[1] || 0,
            durationSeconds: Math.floor((Date.now() - this.lastTime) / 1000)
        };

        // Save to history
        const history = JSON.parse(localStorage.getItem('dr_mario_history') || '[]');
        history.push(result);
        localStorage.setItem('dr_mario_history', JSON.stringify(history));

        this.onGameOver(result);

        if (this.isOnline && this.isHost) {
            this.networkManager?.send({ type: 'GAMEOVER', winner });
        }
    }

    draw() {
        const sprites: RenderSprite[] = [];
        BOARD_OFFSET_X = this.canvas.width / 2 - (COLS * CELL_SIZE) / 2;
        if (this.mode === 'MULTIPLAYER') BOARD_OFFSET_X -= 300;

        this.drawGrid(0, sprites);
        if (this.mode === 'MULTIPLAYER') this.drawGrid(1, sprites);

        // Draw Particles
        for (const p of this.particles) {
            sprites.push({
                x: p.x, y: p.y,
                w: 6, h: 6,
                color: [p.color[0], p.color[1], p.color[2], p.life / p.maxLife], // Fade out
                typeId: 0
            });
        }

        this.renderer.render(sprites);
    }

    drawGrid(pid: number, sprites: RenderSprite[]) {
        const offsetX = pid === 0 ? BOARD_OFFSET_X : BOARD_OFFSET_X + 600;
        const offsetY = BOARD_OFFSET_Y;
        const grid = this.grids[pid];

        // Board background
        sprites.push({ x: offsetX - 4, y: offsetY - 4, w: COLS * CELL_SIZE + 8, h: ROWS * CELL_SIZE + 8, color: [0, 0, 0, 0.8], typeId: 0 });

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = grid.cells[r][c];
                if (cell.type !== CellType.EMPTY) {
                    let typeId = 0;
                    if (cell.type >= 1 && cell.type <= 3) typeId = 1; // Virus
                    else if (cell.type === CellType.PILL_L) typeId = 10;
                    else if (cell.type === CellType.PILL_R) typeId = 11;
                    else if (cell.type === CellType.PILL_T) typeId = 12;
                    else if (cell.type === CellType.PILL_B) typeId = 13;
                    else typeId = 14; // Dot

                    sprites.push({
                        x: offsetX + c * CELL_SIZE, y: offsetY + r * CELL_SIZE,
                        w: CELL_SIZE, h: CELL_SIZE, color: COLORS[cell.color] as any, typeId
                    });
                }
            }
        }

        const pill = this.activePills[pid];
        if (pill) {
            const { x1, y1, x2, y2 } = this.getPillCoords(pill.x, pill.y, pill.rotation);
            let t1 = 0, t2 = 0;
            if (pill.rotation === 0) { t1 = 10; t2 = 11; }
            else if (pill.rotation === 90) { t1 = 13; t2 = 12; }
            else if (pill.rotation === 180) { t1 = 11; t2 = 10; }
            else if (pill.rotation === 270) { t1 = 12; t2 = 13; }

            sprites.push({ x: offsetX + x1 * CELL_SIZE, y: offsetY + y1 * CELL_SIZE, w: CELL_SIZE, h: CELL_SIZE, color: COLORS[pill.c1] as any, typeId: t1 });
            sprites.push({ x: offsetX + x2 * CELL_SIZE, y: offsetY + y2 * CELL_SIZE, w: CELL_SIZE, h: CELL_SIZE, color: COLORS[pill.c2] as any, typeId: t2 });
        }
    }
}
