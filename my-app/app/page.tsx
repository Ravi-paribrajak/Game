"use client";

import { io } from "socket.io-client";
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
  // FIX 1: Weighted Randomness.
  // Now there is a 60% chance for grass, 20% for water, 20% for obstacles.
  const terrainTypes: TerrainType[] = ['grass', 'grass', 'grass', 'water', 'obstacle'];

  for (let y = 0; y < 10; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < 10; x++) {
      let currentTerrain = terrainTypes[Math.floor(Math.random() * terrainTypes.length)];

      // FIX 2: Create Safe Zones for both players.
      // This ensures the 2x2 grid in the top-left and bottom-right are always clear.
      const isPlayer1SafeZone = x <= 1 && y <= 1;
      const isPlayer2SafeZone = x >= 8 && y >= 8;

      if (isPlayer1SafeZone || isPlayer2SafeZone) {
        currentTerrain = 'grass';
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
  return [
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
      health: 100,
      attack: 40,
      defense: 15,
      ownership: "player2",
      x: 8,
      y: 9
    }
  ];
}

export default function Home() {

  const [board, setBoard] = useState<GameBoard>(generateInitialBoard());
  const [units, setUnits] = useState<Unit[]>(generateInitialUnits());
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  // New: The multiplayer connection HOOK:
useEffect(() => {
  // 1. Dial the server
  const socket = io("http://localhost:3001"); // connect to our backend server

  // 2. Listen for a successful connection
  socket.on("connect", () => {
    console.log("✅ Connected to game server! My ID:", socket.id);
  });

  // 3. The cleanup function which will run after player is disconnected
  return () => {
    socket.disconnect();
  }

}, []);  // <-- Empty dependency array means run once on mount and cleanup on unmount


  const handleMove = (dx: number, dy: number) => {

    // 1. Abort if no Unit is selected
    if (!selectedUnitId) return;

    // 2. Find the selected unit's current data
    const selectedUnit = units.find(unit => unit.id === selectedUnitId);
    if (!selectedUnit) return;

    const newX = selectedUnit.x + dx;
    const newY = selectedUnit.y + dy;

    // 3. Check boundaries
    if (newX < 0 || newX >= board[0].length || newY < 0 || newY >= board.length) return;

    // 4. Check if the new tile is walkable
    if (!board[newY][newX].isWalkable) return;

    // 5. Check for unit collisions
    const targetUnit = units.find(unit => unit.x === newX && unit.y === newY);

    if (targetUnit) {
      if (targetUnit.ownership === selectedUnit.ownership) {
        return; // Friendly fire blocked
      } else {
        // --- PATH B: COMBAT ---
        let attacker = selectedUnit;
        let defender = targetUnit;

        let damageToDefender = Math.floor(attacker.attack * (100 / (100 + defender.defense)));
        let damageToAttacker = Math.max(Math.floor(defender.attack * (100 / (100 + attacker.defense))), 0);

        let nextUnits = units.map(unit => {
          if (unit.id === targetUnit.id) {
            return { ...unit, health: unit.health - damageToDefender };
          }
          if (unit.id === selectedUnit.id) {
            return { ...unit, health: unit.health - damageToAttacker };
          }
          return unit;
        });

        // Filter out the dead units!
        nextUnits = nextUnits.filter(unit => unit.health > 0);

        // Save the state ONCE and return so we don't accidentally move
        setUnits(nextUnits);

        // Deselect the unit if it died in combat!
        if (selectedUnit.health - damageToAttacker <= 0) {
          setSelectedUnitId(null);
        }
        return;
      }
    }

    // --- PATH A: MOVEMENT ---
    // If we reach down here, there was no targetUnit. Safe to move!
    const nextUnits = units.map(unit => {
      if (unit.id === selectedUnitId) {
        return { ...unit, x: newX, y: newY };
      }
      return unit;
    });

    setUnits(nextUnits);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp': handleMove(0, -1); break;
        case 'ArrowDown': handleMove(0, 1); break;
        case 'ArrowLeft': handleMove(-1, 0); break;
        case 'ArrowRight': handleMove(1, 0); break;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedUnitId, units, board]);

  return (
    <div className="flex-col items-center justify-center min-h-screen py-2 text-black">
      <div className="flex items-center justify-center text-white mb-4">
        <h1 className="text-2xl font-bold">Game Board</h1>
      </div>

      <div className="flex-col items-center justify-center">
        {board.map(row => (
          <div key={row[0].y} className="flex gap-1 items-center justify-center">
            {row.map(tile => {

              const unitOnTile = units.find(unit => unit.x === tile.x && unit.y === tile.y);
              const isSelected = selectedUnitId === unitOnTile?.id;

              return (
                <div
                  key={tile.id}
                  className={`flex relative items-center justify-center w-20 h-20 border border-amber-400 ${COLOR_MAP[tile.terrain]}`}
                  onClick={() => {
                    if (unitOnTile) {
                      setSelectedUnitId(unitOnTile.id);
                    } else {
                      setSelectedUnitId(null);
                    }
                  }}
                >
                  <span className="opacity-50 text-xs absolute top-1">{tile.terrain}</span>

                  {unitOnTile && (
                    <>
                      <div className={`
                        absolute w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg cursor-pointer
                        ${unitOnTile.ownership === 'player1' ? 'bg-blue-600' : 'bg-red-600'}
                        ${isSelected ? 'ring-4 ring-yellow-400 scale-110 transition-transform' : ''}
                      `}>
                        {unitOnTile.type.charAt(0).toUpperCase()}
                      </div>

                      {/* Health UI Added Here */}
                      <div className="text-[11px] absolute bottom-1 bg-white/80 px-1 rounded text-black font-bold">
                        {unitOnTile.health} HP
                      </div>
                    </>
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