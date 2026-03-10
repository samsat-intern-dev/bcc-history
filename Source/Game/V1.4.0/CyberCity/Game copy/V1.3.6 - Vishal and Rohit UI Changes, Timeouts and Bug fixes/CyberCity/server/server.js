const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const axios = require('axios');
const path = require('path');
const os = require('os'); // Added for os.networkInterfaces()
const fs = require('fs'); // Added for file system operations

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const INACTIVITY_TIMEOUT = 200000; //amount of milliseconds you want prior to timeout

app.use(express.static(path.join(__dirname, '../clients')));

// Function to read configuration from config.json
function readConfig() {
    try {
        const configPath = path.join(__dirname, '../config.json');
        if (fs.existsSync(configPath)) {
            const configContent = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configContent);
            console.log('Configuration loaded from config.json');
            return config;
        }
    } catch (error) {
        console.log('Could not read config.json:', error.message);
    }
    return null;
}

// Function to read IP from server_ip.txt
function readServerIPFile() {
    try {
        const ipFilePath = path.join(__dirname, '../server_ip.txt');
        if (fs.existsSync(ipFilePath)) {
            const content = fs.readFileSync(ipFilePath, 'utf8');
            const lines = content.split('\n').map(line => line.trim());
            
            // Find first non-empty line that doesn't start with #
            for (const line of lines) {
                if (line && !line.startsWith('#') && line.length > 0) {
                    console.log('IP address loaded from server_ip.txt:', line);
                    return line;
                }
            }
        }
    } catch (error) {
        console.log('Could not read server_ip.txt:', error.message);
    }
    return null;
}

// Function to validate IP address format
function isValidIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
}

// Function to get the configured server IP - ALWAYS uses config, never localhost
function getConfiguredServerIP() {
    // ALWAYS try config.json first - this is the priority
    const config = readConfig();
    if (config && config.server && config.server.wlan_ip && config.server.wlan_ip.trim()) {
        const configuredIP = config.server.wlan_ip.trim();
        if (isValidIP(configuredIP)) {
            console.log(`Using configured IP from config.json: ${configuredIP}`);
            return configuredIP;
        } else {
            console.error(`INVALID IP ADDRESS in config.json: ${configuredIP}`);
            console.error('Please fix the IP address in config.json!');
            return configuredIP; // Use it anyway since user explicitly set it
        }
    }
    
    // Try server_ip.txt next
    const fileIP = readServerIPFile();
    if (fileIP && isValidIP(fileIP)) {
        console.log(`Using IP from server_ip.txt: ${fileIP}`);
        return fileIP;
    } else if (fileIP) {
        console.error(`INVALID IP ADDRESS in server_ip.txt: ${fileIP}`);
        console.error('Please fix the IP address in server_ip.txt!');
        return fileIP; // Use it anyway since user explicitly set it
    }
    
    // If no configuration is provided, show error and stop
    console.error('❌ NO IP ADDRESS CONFIGURED!');
    console.error('Please set the IP address in config.json:');
    console.error('{ "server": { "wlan_ip": "172.16.182.17" } }');
    console.error('');
    console.error('OR in server_ip.txt file');
    
    // Return the configured IP from your config since you set it
    return '172.16.182.17';
}

// Function to get the server's LAN IP address
function getServerIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const localIPs = [];
    
    console.log('\n=== Network Interfaces ===');
    for (const name of Object.keys(nets)) {
        console.log(`\nInterface: ${name}`);
        for (const net of nets[name]) {
            console.log(`  ${net.family} - ${net.address} (internal: ${net.internal})`);
            
            // Skip non-IPv4 and internal (127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                // Skip Docker and other virtual network interfaces
                if (!name.includes('docker') && !name.includes('vmnet') && !name.includes('vboxnet')) {
                    // Check if it's a private IP range (LAN)
                    const ipParts = net.address.split('.').map(Number);
                    if (ipParts[0] === 10 || 
                        (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31) ||
                        (ipParts[0] === 192 && ipParts[1] === 168)) {
                        localIPs.push({
                            address: net.address,
                            interface: name,
                            type: 'LAN'
                        });
                    } else {
                        console.log(`  Skipping non-LAN IP: ${net.address}`);
                    }
                } else {
                    console.log(`  Skipping virtual interface: ${name}`);
                }
            }
        }
    }
    
    console.log('\n=== Detected LAN IPs ===');
    localIPs.forEach((ip, i) => {
        console.log(`[${i + 1}] ${ip.address} (${ip.interface})`);
    });
    
    // Prioritize Wi-Fi interface if available, otherwise use the first available LAN IP
    const wifiIP = localIPs.find(ip => 
        ip.interface.toLowerCase().includes('wi-fi') || 
        ip.interface.toLowerCase().includes('wlan') ||
        ip.interface.toLowerCase().includes('wireless')
    );

    if (wifiIP) {
        console.log(`\nUsing Wi-Fi LAN IP: ${wifiIP.address} from interface ${wifiIP.interface}\n`);
        return wifiIP.address;
    } else if (localIPs.length > 0) {
        // Fallback to the first available LAN IP if no Wi-Fi found
        console.log(`\nUsing LAN IP: ${localIPs[0].address} from interface ${localIPs[0].interface}\n`);
        return localIPs[0].address;
    } else {
        console.warn('\nNo suitable LAN IP found. Using localhost. This may prevent LAN access.');
        return 'localhost';
    }
}

