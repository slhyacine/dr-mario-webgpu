export const COLS = 8;
export const ROWS = 16;

export enum CellType {
    EMPTY = 0,
    // Viruses
    VIRUS_R = 1,
    VIRUS_Y = 2,
    VIRUS_B = 3,
    // Pill Parts (Standard segments)
    PILL_L = 4,   // Left part of horizontal pill
    PILL_R = 5,   // Right part
    PILL_T = 6,   // Top part of vertical pill
    PILL_B = 7,   // Bottom part
    PILL_DOT = 8, // Single pill part (after match)
}

export enum PillColor {
    RED = 0,
    YELLOW = 1,
    BLUE = 2
}

export interface Cell {
    type: CellType;
    color: PillColor;
}

export class DrMarioGrid {
    cells: Cell[][];

    constructor() {
        this.cells = Array(ROWS).fill(null).map(() =>
            Array(COLS).fill(null).map(() => ({ type: CellType.EMPTY, color: PillColor.RED }))
        );
    }

    initLevel(level: number) {
        // Clear
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                this.cells[r][c].type = CellType.EMPTY;
            }
        }

        let virusCount = Math.min((level + 1) * 4, 80);
        let placed = 0;
        while (placed < virusCount) {
            const r = Math.floor(Math.random() * (ROWS - 5)) + 5;
            const c = Math.floor(Math.random() * COLS);
            if (this.cells[r][c].type === CellType.EMPTY) {
                const color = Math.floor(Math.random() * 3);
                this.cells[r][c] = { type: CellType.VIRUS_R + color, color: color as PillColor };
                placed++;
            }
        }
    }

    get(r: number, c: number): Cell | null {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
        return this.cells[r][c];
    }

    set(r: number, c: number, cell: Cell) {
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
            this.cells[r][c] = { ...cell };
        }
    }

    isOccupied(r: number, c: number) {
        if (c < 0 || c >= COLS || r >= ROWS) return true; // Walls/Floor
        if (r < 0) return false; // Spawning zone
        return this.cells[r][c].type !== CellType.EMPTY;
    }
}
