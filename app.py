import os
from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
import yt_dlp
import uuid
import math

# Flask app initialization
app = Flask(__name__, 
    template_folder='templates', 
    static_folder='static'
)

# Enable CORS
CORS(app)

# Create downloads directory
DOWNLOAD_FOLDER = 'downloads'
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

# Global progress storage
download_progress = {}

def get_ydl_opts():
    return {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'format': 'best',
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        'socket_timeout': 30,
        'retries': 3,
        'fragment_retries': 3,
    }

def format_file_size(size_bytes):
    if size_bytes is None:
        return "Calculating..."
    if size_bytes == 0:
        return "0 B"
    size_names = ["B", "KB", "MB", "GB"]
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_names[i]}"

# ✅ HEALTH CHECK - MUST WORK
@app.route("/health")
def health_check():
    return jsonify({"status": "healthy", "message": "YouTube Downloader is running!"})

# ✅ TEST ROUTE
@app.route("/test")
def test():
    return jsonify({"status": "success", "message": "Server is working perfectly! 🎉"})

# ✅ MAIN ROUTE
@app.route("/")
def home():
    return render_template("index.html")

# ✅ VIDEO INFO
@app.route("/info/video", methods=["GET"])
def get_video_info():
    url = request.args.get("url")
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    try:
        ydl_opts = get_ydl_opts()
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            if not info:
                return jsonify({"error": "Failed to fetch video information"}), 500
            
            formats = []
            for fmt in info.get('formats', []):
                if fmt.get('vcodec') != 'none':
                    filesize = fmt.get('filesize') or fmt.get('filesize_approx')
                    
                    format_info = {
                        'format_id': fmt.get('format_id', ''),
                        'ext': fmt.get('ext', 'mp4'),
                        'quality': fmt.get('format_note', 'Unknown'),
                        'height': fmt.get('height', 0),
                        'filesize': format_file_size(filesize),
                    }
                    
                    # Set quality label
                    if fmt.get('height'):
                        height = fmt['height']
                        if height >= 2160:
                            format_info['quality'] = "4K"
                        elif height >= 1440:
                            format_info['quality'] = "1440p"
                        elif height >= 1080:
                            format_info['quality'] = "1080p"
                        elif height >= 720:
                            format_info['quality'] = "720p"
                        elif height >= 480:
                            format_info['quality'] = "480p"
                        elif height >= 360:
                            format_info['quality'] = "360p"
                        else:
                            format_info['quality'] = f"{height}p"
                    
                    formats.append(format_info)
            
            # Remove duplicates and sort
            seen = set()
            unique_formats = []
            for fmt in formats:
                quality = fmt['quality']
                if quality not in seen:
                    seen.add(quality)
                    unique_formats.append(fmt)
            
            unique_formats.sort(key=lambda x: x.get('height', 0), reverse=True)
            
            return jsonify({
                'title': info.get('title', 'YouTube Video'),
                'duration': info.get('duration_string', 'Unknown'),
                'uploader': info.get('uploader', 'Unknown'),
                'thumbnail': info.get('thumbnail', ''),
                'formats': unique_formats[:6]
            })
            
    except Exception as e:
        return jsonify({"error": f"Failed to fetch video info: {str(e)}"}), 500

# ✅ AUDIO INFO
@app.route("/info/audio", methods=["GET"])
def get_audio_info():
    url = request.args.get("url")
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    try:
        ydl_opts = get_ydl_opts()
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            if not info:
                return jsonify({"error": "Failed to fetch audio information"}), 500
            
            return jsonify({
                'title': info.get('title', 'YouTube Audio'),
                'duration': info.get('duration_string', 'Unknown'),
                'uploader': info.get('uploader', 'Unknown'),
                'thumbnail': info.get('thumbnail', ''),
                'status': 'success'
            })
            
    except Exception as e:
        return jsonify({"error": f"Failed to fetch audio info: {str(e)}"}), 500