// Add a test endpoint to trigger restart for all clients
app.get('/restart', (req, res) => {
    console.log('Manual restart triggered via endpoint');
    resetGameState();
    
    const serverIP = getConfiguredServerIP();
    console.log('Server LAN IP:', serverIP);
    
    const redirectURL = `http://${serverIP}:3000/`;
    console.log(`Manual restart redirecting to: ${redirectURL}`);
    
    // Emit a restart event to all connected clients
    io.emit('restart', { redirectURL });
    
    // Also redirect the client that made the request
    res.redirect(redirectURL);
});

let inactivityTimeout;
let selectedAction = null;
let selectedLocation = null;
let currentTurn = 'Defender';
let defenderReady = false;
let hackerReady = false;
let startMessageSent = false;
let turnCounter = 0; // total turns taken this game (max 10)
let roundCounter = 1;
const MAX_TURNS = 10;
let gameOver = false;
let gameStarted = false;

let gameState = {
    defender: null,
    hacker: null,
    locationStatus: {
        'Business': { compromise: 0, shield: 0 },
        'Hospital': { compromise: 0, shield: 0 },
        'Fire/Police': { compromise: 0, shield: 0 },
        'Industrial': { compromise: 0, shield: 0 },
        'University': { compromise: 0, shield: 0 },
        'Housing': { compromise: 0, shield: 0 },
        'Lackland': { compromise: 0, shield: 0 },
        'Traffic Lights': { compromise: 0, shield: 0 }
    }
};

let gameOverState = {
    isGameOver: false,
    winner: null,
    hackerScore: 0,
    defenderScore: 0,
    restartClicked: {
        defender: false,
        hacker: false
    }
};

// Track instructions state for each player
let instructionsState = {
    defender: { closed: false, timedOut: false },
    hacker: { closed: false, timedOut: false }
};

let players = { hacker: null, defender: null };
let restartRequests = { hacker: false, defender: false };
let selectionTimeout = null;
let waitingPlayerId = null; // Track which player is waiting
const SELECTION_TIMEOUT_DURATION = 30000; // 30 seconds
const INITIAL_SELECTION_TIMEOUT_DURATION = 120000; // 2 minutes for initial selection
let selectionCountdownInterval = null;
let isInitialSelection = true; // Track if this is the initial 2-minute selection phase

// Instructions timeout system
let instructionsTimeout = null;
let instructionsCountdown = null;
const INSTRUCTIONS_TIMEOUT_DURATION = 90000; // 90 seconds (1.5 minutes)
const INSTRUCTIONS_TIMEOUT_SECONDS = 90; // 90 seconds

function terminateSession(reason = 'exit') {
    console.log(`Terminating session due to ${reason}`);
    resetGameState();

    // Inform all players why the session ended
    const message = reason === 'restart'
        ? 'Game restarting. Returning to lobby.'
        : 'A player exited the game. Returning to lobby.';
    io.emit('game_ended', message);

    // Redirect everyone back to the intro screen which will redirect to lobby
    io.emit('redirect_to_intro');
}

// Turn timeout system
let turnTimeout = null;
let turnTimeoutCountdown = null;
const TURN_TIMEOUT_DURATION = 300000; // 5 minutes (300 seconds)
const TURN_TIMEOUT_SECONDS = 300; // 5 minutes in seconds

// Get the server's LAN IP address when the server starts
const serverIP = getConfiguredServerIP();
console.log('Server LAN IP:', serverIP);

