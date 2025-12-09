# CyberCity LAN Setup Guide

This document explains all the changes made to ensure the CyberCity game works properly with two different devices on LAN, with proper restart functionality.

## Changes Made

### 1. Server Configuration for LAN Access

#### Flask Backend (`app.py`)
- **Changed**: `app.run(debug=True, port=4000)` → `app.run(debug=True, port=4000, host='0.0.0.0')`
- **Purpose**: Allows Flask server to accept connections from any IP address, not just localhost

#### Node.js Server (`server/server.js`)
- **Changed**: `server.listen(3000, () => {` → `server.listen(3000, '0.0.0.0', () => {`
- **Purpose**: Allows Node.js server to accept connections from any IP address

### 2. Startup Script (`start_game.sh`)
Created a comprehensive startup script that:
- Automatically detects the server's IP address
- Installs all dependencies
- Starts both Flask and Node.js servers
- Provides clear instructions for LAN play
- Handles cleanup on exit

### 3. Installation Script (`install.sh`)
Created an installation script that:
- Checks for required dependencies (Python3, Node.js, npm)
- Installs Python dependencies (Flask, requests)
- Installs Node.js dependencies
- Makes all scripts executable
- Provides clear next steps

### 4. Test Script (`test_servers.py`)
Created a test script that:
- Verifies both servers are running
- Tests server communication
- Displays server IP for LAN connections
- Provides troubleshooting information

### 5. Package Configuration
- **Fixed**: Removed problematic "node" dependency from `server/package.json`
- **Enhanced**: Added proper scripts and metadata to main `package.json`

### 6. Documentation
- **Updated**: `README.md` with comprehensive LAN play instructions
- **Created**: This guide explaining all changes

## LAN Play Features

### ✅ Working Features
1. **Two-Device Play**: Server and client can be on different devices
2. **Automatic IP Detection**: Server IP is automatically detected and displayed
3. **Real-time Communication**: Socket.IO works across network
4. **Restart Functionality**: Works for both players across network
5. **Timeout System**: All timeouts work properly
6. **Game State Synchronization**: Game state is properly synchronized

### 🔧 How to Use

#### Quick Start
```bash
# Install everything
./install.sh

# Start the game
./start_game.sh
```

#### Manual Start
```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Start servers
python3 app.py &  # Flask backend
cd server && node server.js  # Node.js server
```

### 🌐 Network Setup

#### Server Device
1. Run the startup script
2. Note the displayed IP address (e.g., `192.168.1.100`)
3. Open browser to `http://localhost:3000`
4. Choose your side (Hacker or Defender)

#### Client Device
1. Ensure both devices are on same WiFi network
2. Open browser to `http://[SERVER_IP]:3000`
3. Choose the opposite side

## Restart Functionality

### How It Works
1. **During Game**: Click "RESTART GAME" button
2. **After Game End**: Click "RESTART GAME" in results modal
3. **Server Processing**: Server resets all game state
4. **Client Redirect**: Both clients are redirected to start screen
5. **LAN Support**: Works across different devices

### Technical Implementation
- **Client Side**: `socket.emit('restart_game', { clientType: 'Defender' })`
- **Server Side**: Handles restart and redirects all clients
- **State Reset**: All game variables, timeouts, and connections are reset
- **Network**: Uses Socket.IO events to coordinate restart across devices

## Troubleshooting

### Common Issues

#### Connection Problems
- **Check**: Both devices on same network
- **Check**: Firewall settings
- **Check**: Server IP address is correct
- **Try**: Using `localhost` on server device

#### Game Not Starting
- **Check**: Both servers running (ports 3000 and 4000)
- **Check**: Different sides selected
- **Check**: Browser console for errors

#### Restart Not Working
- **Check**: Both players clicked restart
- **Check**: Network connectivity
- **Try**: Refreshing browser page

### Testing
```bash
# Test if servers are working
./test_servers.py

# Check server status
lsof -i :3000  # Node.js server
lsof -i :4000  # Flask server
```

## File Structure Summary

```
CyberCity/
├── app.py                 # Flask backend (LAN-enabled)
├── server/
│   ├── server.js         # Node.js server (LAN-enabled)
│   └── package.json      # Fixed dependencies
├── clients/              # Frontend files (unchanged)
├── start_game.sh         # NEW: Startup script
├── install.sh            # NEW: Installation script
├── test_servers.py       # NEW: Test script
├── package.json          # Enhanced with scripts
└── README.md             # Updated with LAN instructions
```

## Verification Checklist

- [x] Flask server accepts external connections (`host='0.0.0.0'`)
- [x] Node.js server accepts external connections (`host='0.0.0.0'`)
- [x] Socket.IO works across network
- [x] Restart functionality works for both players
- [x] All timeouts work properly
- [x] Game state synchronizes correctly
- [x] Installation script works
- [x] Startup script works
- [x] Test script works
- [x] Documentation is complete

## Conclusion

The CyberCity game is now fully configured for LAN play with two devices. The restart functionality works seamlessly across the network, and all game features are properly synchronized. The installation and startup process is streamlined with helpful scripts and clear documentation.