# ✅ VIDEO DOWNLOAD
@app.route("/download/video", methods=["GET"])
def download_video():
    try:
        url = request.args.get("url")
        quality = request.args.get("quality", "best")
        file_id = request.args.get("file_id", str(uuid.uuid4()))
        
        if not url:
            return jsonify({"error": "No URL provided"}), 400

        output_template = os.path.join(DOWNLOAD_FOLDER, f"{file_id}.%(ext)s")

        # Get video info
        ydl_info_opts = get_ydl_opts()
        with yt_dlp.YoutubeDL(ydl_info_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            video_title = info.get('title', 'video').replace('/', '_').replace('\\', '_')[:100]

        def progress_hook(d):
            if d['status'] == 'downloading':
                percent_str = d.get('_percent_str', '0%').strip()
                try:
                    percent_float = float(percent_str.replace('%', '')) if '%' in percent_str else 0
                except:
                    percent_float = 0
                
                download_progress[file_id] = {
                    "percent": percent_float,
                    "status": "Downloading...",
                    "speed": d.get('_speed_str', 'N/A'),
                    "file_id": file_id
                }
                
            elif d['status'] == 'finished':
                download_progress[file_id] = {
                    "percent": 100,
                    "status": "Processing...",
                    "speed": "Complete",
                    "file_id": file_id
                }

        ydl_opts = {
            "outtmpl": output_template,
            "format": quality,
            "progress_hooks": [progress_hook],
        }

        download_progress[file_id] = {"percent": 0, "status": "Starting..."}

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Find and send file
        for f in os.listdir(DOWNLOAD_FOLDER):
            if f.startswith(file_id):
                downloaded_file = os.path.join(DOWNLOAD_FOLDER, f)
                file_ext = f.split('.')[-1] if '.' in f else 'mp4'
                
                if file_id in download_progress:
                    del download_progress[file_id]
                
                response = send_file(
                    downloaded_file, 
                    as_attachment=True, 
                    download_name=f"{video_title}.{file_ext}"
                )
                
                # Cleanup
                try:
                    os.remove(downloaded_file)
                except:
                    pass
                
                return response

        return jsonify({"error": "File not found"}), 500

    except Exception as e:
        file_id = request.args.get("file_id")
        if file_id in download_progress:
            del download_progress[file_id]
        return jsonify({"error": f"Download failed: {str(e)}"}), 500

# ✅ AUDIO DOWNLOAD
@app.route("/download/audio", methods=["GET"])
def download_audio():
    try:
        url = request.args.get("url")
        file_id = request.args.get("file_id", str(uuid.uuid4()))
        
        if not url:
            return jsonify({"error": "No URL provided"}), 400

        output_template = os.path.join(DOWNLOAD_FOLDER, f"{file_id}.%(ext)s")

        # Get audio info
        ydl_info_opts = get_ydl_opts()
        with yt_dlp.YoutubeDL(ydl_info_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            audio_title = info.get('title', 'audio').replace('/', '_').replace('\\', '_')[:100]

        def progress_hook(d):
            if d['status'] == 'downloading':
                percent_str = d.get('_percent_str', '0%').strip()
                try:
                    percent_float = float(percent_str.replace('%', '')) if '%' in percent_str else 0
                except:
                    percent_float = 0
                
                download_progress[file_id] = {
                    "percent": percent_float,
                    "status": "Downloading...",
                    "speed": d.get('_speed_str', 'N/A'),
                    "file_id": file_id
                }
                
            elif d['status'] == 'finished':
                download_progress[file_id] = {
                    "percent": 100,
                    "status": "Converting to MP3...",
                    "speed": "Processing",
                    "file_id": file_id
                }

        ydl_opts = {
            "outtmpl": output_template,
            "format": "bestaudio/best",
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }],
            "progress_hooks": [progress_hook],
        }

        download_progress[file_id] = {"percent": 0, "status": "Starting..."}

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Find and send file
        for f in os.listdir(DOWNLOAD_FOLDER):
            if f.startswith(file_id) and f.endswith('.mp3'):
                downloaded_file = os.path.join(DOWNLOAD_FOLDER, f)
                
                if file_id in download_progress:
                    del download_progress[file_id]
                
                response = send_file(
                    downloaded_file, 
                    as_attachment=True, 
                    download_name=f"{audio_title}.mp3"
                )
                
                # Cleanup
                try:
                    os.remove(downloaded_file)
                except:
                    pass
                
                return response

        return jsonify({"error": "File not found"}), 500

    except Exception as e:
        file_id = request.args.get("file_id")
        if file_id in download_progress:
            del download_progress[file_id]
        return jsonify({"error": f"Audio download failed: {str(e)}"}), 500

# ✅ PROGRESS CHECK
@app.route("/progress/<file_id>")
def get_progress(file_id):
    progress = download_progress.get(file_id, {
        "percent": 0, 
        "status": "Starting...", 
        "speed": "0 B/s"
    })
    return jsonify(progress)

# ✅ OTHER PAGES
@app.route("/privacy")
def privacy():
    return render_template("privacy.html")

@app.route("/terms") 
def terms():
    return render_template("terms.html")

@app.route("/contact")
def contact():
    return render_template("contact.html")

# ✅ Render deployment
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)