import os
import random
import subprocess
from pathlib import Path

def generate_thumbnail(video_path, output_folder):
    video_uuid = Path(video_path).stem

    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    # Get the duration of the video using ffmpeg
    command_duration = f'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "{video_path}"'
    duration = subprocess.check_output(command_duration, shell=True).decode('utf-8').strip()
    
    random_second = random.uniform(0, float(duration))

    output_thumbnail = os.path.join(output_folder, f"{video_uuid}.jpeg")

    # Extract the thumbnail at the random second
    ffmpeg_command = f'ffmpeg -ss {random_second} -i "{video_path}" -frames:v 1 "{output_thumbnail}"'
    
    subprocess.run(ffmpeg_command, shell=True, check=True)
    
    print(f"Thumbnail generated and saved as {output_thumbnail}")

if __name__ == "__main__":
    # Example video path (update this based on your video directory)
    video_folder = "./videos"
    
    # The output folder where the thumbnails will be stored
    output_folder = "./thumbnails"
    
    # Loop over all video files in the video folder
    for video_file in os.listdir(video_folder):
        if video_file.endswith(('.mp4', '.mkv')):  # Add any other video formats if needed
            video_path = os.path.join(video_folder, video_file)
            generate_thumbnail(video_path, output_folder)