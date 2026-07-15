from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, timezone
from extensions import db
from models.queue import Queue
from utils.helpers import generate_nomor_antrian
import requests

# Namespace untuk operasi antrian klinik
queue_ns = Namespace('queue', description='Operasi Antrian Klinik')

# ─── Swagger Models ────────────────────────────────────────────────────────────

queue_response_model = queue_ns.model('QueueResponse', {
    'id': fields.Integer(description='Queue ID'),
    'user_id': fields.Integer(description='User ID Pemilik Antrian'),
    'nama_pasien': fields.String(description='Nama Lengkap Pasien'),
    'nomor_antrian': fields.String(description='Nomor Antrian (contoh: A001)'),
    'status': fields.String(description='Status Antrian (menunggu, dipanggil, selesai, batal)'),
    'created_at': fields.String(description='Tanggal dibuat'),
    'updated_at': fields.String(description='Tanggal diperbarui')
})

message_response_model = queue_ns.model('MessageResponse', {
    'message': fields.String(description='Pesan deskriptif'),
    'queue': fields.Nested(queue_response_model, required=False)
})

# ─── Helper Internal Communication ─────────────────────────────────────────────

def fetch_user_data(user_id):
    """Mengambil data user secara internal dari Auth Service"""
    try:
        resp = requests.get(f"http://localhost:5001/api/auth/users/{user_id}", timeout=2)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error fetching user data for user_id {user_id}: {e}")
    return None

def populate_queue_dict(queue_obj):
    """Mengubah Queue model ke dict dan mengisi nama_pasien dari Auth Service"""
    q_dict = queue_obj.to_dict()
    user_data = fetch_user_data(queue_obj.user_id)
    if user_data:
        q_dict['nama_pasien'] = user_data.get('nama', 'Tidak Diketahui')
    return q_dict

def populate_queues_list(queues_list):
    """Mengubah kumpulan Queue model ke list dict dengan optimasi cache panggilan API"""
    user_cache = {}
    results = []
    for q in queues_list:
        q_dict = q.to_dict()
        uid = q.user_id
        if uid not in user_cache:
            user_data = fetch_user_data(uid)
            user_cache[uid] = user_data.get('nama', 'Tidak Diketahui') if user_data else 'Tidak Diketahui'
        q_dict['nama_pasien'] = user_cache[uid]
        results.append(q_dict)
    return results

# ─── Endpoints ─────────────────────────────────────────────────────────────────

@queue_ns.route('/ambil')
class TakeQueue(Resource):
    @queue_ns.doc(security='Bearer')
    @jwt_required()
    @queue_ns.response(201, 'Antrian berhasil diambil', message_response_model)
    @queue_ns.response(401, 'Token JWT tidak valid atau tidak disertakan')
    def post(self):
        """Pasien mengambil nomor antrian baru"""
        current_user_id = get_jwt_identity()

        # Generate nomor antrian unik untuk hari ini
        nomor_antrian = generate_nomor_antrian()

        new_queue = Queue(
            user_id=int(current_user_id),
            nomor_antrian=nomor_antrian,
            status='menunggu',
            created_at=datetime.now(timezone.utc)
        )

        db.session.add(new_queue)
        db.session.commit()

        return {
            'message': 'Antrian berhasil diambil',
            'queue': populate_queue_dict(new_queue)
        }, 201


@queue_ns.route('/status')
class QueueStatus(Resource):
    @queue_ns.response(200, 'Daftar antrian aktif saat ini', fields.List(fields.Nested(queue_response_model)))
    def get(self):
        """Melihat semua antrian aktif (status: menunggu / dipanggil) — PUBLIC"""
        active_queues = Queue.query.filter(
            Queue.status.in_(['menunggu', 'dipanggil'])
        ).order_by(Queue.created_at.asc()).all()

        return populate_queues_list(active_queues), 200


@queue_ns.route('/rekap')
class QueueRekap(Resource):
    @queue_ns.response(200, 'Rekap antrian hari ini')
    def get(self):
        """Rekap statistik antrian hari ini (jumlah selesai) — PUBLIC"""
        from datetime import date
        today_start = datetime.combine(date.today(), datetime.min.time())
        done_count = Queue.query.filter(
            Queue.status == 'selesai',
            Queue.updated_at >= today_start
        ).count()
        return {'selesai_hari_ini': done_count}, 200


