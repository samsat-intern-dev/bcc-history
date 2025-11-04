""" 
Modbus/TCP to Unity Translator v0.2 (1 April 2020)
(c) 2020, CACI, Inc.

Author:  Scott Thompson, Husam Saoudi
Email:   scott.thompson@caci.com, hsaoudi@caci.com

---

Program polls PLCs for coils at four different locations.  The results
of this poll are converted into hexadecimal octets.  The hex is sent
to a server located at the IP address defined in variable HOST with a 
listening port defined in the variable PORT.  This operation will be 
repeated every 1 second indefinitely.

"""

from pymodbus.client import ModbusTcpClient as ModbusClient
from time import sleep
from os import system, name
import socket

# Host IP address and port number for the listener.
HOST = "127.0.0.1"
PORT = 5555

# Global variables and objects defined here.
power_client = ModbusClient('10.10.10.1')
hosp_client = ModbusClient('10.10.10.2')
police_client = ModbusClient('10.10.10.3')
traf_client = ModbusClient('10.10.10.4')
# hexprefix = "[CB]"
hexsend = ""
hexsent = ""

def clear():
    # This function checks for the operating system and clears the
    # screen for the printout.
    if name == 'nt':
        _ = system('cls')
    else:
        _ = system('clear')

def hexConvert(x, count):
    # Converts bits to a hexadecimal string then returns the string.
    temp_str=""
    for a in range(count):
        temp_str = temp_str + str(int(x.bits[a]))
    #decimal_representation = int(temp_str, 2)
    #hex_string = hex(decimal_representation)
    #if hex_string == "0x0":
    #    hex_string = hex_string + "0"
    #return(hex_string[2:4])
    return(temp_str)

def power():
    numbits = 6
    result = power_client.read_coils(0, numbits)
    print('\nSUBSTATION [PWR]')
    print('10.10.10.1')
    print('Coil 0: Business District ', result.bits[0])
    print('Coil 1: Hospital          ', result.bits[1])
    print('Coil 2: Police / Fire     ', result.bits[2])
    print('Coil 3: Industrial Area   ', result.bits[3])
    print('Coil 4: University        ', result.bits[4])
    print('Coil 5: Residential       ', result.bits[5])
    y = hexConvert(result, numbits)
    y = "[PWR]" + y	
    return y

def hospital():
    numbits = 2
    result = hosp_client.read_coils(0, numbits)
    print('\nHOSPITAL [H]')
    print('10.10.10.2')
    print('Coil 0: Power             ', result.bits[0])
    print('Coil 1: Generator Running ', result.bits[1])
    y = hexConvert(result, numbits)
    y = "[H]" + y
    return y

def police():
    numbits = 2
    result = police_client.read_coils(0, numbits)
    print('\nPOLICE/FIRE [POL]')
    print('10.10.10.3')
    print('Coil 0: Power             ', result.bits[0])
    print('Coil 1: Generator Running ', result.bits[1])
    y = hexConvert(result, numbits)
    y = "[POL]" + y
    return y

def traffic():
    numbits = 6
    result = traf_client.read_coils(0, numbits)
    print('\nTRAFFIC LIGHT [TL]')
    print('10.10.10.4')
    print('Coil 0: Green Light NS    ', result.bits[0])
    print('Coil 1: Yellow Light NS   ', result.bits[1])
    print('Coil 2: Red Light NS      ', result.bits[2])
    print('Coil 3: Green Light EW    ', result.bits[3])
    print('Coil 4: Yellow Light EW   ', result.bits[4])
    print('Coil 5: Red Light EW      ', result.bits[5])
    y = hexConvert(result, numbits)
    y = "[TL]" + y
    return y

if __name__ == '__main__':
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        while True:
            try:
                my_bytes = bytearray()
                clear()
                hexsend = hexsend + power()
                hexsend = hexsend + hospital()
                hexsend = hexsend + police()
                hexsend = hexsend + traffic()
	    #Only send data when it changes - by husam            
            #if hexsent != hexsend:
            #	hexsent = hexsend
            #    s.sendto(hexsend.encode(),(HOST,PORT))
                print("\nSending: " + hexsend)
            #	hexsend = hexprefix + hexsend
                s.sendto(hexsend.encode(),(HOST,PORT))
            #else:
            #	print("\nSending: nothing")
            #   Clear and Sleep
                hexsend = ""            
                sleep(1)
            except:
                print("error")

