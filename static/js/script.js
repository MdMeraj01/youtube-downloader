// Global variables
let currentTab = 'video';

// ✅ URL VALIDATION FUNCTION
function isValidYouTubeUrl(url) {
    if (!url) return false;
    
    const patterns = [
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
        /youtube\.com\/watch\?v=[\w-]+/,
        /youtu\.be\/[\w-]+/,
        /youtube\.com\/embed\/[\w-]+/
    ];
    return patterns.some(pattern => pattern.test(url));
}

// Navigation functionality
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
}

function scrollToDownloader() {
    document.getElementById('video-downloader').scrollIntoView({ behavior: 'smooth' });
}

// Tab switching functionality
function switchTab(tab) {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active', 'bg-blue-500', 'text-white');
        btn.classList.add('text-gray-600');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
        content.classList.remove('active');
    });
    
    const tabButton = document.getElementById(`${tab}-tab`);
    const tabContent = document.getElementById(`${tab}-downloader`);
    
    tabButton.classList.add('active', 'bg-blue-500', 'text-white');
    tabButton.classList.remove('text-gray-600');
    
    tabContent.classList.remove('hidden');
    tabContent.classList.add('active');
    
    currentTab = tab;
}

// Progress animation function
function animateProgress(progressBarId, progressTextId, callback) {
    const progressBar = document.getElementById(progressBarId);
    const progressText = document.getElementById(progressTextId);
    let progress = 0;
    
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) progress = 100;
        
        progressBar.style.width = progress + '%';
        progressText.textContent = Math.round(progress) + '%';
        
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(callback, 500);
        }
    }, 100);
}

