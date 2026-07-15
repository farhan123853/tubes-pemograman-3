from datetime import datetime, timezone
from extensions import db
from models.queue import Queue

def generate_nomor_antrian():
    """
    Menghasilkan nomor antrian seperti A001, A002, A003, ...
    Otomatis reset ke A001 setiap hari baru.
    """
    today = datetime.now(timezone.utc).date()

    latest_queue = Queue.query.filter(
        Queue.created_at >= datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
    ).order_by(Queue.id.desc()).first()

    if latest_queue and latest_queue.nomor_antrian:
        try:
            num_part = latest_queue.nomor_antrian[1:]
            next_num = int(num_part) + 1
        except (ValueError, IndexError):
            next_num = 1
    else:
        next_num = 1

    return f"A{next_num:03d}"
