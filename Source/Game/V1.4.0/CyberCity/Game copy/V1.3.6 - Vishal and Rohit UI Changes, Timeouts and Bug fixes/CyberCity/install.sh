#!/bin/bash

# CyberCity Game Installation Script
echo "🚀 Installing CyberCity Game for LAN Play..."
echo "=========================================="

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python3 is not installed or not in PATH"
    echo "Please install Python 3.x and try again"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    echo "Please install Node.js (v14 or higher) and try again"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed or not in PATH"
    echo "Please install npm and try again"
    exit 1
fi

echo "✅ Python3 found: $(python3 --version)"
echo "✅ Node.js found: $(node --version)"
echo "✅ npm found: $(npm --version)"
echo ""

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip3 install flask requests

# Install main project dependencies
echo "📦 Installing main project dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x start_game.sh
chmod +x test_servers.py

echo ""
echo "🎉 Installation complete!"
echo "=========================================="
echo ""
echo "📋 Next steps:"
echo "1. Run the game: ./start_game.sh"
echo "2. Test servers: ./test_servers.py"
echo "3. Or use npm: npm start"
echo ""
echo "🌐 For LAN play:"
echo "- Server device: http://localhost:3000"
echo "- Client devices: http://[SERVER_IP]:3000"
echo ""
echo "📖 See README.md for detailed instructions"
echo "=========================================="
