from datetime import datetime, timezone
from extensions import db

class Queue(db.Model):
    __tablename__ = 'queues'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    # user_id disimpan sebagai ID biasa tanpa physical ForeignKey
    user_id = db.Column(db.Integer, nullable=False)
    nomor_antrian = db.Column(db.String(10), nullable=False)
    # Status valid: 'menunggu', 'dipanggil', 'selesai', 'batal'
    status = db.Column(db.String(20), default='menunggu', nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc), nullable=True)

    def to_dict(self):
        """Serialisasi objek Queue menjadi dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            # 'nama_pasien' diset default dan nanti diisi oleh route controller via API call ke Auth Service
            'nama_pasien': "Tidak Diketahui",
            'nomor_antrian': self.nomor_antrian,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
