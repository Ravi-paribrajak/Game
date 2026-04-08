const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

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
let connectedPlayer = 0;

// This is the main event listener. It triggers the moment browser connects to the server
io.on('connection', (socket) => {
    connectedPlayer++;
    console.log(`🔌 A new player connected! ID: ${socket.id} has connected`);
    console.log(`Total players online: ${connectedPlayer}`);

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
