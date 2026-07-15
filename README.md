# 🏥 MediQueue — Sistem Antrian Klinik Online

MediQueue adalah aplikasi manajemen antrian klinik berbasis web. Pasien bisa ambil nomor antrian dari mana saja tanpa perlu datang dan duduk menunggu berlama-lama. Status antrian bisa dipantau secara real-time, dan petugas punya dashboard sendiri untuk mengelola semua antrian yang masuk.

Project ini dibangun dengan **Flask** di backend dan **HTML/CSS/JavaScript vanilla** di frontend — semuanya jalan dalam satu server yang sama.

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| **Backend** | Python 3, Flask 3.0, Flask-RESTX |
| **Database** | MySQL (via Laragon) |
| **ORM** | Flask-SQLAlchemy + PyMySQL |
| **Auth** | JWT (JSON Web Token) via Flask-JWT-Extended |
| **Enkripsi Password** | Flask-Bcrypt |
| **Frontend** | HTML5, CSS3 (Vanilla), JavaScript (ES6+) |
| **Icon** | Tabler Icons (CDN) |
| **API Docs** | Swagger UI (otomatis via Flask-RESTX, di `/api/docs`) |

---

## ✨ Fitur Utama

### 👤 Untuk Pasien
- **Registrasi & Login** — daftar akun baru, masuk, dan langsung diarahkan ke dashboard sesuai role
- **Ambil Nomor Antrian** — sekali klik, nomor antrian otomatis di-generate (format `A001`, `A002`, dst.) dan reset setiap hari
- **Pantau Status Antrian** — tampilan real-time apakah antrian sedang menunggu atau sudah dipanggil, plus estimasi berapa orang di depan
- **Batalkan Antrian** — kalau sudah tidak jadi, bisa batalkan antrian sendiri
- **Riwayat Antrian** — lihat daftar antrian yang sudah selesai atau dibatalkan sebelumnya

### 🩺 Untuk Petugas / Dokter / Admin
- **Dashboard Petugas** — lihat semua antrian aktif (menunggu & dipanggil) dalam satu tabel
- **Panggil Pasien** — ubah status antrian dari "menunggu" ke "dipanggil"
- **Tandai Selesai** — mark antrian sebagai "selesai" setelah pasien dilayani
- **Batalkan Antrian** — batalkan antrian tertentu langsung dari dashboard petugas
- **Rekap Statistik** — ringkasan jumlah antrian total, menunggu, dipanggil, dan selesai hari ini
- **Refresh Manual** — tombol refresh untuk update data tanpa reload halaman

### 🌐 Umum
- **Landing Page Publik** — tampilkan status antrian klinik saat ini (tanpa perlu login)
- **Auto-refresh** — data antrian otomatis diperbarui setiap 10 detik di semua halaman
- **Dark Mode** — toggle tema gelap/terang yang tersimpan di `localStorage`
- **Toast Notification** — notifikasi pop-up untuk setiap aksi (sukses & gagal)
- **Swagger UI** — dokumentasi REST API interaktif di `/api/docs`
- **Role-based Access Control** — endpoint tertentu hanya bisa diakses oleh role yang sesuai

---

## ⚙️ Cara Install & Menjalankan

### Prasyarat

