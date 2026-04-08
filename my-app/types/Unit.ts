
// 1. Lockdown the allowed type of Units:
export type UnitType = "soldier" | "archer" | "tank";

// 2. Defining multiplayer game state
export type PlayerId = "player1" | "player2" | "neutral";

// 3. Define the exact shape of a single Unit
export interface Unit {
    id: string;
    type: UnitType;
    health: number;
    attack: number;
    defense: number;
    ownership: PlayerId;
    x: number; // X Coordinate on the board
    y: number; // Y Coordinate on the board
}

