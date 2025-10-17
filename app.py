import os
from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
import yt_dlp
import uuid
import math
import random
import time

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOAD_FOLDER = os.path.join(BASE_DIR, 'downloads')
TEMPLATE_FOLDER = os.path.join(BASE_DIR, 'templates') 
STATIC_FOLDER = os.path.join(BASE_DIR, 'static')

app = Flask(__name__, 
    template_folder=TEMPLATE_FOLDER, 
    static_folder=STATIC_FOLDER
)

os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)
CORS(app)
download_progress = {}

# ✅ SIMPLIFIED & WORKING CONFIGURATION
def get_ydl_opts():
    return {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        
        # ✅ MINIMAL WORKING CONFIG
        'format': 'best',
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
        },
        
        # ✅ NETWORK SETTINGS
        'socket_timeout': 30,
        'retries': 3,
        'fragment_retries': 3,
        'skip_unavailable_fragments': True,
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

# ✅ FIXED VIDEO INFO WITH PROPER ERROR HANDLING
@app.route("/info/video", methods=["GET"])
def get_video_info():
    url = request.args.get("url")
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    try:
        ydl_opts = get_ydl_opts()
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # ✅ CHECK IF INFO IS VALID
            if not info:
                return jsonify({"error": "Failed to fetch video information from YouTube"}), 500
            
            formats = []
            all_formats = info.get('formats', [])
            
            for fmt in all_formats:
                if fmt.get('vcodec') != 'none':
                    filesize = fmt.get('filesize') or fmt.get('filesize_approx')
                    
                    # Calculate approximate size
                    if not filesize and fmt.get('tbr') and info.get('duration'):
                        tbr = fmt.get('tbr', 0) * 1000
                        duration = info.get('duration', 0)
                        filesize = (tbr * duration) / 8
                    
                    format_info = {
                        'format_id': fmt.get('format_id', ''),
                        'ext': fmt.get('ext', 'mp4'),
                        'quality': fmt.get('format_note', ''),
                        'height': fmt.get('height', 0),
                        'width': fmt.get('width', 0),
                        'filesize': format_file_size(filesize),
                        'filesize_bytes': filesize,
                        'vcodec': fmt.get('vcodec', ''),
                        'acodec': fmt.get('acodec', ''),
                    }
                    
                    # Set quality label
                    if fmt.get('height'):
                        height = fmt['height']
                        if height >= 4320:
                            format_info['quality'] = "8K"
                        elif height >= 2160:
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
                        elif height >= 240:
                            format_info['quality'] = "240p"
                        elif height >= 144:
                            format_info['quality'] = "144p"
                        else:
                            format_info['quality'] = f"{height}p"
                    elif fmt.get('format_note'):
                        format_info['quality'] = fmt['format_note']
                    else:
                        format_info['quality'] = 'Unknown'
                    
                    if format_info['quality'] not in ['', 'Unknown', 'none']:
                        formats.append(format_info)
            
            # Sort and remove duplicates
            formats.sort(key=lambda x: x.get('height', 0) or 0, reverse=True)
            
            seen_qualities = set()
            unique_formats = []
            
            for fmt in formats:
                quality = fmt.get('quality')
                if quality and quality not in seen_qualities:
                    seen_qualities.add(quality)
                    unique_formats.append(fmt)
            
            return jsonify({
                'title': info.get('title', 'YouTube Video'),
                'duration': info.get('duration_string', 'Unknown'),
                'uploader': info.get('uploader', 'Unknown'),
                'thumbnail': info.get('thumbnail', ''),
                'formats': unique_formats[:8]
            })
            
    except Exception as e:
        print(f"Video info error: {str(e)}")
        error_msg = str(e)
        
        if "429" in error_msg or "Too Many Requests" in error_msg:
            return jsonify({"error": "YouTube rate limit exceeded. Please try again in a few minutes."}), 429
        elif "Sign in" in error_msg or "bot" in error_msg:
            return jsonify({"error": "YouTube temporary restriction. Please try a different video."}), 423
        elif "unavailable" in error_msg.lower():
            return jsonify({"error": "Video is unavailable or private."}), 404
        else:
            return jsonify({"error": f"Failed to fetch video info: {error_msg}"}), 500

