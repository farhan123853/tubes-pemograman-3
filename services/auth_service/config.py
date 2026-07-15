import os

class Config:
    # Database khusus untuk Auth Service
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        'mysql+pymysql://root:@localhost/mediqueue_auth_db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT secret key untuk decode/encode token JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'mediqueue-secret-key')
    
    DEBUG = True
