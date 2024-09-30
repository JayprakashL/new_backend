import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

export function generateThumbnail(videoPath, outputFolder, cb) {
  const videoUuid = path.parse(videoPath).name;
  const videoThumbnailFolder = path.join(outputFolder, videoUuid);

  // Ensure the output folder and thumbnail folder exist
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }
  if (!fs.existsSync(videoThumbnailFolder)) {
    fs.mkdirSync(videoThumbnailFolder, { recursive: true });
  }

  const outputThumbnail = path.join(videoThumbnailFolder, `${videoUuid}.jpeg`);

  // Generate the thumbnail using fluent-ffmpeg
  ffmpeg(videoPath)
    .on('end', function () {
      console.log(`Thumbnail generated and saved as ${outputThumbnail}`);
      cb(null, outputThumbnail);
    })
    .on('error', function (err) {
      console.log(`Error generating thumbnail: ${err.message}`);
      cb(err);
    })
    // Choose a random second in the video for the thumbnail
    .screenshots({
      count: 1,
      folder: videoThumbnailFolder,
      filename: `${videoUuid}.jpeg`,
      timemarks: ['10%'] // Generate thumbnail at 10% of the video duration
    });
}