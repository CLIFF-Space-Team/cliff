from beanie import Document

class Alert(Document):
    class Settings:
        name = "alerts"