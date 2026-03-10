import sys
from PyQt5.QtWidgets import QWidget, QLabel, QVBoxLayout, QFormLayout, QPushButton, QSpinBox, QComboBox, QMessageBox
from PyQt5.QtGui import QPixmap


class AttackerWindow(QWidget):
    def __init__(self, parent):
        super().__init__(parent)
        
        # Accessing game state and budget from parent (MainWindow)
        self.cybercity = parent.cybercity
        self.budget = parent.budget
        
        # Main layout for the attacker window
        self.layout = QVBoxLayout()
        self.setLayout(self.layout)
        self.image_label = QLabel(self)
        self.layout.addWidget(self.image_label)
        
        self.create_widgets()  # Create initial widgets

    def create_widgets(self):
        # Displaying the attacker's current budget
        attacker_budget_label = QLabel("Attacker's Budget:")
        self.layout.addWidget(attacker_budget_label)

        # Label that shows the current budget value
        self.attacker_budget_label = QLabel(str(self.budget["attacker"]))
        self.layout.addWidget(self.attacker_budget_label)

        # Label for choosing locations to hack
        location_label = QLabel("Locations to Hack:")
        self.layout.addWidget(location_label)

        # SpinBox allows the user to select how many locations to hack (0 to 8)
        self.location_spinbox = QSpinBox()
        self.location_spinbox.setMinimum(0)
        self.location_spinbox.setMaximum(8)
        self.location_spinbox.valueChanged.connect(self.update_widgets)
        self.layout.addWidget(self.location_spinbox)

        # Form layout for dynamically adding district and action widgets
        self.form_layout = QFormLayout()
        self.layout.addLayout(self.form_layout)

        # Submit button to confirm the attack
        submit_button = QPushButton("Submit")
        submit_button.clicked.connect(self.submit_attacker_turn)
        self.layout.addWidget(submit_button)

        # Initial form update
        self.update_widgets()

    def update_widgets(self):
        # Get the number of locations selected
        n_locations = self.location_spinbox.value()

        # Clear existing form widgets
        for i in reversed(range(self.form_layout.count())):
            widget = self.form_layout.itemAt(i).widget()
            if widget:
                widget.deleteLater()

        # Add district and action combo boxes for each selected location
        for i in range(n_locations):
            district_label = QLabel(f"District {i + 1}:")
            district_combobox = QComboBox()
            district_combobox.addItems(list(self.cybercity.districts.keys()))
            action_label = QLabel(f"Action for District {i + 1}:")
            action_combobox = QComboBox()
            action_combobox.addItems(["Phishing", "Virus", "Malware", "Skip Turn"])

            # Add the widgets to the form layout
            self.form_layout.addRow(district_label, district_combobox)
            self.form_layout.addRow(action_label, action_combobox)

    def update_image(self):
        image_path = './img/defender.png'
        pixmap = QPixmap(image_path)
        self.image_label.setPixmap(pixmap)

    def submit_attacker_turn(self):
        n_locations = self.location_spinbox.value()
        start_value = 1

        # Loop through each selected location
        for i in range(n_locations):
            district_combobox = self.form_layout.itemAt(start_value).widget()
            action_combobox = self.form_layout.itemAt(start_value + 2).widget()
            start_value += 4

            district = district_combobox.currentText()
            action = action_combobox.currentText()

            # Calculate cost based on action
            cost = int(self.budget['attacker'] * self.parent().hacking_actions[action]["probability"])
            if cost > self.budget['attacker']:
                QMessageBox.warning(self, "Insufficient Budget", f"You don't have enough budget to perform {action} in {district}.")
            else:
                self.budget['attacker'] -= cost * 0.1

                if action != "Skip Turn" and self.cybercity.hackSuccessful(self.parent().hacking_actions[action]["probability"]):
                    self.cybercity.compromiseEffect(district, self.parent().hacking_actions[action]["effect"])
                    if self.cybercity.getEffect(district) < 0:
                        self.cybercity.turnOffLight(district)

        # Update the displayed budget
        self.attacker_budget_label.setText(str(self.budget["attacker"]))
        self.parent().round_switch()  # Move to the next round
