# 🏥 MediQueue — Sistem Antrian Klinik Online (Microservices)

MediQueue adalah aplikasi manajemen antrian klinik online berbasis web. Aplikasi ini memungkinkan pasien untuk mendaftar dan mengambil nomor antrian dari mana saja tanpa perlu mengantre secara fisik di lokasi. Petugas medis dan dokter dapat mengelola antrian secara real-time melalui dashboard mereka masing-masing.

Proyek ini dirancang menggunakan arsitektur **Microservices** dengan pendekatan **Database-per-Service** untuk menjamin fleksibilitas dan skalabilitas layanan.

---

## 🛠️ Bahasa Pemrograman & Framework

Proyek ini dibangun menggunakan kombinasi teknologi modern yang ringan namun tangguh:

### 1. Backend (Microservices)
* **Bahasa Pemrograman:** Python 3.10+
* **Framework Utama:** **Flask 3.0.3**
* **Framework API & Dokumentasi:** **Flask-RESTX 1.3.0** (untuk RESTful API & Swagger UI otomatis)
* **ORM (Database Mapper):** **Flask-SQLAlchemy 3.1.1**
* **Driver Database:** **PyMySQL 1.1.0** (untuk koneksi ke MySQL)
* **Keamanan & Autentikasi:**
  * **Flask-JWT-Extended 4.6.0** (Autentikasi stateless menggunakan JSON Web Token)
  * **Flask-Bcrypt 1.0.1** (Hashing password aman)

### 2. Frontend (Client-side)
* **Bahasa Pemrograman:** HTML5, CSS3 (Vanilla), JavaScript (ES6+ Vanilla)
* **Penyajian (Serving):** Disajikan langsung sebagai file statis oleh Flask di sisi Auth Service, sehingga tidak memerlukan framework tambahan seperti React atau Vue (membuat load time sangat cepat).
* **Icon Pack:** Tabler Icons (via CDN)

---

## 👥 Role Pengguna (User Roles)

MediQueue mendukung **4 role pengguna** dengan hak akses dan fitur yang berbeda-beda:

| No | Role | Deskripsi Fitur & Hak Akses | Halaman Dashboard |
|---|---|---|---|
| **1** | **Pasien** | <ul><li>Melakukan pendaftaran akun & login</li><li>Mengambil nomor antrian baru berdasarkan poli yang dituju</li><li>Memantau estimasi antrian dan nomor yang sedang dipanggil secara real-time</li><li>Membatalkan antrian sendiri</li><li>Melihat riwayat antrian sebelumnya</li></ul> | `dashboard_pasien.html` |
| **2** | **Petugas** | <ul><li>Melihat daftar seluruh antrian aktif hari ini di klinik</li><li>Memanggil nomor antrian pasien (*Call*)</li><li>Membatalkan antrian jika pasien tidak hadir</li></ul> | `dashboard_petugas.html` |
| **3** | **Dokter** | <ul><li>Melihat daftar antrian pasien di polinya masing-masing</li><li>Memanggil pasien masuk ke ruang periksa</li><li>Menandai status antrian menjadi `selesai` setelah pasien diperiksa</li></ul> | `dashboard_petugas.html` |
| **4** | **Admin** | <ul><li>Memantau status klinik secara global</li><li>Mengatur kehadiran dokter (*Hadir* / *Tidak Hadir*) hari ini</li><li>Mengubah status aktif/praktik dokter</li></ul> | `dashboard_admin.html` |

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
1. `mediqueue_auth_db` (Untuk data user, kredensial login, dan data dokter)
2. `mediqueue_queue_db` (Untuk data antrian dan riwayat transaksi antrian)

**Import Data Awal (Opsional):**
* Import file `services/auth_service/seed_auth.sql` ke database `mediqueue_auth_db`.
* Import file `services/queue_service/seed_queue.sql` ke database `mediqueue_queue_db`.

*Catatan: Konfigurasi default menggunakan user `root` tanpa password di `localhost:3306`. Jika kredensial database Anda berbeda, sesuaikan variabel `SQLALCHEMY_DATABASE_URI` pada file `config.py` di masing-masing folder service.*

### 4. Menjalankan Layanan
Anda dapat menjalankan kedua microservices sekaligus dengan menjalankan file script batch:
```cmd
run_services.bat
```
Atau jalankan secara manual di dua terminal terpisah (pastikan venv aktif):
* **Terminal 1 (Auth Service - Port 5001):**
  ```bash
  python services/auth_service/app.py
  ```
* **Terminal 2 (Queue Service - Port 5002):**
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

## 🔄 Aliran Komunikasi & Integrasi Microservices

1. **Frontend (Port 5001)** mengirimkan seluruh API request secara relatif (misal: `/api/auth/login` atau `/api/queue/status`).
2. **Auth Service (Reverse Proxy)** menerima request tersebut:
   * Jika request mengarah ke `/api/auth/*` atau `/api/dokter/*`, request akan diproses langsung secara lokal oleh Auth Service.
   * Jika request mengarah ke `/api/queue/*` atau `/api/history/*`, request akan di-*proxy* (diteruskan) oleh Auth Service ke **Queue Service** di `http://localhost:5002`.
3. **Queue Service** menggunakan **Stateless JWT Verification** dengan `JWT_SECRET_KEY` yang sama untuk memvalidasi token dari frontend secara mandiri tanpa memanggil Auth Service.
4. Ketika Queue Service membutuhkan informasi detail profil pengguna (misalnya nama pasien), ia akan memanggil API Auth Service secara internal melalui `GET http://localhost:5001/api/auth/users/{user_id}`.