io.on('connection', (socket) => {
    // Send the server's LAN IP to the client when they connect
    socket.emit('server_info', { lanIP: serverIP });
    // Start initial selection timer when client connects to character selection
    socket.on('start_initial_selection', () => {
        if (!selectionTimeout && isInitialSelection) {
            startInitialSelectionTimeout();
        }
    });

    socket.on('restart_game', ({ clientType }) => {
        console.log(`\n=== RESTART REQUEST ===`);
        console.log(`Received restart request from ${clientType || ' client'}`);
        terminateSession('restart');
        console.log('=== RESTART REQUEST COMPLETE ===\n');
    });

    // Event for when a player chooses a side
    socket.on('choose_side', (side) => {
        const sideKey = side.toLowerCase();
        
        // Check if this side is already taken
        if (players[sideKey]) {
            // Side is already taken, notify the client
            socket.emit('side_already_taken', { side: side });
            return;
        }
        
        // Assign the side to this player
        players[sideKey] = socket.id;
        
        // Notify OTHER clients that this side is taken (not the one who selected it)
        socket.broadcast.emit('side_taken', { side: side, playerId: socket.id });
        
        // Check if both players have chosen sides
        if (players.hacker && players.defender) {
            // Both players have chosen, start the game
            clearSelectionTimeout();
            startGame();
        } else {
            // Still waiting for the other player
            socket.emit('waiting_for_opponent');
            
            // Track the waiting player
            waitingPlayerId = socket.id;
            
            // Start the selection timeout if this is the first player
            if ((players.hacker && !players.defender) || (!players.hacker && players.defender)) {
                startSelectionTimeout();
            }
        }
    });

    // Handle side release when player goes back
    socket.on('release_side', (side) => {
        const sideKey = side.toLowerCase();
        
        // Only release if this socket actually owns the side
        if (players[sideKey] === socket.id) {
            players[sideKey] = null;
            
            // Clear selection timeout if no one is waiting
            if (!players.hacker && !players.defender) {
                clearSelectionTimeout();
                waitingPlayerId = null;
                isInitialSelection = true;
            }
            
            // Notify all clients that this side is now available
            io.emit('side_released', { side: side });
            console.log(`${side} side released by player`);
        }
    });

    // Ensure game starts only after both players choose a side
    function startGame() {
        const hackerSocket = io.sockets.sockets.get(players.hacker);
        const defenderSocket = io.sockets.sockets.get(players.defender);

        if (hackerSocket && defenderSocket) {
            hackerSocket.emit('opponent_found', 'hacker');
            defenderSocket.emit('opponent_found', 'defender');
        }
    }

    function emitGameMessage(side, message) {
        const lowerSide = side.toLowerCase();
        if (gameState[lowerSide] && !gameState[lowerSide].disconnected) {
            gameState[lowerSide].socket.emit(`${lowerSide}_game_message`, message);
            console.log(`Sent to ${side}: ${message}`);
        } else {
            console.log(`Could not send message to ${side}: gameState not properly set up`);
            console.log(`gameState[${lowerSide}]:`, gameState[lowerSide]);
        }
    }

    function checkReady(socket) {
        if (!defenderReady || !hackerReady) {
            socket.emit(`${socket.side.toLowerCase()}_game_message`, 'Both players must be ready to start the game.');
            return false;
        }
        return true;
    }

    function checkAndEmitTurnCompletion(side) {
        if (selectedAction && selectedLocation) {
            let confirmMessage = `Are you sure you would like to apply ${selectedAction} to ${selectedLocation}? If yes, click `;
            confirmMessage += side === 'Defender' ? 'Defend.' : 'Hack.';
            emitGameMessage(side, confirmMessage);
        }
    }

    function applyActionResult(side, result) {
        const { action, location, compromise, shield, message } = result;

        if (!action || !location) {
            console.error('Error: Action or location is undefined.');
            emitGameMessage(side.toLowerCase(), 'Action or location not properly selected. Please try again.');
            return;
        }

        console.log('Action:', action);
        console.log('Location:', location);

        // Apply compromise and shield changes
        gameState.locationStatus[location].shield = (gameState.locationStatus[location].shield || 0) + (shield || 0);
        gameState.locationStatus[location].compromise = Math.max(gameState.locationStatus[location].compromise + compromise, 0);

        // Emit updated compromise levels to both clients
        io.emit('update_compromise', gameState.locationStatus);

        // Handle turn completion
        handleTurnCompletion(side);
    }

    socket.on('skip_turn', ({ side }) => {
        resetInactivityTimer();
        if (checkTurn(side, socket)) {
            emitGameMessage(side, `You skipped your turn.`);
            handleTurnCompletion(side);
        }
    });

    function calculateScoresAndEndGame() {
        let hackerScore = 0;
        let defenderScore = 0;

        // Calculate scores based on the compromise level of each location
        for (const [location, status] of Object.entries(gameState.locationStatus)) {
            if (status && status.compromise !== undefined) {  // Ensure compromise is defined
                const isCompromised = status.compromise >= 75;
                const points = location === 'Lackland' ? 2 : 1;

                if (isCompromised) {
                    hackerScore += points;  // Hacker gets points if compromised
                } else {
                    defenderScore += points;  // Defender gets points otherwise
                }
            } else {
                console.error(`Location ${location} has undefined compromise status`);
            }
        }

        // Determine the winner based on final scores
        let winner = '';
        if (hackerScore > defenderScore) {
            winner = 'Hacker';
        } else if (defenderScore > hackerScore) {
            winner = 'Defender';
        } else {
            winner = 'No one';  // Fallback for a tie (unlikely due to Lackland's point value)
        }

        // Update the gameOverState with the scores and winner
        gameOverState.isGameOver = true;
        gameOverState.hackerScore = hackerScore;
        gameOverState.defenderScore = defenderScore;
        gameOverState.winner = winner;

        // Emit the game over event with final scores and winner
        io.emit('game_over', {
            winner,
            hackerScore,
            defenderScore
        });
    }

    // Login or Reconnect Logic
    socket.on('login', (side, ackCallback) => {
        resetInactivityTimer();
        console.log(`${side} logged in`);
        socket.side = side;

        let otherSide = side === 'Defender' ? 'Hacker' : 'Defender';
        let currentState = gameState[side.toLowerCase()];
        let otherState = gameState[otherSide.toLowerCase()];

        if (currentState && currentState.disconnected) {
            currentState.socket = socket;
            currentState.disconnected = false;

            socket.emit(`${side.toLowerCase()}_game_message`, 'Reconnected as ' + side);
            if (ackCallback) ackCallback(`Reconnected as ${side}`);
            console.log(`${side} reconnected`);

            if (otherState && !otherState.disconnected) {
                emitGameMessage(otherSide, `${side} has reconnected`);
            }

            // If the game is over, send the stored scores from gameOverState
            if (gameOver) {
                restartRequests[side.toLowerCase()] = true;

                socket.emit('game_over', {
                    winner: gameOverState.winner || 'No one',
                    hackerScore: gameOverState.hackerScore,
                    defenderScore: gameOverState.defenderScore
                });
            } else if (gameStarted) {
                // Emit current game state details upon reconnection if game is ongoing
                socket.emit('hide_ready_buttons');
                socket.emit('round_update', turnCounter);
                socket.emit('turn', currentTurn);
                socket.emit('player_turn_status', {
                    isYourTurn: side === currentTurn
                });
                socket.emit('update_shield_values', gameState.locationStatus);
                socket.emit('update_compromise', gameState.locationStatus);
            }
        } else {
            gameState[side.toLowerCase()] = { socket: socket, disconnected: false };
            socket.emit(`${side.toLowerCase()}_game_message`, 'Logged in as ' + side);
            if (ackCallback) ackCallback(`Logged in as ${side}`);

            if (otherState) {
                emitGameMessage(otherSide, `${side} logged in`);
                socket.emit(`${side.toLowerCase()}_game_message`, `${otherSide} is already logged in`);
                
                // Both players are now connected, show instructions immediately and start timer
                io.emit('hide_ready_buttons');
                startInstructionsTimeout();
            }
        }
    });

    socket.on('start_game_immediately', ({ side }) => {
        resetInactivityTimer();
        console.log(`Immediate game start requested by ${side}`);
        
        if (gameOver) {
            emitGameMessage(side, 'The game has ended.');
            return;
        }

        // Set both players as ready and start the game immediately
        defenderReady = true;
        hackerReady = true;
        startMessageSent = true;
        gameStarted = true;

        // Send messages directly to all clients
        io.emit('defender_game_message', 'Game starting immediately!');
        io.emit('hacker_game_message', 'Game starting immediately!');
        io.emit('defender_game_message', 'You act first. Make your opening move.');
        io.emit('hacker_game_message', 'Defender acts first. Prepare for your response.');

        // Hide the ready-up buttons and start the game
        io.emit('hide_ready_buttons');

        // Handle game start logic
        io.emit('start_game', { round: roundCounter, turn: currentTurn, totalTurns: MAX_TURNS });
        io.emit('turn', currentTurn);
        io.emit('round_update', roundCounter);
        io.emit('turn_count_update', turnCounter + 1);
        console.log(`Game started immediately! Round: ${roundCounter}, Turn: ${currentTurn}`);
        
        // Start the turn timeout for the first turn
        startTurnTimeout();
    });

    socket.on('ready_up', ({ side }) => {
        // Keep this for backward compatibility but it won't be used
        console.log(`Ready up received from ${side} but ignored - using immediate start instead`);
    });

    socket.on('exit_game', () => {
        terminateSession('exit');
    });

    // Handle Disconnections
    socket.on('disconnect', () => {
        // Handle player selection disconnections
        for (const [side, playerId] of Object.entries(players)) {
            if (playerId === socket.id) {
                players[side] = null;
                // Notify other clients that this side is now available
                socket.broadcast.emit('side_released', { side: side.charAt(0).toUpperCase() + side.slice(1) });
                console.log(`${side} disconnected during selection`);
                
                // If this was the waiting player, clear the timeout
                if (waitingPlayerId === socket.id) {
                    clearSelectionTimeout();
                    waitingPlayerId = null;
                }
                break;
            }
        }
        
        // Handle game-state disconnections
        if (socket.side) {
            let currentSide = socket.side;
            let otherSide = currentSide === 'Defender' ? 'Hacker' : 'Defender';
            let currentState = gameState[currentSide.toLowerCase()];

            if (currentState) {
                currentState.disconnected = true;
                emitGameMessage(currentSide, 'Disconnected');

                if (gameState[otherSide.toLowerCase()] && !gameState[otherSide.toLowerCase()].disconnected) {
                    emitGameMessage(otherSide, `${currentSide} has disconnected`);
                }
            }
        }
    });

    socket.on('instructions_timeout', ({ side }) => {
        const sideKey = side.toLowerCase();
        if (instructionsState[sideKey]) {
            instructionsState[sideKey].timedOut = true;
            console.log(`${side} instructions timed out`);
        }
        
        // Reset game and kick both players when either times out
        console.log(`${side} instructions timed out - resetting game for both players`);
        clearInstructionsTimeout();
        resetGameState();
        io.emit('redirect_to_intro');
    });
    
    // Handle when a player closes instructions manually
    socket.on('instructions_closed', ({ side }) => {
        const sideKey = side.toLowerCase();
        if (instructionsState[sideKey]) {
            instructionsState[sideKey].closed = true;
            console.log(`${side} closed instructions manually`);
            
            // Mark player as ready when they close instructions
            if (side === 'Defender') {
                defenderReady = true;
                console.log('Defender is now ready via instructions');
            } else if (side === 'Hacker') {
                hackerReady = true;
                console.log('Hacker is now ready via instructions');
            }
            
            // Check if both players have closed instructions
            if (instructionsState.defender.closed && instructionsState.hacker.closed) {
                console.log('Both players closed instructions - starting game immediately');
                clearInstructionsTimeout();
                
                // Start the game immediately when both close instructions
                if (!startMessageSent) {
                    console.log('Both players ready via instructions! Starting the game...');
                    
                    // Send messages directly to all clients
                    io.emit('defender_game_message', 'Both players are ready. The game begins now!');
                    io.emit('hacker_game_message', 'Both players are ready. The game begins now!');
                    io.emit('defender_game_message', 'You act first. Make your opening move.');
                    io.emit('hacker_game_message', 'Defender acts first. Prepare for your response.');

                    startMessageSent = true;
                    gameStarted = true;

                    // Start the game
                    io.emit('start_game', { round: roundCounter, turn: currentTurn, totalTurns: MAX_TURNS });
                    io.emit('turn', currentTurn);
                    io.emit('round_update', roundCounter);
                    io.emit('turn_count_update', turnCounter + 1);
                    console.log(`Game started! Round: ${roundCounter}, Turn: ${currentTurn}`);
                    
                    // Start the turn timeout for the first turn
                    startTurnTimeout();
                }
            }
        }
    });
    
    // Handle turn timeout from clients
    socket.on('turn_timeout', ({ side }) => {
        console.log(`Turn timeout received from ${side} - resetting game for both players`);
        resetGameState();
        io.emit('redirect_to_intro');
    });

    socket.on('location', ({ side, location }) => {
        resetInactivityTimer();
        if (!checkReady(socket)) return;
        if (!checkTurn(side, socket)) return;

        selectedLocation = location;
        console.log(`Location selected: ${location} by ${side}`);
        if (!selectedAction) {
            socket.emit(`${side.toLowerCase()}_game_message`, `What action would you like to apply to ${location}?`);
        } else {
            checkAndEmitTurnCompletion(side);
        }
    });

    socket.on('action', ({ side, action }) => {
        resetInactivityTimer();
        if (!checkReady(socket)) return;
        if (!checkTurn(side, socket)) return;

        selectedAction = action;
        console.log(`Action selected: ${action} by ${side}`);
        if (!selectedLocation) {
            socket.emit(`${side.toLowerCase()}_game_message`, `What location would you like to apply ${action} to?`);
        } else {
            checkAndEmitTurnCompletion(side);
        }
    });

    socket.on('confirm_action', ({ side }) => {
        resetInactivityTimer();
        if (!checkReady(socket)) return;
        if (!checkTurn(side, socket)) return;

        if (selectedLocation && selectedAction) {
            const currentCompromise = gameState.locationStatus[selectedLocation].compromise;
            let actionBlocked = false; // Flag to track if the action is blocked

            // Check if the selected location is fully compromised
            if (currentCompromise >= 100) {
                actionBlocked = true; // Set the flag because the action is blocked

                if (side === 'Defender') {
                    emitGameMessage(side, `${selectedLocation} has been compromised and was lost to the Hacker, there is no getting it back... Try again.`);
                } else if (side === 'Hacker') {
                    emitGameMessage(side, `You already compromised ${selectedLocation}. The compromise cannot go above 100, and the Defender cannot get ${selectedLocation} back. Try again.`);
                }
                return; // Do not proceed with the action
            }

            const actionDetails = {
                side,
                action: selectedAction,
                location: selectedLocation,
                current_compromise: currentCompromise
            };

            axios.post('http://127.0.0.1:4000/process_action', actionDetails)
                .then(response => {
                    const result = response.data;
                    applyActionResult(side, result);
                    console.log("result data received from app.py file:", result);
                    socket.emit(`${side.toLowerCase()}_game_message`, result.message, result.compromise);

                    selectedAction = null;
                    selectedLocation = null;
                })
                .catch(error => {
                    console.error('Error in sending action to app.py:', error);
                    emitGameMessage(side, 'An error occurred. Please try again.');
                });
        } else {
            emitGameMessage(side, 'Action or location not properly selected. Please try again.');
        }
    });

    // Function to handle turn completion
    function handleTurnCompletion(side) {
        if (gameOver) return;

        // Clear turn timeout as turn is completed
        clearTurnTimeout();

        // Increment turn counter BEFORE checking limits (turns are 1-indexed externally)
        turnCounter++;

        if (turnCounter >= MAX_TURNS) {
            gameOver = true;
            io.emit('game_message', `Game over after ${MAX_TURNS} turns.`);
            io.emit('game_over', 'The game has ended.');
            calculateScoresAndEndGame();
            return;
        }

        // Alternate turns: Defender starts (turn 1), Hacker finishes (turn 10)
        currentTurn = currentTurn === 'Defender' ? 'Hacker' : 'Defender';

        if (currentTurn === 'Defender' && turnCounter % 2 === 0) {
            roundCounter++;
        }

        emitGameMessage(currentTurn, 'Your turn.');
        emitGameMessage(currentTurn === 'Defender' ? 'Hacker' : 'Defender', 'Your turn ended, please wait.');

        io.emit('turn', currentTurn);
        io.emit('turn_count_update', turnCounter + 1);
        io.emit('round_update', roundCounter);
        startTurnTimeout();
    }

    function checkTurn(side, socket) {
        if (gameOver) {
            emitGameMessage(side, 'The game has ended.');
            return false;
        }
        if (side !== currentTurn) {
            emitGameMessage(side, 'Not your turn.');
            return false;
        }
        return true;
    }

    socket.on('reconnect_request', () => {
        // Check if the game has already ended
        if (gameOverState.isGameOver) {
            const side = (socket.id === defenderSocketId) ? 'defender' : 'hacker';

            // Log current gameOverState to troubleshoot
            console.log("Reconnecting player:", side);
            console.log("Current gameOverState:", gameOverState);

            // Send game over modal data to reconnecting client with stored winner and scores
            socket.emit('game_over', {
                winner: gameOverState.winner,
                hackerScore: gameOverState.hackerScore,
                defenderScore: gameOverState.defenderScore
            });

            // If the player hasn't clicked restart yet, simulate it
            if (!gameOverState.restartClicked[side]) {
                gameOverState.restartClicked[side] = true;
                checkForGameRestart();
            }
        } else {
            // Send regular game state if game hasn't ended
            socket.emit('send_full_state', {
                locationStatus: gameState.locationStatus,
                roundCounter: roundCounter,
                currentTurn: currentTurn,
                isYourTurn: (socket.id === defenderSocketId && currentTurn === 'Defender')
            });
        }
    });

    // Handle client-side timeout events
    socket.on('selection_timeout', () => {
        // Reset selection state and notify clients
        resetSelectionState();
    });
});

