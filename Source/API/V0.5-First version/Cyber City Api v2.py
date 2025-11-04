import subprocess
import argparse
from pymodbus.client import ModbusTcpClient as ModbusClient
''''
copypaste cli.py base functions here so everything is in one file
cli-v2 has same functionality as cli but can run this code in terminal with indentical syntax'''

rpi_1 = '81'
rpi_1_required_coils = [24, 32]
rpi_2 = '82'
rpi_3 = '83'
rpi_4 = '98'
base_ip = '192.168.1.'

def toggle(ip, coil, value): # replaces both on.bat and off.bat
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
    client = ModbusClient(base_ip+str(ip), port=502)
    client.write_coils(0, [value] * (2040))
    return None

def toggle_many(ip, coil_start, coil_end, value): # replaces both onm.bat and offm
    client = ModbusClient(base_ip+str(ip), port=502)
    client.write_coils(coil_start, [value] * (coil_end - coil_start + 1))
    return None

def read_coil(ip, coil): # same thing as read_many but coil_end is 0 because that is the default value found in cli.py
    client = ModbusClient(base_ip+str(ip), port=502)
    response = client.read_coils(coil, 0 - coil + 1)
    return response.bits[: 0 - coil + 1]

def read_many(ip, coil_start, coil_end):
    client = ModbusClient(base_ip+str(ip), port=502)
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

# Example usage:
# toggle_district_1(True)  # Set the coil to 1
# toggle_district_1(False)  # Set the coil to 0