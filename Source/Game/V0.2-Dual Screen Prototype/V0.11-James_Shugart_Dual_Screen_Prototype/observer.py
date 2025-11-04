from PyQt5.QtWidgets import QMainWindow, QTextEdit, QVBoxLayout, QWidget
from PyQt5.QtCore import QTimer

class ObserverWindow(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)

        # Set up layout for observer window
        self.layout = QVBoxLayout()
        self.setLayout(self.layout)

        # Set up a QTextEdit widget to display game events
        self.log_text = QTextEdit(self)
        self.log_text.setReadOnly(True)  # Make the log read-only
        self.layout.addWidget(self.log_text)

       
        # Add a timer to periodically check for updates in the game
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.observe_game)
        self.timer.start(10000)  # Check every 10 seconds
        

        # Reference to the cybercity state (initialized as None, will be set later)
        self.cybercity = None

    # Method to link the observer to the game's state
    def set_game_state(self, cybercity):
        self.cybercity = cybercity

    # Method that observes the game and logs relevant events
    def observe_game(self):
        if not self.cybercity:
            return

        # Check the status of the districts and log changes
        for district, data in self.cybercity.districts.items():
            light_status = data["light"]
            effect_level = self.cybercity.getEffect(district)
            self.log_text.append(f"{district} - Lights: {light_status}, Effect: {effect_level:.2f}")

        # Scroll to the bottom of the log after updating
        self.log_text.verticalScrollBar().setValue(self.log_text.verticalScrollBar().maximum())

    # Method that logs an action taken by a player (either the attacker or defender) and displays it in the observer window
    def log_action(self, player, action):
        self.log_text.append(f"{player} performed: {action}")

    # Method that updates the status of each district in the city, indicating whether the lights are on or off
    def update_city_status(self):
        for district, status in self.cybercity.districts.items():
            self.log_text.append(f"{district}: {'Lights On' if status['light'] == 'On' else 'Lights Off'}")


class ObserverApp(QMainWindow):
    def __init__(self, attacker_window, defender_window, cybercity):
        super().__init__()

        # Set up observer window
        self.observer_window = ObserverWindow(self)
        self.setCentralWidget(self.observer_window)

        # Link the observer to the game's state (Cybercity)
        self.observer_window.set_game_state(cybercity)

        # Reference to the attacker and defender windows
        self.attacker_window = attacker_window
        self.defender_window = defender_window

        # Set window title and size
        self.setWindowTitle("Observer Window")
        self.setGeometry(100, 100, 800, 600)
