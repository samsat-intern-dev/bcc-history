import random
from cybercity import Cybercity

def validate_input(prompt, valid_inputs):
    while True:
        user_input = input(prompt)
        if user_input in valid_inputs:
            return user_input
        else:
            print(f"Invalid input! Please enter one of the following: {', '.join(valid_inputs)}")

cybercity = Cybercity()

budget = {
    "defender": 50000,
    "attacker": 50000
}

# Firewall: The probability of successfully protecting the district from attacks using a firewall.
# Virus Protection: The probability of successfully defending against viruses with virus protection measures.
# Intrusion Detection System: The probability of detecting and preventing intrusions with an intrusion detection system.
# User Training: The probability of improving the users' awareness and reducing the likelihood of security breaches through training.
# Turn Off Lights: This action does not have a probability as it simply turns off the lights in a district.

protection_actions = {
    "Firewall": {"effect": 0.30, "probability": 0.7},
    "Virus Protection": {"effect": 0.15, "probability": 0.8},
    "Intrusion Detection System": {"effect": 0.25, "probability": 0.9},
    "User Training": {"effect": 0.20, "probability": 1.0},
    "Turn Off Lights": {"effect": 0, "probability": 1.0}
}

# Phishing: The probability of successfully tricking users into revealing sensitive information through phishing attacks.
# Virus: The probability of successfully infecting a district with a computer virus.
# Malware: The probability of successfully deploying malware in a district.
# Skip Turn: This action does not have a probability as it simply allows the attacker to skip their turn without performing any action.
hacking_actions = {
    "Phishing": {"effect": 0.35, "probability": 0.7},
    "Virus": {"effect": 0.25, "probability": 0.8},
    "Malware": {"effect": 0.20, "probability": 0.9},
    "Skip Turn": {"effect": 0, "probability": 1.0}
}

for i in range(10):
    print(f"\n--- Round {i+1} ---")

    print("\nDefender's turn!")
    print(f"Budget: {budget['defender']}")

    n_locations = input("How many locations do you want to protect or turn off lights (1-8, press Enter to skip turn): ")
    if n_locations.strip() != "":
        for _ in range(int(n_locations.strip())):

            action = validate_input("Choose your action (Firewall, Virus Protection, Intrusion Detection System, User Training, Turn Off Lights): ", protection_actions.keys())

            district = validate_input("Choose a district: ", cybercity.districts.keys())

            cost = int(budget['defender'] * protection_actions[action]["probability"])

            budget['defender'] -= cost

            if action != "Turn Off Lights":
                cybercity.turnOnLight(district)
            else:
                cybercity.turnOffLight(district)


    print("\nAttacker's turn!")
    print(f"Budget: {budget['attacker']}")

    n_locations = input("How many locations do you want to hack (1-8, press Enter to skip turn): ")
    if n_locations.strip() != "":
        for _ in range(int(n_locations.strip())):

            action = validate_input("Choose your action (Phishing, Virus, Malware, Skip Turn): ", hacking_actions.keys())

            district = validate_input("Choose a district: ", cybercity.districts.keys())

            cost = int(budget['attacker'] * hacking_actions[action]["probability"])

            budget['attacker'] -= cost

            if action != "Skip Turn":
                if cybercity.hackSuccessful(hacking_actions[action]["probability"]):
                    cybercity.turnOffLight(district)

    print("\nAfter turn:")
    cybercity.refresh()

print("\n--- End of Game ---")
