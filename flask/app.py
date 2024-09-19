from flask import Flask, jsonify
from db_operations import sync_videos_to_db, fetch_videos_from_db

app = Flask(__name__)

# Route to sync videos from folder to database
@app.route('/sync_videos', methods=['GET'])
def sync_videos():
    sync_videos_to_db()
    return jsonify({"message": "Videos synced successfully"}), 200

# Route to get video details from the database
@app.route('/get_videos', methods=['GET'])
def get_videos():
    videos = fetch_videos_from_db()
    return jsonify(videos), 200

if __name__ == '__main__':
    app.run(debug=True)