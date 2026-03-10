const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const INACTIVITY_TIMEOUT = 200000; //amount of milliseconds you want prior to timeout

app.use(express.static(path.join(__dirname, '../clients')));

let inactivityTimeout;
let selectedAction = null;
let selectedLocation = null;
let currentTurn = 'Defender';
let defenderReady = false;
let hackerReady = false;
let startMessageSent = false;
let turnCounter = 0;
let roundCounter = 1;
let gameOver = false;
let gameStarted = false;
let selectionTimer = null;

let selectionTimeRemaining = 120; // 2 minutes
let instructionsTimer = null;
let instructionsTimeRemaining = 90; // 1 minute 30 seconds


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
    },
    defenderCooldown: { 'Intrusion Detection': 0 }, // Cooldown for Intrusion Detection only
    budgets: {
        'Defender': 100000,
        'Hacker': 100000
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


let players = { hacker: null, defender: null };
let restartRequests = { hacker: false, defender: false };



const actionCosts = {
    'Defender': {
        'Firewall': 9000,
        'Virus Protection': 11000,
        'Intrusion Detection': 22000,
        'User Training': 10000,
    },
    'Hacker': {
        'Phishing': 7000,
        'Virus': 8500,
        'Malware': 17000,
    }
};

let instructionsClosedStatus = { defender: false, hacker: false };

io.on('connection', (socket) => {


    socket.on('restart_game', ({ clientType }) => {
        console.log(`Received restart request from ${clientType || ' client'}`);

        // Reset game state immediately
        resetGameState();

        // Inform all players
        io.emit('game_ended', 'A player has restarted the game. The game has been reset.');

        // Redirect all players to the introduction screen
        io.emit('redirect_to_intro');

        // Log the restart
        console.log('Game restarted and reset by a player');
    });


    // Event for when a player chooses a side
    socket.on('choose_side', (side) => {
        const sideKey = side.toLowerCase();

        if (players[sideKey]) {
            socket.emit('side_already_taken', { side: side });
            return;
        }

        players[sideKey] = socket.id;
        socket.broadcast.emit('side_taken', { side: side, playerId: socket.id });

        // Set up gameState for this player
        gameState[sideKey] = { socket: socket, disconnected: false };
        socket.side = side;

        if (players.hacker && players.defender) {
            // Both players have chosen, notify them to show instructions
            const hackerSocket = io.sockets.sockets.get(players.hacker);
            const defenderSocket = io.sockets.sockets.get(players.defender);
            if (hackerSocket) hackerSocket.emit('opponent_found', 'hacker');
            if (defenderSocket) defenderSocket.emit('opponent_found', 'defender');
        } else {
            socket.emit('waiting_for_opponent');
        }

        // Check if both players have selected a side
        if (players.hacker && players.defender) {
            stopSelectionTimer();
        }
    });

    socket.on('start_initial_selection', () => {
        // Only start if not already running and game hasn't started
        if (!selectionTimer && !gameStarted && (!players.hacker || !players.defender)) {
            startSelectionTimer();
        } else if (selectionTimer) {
            // If timer is already running, just send current time to the requester
            socket.emit('selection_countdown', { timeRemaining: selectionTimeRemaining });
        }
    });

    socket.on('release_side', (side) => {
        const sideKey = side.toLowerCase();
        if (players[sideKey] === socket.id) {
            players[sideKey] = null;
            socket.broadcast.emit('side_released', { side: side });

            // If we go back to having < 2 players, ensure timer is running
            if (!players.hacker || !players.defender) {
                if (!selectionTimer) {
                    startSelectionTimer();
                }
            }
        }
    });

    socket.on('release_side', (side) => {
        const sideKey = side.toLowerCase();
        if (players[sideKey] === socket.id) {
            players[sideKey] = null;
            socket.broadcast.emit('side_released', { side: side });

            // If we go back to having < 2 players, ensure timer is running
            if (!players.hacker || !players.defender) {
                if (!selectionTimer) {
                    startSelectionTimer();
                }
            }
        }
    });

    socket.on('instructions_closed', ({ side }) => {
        console.log(`========== INSTRUCTIONS CLOSED ==========`);
        console.log(`Side: ${side}`);
        console.log(`Socket ID: ${socket.id}`);
        const sideKey = side.toLowerCase();
        instructionsClosedStatus[sideKey] = true;
        console.log(`Current State:`);
        console.log(`  - Defender: ${instructionsClosedStatus.defender}`);
        console.log(`  - Hacker: ${instructionsClosedStatus.hacker}`);
        console.log(`  - Players: Hacker=${players.hacker}, Defender=${players.defender}`);

        if (instructionsClosedStatus.defender && instructionsClosedStatus.hacker) {
            console.log("✓ BOTH PLAYERS READY - STARTING GAME");
            startGame();
        } else {
            console.log(`⏳ Waiting for ${instructionsClosedStatus.defender ? 'Hacker' : 'Defender'} to close instructions`);
        }
        console.log(`========================================`);
    });

    // Ensure game starts only after both players choose a side
    function startGame() {
        console.log("startGame called");
        const hackerSocket = io.sockets.sockets.get(players.hacker);
        const defenderSocket = io.sockets.sockets.get(players.defender);

        if (hackerSocket && defenderSocket) {
            console.log("Emitting start events");
            hackerSocket.emit('opponent_found', 'hacker');
            defenderSocket.emit('opponent_found', 'defender');

            // CRITICAL FIX: Set ready flags to true so checkReady() passes during gameplay
            defenderReady = true;
            hackerReady = true;
            gameStarted = true;

            // Emit start game event
            io.emit('start_game', { round: roundCounter, turn: currentTurn });
            io.emit('turn_update', { turn: currentTurn, round: roundCounter });

            // Stop the instructions timer as game is starting
            stopInstructionsTimer();
        }
    }



    function emitGameMessage(side, message) {
        const lowerSide = side.toLowerCase();
        if (gameState[lowerSide] && !gameState[lowerSide].disconnected) {
            gameState[lowerSide].socket.emit(`${lowerSide}_game_message`, message);
            console.log(`Sent to ${side}: ${message}`);
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


    function deductBudget(side, action) {
        const cost = actionCosts[side][action] || 0;  // Get the cost of the action
        if (gameState.budgets[side] >= cost) {
            gameState.budgets[side] -= cost;  // Deduct the cost from the player's budget
            return true;  // Successful deduction
        } else {
            emitGameMessage(side.toLowerCase(), `Not enough budget to perform ${action}.`);
            return false;  // Not enough funds
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

        // Handle cooldown for Defender's "Intrusion Detection"
        if (side === 'Defender') {
            if (action === 'Intrusion Detection') {
                // Check if Intrusion Detection is on cooldown
                if (gameState.defenderCooldown['Intrusion Detection'] > 0) {
                    emitGameMessage(side.toLowerCase(), `Intrusion Detection is on cooldown for ${gameState.defenderCooldown['Intrusion Detection']} more round(s).`);
                    emitGameMessage(side.toLowerCase(), 'Please select a new action and location.');
                    return;
                }

                // Only trigger cooldown if compromise >= 75 and revive_range is used
                if (gameState.locationStatus[location].compromise >= 75) {
                    gameState.defenderCooldown['Intrusion Detection'] = 2;  // Start cooldown for 2 rounds
                    emitGameMessage(side.toLowerCase(), 'Intrusion Detection is now on cooldown for 2 rounds.');
                }
            }

            // Apply compromise and shield changes
            gameState.locationStatus[location].shield = (gameState.locationStatus[location].shield || 0) + (shield || 0);
            gameState.locationStatus[location].compromise = Math.max(gameState.locationStatus[location].compromise + compromise, 0);
        } else if (side === 'Hacker') {
            const currentShield = gameState.locationStatus[location].shield || 0;
            const effectiveCompromise = Math.max(compromise - currentShield, 0);
            gameState.locationStatus[location].shield = Math.max(currentShield - compromise, 0);
            gameState.locationStatus[location].compromise = Math.min(gameState.locationStatus[location].compromise + effectiveCompromise, 100);

            if (gameState.locationStatus[location].compromise >= 75) {
                emitGameMessage(side.toLowerCase(), `${location} is now compromised!`);
            }
        }

        // Emit updated compromise levels to both clients
        io.emit('update_compromise', gameState.locationStatus);

        // Handle turn completion and cooldown decrement
        handleTurnCompletion(side);
    }


    socket.on('skip_turn', ({ side }) => {
        resetInactivityTimer();
        if (checkTurn(side, socket)) {
            const budgetIncrease = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
            gameState.budgets[side] += budgetIncrease;

            emitGameMessage(side, `You skipped your turn. ${budgetIncrease} was added to your budget.`);

            io.emit('budget_update', {
                defenderBudget: gameState.budgets['Defender'],
                hackerBudget: gameState.budgets['Hacker'],
                message: `${side} skipped their turn. ${budgetIncrease} was added to their budget.`
            });

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
            winner = 'No one';  // Fallback for a tie (unlikely due to Lackland’s point value)
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

        // CRITICAL FIX: Always update the players object with the current socket.id
        // This ensures that when a player refreshes/reconnects, we track their new socket
        players[side.toLowerCase()] = socket.id;
        console.log(`Updated players object: Hacker=${players.hacker}, Defender=${players.defender}`);

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
                restartRequests[side] = true;

                socket.emit('game_over', {
                    winner: gameOverState.winner || 'No one',
                    hackerScore: gameOverState.hackerScore,
                    defenderScore: gameOverState.defenderScore
                });
            } else if (gameStarted) {
                // Emit current game state details upon reconnection if game is ongoing
                socket.emit('hide_ready_buttons');
                socket.emit('round_update', roundCounter);
                socket.emit('turn', currentTurn);
                socket.emit('player_turn_status', {
                    isYourTurn: side === currentTurn
                });
                socket.emit('budget_update', {
                    defenderBudget: gameState.budgets.Defender,
                    hackerBudget: gameState.budgets.Hacker
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

            }

        }

        // Check if both players are connected and start instructions timer if needed
        if (players.hacker && players.defender && !instructionsTimer && !gameStarted) {
            startInstructionsTimer();
        }
    });


    // Handle Disconnections
    socket.on('disconnect', () => {
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


    socket.on('ready_up', ({ side }) => {
        resetInactivityTimer();
        if (gameOver) {
            emitGameMessage(side, 'The game has ended.');
            return;
        }

        if (side === 'Defender') {
            defenderReady = true;
            emitGameMessage('defender', 'Defender has confirmed they are ready to start.');
        } else if (side === 'Hacker') {
            hackerReady = true;
            emitGameMessage('hacker', 'Hacker has confirmed they are ready to start.');
        }

        if (defenderReady && hackerReady && !startMessageSent) {
            // Emit the start game message to each player once
            emitGameMessage('defender', 'Both players are ready. The game begins now!');
            emitGameMessage('hacker', 'Both players are ready. The game begins now!');
            emitGameMessage('defender', 'You get the first two turns, please proceed.');
            emitGameMessage('hacker', 'Defender gets the first two turns. I will let you know when it is your turn.');

            startMessageSent = true; // Ensure the message is only sent once
            gameStarted = true;

            // Hide the ready-up buttons
            io.emit('hide_ready_buttons');

            // Handle game start logic
            io.emit('start_game', { round: roundCounter, turn: currentTurn }); // Include round number here
            io.emit('turn', currentTurn); // Send the current turn
        } else if (!defenderReady || !hackerReady) {
            // Notify sides of their readiness status
            const waitingMessage = side === 'Defender'
                ? 'Defender has confirmed they are ready to start, they are waiting on you to click ready up.'
                : 'Hacker has confirmed they are ready to start, they are waiting on you to click ready up.';
            emitGameMessage(side === 'Defender' ? 'hacker' : 'defender', waitingMessage);
        }
    });
    socket.on('exit_game', () => {
        // Reset game state
        resetGameState();

        // Inform all players
        io.emit('game_ended', 'A player has exited the game. The game has been reset.');

        // Redirect all players to the introduction screen
        io.emit('redirect_to_intro');

        // Log the exit
        console.log('Game exited and reset by a player');
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

            // Check if the compromise level is between 75 and 100
            if (currentCompromise >= 75 && currentCompromise < 100) {
                if (side === 'Defender' && selectedAction !== 'Intrusion Detection') {
                    emitGameMessage(side, `You can only use "Intrusion Detection" on ${selectedLocation} because it has been compromised.`);
                    return; // Block any action other than Intrusion Detection
                }
            }

            // Check if Intrusion Detection is on cooldown for the Defender
            if (side === 'Defender' && selectedAction === 'Intrusion Detection') {
                const cooldown = gameState.defenderCooldown['Intrusion Detection'];
                if (cooldown > 0) {
                    emitGameMessage(side, `Intrusion Detection is on cooldown for ${cooldown} more rounds.`);
                    return;
                }
            }

            // Deduct budget for the action if it's not blocked
            if (!actionBlocked && !deductBudget(side, selectedAction)) return; // If deduction fails, exit

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

                    // Emit the updated budget to the clients
                    io.emit('budget_update', {
                        defenderBudget: gameState.budgets['Defender'],
                        hackerBudget: gameState.budgets['Hacker']
                    });

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


    let extraTurnFlag = false; // Track if the extra turn is triggered


    // Function to handle turn completion
    function handleTurnCompletion() {
        if (gameOver) return;

        // Increment turn counter
        turnCounter++;

        // Check if the round should be incremented (every 2 turns)
        if (turnCounter % 2 === 0) {
            roundCounter++;
            if (roundCounter > 10) {
                gameOver = true;
                io.emit('game_message', 'Game over after 10 rounds.');
                io.emit('game_over', 'The game has ended.');
                calculateScoresAndEndGame();
                return;
            }
        }

        // Handle special consecutive turns for round 1 (Defender) and round 10 (Hacker)
        if (roundCounter === 1 && currentTurn === 'Defender' && !extraTurnFlag) {
            emitGameMessage('Defender', 'Go again. You have two consecutive turns for the first round.');
            extraTurnFlag = true;
            io.emit('turn_update', { turn: 'Defender', round: roundCounter });
            emitGameMessage('Defender', 'Your turn.');
        } else if (roundCounter === 10 && currentTurn === 'Hacker' && !extraTurnFlag) {
            emitGameMessage('Hacker', 'Go again. This is your last turn before the game ends. Make it count!');
            extraTurnFlag = true;
            io.emit('turn_update', { turn: 'Hacker', round: roundCounter });
            emitGameMessage('Hacker', 'Your turn.');
        } else {
            // Normal turn sequence
            extraTurnFlag = false;
            currentTurn = currentTurn === 'Defender' ? 'Hacker' : 'Defender';

            // Check for cooldowns and emit appropriate messages
            if (currentTurn === 'Defender' && gameState.defenderCooldown['Intrusion Detection'] > 0) {
                gameState.defenderCooldown['Intrusion Detection']--;
                if (gameState.defenderCooldown['Intrusion Detection'] === 1) {
                    emitGameMessage('Defender', 'Intrusion Detection is on cooldown for 1 more round.');
                } else if (gameState.defenderCooldown['Intrusion Detection'] === 0) {
                    emitGameMessage('Defender', 'Intrusion Detection is available once again!');
                }
            }

            // Emit turn messages for both players
            emitGameMessage(currentTurn, 'Your turn.');
            emitGameMessage(currentTurn === 'Defender' ? 'Hacker' : 'Defender', 'Your turn ended, please wait.');

            // Emit turn and round updates
            io.emit('turn_update', { turn: currentTurn, round: roundCounter });
            io.emit('round_update', roundCounter);
        }
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

        // Check if the player has enough budget for at least one action
        const availableActions = actionCosts[side];
        const canAffordAnyAction = Object.values(availableActions).some(cost => gameState.budgets[side] >= cost);

        if (!canAffordAnyAction) {
            emitGameMessage(side, 'Not enough budget to perform any action. Your turn is being skipped.');
            autoSkipTurn(side);  // Auto-skip if no affordable action
            return false;
        }
        return true;
    }

    function autoSkipTurn(side) {
        const budgetIncrease = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
        gameState.budgets[side] += budgetIncrease;

        emitGameMessage(side, `Your turn was skipped. ${budgetIncrease} was added to your budget.`);

        io.emit('budget_update', {
            defenderBudget: gameState.budgets['Defender'],
            hackerBudget: gameState.budgets['Hacker'],
            message: `${side} skipped their turn. ${budgetIncrease} was added to their budget.`
        });

        handleTurnCompletion(side);  // Move to the next player's turn
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

            // If the player hasn’t clicked restart yet, simulate it
            if (!gameOverState.restartClicked[side]) {
                gameOverState.restartClicked[side] = true;
                checkForGameRestart();
            }
        } else {
            // Send regular game state if game hasn’t ended
            socket.emit('send_full_state', {
                defenderBudget: gameState.budgets.Defender,
                hackerBudget: gameState.budgets.Hacker,
                locationStatus: gameState.locationStatus,
                roundCounter: roundCounter,
                currentTurn: currentTurn,
                isYourTurn: (socket.id === defenderSocketId && currentTurn === 'Defender')
            });
        }
    });


});

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
    selectedAction = null;
    selectedLocation = null;
    currentTurn = 'Defender';
    defenderReady = false;
    hackerReady = false;
    startMessageSent = false;
    turnCounter = 0;
    roundCounter = 1;
    gameOver = false;
    gameStarted = false;


    // Reset the inactivity timer
    resetInactivityTimer();
    stopSelectionTimer();

    console.log("Game state has been reset.");

    // Reset gameState but keep gameOverState until reset is emitted
    gameState = {
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
        },
        defenderCooldown: { 'Intrusion Detection': 0 },
        budgets: {
            'Defender': 100000,
            'Hacker': 100000
        }
    };

    players = { hacker: null, defender: null };
    restartRequests = { hacker: false, defender: false };
    instructionsClosedStatus = { defender: false, hacker: false };
    let extraTurnFlag = false;

    console.log("Game state has been reset.");

    // Emit the reset event to all clients
    io.emit('game_reset');

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

resetInactivityTimer();

function startSelectionTimer() {
    if (selectionTimer) return;

    selectionTimeRemaining = 120; // 2 minutes
    console.log('Starting selection timer: 120s');

    selectionTimer = setInterval(() => {
        selectionTimeRemaining--;

        // Broadcast time to all connected clients on the selection screen
        io.emit('selection_countdown', { timeRemaining: selectionTimeRemaining });

        if (selectionTimeRemaining <= 0) {
            clearInterval(selectionTimer);
            selectionTimer = null;

            // Handle timeout - reset selection
            console.log('Selection timer expired');
            players = { hacker: null, defender: null };
            io.emit('reset_to_selection', { reason: 'timeout' });
        }
    }, 1000);
}

function stopSelectionTimer() {
    if (selectionTimer) {
        clearInterval(selectionTimer);
        selectionTimer = null;
        console.log('Selection timer stopped');
    }
}

function startInstructionsTimer() {
    if (instructionsTimer) return;

    instructionsTimeRemaining = 90; // 1 minute 30 seconds
    console.log('Starting instructions timer: 90s');

    instructionsTimer = setInterval(() => {
        instructionsTimeRemaining--;


        // Broadcast time to all connected clients
        io.emit('instructions_countdown', { timeRemaining: instructionsTimeRemaining });

        if (instructionsTimeRemaining <= 0) {
            clearInterval(instructionsTimer);
            instructionsTimer = null;

            // Handle timeout
            console.log('Instructions timer expired');
            io.emit('instructions_timeout', { message: 'Time limit reached for reading instructions.' });
        }
    }, 1000);
}

function stopInstructionsTimer() {
    if (instructionsTimer) {
        clearInterval(instructionsTimer);
        instructionsTimer = null;
        console.log('Instructions timer stopped');
    }
}

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
