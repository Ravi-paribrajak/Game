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
    units: generateInitialUnits(),
    currentTurn: 'player1'  // NEW: Player 1 always goes first
}

let connectedPlayer = 0;
// NEW: Dictionary to map socket.id to 'player1', 'player2', or 'spectator'
const playerRoles = {};

// This is the main event listener. It triggers the moment browser connects to the server
io.on('connection', (socket) => {
    connectedPlayer++;
    // 1. Assign Role logic
    let assignedRole = 'spectator'; // default role
    const currentRole = Object.values(playerRoles);

    if (!currentRole.includes('player1')) {
        assignedRole = 'player1';
    }
    else if (!currentRole.includes('player2')) {
        assignedRole = 'player2';
    }

    // Save to roster
    playerRoles[socket.id] = assignedRole;

    console.log(`🔌 A new player connected! ID: ${socket.id} has connected`);
    console.log(`Total players online: ${connectedPlayer}`);

    // 2. Tell the client who they are!
    socket.emit('assignRole', assignedRole);

    socket.emit('initialGameState', gameState); // Send the initial game state to the newly connected player
 
    // Listen for move requests from the client
    socket.on('requestMove', (moveData) => {
        const { unitId, dx, dy } = moveData;

        const myRole = playerRoles[socket.id];

        // BOUNCER 1: Spectators cannot play!
        if (myRole === 'spectator') {
            return; // Spectators can't play, ignore the move
        }

        // 1. Find the unit in the SERVER's master state
        const selectedUnit = gameState.units.find(u => u.id === unitId);
        
        // SAFETY CHECK FIRST: Does the unit exist?
        if (!selectedUnit) {
            return; // If the unit doesn't exist, ignore the request
        }

        // BOUNCER 2: You cannot move the opponent's pieces!
        if (selectedUnit.ownership !== myRole) {
            return;
        }

        // BOUNCER 3: Is it your turn?
        if (selectedUnit.ownership !== gameState.currentTurn) {
            return; // Ignore the move if it's not the player's turn
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

                // Flip the turn
                gameState.currentTurn = gameState.currentTurn === 'player1' ? 'player2' : 'player1';

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

        // FIXED: Flip the turn after a successful normal move!
        gameState.currentTurn = gameState.currentTurn === 'player1' ? 'player2' : 'player1';

        // Broadcast the updated units to EVERYONE!
        io.emit('gameStateUpdate', gameState);
    });

    // This event will trigger when the player closes it's browser or disconnects from the server
    socket.on('disconnect', () => {
        connectedPlayer--;
        delete playerRoles[socket.id]; // Free up the role!
        console.log(`❌ Player disconnected: ${socket.id} has disconnected`);
        console.log(`Total players online: ${connectedPlayer}`);
    });
});

// Start the server on port 3001:
server.listen(3001, () => {
    console.log('🚀 Game Server is running on http://localhost:3001');
});