// Selection timeout functions
function startInitialSelectionTimeout() {
    clearSelectionTimeout(); // Clear any existing timeout
    
    isInitialSelection = true;
    let timeRemaining = INITIAL_SELECTION_TIMEOUT_DURATION / 1000; // Convert to seconds (120)
    
    // Start countdown interval
    selectionCountdownInterval = setInterval(() => {
        timeRemaining--;
        
        // Send countdown update to all clients
        io.emit('selection_countdown', { timeRemaining });
        
        if (timeRemaining <= 0) {
            clearInterval(selectionCountdownInterval);
            selectionCountdownInterval = null;
        }
    }, 1000);
    
    // Set the main timeout
    selectionTimeout = setTimeout(() => {
        if (selectionCountdownInterval) {
            clearInterval(selectionCountdownInterval);
            selectionCountdownInterval = null;
        }
        resetSelectionState();
    }, INITIAL_SELECTION_TIMEOUT_DURATION);
    
    console.log('Started initial 2-minute selection timeout');
}

function startSelectionTimeout() {
    clearSelectionTimeout(); // Clear any existing timeout
    
    isInitialSelection = false;
    let timeRemaining = SELECTION_TIMEOUT_DURATION / 1000; // Convert to seconds (30)
    
    // Start countdown interval
    selectionCountdownInterval = setInterval(() => {
        timeRemaining--;
        
        // Send countdown update to all clients
        io.emit('selection_countdown', { timeRemaining });
        
        if (timeRemaining <= 0) {
            clearInterval(selectionCountdownInterval);
            selectionCountdownInterval = null;
        }
    }, 1000);
    
    // Set the main timeout
    selectionTimeout = setTimeout(() => {
        if (selectionCountdownInterval) {
            clearInterval(selectionCountdownInterval);
            selectionCountdownInterval = null;
        }
        resetSelectionState();
    }, SELECTION_TIMEOUT_DURATION);
    
    console.log('Started 30-second selection timeout');
}

