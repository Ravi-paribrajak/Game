
//1.  Lockdown the allowed type of terrians:
export type TerrainType = 'obstacle' | 'grass' | 'water';

// 2. Define the exact shape of a single cell
export interface Tile{
    id: string;
    x: number;       // The X Coordinate
    y: number;       // The Y Coordinate
    terrain: TerrainType;
    isWalkable: boolean;
    occupant: string | null;  // null if empty, otherwise a player ID
}

// 3. Define the Board state using the Tile interface
export type GameBoard = Tile[][];