// ✅ FIXED: Video downloader functionality
async function fetchVideoInfo() {
    const url = document.getElementById('video-url').value;
    if (!url) {
        alert('Please enter a YouTube URL');
        return;
    }

    if (!isValidYouTubeUrl(url)) {
        alert('Please enter a valid YouTube URL (youtube.com or youtu.be)');
        return;
    }

    // Show progress
    document.getElementById('video-progress').classList.remove('hidden');
    document.getElementById('video-results').classList.add('hidden');

    try {
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            
            document.getElementById('video-progress-bar').style.width = progress + '%';
            document.getElementById('video-progress-text').textContent = Math.round(progress) + '% - Fetching video info...';
        }, 200);

        const resp = await fetch(`/info/video?url=${encodeURIComponent(url)}`);
        
        clearInterval(progressInterval);
        
        if (!resp.ok) {
            const errorData = await resp.json();
            throw new Error(errorData.error || 'Server error: ' + resp.status);
        }
        
        const data = await resp.json();
        
        // Complete progress bar
        document.getElementById('video-progress-bar').style.width = '100%';
        document.getElementById('video-progress-text').textContent = '100% - Complete!';
        
        setTimeout(() => {
            document.getElementById('video-progress').classList.add('hidden');
            displayVideoResults(data, url);
        }, 500);
        
    } catch (error) {
        document.getElementById('video-progress').classList.add('hidden');
        alert('Error: ' + error.message);
        console.error('Video fetch error:', error);
    }
}
// ✅ IMPROVED: Show ALL qualities including 4K/8K
function displayVideoResults(data, originalUrl) {
    const videoInfo = document.getElementById('video-info');
    const thumbnail = data.thumbnail || '';

    videoInfo.innerHTML = `
        <div class="flex flex-col md:flex-row gap-6 fade-in-up">
            <div class="md:w-1/3">
                <img src="${thumbnail}" alt="Video thumbnail" 
                     class="w-full rounded-lg shadow-lg hover-scale cursor-pointer"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMzAgOTBMMTcwIDExMFY3MEwxMzAgOTBaIiBmaWxsPSIjOUI5QkEwIi8+Cjx0ZXh0IHg9IjE2MCIgeT0iMTMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUI5QkEwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiPlRodW1ibmFpbCBub3QgYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4K';">
            </div>
            <div class="md:w-2/3">
                <h3 class="text-xl font-bold text-gray-800 mb-2">${data.title || 'No title available'}</h3>
                <div class="flex flex-wrap gap-4 text-gray-600 mb-4">
                    <span class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        ${data.duration || 'Unknown duration'}
                    </span>
                    <span class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        ${data.uploader || 'Unknown uploader'}
                    </span>
                </div>
            </div>
        </div>
    `;

    const qualityTable = document.getElementById('video-quality-table');
    const formats = data.formats || [];

    if (formats.length === 0) {
        qualityTable.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-600 mb-4">No video formats found for this video.</p>
                <button onclick="startVideoDownload('${originalUrl}', 'best')" 
                        class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                    Download Best Available Quality
                </button>
            </div>
        `;
        document.getElementById('video-results').classList.remove('hidden');
        return;
    }

    let tableHTML = `
        <h4 class="text-lg font-semibold text-gray-800 mb-4">Available Quality Options (${formats.length} formats):</h4>
        <div class="bg-blue-50 rounded-lg p-4 mb-4">
            <p class="text-blue-700 text-sm">🎥 <strong>Real Qualities Found:</strong> ${formats.map(f => f.quality).join(', ')}</p>
        </div>
        <div class="hidden md:block">
            <table class="w-full">
                <thead>
                    <tr class="border-b border-gray-200">
                        <th class="text-left py-3 px-4 font-semibold text-gray-700">Quality</th>
                        <th class="text-left py-3 px-4 font-semibold text-gray-700">Format</th>
                        <th class="text-left py-3 px-4 font-semibold text-gray-700">File Size</th>
                        <th class="text-left py-3 px-4 font-semibold text-gray-700">Download</th>
                    </tr>
                </thead>
                <tbody>
    `;

    formats.forEach((format, idx) => {
        const qualityLabel = format.quality || 'Unknown';
        const extension = format.ext || 'mp4';
        const fileSize = format.filesize || 'Calculating...';
        const formatId = format.format_id || 'best';
        
        // Color code for different qualities
        let qualityClass = "font-medium text-gray-800";
        if (qualityLabel.includes('8K') || qualityLabel.includes('4K')) {
            qualityClass = "font-bold text-purple-600";
        } else if (qualityLabel.includes('1440p') || qualityLabel.includes('1080p')) {
            qualityClass = "font-semibold text-green-600";
        } else if (qualityLabel.includes('720p')) {
            qualityClass = "font-medium text-blue-600";
        }
        
        tableHTML += `
            <tr class="border-b border-gray-100 slide-in-left" style="animation-delay: ${idx * 0.05}s">
                <td class="py-3 px-4 ${qualityClass}">${qualityLabel}</td>
                <td class="py-3 px-4 text-gray-600">${extension.toUpperCase()}</td>
                <td class="py-3 px-4 text-gray-600">${fileSize}</td>
                <td class="py-3 px-4">
                    <button onclick="startVideoDownload('${originalUrl}', '${formatId}')" 
                            class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                        Download
                    </button>
                </td>
            </tr>
        `;
    });

    tableHTML += `
                </tbody>
            </table>
        </div>
        <div class="md:hidden space-y-4">
    `;

    formats.forEach((format, idx) => {
        const qualityLabel = format.quality || 'Unknown';
        const extension = format.ext || 'mp4';
        const fileSize = format.filesize || 'Calculating...';
        const formatId = format.format_id || 'best';
        
        let qualityClass = "font-medium text-gray-800";
        if (qualityLabel.includes('8K') || qualityLabel.includes('4K')) {
            qualityClass = "font-bold text-purple-600";
        } else if (qualityLabel.includes('1440p') || qualityLabel.includes('1080p')) {
            qualityClass = "font-semibold text-green-600";
        } else if (qualityLabel.includes('720p')) {
            qualityClass = "font-medium text-blue-600";
        }
        
        tableHTML += `
            <div class="bg-gray-50 rounded-lg p-4 slide-in-left" style="animation-delay: ${idx * 0.05}s">
                <div class="flex justify-between items-center mb-2">
                    <span class="${qualityClass}">${qualityLabel}</span>
                    <span class="text-gray-600">${extension.toUpperCase()}</span>
                </div>
                <div class="flex justify-between items-center mb-3">
                    <span class="text-gray-600">Size: ${fileSize}</span>
                </div>
                <button onclick="startVideoDownload('${originalUrl}', '${formatId}')" 
                        class="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors">
                    Download
                </button>
            </div>
        `;
    });

    tableHTML += '</div>';
    qualityTable.innerHTML = tableHTML;
    document.getElementById('video-results').classList.remove('hidden');
}
 

// ✅ IMPROVED: Audio downloader with real qualities
async function fetchAudioInfo() {
    const url = document.getElementById('audio-url').value;
    if (!url) {
        alert('Please enter a YouTube URL');
        return;
    }

    if (!isValidYouTubeUrl(url)) {
        alert('Please enter a valid YouTube URL (youtube.com or youtu.be)');
        return;
    }

    document.getElementById('audio-progress').classList.remove('hidden');
    document.getElementById('audio-results').classList.add('hidden');

    try {
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            
            document.getElementById('audio-progress-bar').style.width = progress + '%';
            document.getElementById('audio-progress-text').textContent = Math.round(progress) + '% - Fetching audio info...';
        }, 200);

        const resp = await fetch(`/info/audio?url=${encodeURIComponent(url)}`);
        
        clearInterval(progressInterval);
        
        if (!resp.ok) {
            const errorData = await resp.json();
            throw new Error(errorData.error || 'Server error: ' + resp.status);
        }
        
        const data = await resp.json();
        
        document.getElementById('audio-progress-bar').style.width = '100%';
        document.getElementById('audio-progress-text').textContent = '100% - Complete!';
        
        setTimeout(() => {
            document.getElementById('audio-progress').classList.add('hidden');
            displayAudioResults(data, url);
        }, 500);
        
    } catch (error) {
        document.getElementById('audio-progress').classList.add('hidden');
        alert('Error: ' + error.message);
        console.error('Audio fetch error:', error);
    }
}

function displayAudioResults(data, originalUrl) {
    const audioInfo = document.getElementById('audio-info');
    audioInfo.innerHTML = `
        <div class="text-center fade-in-up">
            <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-2">${data.title || 'No title available'}</h3>
            <p class="text-gray-600">Duration: ${data.duration || 'Unknown'} | Channel: ${data.uploader || 'Unknown'}</p>
        </div>
    `;

    const formats = data.audio_formats || [];
    const audioFormats = document.getElementById('audio-formats');
    
    if (formats.length === 0) {
        audioFormats.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-600 mb-4">No audio formats found for this video.</p>
                <button onclick="startAudioDownload('${originalUrl}', 'bestaudio')" 
                        class="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors">
                    Download Best Available Audio
                </button>
            </div>
        `;
        document.getElementById('audio-results').classList.remove('hidden');
        return;
    }
    
    let formatsHTML = `<h4 class="text-lg font-semibold text-gray-800 mb-6">Available Audio Formats (${formats.length} formats):</h4>`;
    
    formatsHTML += '<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">';
    
    formats.forEach((format, idx) => {
        const bitrate = format.abr ? `${format.abr}kbps` : '';
        const extension = format.ext || 'mp3';
        const fileSize = format.filesize || 'Calculating...';
        const formatId = format.format_id || 'bestaudio';
        const note = format.note || 'Best Quality';
        
        formatsHTML += `
            <div class="bg-green-50 rounded-lg p-6 text-center hover-scale slide-in-left" style="animation-delay:${idx * 0.05}s">
                <h5 class="font-semibold text-gray-800 mb-2">${extension.toUpperCase()} ${bitrate}</h5>
                <p class="text-gray-600 mb-1">${note}</p>
                <p class="text-gray-600 mb-4">${fileSize}</p>
                <button onclick="startAudioDownload('${originalUrl}', '${formatId}')" 
                        class="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors">
                    Download MP3
                </button>
            </div>
        `;
    });
    
    formatsHTML += '</div>';
    
    audioFormats.innerHTML = formatsHTML;
    document.getElementById('audio-results').classList.remove('hidden');
}

