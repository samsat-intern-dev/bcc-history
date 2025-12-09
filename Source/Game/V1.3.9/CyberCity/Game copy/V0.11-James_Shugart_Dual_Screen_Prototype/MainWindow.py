# from PyQt5.QtWidgets import QMainWindow # Imports qmainwindow from pyqt5
from PyQt5.QtWidgets import QApplication, QMainWindow, QWidget, QLabel, QVBoxLayout, QHBoxLayout, QPushButton, QSpinBox, QComboBox, QTextEdit, QFormLayout, QMessageBox
from attacker import AttackerWindow     # Imports from attacker.py
from defender import DefenderWindow     # Imports from defender.py
from WindowConfig import WindowConfig  # Import WindowConfig.py



class MainWindow(QMainWindow):
    def __init__(self, title, counter, cybercity, main_instance):
        super().__init__()

        # Initialize WindowConfig to handle window sizes and positions
        self.window_config = WindowConfig()

        # Store game references
        self.main_instance = main_instance
        self.title = title
        self.counter = counter
        self.cybercity = cybercity
        self.budget = {"defender": 50000, "attacker": 50000}
        self.round_counter = 0
        self.time_num = 0

        # Set the window size and position based on title
        x, y, width, height = self.window_config.get_geometry(self.title)
        self.setGeometry(x, y, width, height)

        # Define protection actions for the defender
        self.protection_actions = {
            "Firewall": {"effect": 0.30, "probability": 0.7},
            "Virus Protection": {"effect": 0.15, "probability": 0.8},
            "Intrusion Detection System": {"effect": 0.25, "probability": 0.9},
            "User Training": {"effect": 0.20, "probability": 1.0},
            "Turn Off Lights": {"effect": 0, "probability": 1.0}
        }

        # Define hacking actions for the attacker
        self.hacking_actions = {
            "Phishing": {"effect": 0.35, "probability": 0.7},
            "Virus": {"effect": 0.25, "probability": 0.8},
            "Malware": {"effect": 0.20, "probability": 0.9},
            "Skip Turn": {"effect": 0, "probability": 1.0}
        }

        # Ensure all districts have default actions if not already present
        for district in self.cybercity.districts.keys():
            if district not in self.protection_actions:
                self.protection_actions[district] = {"effect": 0, "probability": 1.0}
            if district not in self.hacking_actions:
                self.hacking_actions[district] = {"effect": 0, "probability": 1.0}

        # Initialize the windows for attacker and defender
        self.attack_window = AttackerWindow(self)
        self.defend_window = DefenderWindow(self)

        self.end = self.counter.get_num_rounds()
        if self.end >= 10:
            # End game logic here
            return

        # Set the appropriate window (attacker/defender) based on title
        if self.title == "attacker":
            self.attack_window.create_widgets()
            self.attack_window.update_image()
            self.setCentralWidget(self.attack_window)
        else:
            self.defend_window.create_widgets()
            self.setCentralWidget(self.defend_window)

    # Switch between attacker and defender windows during the round
    def round_switch(self):
        self.counter.next_round()
        num = self.counter.get_num_rounds()
        print(num)

        if num >= 10:
            # End game logic
            return

        # Switch central widget based on round
        self.switch_central_widget(num)

        # Update the window geometry (position and size) for both windows
        x, y, width, height = self.window_config.get_geometry(self.title)
        self.setGeometry(x, y, width, height)

        # Update budget and any other necessary game state changes
        if hasattr(self, 'defender_window'):
            self.defender_window.defender_budget_label.setText(str(self.budget["defender"]))
        if hasattr(self, 'attacker_window'):
            self.attacker_window.attacker_budget_label.setText(str(self.budget["attacker"]))

    # Switch the central widget based on the current round and title
    def switch_central_widget(self, num):
        if num % 2 == 0 and self.title == "attacker":
            self.main_instance.render_content(self.title)
        elif num % 2 == 0 and self.title == "defender":
            self.main_instance.render_image(self.title)
        elif num % 2 != 0 and self.title == "defender":
            self.main_instance.render_content(self.title)
        elif num % 2 != 0 and self.title == "attacker":
            self.main_instance.render_image(self.title)

        # Re-apply the correct geometry
        x, y, width, height = self.window_config.get_geometry(self.title)
        self.setGeometry(x, y, width, height)

    # Define the set_atimage method to update the attacker's image
    def set_atimage(self):
        self.attack_window = AttackerWindow(self)  # Re-initialize attacker window if needed
        self.attack_window.update_image()  # Update the attacker's image
        self.setCentralWidget(self.attack_window)  # Set the attacker window as central widget

    # Define the set_defimage method to update the defender's image
    def set_defimage(self):
        self.defend_window = DefenderWindow(self)  # Re-initialize defender window if needed
        self.defend_window.update_image()  # Update the defender's image
        self.setCentralWidget(self.defend_window)  # Set the defender window as central widget

    # Define the set_attack method to switch to the attacker's window (content, not image)
    def set_attack(self):
        print("Setting attacker window") # debug purposes
        self.attack_window = AttackerWindow(self)  # Re-initialize attacker window if needed
        self.attack_window.create_widgets()  # Ensure the attacker's widgets are created
        self.setCentralWidget(self.attack_window)  # Set the attacker window as central widget

    # Define the set_defend method to switch to the defender's window (content, not image)
    def set_defend(self):
        self.defend_window = DefenderWindow(self)  # Re-initialize defender window if needed
        self.defend_window.create_widgets()  # Ensure widgets are created for the defender
        self.setCentralWidget(self.defend_window)  # Set the defender window as central widget
