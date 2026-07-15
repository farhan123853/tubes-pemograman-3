from flask import Flask
from flask_restx import Api
from config import Config
from extensions import db, bcrypt, jwt

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Inisialisasi extensions ke app
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    # Skema autentikasi JWT
    authorizations = {
        'Bearer': {
            'type': 'apiKey',
            'in': 'header',
            'name': 'Authorization',
            'description': 'Masukkan token JWT dengan format: Bearer <token>'
        }
    }

    # Inisialisasi Flask-RESTX di port 5002
    api = Api(
        app,
        title='MediQueue Queue API',
        version='1.0',
        description='Queue Microservice API Documentation',
        doc='/api/docs',
        authorizations=authorizations,
        security='Bearer'
    )

    # Daftarkan namespace/route ke API
    from routes.queue import queue_ns
    from routes.history import history_ns

    api.add_namespace(queue_ns, path='/api/queue')
    api.add_namespace(history_ns, path='/api/history')

    # Buat tabel MySQL (tabel queues) jika belum ada
    with app.app_context():
        db.create_all()

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5002, debug=True)