Pastikan sudah terinstall:
- **Python 3.10+**
- **MySQL** — bisa pakai [Laragon](https://laragon.org/) (recommended) atau XAMPP
- **pip** (biasanya sudah ikut Python)

### 1. Clone Repository

```bash
git clone https://github.com/username/mediqueue.git
cd mediqueue
```

### 2. Buat Virtual Environment

```bash
python -m venv venv
```

Aktifkan virtual environment:

```bash
# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Setup Database MySQL

**Opsi A — Pakai phpMyAdmin (lebih mudah):**
1. Buka phpMyAdmin di browser (`http://localhost/phpmyadmin`)
2. Klik tab **SQL**
3. Paste seluruh isi file `seed.sql` dan klik **Go**

**Opsi B — Pakai Python seeder:**

```bash
python seeder.py
```

Kedua cara akan membuat database `mediqueue`, tabel `users` dan `queues`, serta satu akun admin awal.

> **Akun Admin Default:**
> - Email: `admin@mediqueue.com`
> - Password: `admin123`

### 5. Konfigurasi Koneksi Database (jika perlu)

Secara default, app terhubung ke MySQL dengan konfigurasi:
- Host: `localhost`
- User: `root`
- Password: *(kosong)*
- Database: `mediqueue`

Kalau konfigurasi MySQL kamu berbeda, edit file `config.py`:

```python
SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://USER:PASSWORD@HOST/mediqueue'
```

Atau bisa pakai environment variable:

```bash
# Windows PowerShell
$env:DATABASE_URL = "mysql+pymysql://root:password@localhost/mediqueue"
$env:JWT_SECRET_KEY = "ganti-dengan-secret-key-yang-aman"
```

### 6. Jalankan Server

```bash
python app.py
```

Server akan berjalan di `http://localhost:5000`.

Buka browser dan akses:
- **Aplikasi:** `http://localhost:5000`
- **API Docs (Swagger):** `http://localhost:5000/api/docs`

---

## 📁 Struktur Folder

```
mediqueue/
│
├── app.py                      # Entry point — inisialisasi Flask & routing utama
├── config.py                   # Konfigurasi database, JWT secret, dll.
├── extensions.py               # Instance shared: db, bcrypt, jwt
├── requirements.txt            # Daftar dependensi Python
├── seeder.py                   # Script Python untuk isi data awal ke database
├── seed.sql                    # SQL script alternatif untuk setup database via phpMyAdmin
│
├── models/                     # Definisi tabel database (SQLAlchemy ORM)
│   ├── user.py                 # Model tabel `users` (id, nama, email, password, role)
│   └── queue.py                # Model tabel `queues` (id, user_id, nomor_antrian, status)
│
├── routes/                     # Handler endpoint REST API
│   ├── auth.py                 # /api/auth — register & login
│   ├── queue.py                # /api/queue — kelola antrian (ambil, panggil, selesai, batal)
│   └── history.py              # /api/history — riwayat antrian milik user
│
├── utils/                      # Fungsi-fungsi helper
│   └── helpers.py              # generate_nomor_antrian() — buat nomor A001, A002, dst.
│
└── frontend/                   # Semua file UI (disajikan langsung oleh Flask)
    ├── index.html              # Landing page — tampilan publik status antrian
    ├── login.html              # Halaman login
    ├── register.html           # Halaman registrasi
    ├── dashboard_pasien.html   # Dashboard khusus pasien
    ├── dashboard_petugas.html  # Dashboard khusus petugas/dokter/admin
    ├── script.js               # Logika frontend — satu file untuk semua halaman
    └── style.css               # Stylesheet — dark mode, komponen, animasi
```

---

## 🔌 Ringkasan API Endpoint

| Method | Endpoint | Deskripsi | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Daftar akun baru | Tidak |
| `POST` | `/api/auth/login` | Login, dapat token JWT | Tidak |
| `POST` | `/api/queue/ambil` | Pasien ambil nomor antrian | JWT |
| `GET` | `/api/queue/status` | Lihat semua antrian aktif | Tidak |
| `GET` | `/api/queue/rekap` | Statistik antrian selesai hari ini | Tidak |
| `PUT` | `/api/queue/panggil/<id>` | Panggil pasien (petugas/admin) | JWT |
| `PUT` | `/api/queue/selesai/<id>` | Tandai antrian selesai (petugas/admin) | JWT |
| `DELETE` | `/api/queue/batal/<id>` | Batalkan antrian | JWT |
| `GET` | `/api/history/` | Riwayat antrian user yang login | JWT |

Dokumentasi lengkap tersedia di **`http://localhost:5000/api/docs`** setelah server berjalan.

---

## 🤝 Cara Kontribusi

1. **Fork** repository ini
2. Buat branch baru untuk fitur atau fix yang mau kamu kerjakan:
   ```bash
   git checkout -b fitur/nama-fitur
   ```
3. Kerjakan perubahan, lalu commit dengan pesan yang jelas:
   ```bash
   git commit -m "feat: tambah fitur notifikasi email"
   ```
4. Push ke branch kamu:
   ```bash
   git push origin fitur/nama-fitur
   ```
5. Buka **Pull Request** ke branch `main` dan jelaskan apa yang kamu ubah

Beberapa hal yang perlu diperhatikan sebelum PR:
- Pastikan app masih bisa jalan tanpa error setelah perubahanmu
- Kalau nambah endpoint baru, pastikan ada validasi input dan pengecekan role yang sesuai
- Hindari commit file yang berisi credential atau password asli

---

## 📄 Lisensi

Project ini menggunakan lisensi **MIT**.

```
MIT License

Copyright (c) 2026 MediQueue

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
