import random

class Cybercity:
    def __init__(self):
        # Initialize districts with their light statuses
        self.districts = {
            "Business": {"light": "On"},
            "Hospital": {"light": "On"},
            "Fire/Police": {"light": "On"},
            "Industrial": {"light": "On"},
            "University": {"light": "On"},
            "Housing": {"light": "On"},
            "Fort Sam": {"light": "On"},
            "Traffic Lights": {"light": "On"},
        }

        # Initialize districts' effects (values that change due to hacking or protection)
        self.districts_effect = {
            "Business": {"effect": 0.0},
            "Hospital": {"effect": 0.0},
            "Fire/Police": {"effect": 0.0},
            "Industrial": {"effect": 0.0},
            "University": {"effect": 0.0},
            "Housing": {"effect": 0.0},
            "Fort Sam": {"effect": 0.0},
            "Traffic Lights": {"effect": 0.0},
        }

    # Apply a positive effect to a district (used for defensive actions)
    def applyEffect(self, district, effect):
        self.districts_effect[district]['effect'] = effect + self.districts_effect[district]['effect']
    
    # Compromise a district's effect (used for hacking actions)
    def compromiseEffect(self, district, effect):
        self.districts_effect[district]['effect'] = self.districts_effect[district]['effect'] - effect

    # Turn the lights on in a specific district
    def turnOnLight(self, district):
        self.districts[district]['light'] = "On"

    # Turn the lights off in a specific district (includes a print statement for feedback)
    def turnOffLight(self, district):
        print("s")
        self.districts[district]['light'] = "Off"

    # Get the light status of a specific district (on or off)
    def getStatus(self, district):
        return self.districts[district]['light']
    
    # Get the current effect level of a specific district
    def getEffect(self, district):
        return self.districts_effect[district]['effect']

    # Turn on the lights in all districts
    def on(self):
        for district in self.districts:
            self.turnOnLight(district)

    # Turn off the lights in all districts
    def off(self):
        for district in self.districts:
            self.turnOffLight(district)

    # Placeholder method for turning on all relays
    def allRelaysOn(self):
        pass

    # Placeholder method for turning off all relays
    def allRelaysOff(self):
        pass

    # Placeholder method for turning on all relays in a specific Pi
    def allPiRelaysOn(self, PiIP):
        pass

    # Placeholder method for turning off all relays in a specific Pi
    def allPiRelaysOff(self, PiIP):
        pass

    # Placeholder method for turning on a specific relay
    def relayOn(self, PiIP, relayNo):
        pass

    # Placeholder method for turning off a specific relay
    def relayOff(self, PiIP, relayNo):
        pass

    # Print the light status of all districts
    def refresh(self):
        for district, status in self.districts.items():
            print(f"{district} lights are {'On' if status['light'] == 'On' else 'Off'}")

    # Get the overall status of the city in text format
    def status(self):
        status_text = "Cybercity status:\n"
        for district, data in self.districts.items():
            status_text += f"{district}: {'Lights On' if data['light'] == 'On' else 'Lights Off'}\n"
        return status_text

    # Determine if a hack attempt is successful based on the given probability
    def hackSuccessful(self, probability):
        a = random.random()  # Generate a random float between 0 and 1
        print(a)  # Print the generated random value
        return a < probability  # Return True if the random value is less than the given probability

    # Attempt to hack all districts based on the given probability
    def hack(self, probability):
        if self.hackSuccessful(probability):  # If the hack is successful
            print("Hacking successful!")
            for district in self.districts:  # Turn off the lights in all districts
                self.turnOffLight(district)
        else:
            print("Hacking failed!")  # If the hack fails, print a failure message
