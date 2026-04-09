const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

function generateInitialBoard() {
    const board = [];
    // FIX 1: Weighted Randomness.
    // Now there is a 60% chance for grass, 20% for water, 20% for obstacles.
    const terrainTypes = ['grass', 'grass', 'grass', 'water', 'obstacle'];

    for (let y = 0; y < 10; y++) {
        const row = [];
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

function generateInitialUnits() {
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

// Configuring CORS for our app is running at localhost:3000
// without this the browser will block the connection to our server
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

// Eventually we will move our generateInitialBoard and generateInitialUnit function here
// The master state will live in the server memory and the clients will send updates to the server which will then broadcast the new state to all clients
let gameState = {
    board: generateInitialBoard(),
    units: generateInitialUnits()
}

let connectedPlayer = 0;

// This is the main event listener. It triggers the moment browser connects to the server
io.on('connection', (socket) => {
    connectedPlayer++;
    console.log(`🔌 A new player connected! ID: ${socket.id} has connected`);
    console.log(`Total players online: ${connectedPlayer}`);
    socket.emit('initialGameState', gameState); // Send the initial game state to the newly connected player
    // Listen for move requests from the client
    socket.on('requestMove', (moveData) => {
        const { unitId, dx, dy } = moveData;

        // 1. Find the unit in the SERVER's master state
        const selectedUnit = gameState.units.find(u => u.id === unitId);
        if (!selectedUnit) {
            return; // If the unit doesn't exist, ignore the request
        }

        const newX = selectedUnit.x + dx;
        const newY = selectedUnit.y + dy;

        // 2. validate the move (check bounds, check for obstacles, etc.)
        if (newX < 0 || newX >= 10 || newY < 0 || newY >= 10) {
            return; // Move is out of bounds, ignore it
        }

        // 3. Check walkability using SERVER state
        if (!gameState.board[newY][newX].isWalkable) {
            return; // can't move into an obstacle, ignore the move
        }

        // 4. Collision & Combat (our exact math, but updating gameState!)
        const targetUnit = gameState.units.find(u => u.x === newX && u.y === newY);

        if (targetUnit) {
            if (targetUnit.ownership === selectedUnit.ownership) {
                return; // Friendly fire blocked!
            } else {
                //Combat
                let damageToDefender = Math.max(selectedUnit.attack - targetUnit.defense, 0);
                let damageToAttacker = Math.max(targetUnit.attack - selectedUnit.defense, 0);

                gameState.units = gameState.units.map(unit => {
                    if (unit.id === targetUnit.id) {
                        return {
                            ...unit,
                            health: unit.health - damageToDefender
                        }
                    }
                    if (unit.id === selectedUnit.id) {
                        return {
                            ...unit,
                            health: unit.health - damageToAttacker
                        }
                    }
                    return unit;
                });
                // Filter out dead units
                gameState.units = gameState.units.filter(unit => unit.health > 0);

                // Broadcast the updated units to EVERYONE!
                io.emit('gameStateUpdate', gameState);
                return;
            }
        }
        // --- MOVEMENT ---
        // If no target, update the unit's coordinates
        gameState.units = gameState.units.map(unit => {
            if (unit.id === selectedUnit.id) {
                return {
                    ...unit,
                    x: newX,
                    y: newY
                }
            }
            return unit;
        });
        // Broadcast the updated units to EVERYONE!
        io.emit('gameStateUpdate', gameState);
    });

    // This event will trigger when the player closes it's browser or disconnects from the server
    socket.on('disconnect', () => {
        connectedPlayer--;
        console.log(`❌ Player disconnected: ${socket.id} has disconnected`);
        console.log(`Total players online: ${connectedPlayer}`);
    });
});

// Start the server on port 3001:
server.listen(3001, () => {
    console.log('🚀 Game Server is running on http://localhost:3001');
});
