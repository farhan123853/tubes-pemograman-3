from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt
from datetime import date, datetime, timezone
from extensions import db
from models.user import User

dokter_ns = Namespace('dokter', description='Operasi Jadwal Dokter')

# ─── Swagger Models ───────────────────────────────────────────────────────────

dokter_model = dokter_ns.model('DokterHariIni', {
    'id': fields.Integer,
    'nama': fields.String,
    'poli': fields.String,
    'status': fields.String,
    'hadir': fields.Boolean,
    'jam_mulai': fields.String,
    'jam_selesai': fields.String,
})

# ─── Jadwal Dokter Hari Ini ───────────────────────────────────────────────────

@dokter_ns.route('/jadwal/hari-ini')
class JadwalHariIni(Resource):
    def get(self):
        """
        Daftar dokter/petugas yang dijadwalkan hari ini (PUBLIC).
        Mengembalikan semua user dengan role 'petugas' atau 'dokter'.
        Field 'hadir' dan 'status' bersifat statis (default tersedia).
        """
        dokters = User.query.filter(
            User.role.in_(['petugas', 'dokter'])
        ).order_by(User.nama.asc()).all()

        result = []
        for d in dokters:
            result.append({
                'id': d.id,
                'nama': d.nama,
                'poli': getattr(d, 'poli', None) or '–',
                'status': 'tersedia',   # default
                'hadir': True,
                'jam_mulai': '08:00',
                'jam_selesai': '16:00',
            })

        return result, 200


@dokter_ns.route('/jadwal/<int:id>')
@dokter_ns.param('id', 'ID Dokter/Petugas')
class JadwalDokterDetail(Resource):
    @dokter_ns.doc(security='Bearer')
    @jwt_required()
    def put(self, id):
        """Toggle hadir/tidak hadir dokter — hanya Admin"""
        claims = get_jwt()
        if claims.get('role') != 'admin':
            return {'message': 'Akses ditolak'}, 403

        data = dokter_ns.payload or {}
        hadir = data.get('hadir', True)

        user = db.session.get(User, id)
        if not user or user.role not in ['petugas', 'dokter']:
            return {'message': 'Dokter tidak ditemukan'}, 404

        return {
            'message': f'Status kehadiran dokter {user.nama} diperbarui',
            'hadir': hadir
        }, 200
