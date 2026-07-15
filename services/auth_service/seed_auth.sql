-- ==========================================================
--  MediQueue - Auth Service Database Setup & Seed Script
--  Tempel seluruh isi file ini ke phpMyAdmin > SQL tab
-- ==========================================================

CREATE DATABASE IF NOT EXISTS mediqueue_auth_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mediqueue_auth_db;

DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password VARCHAR(200) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'pasien',
    poli VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Masukkan data Akun Admin awal (Password: admin123)
INSERT INTO users (nama, email, password, role, created_at) VALUES
(
    'Admin Klinik',
    'admin@mediqueue.com',
    '$2b$12$hvRS5dktNEMc2t21zCDQj.YLg9pmK7GpsVgrVlynoAONi2AZqizNO',
    'admin',
    CURRENT_TIMESTAMP
);

-- Verifikasi hasil insert
SELECT id, nama, email, role, created_at FROM users;
