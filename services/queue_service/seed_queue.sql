-- ==========================================================
--  MediQueue - Queue Service Database Setup & Seed Script
--  Tempel seluruh isi file ini ke phpMyAdmin > SQL tab
-- ==========================================================

CREATE DATABASE IF NOT EXISTS mediqueue_queue_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mediqueue_queue_db;

DROP TABLE IF EXISTS queues;

CREATE TABLE queues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- Dipertahankan sebagai ID user (integer biasa) tanpa Foreign Key
    nomor_antrian VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'menunggu',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Verifikasi hasil pembuatan tabel
DESCRIBE queues;
