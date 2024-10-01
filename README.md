# Pre-requisites for the project
Might not have mentioned about the database, there are two tables: Users and video_streaming.
Create the database and apply the following:

USE users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

USE video_streaming;

CREATE TABLE videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  videoUrl VARCHAR(255) NOT NULL,
  thumbnailUrl VARCHAR(255),
  duration INT,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  dislikes INT DEFAULT 0,
  category VARCHAR(100),
  tags VARCHAR(255),
  uploaderId INT,
  videoQuality VARCHAR(10),
  isPrivate BOOLEAN DEFAULT FALSE,
  fileSize BIGINT,
  uploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
