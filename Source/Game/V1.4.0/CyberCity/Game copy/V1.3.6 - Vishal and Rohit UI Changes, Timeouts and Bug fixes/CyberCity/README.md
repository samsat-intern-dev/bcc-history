# CyberCity Game

A cybersecurity-themed strategy game where a Hacker and Defender battle for control of city locations.

## Features

- **LAN Multiplayer**: Play with two devices on the same network
- **Real-time Communication**: Socket.IO for instant game updates
- **Restart Functionality**: Easy game restart for both players
- **Timeout System**: Automatic timeouts for inactive players
- **Responsive UI**: Works on desktop and mobile devices

## Prerequisites

- Python 3.x
- Node.js (v14 or higher)
- npm

## Installation

1. Clone or download the project
2. Navigate to the project directory
3. Run the startup script:

```bash
./start_game.sh
```

Or manually install dependencies and start servers:

```bash
# Install main project dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..

# Start Flask backend (in background)
python3 app.py &

# Start Node.js server
cd server
node server.js
```

## LAN Play Instructions

### Server Device (Host)
1. Run the startup script: `./start_game.sh`
2. Note the displayed IP address (e.g., `192.168.1.100`)
3. Open your browser and go to: `http://localhost:3000`
4. Choose your side (Hacker or Defender)

### Client Device
1. Make sure both devices are on the same WiFi network
2. Open your browser and go to: `http://[SERVER_IP]:3000`
   - Replace `[SERVER_IP]` with the IP address shown on the server device
   - Example: `http://192.168.1.100:3000`
3. Choose the opposite side from the server device

## Game Flow

1. **Character Selection**: Both players choose their sides (Hacker/Defender)
2. **Instructions**: Players read game instructions (90-second timeout)
3. **Game Start**: Defender gets the first two turns
4. **Turns**: Players take turns selecting actions and locations
5. **Game End**: After 1 round, scores are calculated
6. **Restart**: Both players can restart the game

## Restart Functionality

- **During Game**: Click the "RESTART GAME" button in the game interface
- **After Game End**: Click "RESTART GAME" in the results modal
- **Automatic**: Both players are redirected to the start screen
- **LAN Support**: Restart works across different devices on the network

## Timeout System

- **Instructions**: 90 seconds to read and close instructions
- **Turn**: 5 minutes per turn
- **Selection**: 2 minutes for initial character selection, 30 seconds for subsequent selections
- **Inactivity**: 200 seconds of overall inactivity

## Game Mechanics

### Hacker Actions
- **Phishing**: 90% success rate, 40-85 compromise
- **Virus**: 85% success rate, 60-85 compromise  
- **Malware**: 80% success rate, 70-100 compromise

### Defender Actions
- **Firewall**: Reduces compromise and hacker success probability
- **Virus Protection**: Adds shield to locations
- **Intrusion Detection**: Revives compromised systems (cooldown: 2 rounds)
- **User Training**: Reduces damage and compromise

### Scoring
- Each location is worth 1 point (except Lackland = 2 points)
- Locations with ≥75% compromise go to Hacker
- Locations with <75% compromise go to Defender

## Troubleshooting

### Connection Issues
- Ensure both devices are on the same network
- Check firewall settings on both devices
- Verify the server IP address is correct
- Try using `localhost` on the server device

### Game Not Starting
- Check that both Flask (port 4000) and Node.js (port 3000) servers are running
- Ensure both players have selected different sides
- Check browser console for error messages

### Restart Not Working
- Both players must click restart
- Check network connectivity
- Refresh the browser page if needed

## File Structure

```
CyberCity/
├── app.py                 # Flask backend (game logic)
├── server/
│   ├── server.js         # Node.js server (Socket.IO)
│   └── package.json      # Server dependencies
├── clients/              # Frontend files
│   ├── index.html        # Main entry point
│   ├── defender.html     # Defender game interface
│   ├── hacker.html       # Hacker game interface
│   └── ...               # Other game screens
├── start_game.sh         # Startup script
└── package.json          # Main project dependencies
```

## Development

To modify the game:
- **Backend Logic**: Edit `app.py` for game mechanics
- **Server Communication**: Edit `server/server.js` for Socket.IO events
- **Frontend**: Edit files in `clients/` directory
- **Styling**: CSS is embedded in HTML files

## License

This project is for educational purposes.