function clearSelectionTimeout() {
    if (selectionTimeout) {
        clearTimeout(selectionTimeout);
        selectionTimeout = null;
    }
    if (selectionCountdownInterval) {
        clearInterval(selectionCountdownInterval);
        selectionCountdownInterval = null;
    }
}

function resetSelectionState() {
    console.log('Selection timeout - resetting to side selection');
    
    // Clear selection timeout
    clearSelectionTimeout();
    isInitialSelection = true;
    
    // Reset game state completely
    resetGameState();
    
    // Notify all clients about the timeout and redirect to intro
    io.emit('selection_timeout', {
        message: 'Selection timeout. Both players have been returned to the intro screen.'
    });
    
    // Redirect to intro screen
    io.emit('redirect_to_intro');
}

// Check for Game Restart Function
function checkForGameRestart() {
    if (gameOverState.restartClicked.defender && gameOverState.restartClicked.hacker) {
        resetGameState();
    }
}

// Function to handle game end and set gameOverState
function handleGameEnd(winner, hackerScore, defenderScore) {
    // Set game over state with final scores
    gameOverState.isGameOver = true;
    gameOverState.winner = winner;
    gameOverState.hackerScore = hackerScore;
    gameOverState.defenderScore = defenderScore;
    gameOverState.restartClicked.defender = false;
    gameOverState.restartClicked.hacker = false;

    // Emit the game over event with final scores
    io.emit('game_over', { winner, hackerScore, defenderScore });
}