// ✅ FIXED: Thumbnail downloader functionality
async function fetchThumbnailInfo() {
    const url = document.getElementById('thumbnail-url').value;
    if (!url) {
        alert('Please enter a YouTube URL');
        return;
    }

    if (!isValidYouTubeUrl(url)) {
        alert('Please enter a valid YouTube URL (youtube.com or youtu.be)');
        return;
    }

    document.getElementById('thumbnail-progress').classList.remove('hidden');
    document.getElementById('thumbnail-results').classList.add('hidden');

    try {
        // Real progress animation for fetching
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            
            document.getElementById('thumbnail-progress-bar').style.width = progress + '%';
            document.getElementById('thumbnail-progress-text').textContent = Math.round(progress) + '% - Fetching thumbnail info...';
        }, 200);

        const resp = await fetch(`/info/video?url=${encodeURIComponent(url)}`);
        
        clearInterval(progressInterval);
        
        if (!resp.ok) {
            throw new Error('Server error: ' + resp.status);
        }
        
        const data = await resp.json();
        
        // Complete progress bar
        document.getElementById('thumbnail-progress-bar').style.width = '100%';
        document.getElementById('thumbnail-progress-text').textContent = '100% - Complete!';
        
        setTimeout(() => {
            document.getElementById('thumbnail-progress').classList.add('hidden');
            displayThumbnailResults(data, url);
        }, 500);
        
    } catch (error) {
        document.getElementById('thumbnail-progress').classList.add('hidden');
        alert('Error: ' + error.message);
        console.error('Thumbnail fetch error:', error);
    }
}

