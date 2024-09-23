import os
import ffmpeg
from db_config import db_connection
from datetime import datetime

# Path to videos folder inside node_express
VIDEO_FOLDER = os.path.join('..', 'node_express', 'videos')

# Video duration using ffmpeg
def get_video_duration(file_path):
    probe = ffmpeg.probe(file_path)
    duration = probe['format']['duration']
    return int(float(duration))

# Sync videos to the database
def sync_videos_to_db():
    connection = db_connection()
    cursor = connection.cursor()

    # List of videos
    video_files = os.listdir(VIDEO_FOLDER)

    for video in video_files:
        if video.endswith(('.mp4', '.mkv')):  # Extensions
            video_path = os.path.join(VIDEO_FOLDER, video)

            # Duration and file size
            duration = get_video_duration(video_path)
            file_size = os.path.getsize(video_path)

            title = video
            video_url = f"http://localhost:8000/videos/{video}"
            upload_date = datetime.now()

            # Insert video data into MySQL
            cursor.execute("""
                INSERT INTO videos (title, videoUrl, duration, fileSize, uploadDate)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                duration = VALUES(duration),
                fileSize = VALUES(fileSize),
                uploadDate = VALUES(uploadDate)
            """, (title, video_url, duration, file_size, upload_date))

    connection.commit()
    cursor.close()
    connection.close()

# Fetch videos from the database
def fetch_videos_from_db():
    connection = db_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("SELECT * FROM videos")
    videos = cursor.fetchall()

    cursor.close()
    connection.close()

    return videos