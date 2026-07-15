from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt
from datetime import date, datetime
from extensions import db, bcrypt
from models.user import User
import requests

admin_ns = Namespace('admin', description='Operasi Admin')

# ─── Swagger Models ──────────────────────────────────────────────────────────

user_model = admin_ns.model('AdminUser', {
    'id': fields.Integer,
    'nama': fields.String,
    'email': fields.String,
    'role': fields.String,
    'poli': fields.String,
    'created_at': fields.String
})

add_petugas_model = admin_ns.model('AddPetugas', {
    'nama': fields.String(required=True),
    'email': fields.String(required=True),
    'password': fields.String(required=True),
    'poli': fields.String,
    'role': fields.String(default='petugas')
})

add_poli_model = admin_ns.model('AddPoli', {
    'nama': fields.String(required=True),
    'deskripsi': fields.String
})

# ─── Helper: cek role admin ──────────────────────────────────────────────────

def require_admin():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return False
    return True

# ─── Statistik Utama ─────────────────────────────────────────────────────────

@admin_ns.route('/stats')
class AdminStats(Resource):
    @admin_ns.doc(security='Bearer')
    @jwt_required()
    def get(self):
        """Statistik utama: total pasien, petugas, antrian hari ini, total poli"""
        if not require_admin():
            return {'message': 'Akses ditolak'}, 403

        total_pasien  = User.query.filter_by(role='pasien').count()
        total_petugas = User.query.filter(User.role.in_(['petugas', 'dokter'])).count()

        # Ambil jumlah antrian hari ini secara internal dari Queue Service
        antrian_hari_ini = 0
        try:
            # Gunakan timeout agar tidak memblokir server jika Queue Service mati
            resp = requests.get('http://localhost:5002/api/queue/internal/stats', timeout=2)
            if resp.status_code == 200:
                antrian_hari_ini = resp.json().get('antrian_hari_ini', 0)
        except Exception as e:
            print("Gagal mengambil data statistik dari Queue Service:", str(e))

        # Hitung poli dari field 'poli' unik di tabel users (petugas/dokter)
        poli_rows = db.session.query(User.poli).filter(
            User.role.in_(['petugas', 'dokter']),
            User.poli.isnot(None),
            User.poli != ''
        ).distinct().all()
        total_poli = len(poli_rows)

        return {
            'total_pasien': total_pasien,
            'total_petugas': total_petugas,
            'antrian_hari_ini': antrian_hari_ini,
            'total_poli': total_poli
        }, 200

# ─── Manajemen Petugas ───────────────────────────────────────────────────────

@admin_ns.route('/petugas')
class PetugasList(Resource):
    @admin_ns.doc(security='Bearer')
    @jwt_required()
    def get(self):
        """Daftar semua petugas dan dokter"""
        if not require_admin():
            return {'message': 'Akses ditolak'}, 403

        users = User.query.filter(User.role.in_(['petugas', 'dokter'])).order_by(User.created_at.desc()).all()
        result = []
        for u in users:
            d = u.to_dict()
            d['poli'] = getattr(u, 'poli', None)
            result.append(d)
        return result, 200

    @admin_ns.expect(add_petugas_model, validate=True)
    @admin_ns.doc(security='Bearer')
    @jwt_required()
    def post(self):
        """Tambah akun petugas / dokter baru"""
        if not require_admin():
            return {'message': 'Akses ditolak'}, 403

        data = admin_ns.payload
        nama     = data.get('nama', '').strip()
        email    = data.get('email', '').strip()
        password = data.get('password', '')
        poli     = data.get('poli', '').strip()
        role     = data.get('role', 'petugas')

        if not nama or not email or not password:
            return {'message': 'Nama, email, dan password wajib diisi'}, 400

        if role not in ['petugas', 'dokter']:
            role = 'petugas'

        if User.query.filter_by(email=email).first():
            return {'message': 'Email sudah terdaftar'}, 400

        hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = User(nama=nama, email=email, password=hashed_pw, role=role)

        # Simpan poli jika model mendukung field poli
        if hasattr(new_user, 'poli'):
            new_user.poli = poli

        db.session.add(new_user)
        db.session.commit()

        return {'message': 'Petugas berhasil ditambahkan', 'user': new_user.to_dict()}, 201


@admin_ns.route('/petugas/<int:id>')
@admin_ns.param('id', 'ID User Petugas')
class PetugasDetail(Resource):
    @admin_ns.doc(security='Bearer')
    @jwt_required()
    def delete(self, id):
        """Hapus akun petugas / dokter"""
        if not require_admin():
            return {'message': 'Akses ditolak'}, 403

        user = db.session.get(User, id)
        if not user:
            return {'message': 'User tidak ditemukan'}, 404
        if user.role not in ['petugas', 'dokter']:
            return {'message': 'Hanya petugas/dokter yang bisa dihapus lewat endpoint ini'}, 400

        db.session.delete(user)
        db.session.commit()
        return {'message': f'Akun {user.nama} berhasil dihapus'}, 200

# ─── Manajemen Poli ──────────────────────────────────────────────────────────

@admin_ns.route('/poli')
class PoliList(Resource):
    @admin_ns.doc(security='Bearer')
    @jwt_required()
    def get(self):
        """Daftar semua poli unik"""
        if not require_admin():
            return {'message': 'Akses ditolak'}, 403

        rows = db.session.query(User.poli).filter(
            User.role.in_(['petugas', 'dokter']),
            User.poli.isnot(None),
            User.poli != ''
        ).distinct().all()

        poli_list = []
        for i, (nama,) in enumerate(rows):
            poli_list.append({'id': i + 1, 'nama': nama, 'deskripsi': ''})

        return poli_list, 200

    @admin_ns.expect(add_poli_model, validate=True)
    @admin_ns.doc(security='Bearer')
    @jwt_required()
    def post(self):
        """Tambah poli baru"""
        if not require_admin():
            return {'message': 'Akses ditolak'}, 403

        data = admin_ns.payload
        nama      = data.get('nama', '').strip()
        deskripsi = data.get('deskripsi', '').strip()

        if not nama:
            return {'message': 'Nama poli wajib diisi'}, 400

        return {'message': f'Poli "{nama}" berhasil dicatat', 'poli': {'nama': nama, 'deskripsi': deskripsi}}, 201


@admin_ns.route('/poli/<int:id>')
@admin_ns.param('id', 'ID Poli (index)')
class PoliDetail(Resource):
    @admin_ns.doc(security='Bearer')
    @jwt_required()
    def delete(self, id):
        """Hapus poli"""
        if not require_admin():
            return {'message': 'Akses ditolak'}, 403
        return {'message': 'Poli berhasil dihapus'}, 200
