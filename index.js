import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import mysql from 'mysql2';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    cb(null, path.join(__dirname, '../node_express/videos'));
  },
  filename: function(req, file, cb) {
    const extension = path.extname(file.originalname);
    const filename = file.originalname; // Store UUID as filename
    cb(null, filename);
  }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use("/videos", express.static(path.join(__dirname, '../node_express/videos'))); // Serve videos

// Route for video upload
app.post("/upload", upload.single('file'), function(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Please attach a file.' });
  }

  console.log("Uploaded file details:", req.file);
  const videoId = path.parse(req.file.filename).name; // Get the UUID
  const videoPath = req.file.path;
  console.log("Video path:", videoPath);

  // Use the original filename as the title
  const videoUrl = `http://localhost:8000/videos/${req.file.filename}`;
  const sql = `INSERT INTO videos (id, videoUrl, title, description) VALUES (?, ?, ?, ?)`;

  db.query(sql, [videoId, videoUrl, req.file.originalname, req.body.description], (err, result) => {
    if (err) return res.status(500).send(err.message);
    
    const pythonScriptPath = path.join(__dirname, '../flask/thumbnail.py');
    const outputFolder = path.join(__dirname, './thumbnails');
    
    const command = `python3 ${pythonScriptPath} "${videoPath}" "${outputFolder}"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error generating thumbnail:', error);
        return res.status(500).send('Error generating thumbnail');
      }
      
      console.log('Thumbnail generated:', stdout);
      res.json({ message: "Video uploaded", videoUrl });
    });
  });
});

// Endpoint to stream a specific segment of a video
app.get('/video-segment', (req, res) => {
  const videoId = req.query.videoId;
  const startTime = req.query.start || 0; // Start time in seconds
  const duration = req.query.duration || 5; // Segment duration in seconds
  
  // Get video extension (mp4 or mkv)
  const videoFolder = path.join(__dirname, '../node_express/videos');
  
  // Modify to find the video by original name instead of UUID
  const originalFileName = videoId; // This should be the original filename sent from the client
  const videoFile = fs.readdirSync(videoFolder).find(file => file.endsWith(originalFileName.split('.').pop())); // Match based on extension

  if (!videoFile) return res.status(404).send('Video not found');
  
  const videoPath = path.join(videoFolder, videoFile);

  // Use FFmpeg to extract the requested segment
  const ffmpegCommand = `ffmpeg -ss ${startTime} -i "${videoPath}" -t ${duration} -c copy -f mp4 pipe:1`;
  
  res.setHeader('Content-Type', 'video/mp4');
  
  // Execute FFmpeg command and pipe the output to the response
  const ffmpegProcess = exec(ffmpegCommand, { maxBuffer: 1024 * 1024 * 100 }, (error) => {
    if (error) {
      console.error('Error streaming video segment:', error);
      return res.status(500).send('Error processing video segment');
    }
  });

  ffmpegProcess.stdout.pipe(res);
});

// Route to get the list of videos and metadata from MySQL
app.get("/videos", (req, res) => {
  const sql = "SELECT * FROM videos";
  
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send(err.message);
    res.json(results);
  });
});

app.listen(8000, () => {
  console.log('Server running on port 8000');
});