from flask import Flask, request, jsonify
import random
import time
import threading

try:
    import RPi.GPIO as GPIO

    GPIO.setmode(GPIO.BCM)
except ImportError:
    print("RPi.GPIO not found. Skipping GPIO setup.")
    GPIO = None  # So you know GPIO isn't available

app = Flask(__name__)

# Define GPIO pins for 8 locations if GPIO is available
if GPIO:
    LOCATION_PINS = {
        'Business': 2,
        'Hospital': 3,
        'Fire/Police': 4,
        'Industrial': 5,
        'University': 6,
        'Housing': 7,
        'Lackland': 8,
        'Traffic Lights': 9
    }
else:
    LOCATION_PINS = {}  # Empty dictionary if GPIO is not available

# Set up pins as output and turn all lights on, if GPIO is available
if GPIO:
    for pin in LOCATION_PINS.values():
        GPIO.setup(pin, GPIO.OUT)
        GPIO.output(pin, GPIO.HIGH)

# Hacker actions and their probabilities
HACKER_ACTIONS = {
    'Phishing': {'base_probability': 0.90, 'compromise_range': (40, 85)},
    'Virus': {'base_probability': 0.85, 'compromise_range': (60, 85)},
    'Malware': {'base_probability': 0.80, 'compromise_range': (70, 100)},
}

# Defender actions and their effects
DEFENDER_ACTIONS = {
    'Firewall': {'compromise_reduction_range': (6, 10), 'hacker_probability_reduction': 0.1},
    'Virus Protection': {'shield_range': (20, 35)},
    'Intrusion Detection': {'revive_range': (42, 88), 'reduction_range': (5, 10)},
    'User Training': {'damage_reduction_range': (10, 50), 'compromise_reduction_range': (6, 15)},
}

# State tracking for each location
location_damage_reduction = {}
location_hacker_probability_reduction = {loc: 0 for loc in LOCATION_PINS.keys()}
defender_action_cooldowns = {'Intrusion Detection': 0}


def decrement_cooldowns():
    """Decrement cooldowns for defender actions."""
    for action in defender_action_cooldowns:
        if defender_action_cooldowns[action] > 0:
            defender_action_cooldowns[action] -= 1


