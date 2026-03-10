# IP Configuration for CyberCity Game

## Overview
The CyberCity game server now supports configurable IP addressing for restart and routing functionality. This allows you to specify the exact WLAN IP address that should be used when players restart the game, ensuring both players are routed to the correct server address.

## Configuration Methods

### Method 1: Using config.json (Recommended)

1. Open the `config.json` file in the CyberCity directory
2. Set the `wlan_ip` field to your desired IP address:

```json
{
  "server": {
    "wlan_ip": "192.168.1.100",
    "description": "Set the wlan_ip to your desired IP address for server routing. Leave empty to use auto-detection.",
    "example": "192.168.1.100"
  },
  "game": {
    "restart_routing": {
      "enabled": true,
      "description": "When enabled, restart functionality will route both players to the configured WLAN IP address"
    }
  }
}
```

3. Save the file and restart the server

### Method 2: Using server_ip.txt (Simple Alternative)

1. Open the `server_ip.txt` file in the CyberCity directory
2. Add your IP address on a new line (ignore lines starting with #):

```
# Server IP Configuration
# Enter your WLAN IP address below (one line only)
# Example: 192.168.1.100
# Leave empty to use auto-detection
192.168.1.100
```

3. Save the file and restart the server

## How It Works

### Priority Order
The server checks for IP configuration in this order:
1. **config.json** - Checks the `server.wlan_ip` field
2. **server_ip.txt** - Reads the first non-comment line
3. **Auto-detection** - Falls back to automatic network interface detection

### When the Configuration is Used
The configured IP address is used in these scenarios:
- When players click the "Restart" button after a game
- During game resets due to timeouts or errors
- For all server routing and redirection functionality

### Auto-Detection Behavior
If no configuration is provided, the server will:
1. Scan all network interfaces
2. Prioritize Wi-Fi/WLAN interfaces
3. Choose the first available LAN IP address
4. Fall back to localhost if no suitable IP is found

## Finding Your WLAN IP Address

### Windows
```cmd
ipconfig
```
Look for "Wireless LAN adapter Wi-Fi" and find the IPv4 Address

### macOS/Linux
```bash
ifconfig
```
Look for your wireless interface (usually en0, wlan0, or similar)

### Or check the server logs
When you start the server, it will display detected network interfaces and the IP it's using:

```
=== Network Interfaces ===
Interface: en0
  IPv4 - 192.168.1.100 (internal: false)

Using Wi-Fi LAN IP: 192.168.1.100 from interface en0
```

## Example Scenarios

### Scenario 1: Home Network
- Your router assigns 192.168.1.x addresses
- Set `wlan_ip` to your computer's specific IP: `"192.168.1.100"`

### Scenario 2: School/Office Network
- Network uses 10.x.x.x or 172.16.x.x addresses
- Set `wlan_ip` to your computer's assigned IP: `"10.0.1.50"`

### Scenario 3: Mobile Hotspot
- Your phone creates a hotspot with 192.168.43.x addresses
- Set `wlan_ip` to your computer's IP on the hotspot: `"192.168.43.2"`

## Troubleshooting

### Players Can't Connect After Restart
1. Verify the IP address in your configuration file is correct
2. Make sure your firewall allows connections on port 3000
3. Check that both players are on the same network

### Server Won't Start
1. Check the config.json syntax with a JSON validator
2. Ensure the server_ip.txt file doesn't have any special characters
3. Review server logs for specific error messages

### Configuration Not Taking Effect
1. Restart the server completely
2. Check the server logs for configuration loading messages:
   - "Configuration loaded from config.json"
   - "IP address loaded from server_ip.txt"
   - "Using configured IP from config.json: X.X.X.X"

## Server Log Messages

Look for these messages to verify your configuration is working:

```
Configuration loaded from config.json
Using configured IP from config.json: 192.168.1.100
Server LAN IP: 192.168.1.100
```

Or for the text file method:
```
IP address loaded from server_ip.txt: 192.168.1.100
Using IP from server_ip.txt: 192.168.1.100
Server LAN IP: 192.168.1.100
```