@queue_ns.route('/panggil/<int:id>')
@queue_ns.param('id', 'ID Antrian yang akan dipanggil')
class CallQueue(Resource):
    @queue_ns.doc(security='Bearer')
    @jwt_required()
    @queue_ns.response(200, 'Status antrian diubah menjadi dipanggil', message_response_model)
    @queue_ns.response(403, 'Akses ditolak — hanya untuk Dokter/Admin/Petugas')
    @queue_ns.response(404, 'Antrian tidak ditemukan')
    def put(self, id):
        """Mengubah status antrian menjadi 'dipanggil' (Hanya Dokter/Admin/Petugas)"""
        claims = get_jwt()
        role = claims.get('role')
        if role not in ['petugas', 'dokter', 'admin']:
            return {'message': 'Akses ditolak. Endpoint ini hanya untuk Petugas, Dokter, atau Admin.'}, 403

        queue = db.session.get(Queue, id)
        if not queue:
            return {'message': 'Antrian tidak ditemukan'}, 404

        queue.status = 'dipanggil'
        queue.updated_at = datetime.now(timezone.utc)
        db.session.commit()

        return {'message': 'Pasien dipanggil', 'queue': populate_queue_dict(queue)}, 200


@queue_ns.route('/selesai/<int:id>')
@queue_ns.param('id', 'ID Antrian yang telah selesai dilayani')
class CompleteQueue(Resource):
    @queue_ns.doc(security='Bearer')
    @jwt_required()
    @queue_ns.response(200, 'Status antrian diubah menjadi selesai', message_response_model)
    @queue_ns.response(403, 'Akses ditolak — hanya untuk Dokter/Admin/Petugas')
    @queue_ns.response(404, 'Antrian tidak ditemukan')
    def put(self, id):
        """Mengubah status antrian menjadi 'selesai' (Hanya Dokter/Admin/Petugas)"""
        claims = get_jwt()
        role = claims.get('role')
        if role not in ['petugas', 'dokter', 'admin']:
            return {'message': 'Akses ditolak. Endpoint ini hanya untuk Petugas, Dokter, atau Admin.'}, 403

        queue = db.session.get(Queue, id)
        if not queue:
            return {'message': 'Antrian tidak ditemukan'}, 404

        queue.status = 'selesai'
        queue.updated_at = datetime.now(timezone.utc)
        db.session.commit()

        return {'message': 'Antrian selesai dilayani', 'queue': populate_queue_dict(queue)}, 200


@queue_ns.route('/batal/<int:id>')
@queue_ns.param('id', 'ID Antrian yang ingin dibatalkan')
class CancelQueue(Resource):
    @queue_ns.doc(security='Bearer')
    @jwt_required()
    @queue_ns.response(200, 'Antrian berhasil dibatalkan', message_response_model)
    @queue_ns.response(403, 'Akses ditolak — bukan antrian milik Anda')
    @queue_ns.response(404, 'Antrian tidak ditemukan')
    def delete(self, id):
        """Pasien membatalkan antriannya sendiri (ubah status menjadi 'batal')"""
        current_user_id = str(get_jwt_identity())

        queue = db.session.get(Queue, id)
        if not queue:
            return {'message': 'Antrian tidak ditemukan'}, 404

        if str(queue.user_id) != current_user_id:
            return {'message': 'Akses ditolak. Anda hanya dapat membatalkan antrian milik Anda sendiri.'}, 403

        queue.status = 'batal'
        queue.updated_at = datetime.now(timezone.utc)
        db.session.commit()

        return {'message': 'Antrian berhasil dibatalkan', 'queue': populate_queue_dict(queue)}, 200


# ─── Endpoint Internal (Untuk Komunikasi dari Auth Service) ──────────────────────

@queue_ns.route('/internal/stats')
class QueueStatsInternal(Resource):
    def get(self):
        """Endpoint internal untuk mengambil jumlah antrian hari ini (digunakan oleh Auth/Admin Service)"""
        from datetime import date
        today_start = datetime.combine(date.today(), datetime.min.time())
        antrian_hari_ini = Queue.query.filter(Queue.created_at >= today_start).count()
        return {'antrian_hari_ini': antrian_hari_ini}, 200