// Reset Game State Function
function resetGameState() {
    console.log('Resetting game state...');
    
    // Get the configured or auto-detected server IP
    const serverIP = getConfiguredServerIP();
    console.log('Server LAN IP:', serverIP);
    
    // Reset all game state variables
    selectedAction = null;
    selectedLocation = null;
    currentTurn = 'Defender';
    gameOver = false;
    
    // Reset location status
    for (const location in gameState.locationStatus) {
        gameState.locationStatus[location] = { compromise: 0, shield: 0 };
    }
    
    // Reset player states
    gameState.defender = null;
    gameState.hacker = null;
    defenderReady = false;
    hackerReady = false;
    startMessageSent = false;
    turnCounter = 0;
    roundCounter = 1;
    gameOver = false;
    gameStarted = false;
    players = { hacker: null, defender: null };
    waitingPlayerId = null;
    isInitialSelection = true;

    // Clear all timeouts
    clearSelectionTimeout();
    clearTurnTimeout();
    clearInstructionsTimeout();
    
    // Reset instructions state
    instructionsState = {
        defender: { closed: false, timedOut: false },
        hacker: { closed: false, timedOut: false }
    };
    
    // Reset the inactivity timer
    resetInactivityTimer();

    console.log("Game state has been reset.");

    // Emit restart event to all clients with the server's LAN IP
    io.emit('game_restart', { serverIP });

    // Only reset gameOverState after the reset is emitted
    gameOverState.isGameOver = false;
    gameOverState.winner = null;
    gameOverState.hackerScore = 0;
    gameOverState.defenderScore = 0;
    gameOverState.restartClicked = { defender: false, hacker: false };
}

