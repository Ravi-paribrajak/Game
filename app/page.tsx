"use client";

import { GameBoard, TerrainType, Tile } from "@/types/Tile";
import {UnitType, playerId, Unit} from "@/types/Unit";
import { useState, useEffect } from "react";

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

      if(x === 0 && y === 0) {
        currentTerrain = 'grass'; // Ensure starting position is walkable
      }

      const isWalkable = currentTerrain !== 'obstacle';
      const tile = {
        id: `${x}-${y}`,
        x: x,
        y: y,
        terrain: currentTerrain,
        isWalkable: isWalkable,
      }
      row.push(tile);
    }

    board.push(row);
  }

  return board;
}

export default function Home() {

  const [board, setBoard] = useState<GameBoard>(generateInitialBoard());
  const [playerPosition, setPlayerPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  

  const handleMove = (dx: number, dy: number) => {

    let currentX = playerPosition.x;
    let currentY = playerPosition.y;

    const newX = currentX + dx;
    const newY = currentY + dy;

    // Check boundaries
    if (newX < 0 || newX >= board[0].length || newY < 0 || newY >= board.length) {
      return; // out of bounds 
    }

    // Check if the new tile is walkable
    if (!board[newY][newX].isWalkable) {
      return; // can't move into an obstacle
    }

    // Move the player
    setPlayerPosition({ x: newX, y: newY });

  }
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          handleMove(0, -1);
          break;
        case 'ArrowDown':
          handleMove(0, 1);
          break;
        case 'ArrowLeft':
          handleMove(-1, 0);
          break;
        case 'ArrowRight':
          handleMove(1, 0);
          break;
      }
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [playerPosition, board]);


  return (
    <div className="flex-col items-center justify-center min-h-screen py-2 text-black">

      <div className="flex items-center justify-center text-white">

        <h1>Game Board</h1>
      </div>
      <div className="flex-col items-center justify-center">
        {board.map(row => (
          <div key={row[0].y} className="flex gap-3 items-center justify-center">
            {row.map(tile => (
              <div key={tile.id} className={`flex relative items-center justify-center w-20 h-16 my-1 border border-amber-400 ${COLOR_MAP[tile.terrain]}`}>
                {tile.terrain}
                {tile.x === playerPosition.x && tile.y === playerPosition.y && <div className="h-4 w-4 rounded-full bg-black absolute"></div>}
              </div>


            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