@app.route('/process_action', methods=['POST'])
def process_action():
    data = request.get_json()
    print(f"Received data: {data}")  # log the received data
    location = data.get('location')
    if location:
        print(f"Location: {location}")
    else:
        print("Location not found in request data.")

    side = data['side']
    action = data['action']
    location = data['location']
    current_compromise = data.get('current_compromise', 0)

    result = {}

    if current_compromise >= 100:
        if side == 'Hacker':
            message = f'You have already fully compromised {location}, the defender will not be able to save it. Hack somewhere else.'
        else:  # Defender
            message = f'{location} was lost to the Hacker... There is no getting it back. Try another location.'
        return jsonify({'message': message})

    if side == 'Defender':
        if action == 'Intrusion Detection':
            if defender_action_cooldowns['Intrusion Detection'] > 0:
                message = f'Intrusion Detection is currently on cooldown. Please try another action.'
                return jsonify({'message': message})

            if current_compromise < 75:
                reduction_amount = random.randint(*DEFENDER_ACTIONS['Intrusion Detection']['reduction_range'])
                applied_value = min(reduction_amount, current_compromise)
                message = f'Intrusion Detection at {location} reduced the compromise by {applied_value}.'
            elif 75 <= current_compromise < 100:
                revive_amount = random.randint(*DEFENDER_ACTIONS['Intrusion Detection']['revive_range'])
                applied_value = min(revive_amount, current_compromise)
                message = f'Intrusion Detection at {location} revived systems, decreasing compromise by {applied_value}.'
                defender_action_cooldowns['Intrusion Detection'] = 2
                # message += ' Intrusion Detection is now on a 2 round cooldown.'
            else:
                message = f'{location} has been lost to the Hacker. There is no getting it back...'

            result = {
                'action': action,
                'location': location,
                'compromise': -applied_value,
                'message': message
            }

        if action == 'User Training':
            reduction = random.randint(*DEFENDER_ACTIONS['User Training']['compromise_reduction_range'])
            applied_value = min(reduction, current_compromise)
            damage_reduction = random.randint(*DEFENDER_ACTIONS['User Training']['damage_reduction_range'])
            location_damage_reduction[location] = damage_reduction

            message = (
                f'User Training at {location} reduced compromise by {applied_value} and reduced damage from future attacks '
                f'by {damage_reduction}%.'
            )
            result = {
                'action': action,
                'location': location,
                'compromise': -applied_value,
                'message': message
            }

    if side == 'Hacker':
        # Get action details and apply any probability reduction from Firewall
        action_details = HACKER_ACTIONS[action]
        total_probability_reduction = location_hacker_probability_reduction.get(location, 0)
        effective_probability = action_details['base_probability'] - total_probability_reduction

        success = random.random() < effective_probability
        location_hacker_probability_reduction[location] = 0  # Reset after attack

        if success:
            compromise_increase = random.randint(*action_details['compromise_range'])
            damage_reduction_percent = location_damage_reduction.get(location, 0)
            damage_reduction_amount = int(compromise_increase * (damage_reduction_percent / 100))
            final_increase = max(compromise_increase - damage_reduction_amount, 0)

            if damage_reduction_percent > 0:
                message = (
                    f'{action} was implemented at {location}. It would have done {compromise_increase} but '
                    f'due to previous User Training, the compromise was reduced by {damage_reduction_amount} '
                    f'({damage_reduction_percent}%), causing the compromise increase to only be {final_increase}.'
                )
                if total_probability_reduction > 0:
                    message += f' The probability of success was {total_probability_reduction * 100:.2f}% less than normal due to previous Firewall deployment.'

                location_damage_reduction[location] = 0  # Reset after successful attack
            else:
                message = (
                    f'{action} was implemented at {location}, increasing the compromise by {final_increase}.'
                )
                if total_probability_reduction > 0:
                    message += f' The probability of success was {total_probability_reduction * 100:.2f}% less than normal due to previous Firewall deployment.'

            result = {
                'action': action,
                'location': location,
                'compromise': final_increase,
                'message': message
            }
        else:
            if total_probability_reduction > 0:
                message = (
                    f'{action} failed at {location}, likely due to previous Firewall effects. '
                    f'The probability to land a successful attack at {location} was '
                    f'{total_probability_reduction * 100:.2f}% less than normal.'
                )
            else:
                message = f'{action} failed at {location}. Maybe next time...'

            result = {
                'action': action,
                'location': location,
                'compromise': 0,
                'message': message
            }

    elif side == 'Defender':
        if action == 'Firewall':
            # Ensure that the location exists in location_hacker_probability_reduction
            if location not in location_hacker_probability_reduction:
                location_hacker_probability_reduction[location] = 0  # Initialize with a default value

            # Apply firewall action for compromise reduction
            reduction = random.randint(*DEFENDER_ACTIONS['Firewall']['compromise_reduction_range'])
            applied_value = min(reduction, current_compromise)
            location_hacker_probability_reduction[location] += DEFENDER_ACTIONS['Firewall']['hacker_probability_reduction']
            total_probability_reduction = location_hacker_probability_reduction[location]

            # Generate message based on applied values
            if applied_value == reduction:
                message = (
                    f'Firewall activated at {location}, compromise decreased by {applied_value}. '
                    f'The probability that the next attack will be successful at {location} was decreased by '
                    f'{total_probability_reduction * 100:.2f}%.'
                )
            else:
                message = (
                    f'Firewall activated at {location}, reducing compromise by {applied_value}. '
                    f'The full reduction was {reduction}, but only {applied_value} could be applied. '
                    f'The probability that the next attack will be successful at {location} was decreased by '
                    f'{total_probability_reduction * 100:.2f}%.'
                )

            result = {
                'action': action,
                'location': location,
                'compromise': -applied_value,
                'message': message
            }

        elif action == 'Virus Protection':
            shield = random.randint(*DEFENDER_ACTIONS['Virus Protection']['shield_range'])
            message = f'Virus Protection deployed at {location}, adding a shield of {shield}.'
            result = {
                'action': action,
                'location': location,
                'shield': shield,
                'compromise': 0,
                'message': message
            }

    return jsonify(result)


def decrement_cooldowns_thread():
    """Run the cooldown decrement in a separate thread."""
    while True:
        decrement_cooldowns()
        time.sleep(1)


# Run cooldowns decrement thread
cooldown_thread = threading.Thread(target=decrement_cooldowns_thread, daemon=True)
cooldown_thread.start()

if __name__ == '__main__':
    app.run(debug=True, port=4000)
