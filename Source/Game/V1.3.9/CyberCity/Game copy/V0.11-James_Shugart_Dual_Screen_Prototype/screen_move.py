import sys
from PyQt5.QtWidgets import QApplication
from MainWindow import MainWindow  # Import MainWindow class
from cybercity import Cybercity
from next import NextRound
from observer import ObserverWindow, ObserverApp


class Main:
    def __init__(self):
        super().__init__()
        counter = NextRound()
        self.cybercity = Cybercity()  # Game state

        # Initialize player windows
        self.attacker = MainWindow("attacker", counter, self.cybercity, self)
        self.defender = MainWindow("defender", counter, self.cybercity, self)

        # Initialize observer window
        self.observer = ObserverApp(self.attacker, self.defender, self.cybercity)

        # Show all windows
        self.attacker.show()    # Show attacker window
        self.defender.show()    # Show defender window
        self.observer.show()    # Show observer window

    def render_image(self, title):
        if title == "attacker":
            
            print("Switching to attacker window")   # for debug purposes

            self.attacker.attack_window.update_image()
            self.attacker.setCentralWidget(self.attacker.attack_window)
            print("Attacker window set")
            self.defender.set_defend()

            # Log attack action in observer window
            self.observer.observer_window.log_action("attacker", "image updated")
    
        elif title == "defender":
            
            print("Switching to defender window")   # for debug purposes

            self.defender.set_defimage()
            self.attacker.set_atimage()

            # Log defend action in observer window
            self.observer.observer_window.log_action("defender", "image updated")

    def render_content(self, title):
        if title == "attacker":

            print("Switching to attacker content")  # for debug purposes

            self.attacker.attack_window.create_widgets()
            self.attacker.setCentralWidget(self.attacker.attack_window)
            print("Attacker content set")
            self.defender.set_defimage()

            # Log attack action in observer window
            self.observer.observer_window.log_action("attacker", "content updated")
    
        elif title == "defender":
        
            print("Switching to defender content")  # for debug purposes

            self.attacker.set_atimage()
            self.defender.set_defend()

            # Log defend action in observer window
            self.observer.observer_window.log_action("defender", "content updated")

# Main game loop
if __name__ == '__main__':
    app = QApplication(sys.argv)
    main_game = Main()  # Initialize the game
    sys.exit(app.exec_())