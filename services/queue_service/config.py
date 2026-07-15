import os

class Config:
    # Database khusus untuk Queue Service
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        'mysql+pymysql://root:@localhost/mediqueue_queue_db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT secret key untuk decode token JWT (harus sama dengan Auth Service!)
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'mediqueue-secret-key')
    
    DEBUG = True
