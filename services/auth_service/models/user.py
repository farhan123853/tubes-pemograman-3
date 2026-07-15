from datetime import datetime, timezone
from extensions import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nama = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    # Role valid: 'pasien', 'petugas', 'dokter', 'admin'
    role = db.Column(db.String(20), default='pasien', nullable=False)
    # Poli/layanan tempat petugas atau dokter bertugas
    poli = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        """Serialisasi User ke dictionary (password dikecualikan demi keamanan)"""
        return {
            'id': self.id,
            'nama': self.nama,
            'email': self.email,
            'role': self.role,
            'poli': self.poli,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
