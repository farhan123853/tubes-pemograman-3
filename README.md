# 🏥 MediQueue — Sistem Antrian Klinik Online (Microservices)

MediQueue adalah aplikasi manajemen antrian klinik berbasis web dengan arsitektur microservices. Aplikasi ini memisahkan layanan autentikasi/user dengan layanan antrian untuk menjamin skalabilitas dan performa yang lebih baik.

---

## 🛠️ Tech Stack & Microservices

Aplikasi ini dibagi menjadi dua microservices utama yang berjalan secara independen:

### 1. Auth Service (Port `5001`)
* **Peran:** Mengelola autentikasi pengguna (Registrasi & Login), Profil, Jadwal Dokter, sekaligus bertindak sebagai **Reverse Proxy Gateway** yang menyajikan frontend.
* **Database:** MySQL (`mediqueue_auth_db`)
* **Teknologi:** Flask, Flask-RESTX, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-Bcrypt
* **Swagger UI Docs:** `http://localhost:5001/api/docs`

### 2. Queue Service (Port `5002`)
* **Peran:** Mengelola seluruh data antrian (pengambilan antrian, pemanggilan, status, riwayat, rekap statistik).
* **Database:** MySQL (`mediqueue_queue_db`)
* **Teknologi:** Flask, Flask-RESTX, Flask-SQLAlchemy, Flask-JWT-Extended
* **Swagger UI Docs:** `http://localhost:5002/api/docs`

---

## 📁 Struktur Folder Proyek

```
mediqueue/
│
├── run_services.bat            # Script batch untuk menjalankan kedua service sekaligus
├── requirements.txt            # Dependensi Python untuk seluruh proyek
├── README.md                   # Dokumentasi ini
│
├── frontend/                   # File UI Static (disajikan oleh Auth Service)
│   ├── index.html              # Landing page status antrian (publik)
│   ├── login.html              # Halaman masuk
│   ├── register.html           # Halaman daftar pasien
│   ├── dashboard_pasien.html   # Panel antrian pasien
│   ├── dashboard_petugas.html  # Panel petugas/dokter
│   ├── dashboard_admin.html    # Panel admin klinik
│   ├── style.css               # Styling global (dark mode & layout)
│   └── script.js               # Logika klien & fetching API
│
└── services/
    ├── auth_service/           # Microservice untuk Autentikasi & User
    │   ├── app.py              # Flask entry point & Reverse Proxy
    │   ├── config.py           # Konfigurasi port, DB URL, JWT secret
    │   ├── extensions.py       # Instance SQLAlchemy, Bcrypt, JWT
    │   ├── seed_auth.sql       # Data awal database auth
    │   ├── models/             # Schema database (User & Dokter)
    │   └── routes/             # Controller REST API (auth, admin, dokter)
    │
    └── queue_service/          # Microservice untuk Antrian Klinik
        ├── app.py              # Flask entry point
        ├── config.py           # Konfigurasi port, DB URL, JWT secret
        ├── extensions.py       # Instance SQLAlchemy, Bcrypt, JWT
        ├── seed_queue.sql      # Data awal database antrian
        ├── models/             # Schema database (Queue)
        ├── routes/             # Controller REST API (queue, history)
        └── utils/              # Helper generator nomor antrian
```

---

## ⚙️ Cara Instalasi & Menjalankan

### Prasyarat
Pastikan sistem Anda sudah terinstal:
* **Python 3.10+**
* **MySQL Server** (bisa melalui Laragon atau XAMPP)
* **pip** (Python package installer)

### 1. Buat Virtual Environment
Buka terminal di root direktori proyek `mediqueue`:
```bash
python -m venv venv
```
Aktifkan virtual environment:
* **Windows (CMD/PowerShell):**
  ```bash
  venv\Scripts\activate
  ```
* **Mac/Linux:**
  ```bash
  source venv/bin/activate
  ```

### 2. Instal Dependensi
```bash
pip install -r requirements.txt
```

### 3. Setup Database MySQL
Buatlah dua database baru di MySQL Anda:
1. `mediqueue_auth_db`
2. `mediqueue_queue_db`

**Import Data Awal (Opsional):**
* Import file `services/auth_service/seed_auth.sql` ke dalam database `mediqueue_auth_db`.
* Import file `services/queue_service/seed_queue.sql` ke dalam database `mediqueue_queue_db`.

*Catatan: Konfigurasi default menggunakan user `root` tanpa password di `localhost:3306`. Jika kredensial database Anda berbeda, sesuaikan variabel `SQLALCHEMY_DATABASE_URI` pada file `config.py` di masing-masing folder service.*

### 4. Menjalankan Layanan
Anda dapat menjalankan kedua microservices sekaligus dengan menjalankan file script batch:
```cmd
run_services.bat
```
Atau jalankan secara manual di dua terminal terpisah (pastikan venv aktif):
* **Terminal 1 (Auth Service):**
  ```bash
  python services/auth_service/app.py
  ```
* **Terminal 2 (Queue Service):**
  ```bash
  python services/queue_service/app.py
  ```

---

## 🔌 URL Akses Layanan

Setelah server berjalan, Anda dapat mengakses URL berikut di browser Anda:
* **Aplikasi Web Utama (Frontend):** `http://localhost:5001`
* **Swagger API Docs - Auth Service:** `http://localhost:5001/api/docs`
* **Swagger API Docs - Queue Service:** `http://localhost:5002/api/docs`

---

## 🔄 Aliran Komunikasi (Proxy & API)

1. **Frontend** mengirimkan seluruh API request secara relatif ke host yang sama (port `5001`).
2. **Auth Service (Reverse Proxy)** menerima request tersebut:
   * Jika request mengarah ke `/api/auth/*` atau `/api/dokter/*`, request akan diproses langsung secara lokal.
   * Jika request mengarah ke `/api/queue/*` atau `/api/history/*`, request akan di-*proxy* (diteruskan) oleh Auth Service ke **Queue Service** di `http://localhost:5002`.
3. **Queue Service** menggunakan **Stateless JWT Verification** dengan `JWT_SECRET_KEY` yang sama untuk memvalidasi token yang dikirimkan.
4. Ketika Queue Service membutuhkan informasi detail profil pengguna (misalnya nama pasien), ia akan memanggil API Auth Service secara internal melalui `GET http://localhost:5001/api/auth/users/{user_id}`.
