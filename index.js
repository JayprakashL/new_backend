import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import mysql from 'mysql2';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { generateThumbnail } from './generateThumbnail.js'; // Import the thumbnail module

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'video_streaming'
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

const app = express();
app.use(cors());
app.use(express.json());

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'node_express', 'videos');
    cb(null, uploadPath); 
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original filename
  }
});

const upload = multer({ storage: storage });

// Serve videos, thumbnails, and captions statically
app.use('/videos', express.static(path.join(__dirname, 'node_express', 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'node_express', 'thumbnails')));
app.use('/captions', express.static(path.join(__dirname, 'node_express', 'captions')));

// Upload Route
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const videoUrl = `http://localhost:8000/videos/${req.file.filename}`;
  const fileSize = req.file.size;
  const uploadDate = new Date();

  const insertFields = {
    title: req.file.originalname,
    videoUrl: videoUrl,
    fileSize: fileSize,
    uploadDate: uploadDate
  };

  if (req.body.description) insertFields.description = req.body.description;
  if (req.body.category) insertFields.category = req.body.category;
  if (req.body.tags) insertFields.tags = req.body.tags;
  if (req.body.videoQuality) insertFields.videoQuality = req.body.videoQuality;
  if (req.body.isPrivate !== undefined) insertFields.isPrivate = req.body.isPrivate;

  const columns = Object.keys(insertFields).join(', ');
  const values = Object.values(insertFields);
  const placeholders = values.map(() => '?').join(', ');

  const sql = `INSERT INTO videos (${columns}) VALUES (${placeholders})`;

  db.query(sql, values, (err) => {
    if (err) return res.status(500).send(err.message);

    const videoPath = req.file.path;
    const outputFolder = path.join(__dirname, 'node_express', 'thumbnails');

    generateThumbnail(videoPath, outputFolder, (error, thumbnailPath) => {
      if (error) {
        console.error('Error generating thumbnail:', error);
        return res.status(500).send('Error generating thumbnail');
      }

      res.json({ message: 'Video uploaded', videoUrl, thumbnail: thumbnailPath });
    });
  });
});

// Stream video in chunks
app.get('/video/:id', (req, res) => {
  const videoId = req.params.id;
  const videoPath = path.join(__dirname, 'node_express', 'videos', videoId);

  fs.stat(videoPath, (err, stats) => {
    if (err || !stats.isFile()) {
      return res.status(404).send('Video not found');
    }

    const range = req.headers.range;
    if (!range) {
      return res.status(416).send('Requires Range header');
    }

    const videoSize = stats.size;
    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ''));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
    const contentLength = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${videoSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': contentLength,
      'Content-Type': 'video/mp4',
    });

    const videoStream = fs.createReadStream(videoPath, { start, end });
    videoStream.pipe(res);
  });
});

// Videos route
app.get('/videos', (req, res) => {
  const sql = 'SELECT * FROM videos';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send(err.message);
    res.json(results);
  });
});

// Metadata Route
app.get('/video/:id/metadata', (req, res) => {
  const videoId = req.params.id;
  const sql = 'SELECT * FROM videos WHERE id = ?';
  db.query(sql, [videoId], (err, result) => {
    if (err) return res.status(500).send(err.message);
    res.json(result[0]);
  });
});

// Get captions
app.get('/video/:id/captions', (req, res) => {
  const videoId = req.params.id;
  const captionsPath = path.join(__dirname, 'node_express', 'captions', `${videoId}.vtt`);

  fs.stat(captionsPath, (err, stats) => {
    if (err || !stats.isFile()) {
      return res.status(404).send('Captions not found');
    }
    res.sendFile(captionsPath);
  });
});

app.listen(8000, () => {
  console.log('Server running on port 8000');
});