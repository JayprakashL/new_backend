import express from 'express'; 
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import mysql from 'mysql2';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid'; // Import UUID module
import { generateThumbnail } from './generateThumbnail.js'; // Import the thumbnail module
import ffmpeg from 'fluent-ffmpeg';

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
    const uuid = uuidv4(); // Generate UUID
    const extension = path.extname(file.originalname); // Extract file extension
    const filename = `${uuid}${extension}`; // Create new filename with UUID
    cb(null, filename); // Save the video file with UUID as filename
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

  const uuid = path.parse(req.file.filename).name; // Extract UUID from filename
  const videoUrl = `http://localhost:8000/videos/${req.file.filename}`; // Use the new filename
  const fileSizeKB = (req.file.size / 1024).toFixed(2); // Convert file size to KB
  const uploadDate = new Date();

  // Get video duration
  ffmpeg.ffprobe(req.file.path, (err, metadata) => {
    if (err) return res.status(500).send(err.message);

    const duration = metadata.format.duration; // Duration in seconds

    const insertFields = {
      title: req.file.originalname,
      videoUrl: videoUrl,
      fileSize: req.file.size,
      uploadDate: uploadDate,
      description: req.body.description || null,
      category: req.body.category || null,
      tags: req.body.tags || null,
      videoQuality: req.body.videoQuality || null,
      isPrivate: req.body.isPrivate !== undefined ? req.body.isPrivate : false
    };

    const columns = Object.keys(insertFields).join(', ');
    const values = Object.values(insertFields);
    const placeholders = values.map(() => '?').join(', ');

    const sql = `INSERT INTO videos (${columns}) VALUES (${placeholders})`;

    db.query(sql, values, (err, result) => {
      if (err) return res.status(500).send(err.message);

      const videoPath = req.file.path;
      const outputFolder = path.join(__dirname, 'node_express', 'thumbnails');
      const thumbnailFile = `${uuid}.png`; // Generate thumbnail file with UUID

      generateThumbnail(videoPath, path.join(outputFolder, thumbnailFile), (error) => {
        if (error) {
          console.error('Error generating thumbnail:', error);
          return res.status(500).send('Error generating thumbnail');
        }

        const thumbnailUrl = `http://localhost:8000/thumbnails/${thumbnailFile}`; // Serve the thumbnail with UUID

        // Respond with UUID, title, file size, and duration
        res.json({
          message: 'Video uploaded',
          uuid: uuid,
          title: req.file.originalname,
          fileSize: `${fileSizeKB} KB`, // Return size in KB
          duration: duration, // Duration in seconds
          videoUrl,
          thumbnail: thumbnailUrl
        });
      });
    });
  });
});

// Stream video in chunks using UUID
app.get('/video/:uuid', (req, res) => {
  const videoUuid = req.params.uuid;
  const videoPath = path.join(__dirname, 'node_express', 'videos', `${videoUuid}.mp4`);

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

// Videos route to fetch all video metadata
app.get('/videos', (req, res) => {
  const sql = 'SELECT * FROM videos';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send(err.message);
    res.json(results);
  });
});

// Metadata Route with UUID
app.get('/video/:uuid/metadata', (req, res) => {
  const videoUuid = req.params.uuid;
  const sql = 'SELECT * FROM videos WHERE videoUrl LIKE ?';

  db.query(sql, [`%${videoUuid}%`], (err, result) => {
    if (err) return res.status(500).send(err.message);
    if (result.length === 0) return res.status(404).json({ error: 'Video not found' });
    res.json(result[0]);
  });
});

// Get captions for video using UUID
app.get('/video/:uuid/captions', (req, res) => {
  const videoUuid = req.params.uuid;
  const captionsPath = path.join(__dirname, 'node_express', 'captions', `${videoUuid}.vtt`);

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