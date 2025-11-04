import subprocess
import argparse

rpi_1 = '81'
rpi_1_required_coils = [24, 32]
rpi_2 = '82'
rpi_3 = '83'
rpi_4 = '98'
base_ip = '192.168.1.'
cli = '/Battle for Cyber City/Source/Command Line Interface (test program)/V1-Battle for Cyber City Test Program/cli.py'

def toggle(ip, coil, value): # replaces both on.bat and off.bat
    ip = base_ip + str(ip)
    subprocess.run(f'python {cli} -i {ip} -m write_coils -s {str(coil)} -v {str(value)}')

def toggle_all(value): # replaces both allon.bat and alloff.bat
    subprocess.run(f'python {cli} -i {base_ip+rpi_1} -m write_coils -s 0 -e 2039 -v {str(value)}')
    subprocess.run(f'python {cli} -i {base_ip+rpi_2} -m write_coils -s 0 -e 2039 -v {str(value)}')
    subprocess.run(f'python {cli} -i {base_ip+rpi_3} -m write_coils -s 0 -e 2039 -v {str(value)}')
    subprocess.run(f'python {cli} -i {base_ip+rpi_4} -m write_coils -s 0 -e 2039 -v {str(value)}')

def toggle_rpi(ip, value):
    ip = base_ip + str(ip)
    subprocess.run(f'python {cli} -i {ip} -m write_coils -s 0 -e 2039 -v {str(value)}')

def toggle_many(ip, coil_start, coil_end, value): # replaces both onm.bat and offm
    ip = base_ip + str(ip)
    subprocess.run(f'python {cli} -i {ip} -m write_coils -s {str(coil_start)} -e {str(coil_end)} -v {str(value)}')

def read_coil(ip, coil):
    ip = base_ip + str(ip)
    subprocess.run(f'python {cli} -i {ip} -m read_coils -s {coil}')

def read_many(ip, coil_start, coil_end):
    ip = base_ip + str(ip)
    subprocess.run(f'python {cli} -i {ip} -m read_coils -s {coil_start} -e {coil_end}')

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


# Example usage:
# toggle_district_1(True)  # Set the coil to 1
# toggle_district_1(False)  # Set the coil to 0