import subprocess
import argparse
from pymodbus.client import ModbusTcpClient as ModbusClient
'''
copypaste cli.py base functions here so everything is in one file (done)
cli-v2 has same functionality as cli but can run this code in terminal with indentical syntax
MAKE BATCH FILE ASSUME IP, NOT CODE
add primitive functions; make batch files for them
'''

rpi_1 = '81'
rpi_1_required_coils = [24, 32]
rpi_2 = '82'
rpi_3 = '83'
rpi_4 = '98'
base_ip = '192.168.1.'

def toggle(ip, coil, value): # replaces both on.bat and off.bat
    if len(str(ip)) > 2: # when full IP is given, use that IP and not the base IP
        client = ModbusClient(str(ip), port=502)
    else:
        client = ModbusClient(base_ip + str(ip), port=502)
    client.write_register(coil, value)
    return None

def toggle_all(value): # replaces both allon.bat and alloff.bat
    client = ModbusClient(base_ip+rpi_1, port=502)
    client.write_coils(0, [value] * (2040)) # 2040 = 2039 - 0 + 1
    client = ModbusClient(base_ip+rpi_2, port=502)
    client.write_coils(0, [value] * (2040))
    client = ModbusClient(base_ip+rpi_3, port=502)
    client.write_coils(0, [value] * (2040))
    client = ModbusClient(base_ip+rpi_4, port=502)
    client.write_coils(0, [value] * (2040))
    return None
    
def toggle_rpi(ip, value):
    if len(str(ip)) > 2:
        client = ModbusClient(str(ip), port=502)
    else:
        client = ModbusClient(base_ip + str(ip), port=502)
    client.write_coils(0, [value] * (2040))
    return None

def toggle_many(ip, coil_start, coil_end, value): # replaces both onm.bat and offm
    if len(str(ip)) > 2:
        client = ModbusClient(str(ip), port=502)
    else:
        client = ModbusClient(base_ip + str(ip), port=502)
    client.write_coils(coil_start, [value] * (coil_end - coil_start + 1))
    return None

def read_coils(ip, coil_start, coil_end) -> list: # same thing as read_many but coil_end is 0 because that is the default value found in cli.py
    if len(str(ip)) > 2:
        client = ModbusClient(str(ip), port=502)
    else:
        client = ModbusClient(base_ip + str(ip), port=502)
    response = client.read_coils(coil_start, coil_end - coil_start +1)
    return response.bits[: coil_end - coil_start + 1]

def read_many(ip, coil_start, coil_end):
    if len(str(ip)) > 2:
        client = ModbusClient(str(ip), port=502)
    else:
        client = ModbusClient(base_ip + str(ip), port=502)
    response = client.read_coils(coil_start, coil_end - coil_start + 1)
    return response.bits[: coil_end - coil_start + 1]

def toggle_traffic(value):
    required_coil = 56 # this is on rpi_1 and is a specific coil required for only the traffic lights
    coil = 64
    if value:
        for rpi_1_required_coil in rpi_1_required_coils:
            toggle(rpi_1, rpi_1_required_coil, 1) # toggle universal required coils
        toggle(rpi_1, 56, 1) # toggle required coils
        toggle(rpi_4, coil, 1) # toggle main coil
    else: # ensures toggling off doesn't mess with required coils for other functions
        toggle(rpi_1, required_coil, 0)
        toggle(rpi_4, coil, 0)

def toggle_district1(value): # defined (Currently) as Police, Bank -> Fire, Houses -> Theatre
    coils = [40, 64, 72] # Houses -> Theatre; Bank -> Fire; Police, respectively

    if value:
        for rpi_1_required_coil in rpi_1_required_coils:
           toggle(rpi_1, rpi_1_required_coil, 1) # toggle universal required coils
        for coil in coils:
            toggle(rpi_1, coil, 1)
    else:
        for coil in coils: # toggle on each coil
            toggle(rpi_1, coil, 0)

def toggle_business(value): # placeholder for future functionality
    return None

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Test the connection to the modbus server and read/write to the modbus addresses.")

    parser.add_argument("-i", "--ip", dest="ip_address", type=str, help="IP address of the modbus server. Also functions with only the last 2 digits", default="192.168.1.81", required=True)

    parser.add_argument("-m", "--method", dest="modbus_method", type=str, help="Modbus method to use", default="read_coils", choices=["read_coils", "write_coils"], required=True)

    parser.add_argument("-s", "--start", dest="start", type=int, help="Starting address of the modbus address", default=0, required=True)

    parser.add_argument("-e", "--end", dest="end", type=int, help="Ending address of the modbus address", default=0)

    parser.add_argument("-v", "--value", dest="value", type=int, help="Value to write to the modbus address", default=0)

    args = parser.parse_args()

    ip = args.ip_address # original .bat files will function as intended since "192.168.1.%1" has len()> 2, so they will run functions without base_ip

    if not args.end > args.start:
        args.end = args.start

    if args.modbus_method == "read_coils":
        print(read_coils(ip, args.start, args.end))

# Example usage:
# toggle_district_1(True)  # Set the coil to 1
# toggle_district_1(False)  # Set the coil to 0