require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const { Patient, Booking } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi S3 Client untuk AWS atau Google Cloud Storage Interoperability
const s3Config = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};

// Gunakan S3_ENDPOINT khusus jika kamu memakai Google Cloud Storage
if (process.env.S3_ENDPOINT) {
  s3Config.endpoint = process.env.S3_ENDPOINT;
}

const s3 = new S3Client(s3Config);

// Konfigurasi penyimpanan Multer langsung ke S3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    acl: 'public-read', // Mengatur agar file bisa diakses publik (opsional)
    key: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
    }
  })
});

// 1. Endpoint Register
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newPatient = await Patient.create({ name, email, password: hashedPassword });
    res.status(201).json({ message: 'Registrasi berhasil', patientId: newPatient.id });
  } catch (error) {
    res.status(500).json({ error: 'Gagal melakukan registrasi' });
  }
});

// 2. Endpoint Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
      return res.json({ token, role: 'admin', message: 'Login Admin sukses' });
    }

    const patient = await Patient.findOne({ where: { email } });
    if (!patient) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

    const isValidPassword = await bcrypt.compare(password, patient.password);
    if (!isValidPassword) return res.status(401).json({ error: 'Password salah' });

    const token = jwt.sign({ id: patient.id, role: 'patient' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, role: 'patient', patientId: patient.id, name: patient.name });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan saat login' });
  }
});

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'Token tidak disediakan' });
  
  jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Token tidak valid' });
    req.user = decoded;
    next();
  });
};

// 3. Endpoint Booking (Simpan URL dari S3)
app.post('/api/bookings', verifyToken, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File dokumen wajib diunggah' });
    
    const { booking_date } = req.body;
    // URL file didapatkan dari balasan server S3
    const document_url = req.file.location; 
    
    const newBooking = await Booking.create({
      patient_id: req.user.id,
      booking_date,
      document_url,
      status: 'pending'
    });
    
    res.status(201).json({ message: 'Booking berhasil dibuat', booking: newBooking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal membuat booking' });
  }
});

// 4. Endpoint Lihat Booking
app.get('/api/bookings', verifyToken, async (req, res) => {
  try {
    let bookings;
    if (req.user.role === 'admin') {
      bookings = await Booking.findAll({ include: Patient });
    } else {
      bookings = await Booking.findAll({ where: { patient_id: req.user.id } });
    }
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data booking' });
  }
});

// 5. Endpoint Update Status Booking
app.put('/api/bookings/:id/status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Akses ditolak' });
    
    const { status } = req.body;
    await Booking.update({ status }, { where: { id: req.params.id } });
    
    res.json({ message: `Status booking berhasil diubah menjadi ${status}` });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengubah status' });
  }
});

// 6. Endpoint Hapus Booking
app.delete('/api/bookings/:id', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({ 
      where: { id: req.params.id, patient_id: req.user.id, status: 'pending' } 
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan atau sudah diproses' });
    }

    // Ekstraksi nama file dari URL untuk menghapus file di S3
    const urlParts = booking.document_url.split('/');
    const fileKey = urlParts[urlParts.length - 1];

    const deleteParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
    };

    try {
      await s3.send(new DeleteObjectCommand(deleteParams));
    } catch (s3Error) {
      console.error("Gagal menghapus file dari S3", s3Error);
    }

    await booking.destroy();
    res.json({ message: 'Jadwal berhasil dibatalkan' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal membatalkan jadwal' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server Backend berjalan di http://localhost:${PORT}`);
});