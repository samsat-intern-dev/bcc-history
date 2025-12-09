#!/bin/bash

# CyberCity Game Startup Script for LAN Play
echo "Starting CyberCity Game for LAN Play..."

# Function to get the server's IP address
get_server_ip() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost"
    else
        # Linux
        hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost"
    fi
}

# Get server IP
SERVER_IP=$(get_server_ip)
echo "Server IP: $SERVER_IP"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python3 is not installed or not in PATH"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed or not in PATH"
    exit 1
fi

# Install dependencies for the main project
echo "Installing main project dependencies..."
npm install

# Install dependencies for the server
echo "Installing server dependencies..."
cd server
npm install
cd ..

# Start the Flask backend in the background
echo "Starting Flask backend on port 4000..."
python3 app.py &
FLASK_PID=$!

# Wait a moment for Flask to start
sleep 2

# Start the Node.js server
echo "Starting Node.js server on port 3000..."
cd server
node server.js &
NODE_PID=$!
cd ..

# Function to cleanup on exit
cleanup() {
    echo "Shutting down servers..."
    kill $FLASK_PID 2>/dev/null
    kill $NODE_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo ""
echo "=========================================="
echo "CyberCity Game is now running!"
echo "=========================================="
echo "Server IP: $SERVER_IP"
echo "Game URL: http://$SERVER_IP:3000"
echo "Local URL: http://localhost:3000"
echo ""
echo "Instructions for LAN play:"
echo "1. On the server device, use: http://localhost:3000"
echo "2. On client devices, use: http://$SERVER_IP:3000"
echo "3. Make sure both devices are on the same network"
echo ""
echo "Press Ctrl+C to stop the servers"
echo "=========================================="

# Wait for the servers to run
wait
