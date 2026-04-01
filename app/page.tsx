"use client";

import { GameBoard, TerrainType, Tile } from "@/types/Tile";
import { useState } from "react";

const COLOR_MAP: Record<TerrainType, string> = {
  'grass': "bg-green-500",
  'water': "bg-blue-500",
  'obstacle': "bg-gray-500"
}

export function generateInitialBoard(): GameBoard {
  const board: GameBoard = [];
  const terrainTypes: TerrainType[] = ['grass', 'water', 'obstacle'];

  for (let y = 0; y < 10; y++) {

    const row: Tile[] = [];

    for (let x = 0; x < 10; x++) {
      let currentTerrain = terrainTypes[Math.floor(Math.random() * terrainTypes.length)];
      let currentOccupant: string | null = null;

      if (x === 0 && y === 0) {
        currentOccupant = "player1";
        currentTerrain = "grass";
      }

      const isWalkable = currentTerrain !== 'obstacle';
      const tile = {
        id: `${x}-${y}`,
        x: x,
        y: y,
        terrain: currentTerrain,
        isWalkable: isWalkable,
        occupant: currentOccupant
      }
      row.push(tile);
    }

    board.push(row);
  }

  return board;
}

export default function Home() {

  const [board, setBoard] = useState<GameBoard>(generateInitialBoard());


  return (
    <div className="flex-col items-center justify-center min-h-screen py-2 text-black">

      <div className="flex items-center justify-center text-white">

        <h1>Game Board</h1>
      </div>
      <div className="flex-col items-center justify-center">
        {board.map(row => (
          <div key={row[0].y} className="flex gap-3 items-center justify-center">
            {row.map(tile => (
              <div key={tile.id}  className={`flex relative items-center justify-center w-20 h-16 my-1 border border-amber-400 ${COLOR_MAP[tile.terrain]}`}>
                {tile.terrain}
                {tile.occupant != null && <div className="h-4 w-4 rounded-full bg-black absolute"></div>}
              </div>
              

            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
