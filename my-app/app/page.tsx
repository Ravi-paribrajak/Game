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

export default function Home() {
  const [board, setBoard] = useState<GameBoard>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [currentTurn, setCurrentTurn] = useState<string>('player1');
  const [myRole, setMyRole] = useState<string>('spectator'); // NEW: Track if I'm player1, player2, or spectator

  // FIXED: Hook is safely inside the component
  const [socket, setSocket] = useState<any>(null);

  // FIXED: Merged into a single, clean connection cycle
  useEffect(() => {
    const newSocket = io("http://localhost:3001");
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("✅ Connected to game server! My ID:", newSocket.id);
    });

    newSocket.on('assignRole', (role) => {
      console.log(`🎭 I have been assigned the role: ${role}`);
      setMyRole(role);
    })

    newSocket.on("initialGameState", (serverState) => {
      console.log("📥 Received master state from server!", serverState);
      setBoard(serverState.board);
      setUnits(serverState.units);
      setCurrentTurn(serverState.currentTurn);
    });

    newSocket.on("gameStateUpdate", (serverState) => {
      setUnits(serverState.units);
      setCurrentTurn(serverState.currentTurn);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleMove = (dx: number, dy: number) => {
    if (!selectedUnitId || !socket) return;

    socket.emit("requestMove", {
      unitId: selectedUnitId,
      dx,
      dy
    });
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
  }, [selectedUnitId, units, board, socket]);

  return (
    <div className="flex-col items-center justify-center min-h-screen py-2 text-black">
      <div className="flex items-center justify-center text-white mb-4 flex-col">
        <h1 className="text-2xl font-bold">Game Board</h1>
        <h2>{`You are Playing as: ${myRole}`}</h2>
        <div className={`px-4 py-2 rounded font-bold uppercase tracking-wider mb-4 
              ${currentTurn === 'player1' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
          {currentTurn === 'player1' ? "Blue Player's Turn" : "Red Player's Turn"}
        </div>
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
                      if (unitOnTile.ownership === myRole) {
                        setSelectedUnitId(unitOnTile.id);
                      }
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