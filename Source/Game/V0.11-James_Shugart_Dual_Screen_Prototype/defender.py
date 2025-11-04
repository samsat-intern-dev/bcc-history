import sys
from PyQt5.QtWidgets import QApplication, QMainWindow, QWidget, QLabel, QVBoxLayout, QHBoxLayout, QPushButton, QSpinBox, QComboBox, QTextEdit, QFormLayout, QMessageBox
from cybercity import Cybercity
from PyQt5.QtGui import QPixmap


class DefenderWindow(QWidget):
    def __init__(self, parent):
        super().__init__(parent)
         # Reference to the Cybercity game state and defender's budget
        self.cybercity = parent.cybercity
        self.budget = parent.budget

         # Main layout for the window
        self.layout = QVBoxLayout()
        self.setLayout(self.layout)
        self.image_label = QLabel(self)
        self.layout.addWidget(self.image_label)

    def create_widgets(self):

         # Displaying the defender's current budget
        defender_budget_label = QLabel("Defender's Budget:")
        self.layout.addWidget(defender_budget_label)

        # Label that shows the current budget value
        self.defender_budget_label = QLabel(str(self.budget["defender"]))
        self.layout.addWidget(self.defender_budget_label)

        # Label for choosing locations to defend
        location_label = QLabel("Locations to Protect / Turn Off Lights (0-8):")
        self.layout.addWidget(location_label)

         # SpinBox allows the user to select how many locations to defend (0 to 8)
        self.location_spinbox = QSpinBox()
        self.location_spinbox.setMinimum(0)
        self.location_spinbox.setMaximum(8)

        # Connect spinbox value changes to update the form dynamically
        self.location_spinbox.valueChanged.connect(self.update_district_selection)
        self.layout.addWidget(self.location_spinbox)

        # Form layout for dynamically adding district selection widgets
        self.form_layout = QFormLayout()
        self.layout.addLayout(self.form_layout)

        # Button to submit the defender's choices
        submit_button = QPushButton("Submit")
        submit_button.clicked.connect(self.submit_defender_turn)
        self.layout.addWidget(submit_button)
        
      
    def update_district_selection(self):
        # Get the number of locations chosen
        n_locations = self.location_spinbox.value()

        # Remove any existing widgets from the form layout
        for i in reversed(range(self.form_layout.count())):
            widget = self.form_layout.itemAt(i).widget()
            if widget is not None:
                widget.setParent(None)

        # Add a label and combo box for each selected location (district)
        for i in range(n_locations):
            district_label = QLabel(f"District {i + 1}:")
            district_combobox = QComboBox()

            # Populate combo box with available districts from Cybercity
            district_combobox.addItems(list(self.cybercity.districts.keys()))
            action_label = QLabel(f"Choose Action for District {i + 1}:")


            action_combobox = QComboBox()
            action_combobox.addItems(["Firewall", "Virus Protection", "Intrusion Detection System", "User Training", "Turn Off Lights"])
            self.form_layout.addRow(district_label, district_combobox)
            self.form_layout.addRow(action_label, action_combobox)

            
    def update_image(self):
        if self.parent().title == "defender":
            print("def imag")
            image_path = './img/attacker.png'
            pixmap = QPixmap(image_path)
            self.image_label.setPixmap(pixmap)


    def submit_defender_turn(self):
        # Collect the selected districts for defending
        n_locations = self.location_spinbox.value()

        start_value = 1
        for i in range(n_locations):
            print(i)
            district_combobox = self.form_layout.itemAt(start_value).widget()
            action_combobox = self.form_layout.itemAt(start_value + 2).widget()
            start_value += 4
            district = district_combobox.currentText()
            action = action_combobox.currentText()

            # Check if the defender has enough budget for the operation
            cost = int(self.budget['defender'] * self.parent().protection_actions[action]["probability"])
            if cost > self.budget['defender']:

                QMessageBox.warning(self, "Insufficient Budget", f"You don't have enough budget to perform the action '{action}' in District {district}.")
            else:
                self.budget['defender'] -= cost * 0.1

            if action == "Turn Off Lights":
                self.cybercity.turnOffLight(district)
            else:
                print("yes")

                if self.cybercity.hackSuccessful(self.parent().protection_actions[action]["probability"]):
                    self.cybercity.applyEffect(district, self.parent().protection_actions[action]["effect"])
                    if self.cybercity.getEffect(district) >= 0:
                        self.cybercity.turnOnLight(district)
                else:
                    QMessageBox.warning(self, "Defense Failed", f"Defense {action} is not successful in District {district}.")

        self.defender_budget_label.setText(str(self.budget["defender"]))
        self.parent().round_switch()
