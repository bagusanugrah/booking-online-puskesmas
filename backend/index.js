require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
// Kita panggil perintah PutObjectCommand untuk menembak langsung ke S3
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Patient, Booking, Disease, EnvironmentReport } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi S3 Client murni (tanpa embel-embel checksum yang bikin error)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  endpoint: process.env.S3_ENDPOINT || 'https://storage.googleapis.com',
  forcePathStyle: true
});

// Kembalikan Multer ke mode Transit Lokal sementara
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
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

// 3. Endpoint Booking (Transit Lokal -> Tembak S3 -> Hapus Lokal)
app.post('/api/bookings', verifyToken, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File dokumen wajib diunggah' });
    
    const { booking_date } = req.body;
    const fileName = req.file.filename;
    const localFilePath = req.file.path;

    // Baca file utuh dari hardisk
    const fileContent = fs.readFileSync(localFilePath);

    // Siapkan roket untuk menembak ke Google Cloud
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Body: fileContent,
      ContentType: req.file.mimetype // Pastikan format terbaca (PDF/JPG)
    };

    // Eksekusi tembakan ke awan
    await s3.send(new PutObjectCommand(uploadParams));

    // Bersihkan jejak (hapus file dari folder lokal)
    fs.unlinkSync(localFilePath);
    
    // Rangkai URL publik dari Google Cloud
    const document_url = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${fileName}`;
    
    const newBooking = await Booking.create({
      patient_id: req.user.id,
      booking_date,
      document_url,
      status: 'pending'
    });
    
    res.status(201).json({ message: 'Booking berhasil dibuat', booking: newBooking });
  } catch (error) {
    console.error(error);
    // Jika gagal, tetap bersihkan file lokal yang nyangkut
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Gagal membuat booking ke awan' });
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

    const urlParts = booking.document_url.split('/');
    const fileKey = urlParts[urlParts.length - 1];

    try {
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileKey,
      }));
    } catch (s3Error) {
      console.error("Gagal menghapus file dari S3", s3Error);
    }

    await booking.destroy();
    res.json({ message: 'Jadwal berhasil dibatalkan' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal membatalkan jadwal' });
  }
});

// --- FITUR MONITORING PENYAKIT ---

// Endpoint Lihat Tren Penyakit
app.get('/api/diseases', verifyToken, async (req, res) => {
  try {
    const diseases = await Disease.findAll();
    res.json(diseases);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data penyakit' });
  }
});

// Endpoint Tambah Penyakit (Khusus Admin)
app.post('/api/diseases', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Akses ditolak' });
    const { name, cases, location } = req.body;
    const newDisease = await Disease.create({ name, cases, location });
    res.status(201).json({ message: 'Data penyakit ditambahkan', disease: newDisease });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menambah data penyakit' });
  }
});

// Endpoint Hapus Penyakit (Khusus Admin)
app.delete('/api/diseases/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Akses ditolak' });
    await Disease.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Data penyakit berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus data penyakit' });
  }
});

// --- FITUR LAPORAN LINGKUNGAN ---

// Endpoint Buat Laporan Lingkungan (Khusus Pasien)
app.post('/api/reports', verifyToken, async (req, res) => {
  try {
    const { title, description, address } = req.body;
    const newReport = await EnvironmentReport.create({
      patient_id: req.user.id,
      title,
      description,
      address,
      status: 'Menunggu'
    });
    res.status(201).json({ message: 'Laporan berhasil dikirim', report: newReport });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengirim laporan' });
  }
});

// Endpoint Lihat Laporan
app.get('/api/reports', verifyToken, async (req, res) => {
  try {
    let reports;
    if (req.user.role === 'admin') {
      reports = await EnvironmentReport.findAll(); 
    } else {
      reports = await EnvironmentReport.findAll({ where: { patient_id: req.user.id } });
    }
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data laporan' });
  }
});

// Endpoint Update Status Laporan (Khusus Admin)
app.put('/api/reports/:id/status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Akses ditolak' });
    const { status } = req.body;
    await EnvironmentReport.update({ status }, { where: { id: req.params.id } });
    res.json({ message: `Status laporan diubah menjadi ${status}` });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengubah status laporan' });
  }
});

// Endpoint Hapus Laporan (Admin bebas hapus, Pasien hanya bisa hapus jika status Menunggu)
app.delete('/api/reports/:id', verifyToken, async (req, res) => {
  try {
    const report = await EnvironmentReport.findByPk(req.params.id);
    if (!report) return res.status(404).json({ error: 'Laporan tidak ditemukan' });

    // Cek hak akses
    if (req.user.role === 'patient' && (report.patient_id !== req.user.id || report.status !== 'Menunggu')) {
      return res.status(403).json({ error: 'Hanya bisa menghapus laporan yang masih menunggu' });
    }

    await report.destroy();
    res.json({ message: 'Laporan berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus laporan' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server Backend berjalan di http://localhost:${PORT}`);
});