# ✅ SIMILAR FIX FOR AUDIO INFO
@app.route("/info/audio", methods=["GET"])
def get_audio_info():
    url = request.args.get("url")
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    try:
        ydl_opts = get_ydl_opts()
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # ✅ CHECK IF INFO IS VALID
            if not info:
                return jsonify({"error": "Failed to fetch audio information from YouTube"}), 500
            
            audio_formats = []
            for fmt in info.get('formats', []):
                if fmt.get('vcodec') == 'none' and fmt.get('acodec') != 'none':
                    filesize = fmt.get('filesize') or fmt.get('filesize_approx')
                    
                    abr = fmt.get('abr', 0)
                    format_info = {
                        'format_id': fmt.get('format_id', ''),
                        'ext': fmt.get('ext', 'mp3'),
                        'abr': abr,
                        'filesize': format_file_size(filesize),
                        'filesize_bytes': filesize,
                        'note': f"{abr}kbps" if abr else 'Best Quality'
                    }
                    audio_formats.append(format_info)
            
            audio_formats.sort(key=lambda x: x.get('abr', 0), reverse=True)
            
            seen_bitrates = set()
            unique_formats = []
            for fmt in audio_formats:
                bitrate = fmt.get('abr')
                if bitrate not in seen_bitrates:
                    seen_bitrates.add(bitrate)
                    unique_formats.append(fmt)
            
            return jsonify({
                'title': info.get('title', 'YouTube Audio'),
                'duration': info.get('duration_string', 'Unknown'),
                'uploader': info.get('uploader', 'Unknown'),
                'audio_formats': unique_formats[:3]
            })
            
    except Exception as e:
        print(f"Audio info error: {str(e)}")
        error_msg = str(e)
        
        if "429" in error_msg or "Too Many Requests" in error_msg:
            return jsonify({"error": "YouTube rate limit exceeded. Please try again in a few minutes."}), 429
        elif "Sign in" in error_msg or "bot" in error_msg:
            return jsonify({"error": "YouTube temporary restriction. Please try a different video."}), 423
        else:
            return jsonify({"error": f"Failed to fetch audio info: {error_msg}"}), 500

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
            if not info:
                return jsonify({"error": "Failed to get video information"}), 500
            video_title = info.get('title', 'video').replace('/', '_').replace('\\', '_')[:100]

        def progress_hook(d):
            if d['status'] == 'downloading':
                percent_str = d.get('_percent_str', '0%').strip()
                try:
                    if '%' in percent_str:
                        percent_float = float(percent_str.replace('%', ''))
                    else:
                        percent_float = 0
                except:
                    percent_float = 0
                
                speed = d.get('_speed_str', '0 B/s')
                total_bytes = d.get('total_bytes') or d.get('total_bytes_estimate')
                downloaded_bytes = d.get('downloaded_bytes', 0)
                
                if total_bytes:
                    downloaded_mb = downloaded_bytes / (1024 * 1024)
                    total_mb = total_bytes / (1024 * 1024)
                    size_info = f"{downloaded_mb:.1f}/{total_mb:.1f} MB"
                else:
                    downloaded_mb = downloaded_bytes / (1024 * 1024)
                    size_info = f"{downloaded_mb:.1f} MB"
                
                download_progress[file_id] = {
                    "percent": percent_float,
                    "status": f"Downloading...",
                    "size_info": size_info,
                    "speed": speed,
                    "file_id": file_id
                }
                
            elif d['status'] == 'finished':
                download_progress[file_id] = {
                    "percent": 100,
                    "status": "Processing video...",
                    "size_info": "Complete",
                    "speed": "Processing...",
                    "file_id": file_id
                }

        ydl_opts = {
            "outtmpl": output_template,
            "quiet": False,
            "no_warnings": False,
            "format": quality if quality != 'best' else 'best[height<=1080]',
            "progress_hooks": [progress_hook],
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            'retries': 3,
            'fragment_retries': 3,
        }

        download_progress[file_id] = {
            "percent": 0, 
            "status": "Starting download...", 
            "size_info": "0/0 MB",
            "speed": "Starting...",
            "file_id": file_id
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

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
                
                try:
                    if os.path.exists(downloaded_file):
                        os.remove(downloaded_file)
                except:
                    pass
                    
                return response

        return jsonify({"error": "File not found after download"}), 500

    except Exception as e:
        print(f"Download error: {e}")
        file_id = request.args.get("file_id")
        if file_id and file_id in download_progress:
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

        ydl_info_opts = get_ydl_opts()
        with yt_dlp.YoutubeDL(ydl_info_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                return jsonify({"error": "Failed to get audio information"}), 500
            audio_title = info.get('title', 'audio').replace('/', '_').replace('\\', '_')[:100]

        def progress_hook(d):
            if d['status'] == 'downloading':
                percent_str = d.get('_percent_str', '0%').strip()
                try:
                    if '%' in percent_str:
                        percent_float = float(percent_str.replace('%', ''))
                    else:
                        percent_float = 0
                except:
                    percent_float = 0
                
                speed = d.get('_speed_str', '0 B/s')
                total_bytes = d.get('total_bytes') or d.get('total_bytes_estimate')
                downloaded_bytes = d.get('downloaded_bytes', 0)
                
                if total_bytes:
                    downloaded_mb = downloaded_bytes / (1024 * 1024)
                    total_mb = total_bytes / (1024 * 1024)
                    size_info = f"{downloaded_mb:.1f}/{total_mb:.1f} MB"
                else:
                    downloaded_mb = downloaded_bytes / (1024 * 1024)
                    size_info = f"{downloaded_mb:.1f} MB"
                
                download_progress[file_id] = {
                    "percent": percent_float,
                    "status": f"Downloading...",
                    "size_info": size_info,
                    "speed": speed,
                    "file_id": file_id
                }
                
            elif d['status'] == 'finished':
                download_progress[file_id] = {
                    "percent": 100,
                    "status": "Converting to MP3...",
                    "size_info": "Converting...",
                    "speed": "Processing...",
                    "file_id": file_id
                }

        ydl_opts = {
            "outtmpl": output_template,
            "quiet": False,
            "no_warnings": False,
            "format": "bestaudio/best",
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }],
            "progress_hooks": [progress_hook],
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            'retries': 3,
            'fragment_retries': 3,
        }

        download_progress[file_id] = {
            "percent": 0, 
            "status": "Starting audio download...", 
            "size_info": "0/0 MB",
            "speed": "Starting...",
            "file_id": file_id
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

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
                
                try:
                    if os.path.exists(downloaded_file):
                        os.remove(downloaded_file)
                    original_file = downloaded_file.replace('.mp3', '.m4a')
                    if os.path.exists(original_file):
                        os.remove(original_file)
                except:
                    pass
                    
                return response

        return jsonify({"error": "File not found after download"}), 500

    except Exception as e:
        print(f"Audio download error: {e}")
        file_id = request.args.get("file_id")
        if file_id and file_id in download_progress:
            del download_progress[file_id]
        return jsonify({"error": f"Audio download failed: {str(e)}"}), 500

# ✅ PROGRESS CHECK ROUTE
@app.route("/progress/<file_id>")
def get_progress(file_id):
    progress = download_progress.get(file_id, {
        "percent": 0, 
        "status": "Starting...", 
        "size_info": "0/0 MB",
        "speed": "0 B/s"
    })
    return jsonify(progress)

# ✅ HEALTH CHECK
@app.route("/health")
def health_check():
    return jsonify({"status": "healthy", "message": "YouTube Downloader is running"})

# ✅ MAIN ROUTES
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/privacy")
def privacy():
    return render_template("privacy.html")

@app.route("/terms") 
def terms():
    return render_template("terms.html")

@app.route("/contact")
def contact():
    return render_template("contact.html")

@app.route("/test")
def test():
    return jsonify({"status": "success", "message": "Server working!"})

# ✅ Render specific
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)