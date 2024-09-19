import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import mysql from 'mysql2';

// Setup MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'video_metadata'
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

const app = express();

// Multer configuration for video uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "./videos");
  },
  filename: function(req, file, cb) {
    cb(null, file.fieldname + "-" + uuidv4() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use("/videos", express.static("videos")); // Serve videos

// Route for video upload
app.post("/upload", upload.single('file'), function(req, res) {
  const videoId = uuidv4();
  const videoPath = req.file.path;
  const hlsPath = `./videos/trailers/${videoId}/index.m3u8`;

  if (!fs.existsSync(`./videos/trailers/${videoId}`)) {
    fs.mkdirSync(`./videos/trailers/${videoId}`, { recursive: true });
  }

  // Convert video to HLS using FFmpeg
  const ffmpegCommand = `ffmpeg -i ${videoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "./videos/trailers/${videoId}/segment%03d.ts" ${hlsPath}`;
  
  exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) return res.status(500).send(`Error: ${error.message}`);

    const videoUrl = `http://localhost:8000/videos/trailers/${videoId}/index.m3u8`;
    
    // Store metadata in MySQL
    const sql = `INSERT INTO videos (video_id, video_url, title, description) VALUES (?, ?, ?, ?)`;
    db.query(sql, [videoId, videoUrl, req.body.title, req.body.description], (err, result) => {
      if (err) return res.status(500).send(err.message);
      res.json({ message: "Video uploaded and converted", videoUrl });
    });
  });
});

app.listen(8000, () => console.log("Node.js server listening on port 8000"));