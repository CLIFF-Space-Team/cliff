from beanie import Document
class User(Document):
    class Settings:
        name = "users"