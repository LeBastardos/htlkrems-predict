import os


class Settings:
	PROJECT_NAME = os.getenv("PROJECT_NAME", "htlkrems-predict")
	API_V1_STR = os.getenv("API_V1_STR", "/api/v1")

	AZURE_TENANT_ID = os.getenv("AZURE_TENANT_ID", "common")
	AZURE_CLIENT_ID = os.getenv("AZURE_CLIENT_ID", "")
	AZURE_CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET", "")
	AZURE_REDIRECT_URI = os.getenv("AZURE_REDIRECT_URI", "http://localhost:3000/auth/callback")
	ALLOWED_EMAIL_DOMAIN = os.getenv("ALLOWED_EMAIL_DOMAIN", "htlkrems.at")

	JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
	JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
	ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

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
