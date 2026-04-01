"use client";

import { GameBoard, TerrainType, Tile } from "@/types/Tile";
import { UnitType, PlayerId, Unit } from "@/types/Unit";
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

      if (x === 0 && y === 0) {
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
export function generateInitialUnits(): Unit[] {
  const units: Unit[] = [
    {
      id: "p1-soldier-1",
      type: "soldier",
      health: 100,
      attack: 20,
      defense: 10,
      ownership: "player1",
      x: 0,
      y: 0
    },
    {
      id: "p1-archer-1",
      type: "archer",
      health: 80,
      attack: 30,
      defense: 5,
      ownership: "player1",
      x: 0,
      y: 1
    },
    {
      id: "p2-tank-1",
      type: "tank",
      health: 200,
      attack: 50,
      defense: 40,
      ownership: "player2",
      x: 8,
      y: 9
    }
  ];
  return units;
}

export default function Home() {

  const [board, setBoard] = useState<GameBoard>(generateInitialBoard());
  const [units, setUnits] = useState<Unit[]>(generateInitialUnits());
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const handleMove = (dx: number, dy: number) => {

    // 1. Abort if no Unit is selected
    if (!selectedUnitId) {
      return;
    }

    // 2. Find the selected unit's current data
    const selectedUnit = units.find(unit => unit.id === selectedUnitId);
    if (!selectedUnit) {
      return; // This should never happen, but we check just in case
    }

    const newX = selectedUnit.x + dx;
    const newY = selectedUnit.y + dy;

    // 3. Check boundaries
    if (newX < 0 || newX >= board[0].length || newY < 0 || newY >= board.length) {
      return; // out of bounds 
    }

    // 4. Check if the new tile is walkable
    if (!board[newY][newX].isWalkable) {
      return; // can't move into an obstacle
    }

    // 5. Check for unit collisions (Is someone already standing there?)
    const isTileOccupied = units.some(unit => unit.x === newX && unit.y === newY);
    if (isTileOccupied) {
      return; // Block movement! (Later, this might trigger an attack instead)
    }

    // 6. Update the state immutably
    const updatedUnits = units.map(unit => {
      if (unit.id === selectedUnitId) {
        // Return a copy of the moving unit with new coordinates
        return { ...unit, x: newX, y: newY };
      }
      // Return all other units exactly as they are
      return unit;
    });
    setUnits(updatedUnits);
  };
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
  }, [selectedUnitId, units, board]);

  return (
    <div className="flex-col items-center justify-center min-h-screen py-2 text-black">

      <div className="flex items-center justify-center text-white">

        <h1>Game Board</h1>
      </div>
      <div className="flex-col items-center justify-center">
        {board.map(row => (

          <div key={row[0].y} className="flex gap-3 items-center justify-center">
            {row.map(tile => {
              // 1. Do the math BEFORE returning JSX
              const unitOnTile = units.find(unit => unit.x === tile.x && unit.y === tile.y);
              const isSelected = selectedUnitId === unitOnTile?.id;

              // 2. Return the clean JSX
              return (
                <div
                  key={tile.id}
                  className={`flex relative items-center justify-center w-20 h-16 my-1 border border-amber-400 ${COLOR_MAP[tile.terrain]}`}
                  onClick={() => {
                    if (unitOnTile) {
                      setSelectedUnitId(unitOnTile.id);
                    } else {
                      setSelectedUnitId(null);
                    }
                  }}
                >
                  {/* Terrain Text (made it slightly faded so it doesn't distract from units) */}
                  <span className="opacity-50 text-xs">{tile.terrain}</span>

                  {/* Render the Unit if it exists */}
                  {unitOnTile && (
                    <div className={`
                              absolute w-8 h-8 rounded-full flex items-center justify-center text-white font-bold
                              ${unitOnTile.ownership === 'player1' ? 'bg-blue-600' : 'bg-red-600'}
                              ${isSelected ? 'ring-4 ring-yellow-500' : ''}
                              `}>
                      {unitOnTile.type.charAt(0).toUpperCase()}
                    </div>
                  )}

                </div>
              );


            })}
          </div>
        ))}
      </div>
    </div>
  );
}