function displayThumbnailResults(data, originalUrl) {
    const thumbnailInfo = document.getElementById('thumbnail-info');
    const thumbnailGrid = document.getElementById('thumbnail-grid');
    
    thumbnailInfo.innerHTML = `
        <div class="text-center fade-in-up">
            <h3 class="text-xl font-bold text-gray-800 mb-2">${data.title || 'No title available'}</h3>
            <p class="text-gray-600">Channel: ${data.uploader || 'Unknown'}</p>
        </div>
    `;

    const thumbnailUrl = data.thumbnail;
    
    let gridHTML = `
        <h4 class="text-lg font-semibold text-gray-800 mb-6">Available Thumbnail:</h4>
        <div class="grid md:grid-cols-1 gap-6">
            <div class="bg-white rounded-lg p-6 text-center hover-scale">
                <div class="mb-4">
                    <img src="${thumbnailUrl}" alt="Video thumbnail" 
                         class="mx-auto rounded-lg shadow-lg max-w-full h-auto max-h-64"
                         onerror="this.style.display='none'">
                </div>
                <div class="space-y-3">
                    <button onclick="downloadThumbnail('${originalUrl}', 'maxres')" 
                            class="w-full bg-purple-500 text-white py-3 rounded-lg hover:bg-purple-600 transition-colors font-medium">
                        Download High Quality Thumbnail
                    </button>
                    <p class="text-gray-600 text-sm">Click to download the highest quality thumbnail available</p>
                </div>
            </div>
        </div>
    `;
    
    thumbnailGrid.innerHTML = gridHTML;
    document.getElementById('thumbnail-results').classList.remove('hidden');
}

// ✅ LOADER FUNCTIONS
function showLoaderWithProgress() {
    const loader = document.createElement("div");
    loader.id = "download-loader";
    loader.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
    loader.innerHTML = `
        <div class="bg-white rounded-xl p-8 shadow-lg flex flex-col items-center w-80">
            <svg class="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <p class="text-gray-700 font-medium mb-2 text-center" id="loader-status">Preparing your download...</p>
            <p class="text-gray-600 text-sm mb-1" id="loader-size-info">0/0 MB</p>
            <p class="text-gray-500 text-xs mb-3" id="loader-speed">Starting...</p>
            <div class="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div id="loader-progress-bar" class="bg-blue-600 h-3 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
            <p id="loader-progress-text" class="text-gray-600 text-sm">0%</p>
        </div>
    `;
    document.body.appendChild(loader);
}

function updateLoaderProgress(percent, status = "", sizeInfo = "", speed = "") {
    const bar = document.getElementById("loader-progress-bar");
    const text = document.getElementById("loader-progress-text");
    const statusEl = document.getElementById("loader-status");
    const sizeInfoEl = document.getElementById("loader-size-info");
    const speedEl = document.getElementById("loader-speed");
    
    if (bar && text) {
        bar.style.width = percent + "%";
        text.textContent = percent + "%";
    }
    
    if (statusEl && status) {
        statusEl.textContent = status;
    }
    
    if (sizeInfoEl && sizeInfo) {
        sizeInfoEl.textContent = sizeInfo;
    }
    
    if (speedEl && speed) {
        speedEl.textContent = speed;
    }
}

function hideLoader() {
    const loader = document.getElementById("download-loader");
    if (loader) loader.remove();
}

