import os
import requests
from flask import Flask, send_from_directory, request, Response
from flask_restx import Api
from config import Config
from extensions import db, bcrypt, jwt

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Lokasi frontend di root project (agar tidak perlu duplikasi file HTML/CSS/JS)
    frontend_dir = os.path.abspath(os.path.join(app.root_path, '..', '..', 'frontend'))

    @app.route('/')
    def serve_index():
        return send_from_directory(frontend_dir, 'index.html')

    @app.route('/<path:filename>')
    def serve_static_files(filename):
        allowed_files = {
            'index.html', 'login.html', 'register.html',
            'dashboard_pasien.html', 'dashboard_petugas.html',
            'dashboard_admin.html', 'profil.html',
            'style.css', 'script.js'
        }
        if filename in allowed_files:
            return send_from_directory(frontend_dir, filename)
        return "Not Found", 404

    # ─── REVERSE PROXY GATEWAY (Merutekan request ke Queue Service) ────────────
    
    @app.route('/api/queue/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
    def proxy_queue(path):
        """Mem-proxy semua request /api/queue/* ke Queue Service di port 5002"""
        url = f"http://localhost:5002/api/queue/{path}"
        headers = {key: value for (key, value) in request.headers if key.lower() != 'host'}
        
        try:
            resp = requests.request(
                method=request.method,
                url=url,
                headers=headers,
                data=request.get_data(),
                cookies=request.cookies,
                allow_redirects=False,
                timeout=10
            )
            # Filter headers
            excluded_headers = ['content-length', 'transfer-encoding', 'connection']
            resp_headers = [(name, value) for (name, value) in resp.raw.headers.items()
                            if name.lower() not in excluded_headers]
            return Response(resp.content, resp.status_code, resp_headers)
        except Exception as e:
            return {"message": f"Queue Service tidak dapat dihubungi: {str(e)}"}, 502

    @app.route('/api/history/', defaults={'path': ''}, methods=['GET'])
    @app.route('/api/history/<path:path>', methods=['GET'])
    def proxy_history(path, **kwargs):
        """Mem-proxy request /api/history/ ke Queue Service di port 5002"""
        url = f"http://localhost:5002/api/history/{path}" if path else "http://localhost:5002/api/history/"
        headers = {key: value for (key, value) in request.headers if key.lower() != 'host'}
        
        try:
            resp = requests.request(
                method=request.method,
                url=url,
                headers=headers,
                data=request.get_data(),
                cookies=request.cookies,
                allow_redirects=False,
                timeout=10
            )
            excluded_headers = ['content-length', 'transfer-encoding', 'connection']
            resp_headers = [(name, value) for (name, value) in resp.raw.headers.items()
                            if name.lower() not in excluded_headers]
            return Response(resp.content, resp.status_code, resp_headers)
        except Exception as e:
            return {"message": f"Queue Service tidak dapat dihubungi: {str(e)}"}, 502

    # Inisialisasi extensions
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    authorizations = {
        'Bearer': {
            'type': 'apiKey',
            'in': 'header',
            'name': 'Authorization',
            'description': 'Masukkan token JWT dengan format: Bearer <token>'
        }
    }

    # Inisialisasi Flask-RESTX Swagger UI untuk endpoint lokal Auth Service
    api = Api(
        app,
        title='MediQueue Auth & Admin API',
        version='1.0',
        description='Auth & Admin Microservice API Documentation',
        doc='/api/docs',
        authorizations=authorizations,
        security='Bearer'
    )

    # Registrasi namespaces
    from routes.auth import auth_ns
    from routes.dokter import dokter_ns
    from routes.admin import admin_ns

    api.add_namespace(auth_ns, path='/api/auth')
    api.add_namespace(dokter_ns, path='/api/dokter')
    api.add_namespace(admin_ns, path='/api/admin')

    # Buat tabel jika belum ada
    with app.app_context():
        db.create_all()

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5001, debug=True)