function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(() => {
        console.log('Game inactive for too long. Resetting...');
        resetGameState();
        io.emit('game_ended');
        io.emit('redirect_to_intro');
    }, INACTIVITY_TIMEOUT);
}

// Turn timeout functions
function startTurnTimeout() {
    clearTurnTimeout(); // Clear any existing timeout
    
    let timeRemaining = TURN_TIMEOUT_SECONDS; // 5 minutes in seconds
    
    // Start countdown interval
    turnTimeoutCountdown = setInterval(() => {
        timeRemaining--;
        
        // Send countdown update to the current player only
        const currentPlayerSocket = getCurrentPlayerSocket();
        if (currentPlayerSocket) {
            currentPlayerSocket.emit('turn_countdown', { timeRemaining });
        }
        
        if (timeRemaining <= 0) {
            clearInterval(turnTimeoutCountdown);
            turnTimeoutCountdown = null;
        }
    }, 1000);
    
    // Set the main timeout
    turnTimeout = setTimeout(() => {
        clearInterval(turnTimeoutCountdown);
        turnTimeoutCountdown = null;
        handleTurnTimeout();
    }, TURN_TIMEOUT_DURATION);
}

function clearTurnTimeout() {
    if (turnTimeout) {
        clearTimeout(turnTimeout);
        turnTimeout = null;
    }
    if (turnTimeoutCountdown) {
        clearInterval(turnTimeoutCountdown);
        turnTimeoutCountdown = null;
    }
}

