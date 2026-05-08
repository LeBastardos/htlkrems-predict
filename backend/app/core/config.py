import os


class Settings:
	PROJECT_NAME = os.getenv("PROJECT_NAME", "htlkrems-predict")
	API_V1_STR = os.getenv("API_V1_STR", "/api/v1")

	MYSQL_HOST = os.getenv("MYSQL_HOST", "db")
	MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
	MYSQL_USER = os.getenv("MYSQL_USER", "htlkrems")
	MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "htlkrems123")
	MYSQL_DB = os.getenv("MYSQL_DB", "htlkrems_predict")

	@property
	def DATABASE_URL(self) -> str:
		return (
			f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}"
			f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"
		)


settings = Settings()
