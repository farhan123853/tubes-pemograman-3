from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.queue import Queue

# Namespace untuk history
history_ns = Namespace('history', description='Riwayat Antrian User')

# Model respons lokal
history_queue_model = history_ns.model('HistoryQueue', {
    'id': fields.Integer(description='Queue ID'),
    'user_id': fields.Integer(description='User ID Pemilik Antrian'),
    'nomor_antrian': fields.String(description='Nomor Antrian (contoh: A001)'),
    'status': fields.String(description='Status (selesai / batal)'),
    'created_at': fields.String(description='Tanggal dibuat'),
    'updated_at': fields.String(description='Tanggal diperbarui')
})

@history_ns.route('/')
class QueueHistory(Resource):
    @history_ns.doc(security='Bearer')
    @jwt_required()
    @history_ns.response(200, 'Daftar riwayat antrian user', fields.List(fields.Nested(history_queue_model)))
    @history_ns.response(401, 'Token JWT tidak valid atau tidak disertakan')
    def get(self):
        """Mendapatkan riwayat antrian milik user yang sedang login (hanya status 'selesai' dan 'batal')"""
        current_user_id = get_jwt_identity()

        # Filter antrian milik user dengan status selesai atau batal, urutkan terbaru dulu
        history_queues = Queue.query.filter(
            Queue.user_id == int(current_user_id),
            Queue.status.in_(['selesai', 'batal'])
        ).order_by(Queue.created_at.desc()).all()

        return [q.to_dict() for q in history_queues], 200