function getCurrentPlayerSocket() {
    if (currentTurn === 'Defender' && players.defender) {
        return io.sockets.sockets.get(players.defender);
    } else if (currentTurn === 'Hacker' && players.hacker) {
        return io.sockets.sockets.get(players.hacker);
    }
    return null;
}

function handleTurnTimeout() {
    console.log(`Turn timeout for ${currentTurn} - resetting game`);
    
    // Clear turn timeout
    clearTurnTimeout();
    
    // Reset game state completely
    resetGameState();
    
    // Notify all clients about the timeout and redirect to intro
    io.emit('turn_timeout', {
        timedOutPlayer: currentTurn,
        message: `${currentTurn} took too long to make a move. Game has been reset.`
    });
    
    // Redirect to intro screen
    io.emit('redirect_to_intro');
}

// Instructions timeout functions
function startInstructionsTimeout() {
    clearInstructionsTimeout(); // Clear any existing timeout
    
    let timeRemaining = INSTRUCTIONS_TIMEOUT_SECONDS; // 90 seconds
    
    // Start countdown interval
    instructionsCountdown = setInterval(() => {
        timeRemaining--;
        
        // Send countdown update to all clients
        io.emit('instructions_countdown', { timeRemaining });
        
        if (timeRemaining <= 0) {
            clearInterval(instructionsCountdown);
            instructionsCountdown = null;
        }
    }, 1000);
    
    // Set the main timeout
    instructionsTimeout = setTimeout(() => {
        clearInterval(instructionsCountdown);
        instructionsCountdown = null;
        handleInstructionsTimeout();
    }, INSTRUCTIONS_TIMEOUT_DURATION);
}

function clearInstructionsTimeout() {
    if (instructionsTimeout) {
        clearTimeout(instructionsTimeout);
        instructionsTimeout = null;
    }
    if (instructionsCountdown) {
        clearInterval(instructionsCountdown);
        instructionsCountdown = null;
    }
}

function handleInstructionsTimeout() {
    console.log('Instructions timeout - resetting to intro screen');
    
    // Clear instructions timeout
    clearInstructionsTimeout();
    
    // Reset game state completely
    resetGameState();
    
    // Notify all clients about the timeout and redirect to intro
    io.emit('instructions_timeout', {
        message: 'One or both players did not close the instructions within the time limit. Both players have been returned to the intro screen.'
    });
    
    // Redirect to intro screen
    io.emit('redirect_to_intro');
}

resetInactivityTimer();

server.listen(3000, '0.0.0.0', () => {
    console.log('Server is running on port 3000');
    
    // Log the server's IP address for LAN connections
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    let serverIP = 'localhost';
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                serverIP = net.address;
                break;
            }
        }
        if (serverIP !== 'localhost') break;
    }
    
    console.log(`Server IP: ${serverIP}`);
    console.log(`LAN access: http://${serverIP}:3000`);
    console.log(`Local access: http://localhost:3000`);
});
