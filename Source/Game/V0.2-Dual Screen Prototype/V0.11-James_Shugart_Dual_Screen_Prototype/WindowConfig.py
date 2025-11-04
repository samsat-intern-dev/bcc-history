class WindowConfig:
    def __init__(self):
        # Define default window sizes and positions for different roles
        self.default_width = 320
        self.default_height = 480

        # Coordinates for attacker and defender windows
        self.positions = {
            "attacker": (50, 50),
            "defender": (700, 50)
        }

    # Method to return the geometry (position and size) for a given title
    def get_geometry(self, title):
        x, y = self.positions.get(title, (100, 100))  # Default to (100, 100) if title not found
        return x, y, self.default_width, self.default_height

