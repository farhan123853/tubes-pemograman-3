from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import create_access_token
from extensions import db, bcrypt
from models.user import User

# Initialize namespace
auth_ns = Namespace('auth', description='Operasi Autentikasi')

# Swagger models
register_model = auth_ns.model('Register', {
    'nama': fields.String(required=True, description='Nama Lengkap'),
    'email': fields.String(required=True, description='Alamat Email'),
    'password': fields.String(required=True, description='Password'),
    'role': fields.String(required=False, description='Role (pasien, dokter, admin)', default='pasien')
})

login_model = auth_ns.model('Login', {
    'email': fields.String(required=True, description='Alamat Email'),
    'password': fields.String(required=True, description='Password')
})

user_response_model = auth_ns.model('UserResponse', {
    'id': fields.Integer(description='User ID'),
    'nama': fields.String(description='Nama Lengkap'),
    'email': fields.String(description='Alamat Email'),
    'role': fields.String(description='Role User'),
    'poli': fields.String(description='Poli Petugas/Dokter'),
    'created_at': fields.String(description='Tanggal Pendaftaran')
})

auth_response_model = auth_ns.model('AuthResponse', {
    'message': fields.String(description='Status pesan'),
    'access_token': fields.String(description='JWT Access Token'),
    'user': fields.Nested(user_response_model)
})

@auth_ns.route('/register')
class Register(Resource):
    @auth_ns.expect(register_model, validate=True)
    @auth_ns.response(201, 'Registrasi berhasil', auth_response_model)
    @auth_ns.response(400, 'Bad Request / Email sudah digunakan')
    def post(self):
        """Registrasi user/pasien baru"""
        data = auth_ns.payload
        nama = data.get('nama')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'pasien')
        
        # Validasi sederhana
        if not nama or not email or not password:
            return {'message': 'Nama, email, dan password wajib diisi'}, 400
            
        if role not in ['pasien', 'petugas', 'dokter', 'admin']:
            return {'message': 'Role tidak valid. Gunakan: pasien, petugas, dokter, atau admin'}, 400
            
        # Periksa apakah email sudah terdaftar
        if User.query.filter_by(email=email).first():
            return {'message': 'Email sudah terdaftar'}, 400
            
        # Hash password dan simpan user baru
        hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = User(
            nama=nama,
            email=email,
            password=hashed_pw,
            role=role
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        # Generate token JWT dengan menyertakan role
        access_token = create_access_token(identity=str(new_user.id), additional_claims={'role': new_user.role})
        
        return {
            'message': 'Registrasi berhasil',
            'access_token': access_token,
            'user': new_user.to_dict()
        }, 201

@auth_ns.route('/login')
class Login(Resource):
    @auth_ns.expect(login_model, validate=True)
    @auth_ns.response(200, 'Login berhasil', auth_response_model)
    @auth_ns.response(401, 'Kredensial tidak valid')
    def post(self):
        """Login dan dapatkan token JWT"""
        data = auth_ns.payload
        email = data.get('email')
        password = data.get('password')
        
        user = User.query.filter_by(email=email).first()
        if not user or not bcrypt.check_password_hash(user.password, password):
            return {'message': 'Email atau password salah'}, 401
            
        # Generate token JWT dengan menyertakan role
        access_token = create_access_token(identity=str(user.id), additional_claims={'role': user.role})
        
        return {
            'message': 'Login berhasil',
            'access_token': access_token,
            'user': user.to_dict()
        }, 200

@auth_ns.route('/users/<int:id>')
@auth_ns.param('id', 'ID User')
class UserDetailInternal(Resource):
    @auth_ns.response(200, 'Data user ditemukan', user_response_model)
    @auth_ns.response(404, 'User tidak ditemukan')
    def get(self, id):
        """Endpoint internal untuk mengambil data user berdasarkan ID (digunakan oleh Queue Service)"""
        user = db.session.get(User, id)
        if not user:
            return {'message': 'User tidak ditemukan'}, 404
        return user.to_dict(), 200
