require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Patient, Booking } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());

// Ekspos folder lokal agar gambar bisa dibaca frontend
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Konfigurasi Multer untuk simpan di folder lokal
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir); // Otomatis membuat folder 'uploads' jika belum ada
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
});
const upload = multer({ storage });

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

// 3. Endpoint Booking (Simpan URL lokal)
app.post('/api/bookings', verifyToken, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File dokumen wajib diunggah' });
    
    const { booking_date } = req.body;
    const document_url = `/uploads/${req.file.filename}`; // Pakai path lokal
    
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

// 6. Endpoint Hapus/Batal Booking (Khusus Pasien)
app.delete('/api/bookings/:id', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({ 
      where: { id: req.params.id, patient_id: req.user.id, status: 'pending' } 
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan atau sudah diproses' });
    }

    // Hapus file fisik gambar dari folder lokal
    const filePath = path.join(__dirname, booking.document_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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