// ✅ FIXED DOWNLOAD FUNCTIONS
function startVideoDownload(url, quality) {
    const fileId = Date.now().toString();
    showLoaderWithProgress();
    updateLoaderProgress(0, "Starting video download...", "0/0 MB", "Starting...");

    let progressInterval;

    function checkProgress() {
        progressInterval = setInterval(async () => {
            try {
                const resp = await fetch(`/progress/${fileId}`);
                const data = await resp.json();
                
                if (data.percent !== undefined) {
                    updateLoaderProgress(
                        data.percent, 
                        data.status, 
                        data.size_info || "", 
                        data.speed || ""
                    );
                    
                    if (data.percent >= 100) {
                        clearInterval(progressInterval);
                        setTimeout(() => {
                            hideLoader();
                            showThankYouModal();
                        }, 1500);
                    }
                }
            } catch (error) {
                console.error("Progress check error:", error);
            }
        }, 500);
    }

    checkProgress();

    const xhr = new XMLHttpRequest();
    xhr.open("GET", `/download/video?url=${encodeURIComponent(url)}&quality=${encodeURIComponent(quality)}&file_id=${fileId}`, true);
    xhr.responseType = "blob";

    xhr.onload = function () {
        clearInterval(progressInterval);
        
        if (xhr.status === 200) {
            updateLoaderProgress(100, "Download completed!", "Complete", "Done");
            
            setTimeout(() => {
                const blob = xhr.response;
                const contentDisposition = xhr.getResponseHeader('Content-Disposition');
                let filename = "video.mp4";
                
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                    if (filenameMatch) {
                        filename = filenameMatch[1];
                    }
                }
                
                const link = document.createElement("a");
                link.href = window.URL.createObjectURL(blob);
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(link.href);

                hideLoader();
                showThankYouModal();
            }, 1000);
        } else {
            clearInterval(progressInterval);
            hideLoader();
            alert("Download failed. Please try again.");
        }
    };

    xhr.onerror = function () {
        clearInterval(progressInterval);
        hideLoader();
        alert("Network error during download.");
    };

    xhr.send();
}

function startAudioDownload(url, format) {
    const fileId = Date.now().toString();
    showLoaderWithProgress();
    updateLoaderProgress(0, "Starting audio download...", "0/0 MB", "Starting...");

    let progressInterval;

    function checkProgress() {
        progressInterval = setInterval(async () => {
            try {
                const resp = await fetch(`/progress/${fileId}`);
                const data = await resp.json();
                
                if (data.percent !== undefined) {
                    updateLoaderProgress(
                        data.percent, 
                        data.status, 
                        data.size_info || "", 
                        data.speed || ""
                    );
                    
                    if (data.percent >= 100) {
                        clearInterval(progressInterval);
                        setTimeout(() => {
                            hideLoader();
                            showThankYouModal();
                        }, 1500);
                    }
                }
            } catch (error) {
                console.error("Progress check error:", error);
            }
        }, 500);
    }

    checkProgress();

    const xhr = new XMLHttpRequest();
    xhr.open("GET", `/download/audio?url=${encodeURIComponent(url)}&format=${encodeURIComponent(format)}&file_id=${fileId}`, true);
    xhr.responseType = "blob";

    xhr.onload = function () {
        clearInterval(progressInterval);
        
        if (xhr.status === 200) {
            updateLoaderProgress(100, "Download completed!", "Complete", "Done");
            
            setTimeout(() => {
                const blob = xhr.response;
                const contentDisposition = xhr.getResponseHeader('Content-Disposition');
                let filename = "audio.mp3";
                
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                    if (filenameMatch) {
                        filename = filenameMatch[1];
                    }
                }
                
                const link = document.createElement("a");
                link.href = window.URL.createObjectURL(blob);
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(link.href);

                hideLoader();
                showThankYouModal();
            }, 1000);
        } else {
            clearInterval(progressInterval);
            hideLoader();
            alert("Download failed. Please try again.");
        }
    };

    xhr.onerror = function () {
        clearInterval(progressInterval);
        hideLoader();
        alert("Network error during download.");
    };

    xhr.send();
}

function downloadThumbnail(url, quality) {
    alert("Thumbnail download feature coming soon!");
}

// Utility functions
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : 'dQw4w9WgXcQ';
}

function showThankYouModal() {
    document.getElementById('thank-you-modal').classList.remove('hidden');
}

function closeThankYouModal() {
    document.getElementById('thank-you-modal').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Navigation highlighting on scroll
window.addEventListener('scroll', () => {
    const sections = ['hero', 'video-downloader', 'audio-downloader', 'thumbnail-downloader'];
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    sections.forEach(section => {
        const element = document.getElementById(section);
        if (element) {
            const rect = element.getBoundingClientRect();
            if (rect.top <= 100 && rect.bottom >= 100) {
                current = section;
            }
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Set initial tab
    switchTab('video');
    
    // Add smooth scrolling to nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
            
            // Close mobile menu if open
            document.getElementById('mobile-menu').classList.add('hidden');
        });
    });
});