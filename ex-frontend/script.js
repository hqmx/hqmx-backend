document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let state = {
        currentTaskId: null,
        currentFormat: 'video',
        mediaInfo: null,
        eventSource: null
    };

    // --- CONFIGURATION ---
    // API 엔드포인트 설정
// 로컬 개발: http://localhost:5001
// Cloudflare 배포: https://hqmx-workers.your-subdomain.workers.dev
const API_BASE_URL = 'http://localhost:5001';

    // --- DOM ELEMENT CACHE ---
    const dom = {
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        urlInput: document.getElementById('urlInput'),
        analyzeBtn: document.getElementById('analyzeBtn'),
        analyzeBtnIcon: document.getElementById('analyzeBtn').querySelector('i'),
        analyzeBtnText: document.getElementById('analyzeBtn').querySelector('span'),
        previewSection: document.getElementById('previewSection'),
        thumbnailImg: document.getElementById('thumbnailImg'),
        mediaTitle: document.getElementById('mediaTitle'),
        mediaDuration: document.getElementById('mediaDuration'),
        formatTabs: document.querySelectorAll('.format-tab'),
        videoFormatsContainer: document.getElementById('videoFormats'),
        audioFormatsContainer: document.getElementById('audioFormats'),
        videoFormat: document.getElementById('videoFormat'),
        videoQuality: document.getElementById('videoQuality'),
        audioFormat: document.getElementById('audioFormat'),
        audioQuality: document.getElementById('audioQuality'),
        videoSizeEstimate: document.getElementById('videoSizeEstimate'),
        audioSizeEstimate: document.getElementById('audioSizeEstimate'),
        downloadBtn: document.getElementById('downloadBtn'),
        progressContainer: document.getElementById('progressSection'),
        spinner: document.querySelector('#progressSection .spinner'),
        progressStatus: document.getElementById('progressStatus'),
        progressPercentage: document.querySelector('#progressSection .progress-percentage'),
        progressBar: document.querySelector('#progressSection .progress-fill'),
    };

    // --- THEME MANAGEMENT ---
    const currentTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.body.setAttribute('data-theme', currentTheme);

    function handleThemeToggle() {
        const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    // --- EVENT LISTENERS ---
    dom.themeToggleBtn.addEventListener('click', handleThemeToggle);
    dom.analyzeBtn.addEventListener('click', handleAnalyzeClick);
    dom.urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAnalyzeClick();
    });
    dom.formatTabs.forEach(tab => {
        tab.addEventListener('click', () => handleFormatSwitch(tab.dataset.mediaType));
    });
    [dom.videoFormat, dom.videoQuality, dom.audioFormat, dom.audioQuality].forEach(el => {
        el.addEventListener('change', updateSizeEstimates);
    });
    dom.downloadBtn.addEventListener('click', handleDownloadClick);

    // --- HANDLER: Analyze URL ---
    async function handleAnalyzeClick() {
        const url = dom.urlInput.value.trim();
        if (!url) {
            showError(t('please_enter_url'));
            return;
        }
        setAnalyzingState(true);
        resetUI();

        try {
            const currentLang = localStorage.getItem('language') || 'en';
            const response = await fetch(`${API_BASE_URL}/analyze`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept-Language': currentLang
                },
                body: JSON.stringify({ url })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || t('unknown_server_error'));
            
            state.mediaInfo = data;
            renderPreview(data);
            dom.previewSection.style.display = 'block';

        } catch (error) {
            console.error('Analysis Error:', error);
            showError(t('analysis_failed', { error: error.message }));
        } finally {
            setAnalyzingState(false);
        }
    }

    // --- HANDLER: Switch Format ---
    function handleFormatSwitch(type) {
        state.currentFormat = type;
        dom.formatTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.mediaType === type));
        dom.videoFormatsContainer.classList.toggle('active', type === 'video');
        dom.audioFormatsContainer.classList.toggle('active', type === 'audio');
        updateSizeEstimates();
    }

    // --- HANDLER: Start Download ---
    async function handleDownloadClick() {
        if (!state.mediaInfo) {
            showError(t('please_analyze_first'));
            return;
        }
        const payload = {
            url: dom.urlInput.value.trim(),
            mediaType: state.currentFormat,
            formatType: state.currentFormat === 'video' ? dom.videoFormat.value : dom.audioFormat.value,
            quality: state.currentFormat === 'video' ? dom.videoQuality.value : dom.audioQuality.value,
        };
        setDownloadingState(true);
        updateProgress(0, 'Requesting download...');

        try {
            const currentLang = localStorage.getItem('language') || 'en';
            const response = await fetch(`${API_BASE_URL}/download`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept-Language': currentLang
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok || !data.task_id) throw new Error(data.error || t('failed_to_start_download'));

            state.currentTaskId = data.task_id;
            startProgressMonitor(data.task_id);

        } catch (error) {
            console.error('Download Start Error:', error);
            showError(t('error_prefix', { error: error.message }));
            setDownloadingState(false);
        }
    }

    // --- REAL-TIME: Progress Monitoring via SSE ---
    function startProgressMonitor(taskId) {
        if (state.eventSource) state.eventSource.close();
        state.eventSource = new EventSource(`${API_BASE_URL}/stream-progress/${taskId}`);
        
        state.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.status === 'error') {
                   throw new Error(data.message);
                }
                updateProgress(data.percentage, data.message);
                if (data.status === 'complete') {
                   handleDownloadCompletion(taskId);
                }
            } catch (error) {
                console.error("SSE Message Error:", error)
                showError(t('error_prefix', { error: error.message }));
                handleDownloadTermination();
            }
        };
        
        state.eventSource.onerror = (err) => {
            console.error('SSE connection error:', err);
            showError(t('connection_lost_retrying'));
            setTimeout(() => fetchFinalStatus(taskId), 2000);
            handleDownloadTermination();
        };
    }
    
    // --- FINALIZATION ---
    function handleDownloadCompletion(taskId) {
        updateProgress(100, t('download_complete_transferring'));
        window.location.href = `${API_BASE_URL}/get-file/${taskId}`;
        setTimeout(() => setDownloadingState(false), 3000);
        handleDownloadTermination();
    }
    
    function handleDownloadTermination() {
        if (state.eventSource) {
            state.eventSource.close();
            state.eventSource = null;
        }
        state.currentTaskId = null;
    }

    async function fetchFinalStatus(taskId) {
        try {
            const response = await fetch(`${API_BASE_URL}/check-status/${taskId}`);
            const data = await response.json();
            if (data.status === 'complete') {
                handleDownloadCompletion(taskId);
            } else {
                showError(data.message || t('could_not_complete_task'));
                setDownloadingState(false);
            }
        } catch (error) {
            showError(t('could_not_retrieve_status'));
            setDownloadingState(false);
        }
    }

    // --- UI RENDERING & STATE ---
    function setAnalyzingState(isAnalyzing) {
        dom.analyzeBtn.disabled = isAnalyzing;
        dom.analyzeBtnIcon.className = isAnalyzing ? 'fas fa-spinner fa-spin' : 'fas fa-search';
        dom.analyzeBtnText.textContent = isAnalyzing ? t('analyzing') : t('analyze');
    }

    function setDownloadingState(isDownloading) {
        dom.downloadBtn.style.display = isDownloading ? 'none' : 'block';
        dom.progressContainer.style.display = isDownloading ? 'block' : 'none';
        if (!isDownloading) {
            updateProgress(0, '');
        }
    }
    
    function resetUI() {
        dom.previewSection.style.display = 'none';
        dom.thumbnailImg.src = '';
        dom.thumbnailImg.parentElement.classList.remove('fallback-active');
        state.mediaInfo = null;
        state.currentTaskId = null;
        setDownloadingState(false);
    }
    
    function renderPreview(info) {
        const thumbContainer = dom.thumbnailImg.parentElement;
        thumbContainer.classList.remove('fallback-active');
        dom.thumbnailImg.onerror = () => {
            thumbContainer.classList.add('fallback-active');
        };

        if (info.thumbnail) {
            dom.thumbnailImg.src = info.thumbnail;
        } else {
            thumbContainer.classList.add('fallback-active');
            dom.thumbnailImg.src = '';
        }

        dom.mediaTitle.textContent = info.title || t('mediaTitleDefault');
        
        const durationText = info.duration ? `${t('duration')}: ${formatDuration(info.duration)}` : `${t('duration')}: --:--`;
        dom.mediaDuration.innerHTML = `<i class="fas fa-clock"></i> ${durationText}`;

        populateQualityDropdowns(info);
        updateSizeEstimates();
    }
    
    function populateQualityDropdowns(info) {
        dom.videoQuality.innerHTML = '';
        
        const h264formats = info.video_formats?.filter(f => 
            f.vcodec?.startsWith('avc1') && f.height
        ) || [];

        let recommendedFormat = null;
        if (h264formats.length > 0) {
            recommendedFormat = h264formats.reduce((best, current) => 
                (current.height > best.height) ? current : best
            , h264formats[0]);
        }

        const allAvailableHeights = [...new Set(info.video_formats?.map(f => f.height).filter(h => h))].sort((a, b) => b - a);
        const addedValues = new Set();

        if (recommendedFormat) {
            const value = recommendedFormat.height.toString();
            const text = `${t('recommended')}: ${getQualityLabel(recommendedFormat.height)} (${t('fast')})`;
            dom.videoQuality.innerHTML += `<option value="${value}" selected>${text}</option>`;
            addedValues.add(value);
        }
        
        const bestOptionSelected = !recommendedFormat ? 'selected' : '';
        dom.videoQuality.innerHTML += `<option value="best" ${bestOptionSelected}>${t('bestQuality')} (${t('mayBeSlow')})</option>`;
        addedValues.add('best');

        allAvailableHeights.forEach(height => {
            const value = height.toString();
            if (!addedValues.has(value)) {
                dom.videoQuality.innerHTML += `<option value="${value}">${getQualityLabel(height)}</option>`;
                addedValues.add(value);
            }
        });
        
        const defaultAudioBitrates = [
            { value: '320', text: `320 kbps (${t('best')})` },
            { value: '256', text: `256 kbps (${t('high')})` },
            { value: '192', text: `192 kbps (${t('standard')})` },
            { value: '128', text: `128 kbps (${t('normal')})` },
        ];
        dom.audioQuality.innerHTML = '';
        defaultAudioBitrates.forEach(opt => {
            dom.audioQuality.innerHTML += `<option value="${opt.value}">${opt.text}</option>`;
        });
        dom.audioQuality.value = '192';
    }

    function updateProgress(percentage, message) {
        dom.progressContainer.style.display = 'block';
        const clampedPercentage = Math.min(100, Math.max(0, percentage));
        dom.progressBar.style.width = clampedPercentage + '%';
        dom.progressPercentage.textContent = Math.round(clampedPercentage) + '%';
        
        const cleanMessage = message.replace(/\[\d+(?:;\d+)*m/g, '');
        dom.progressStatus.textContent = cleanMessage;

        dom.spinner.style.display = clampedPercentage < 100 && clampedPercentage > 0 ? 'block' : 'none';
    }

    // --- UTILITY: Get Format Size ---
    function getFormatSize(format, duration, fallbackBitrate = 0) {
        if (!format && fallbackBitrate === 0) return 0;

        // First try to get direct size information
        const directSize = format?.filesize || format?.filesize_approx;
        if (directSize && directSize > 0) {
            return parseFloat(directSize);
        }
        
        // Calculate from bitrate and duration
        const bitrate = format?.tbr || format?.abr || format?.vbr || fallbackBitrate;
        if (bitrate && duration > 0) {
            return (parseFloat(bitrate) * 1000 / 8) * duration;
        }

        // Fallback estimation for formats with no size/bitrate info
        if (duration > 0) {
            // Estimate based on format type and quality
            let assumedBitrate = 192; // Default audio bitrate
            
            if (format?.vcodec) {
                // Video format - estimate based on resolution
                const height = format?.height || 360;
                if (height >= 1080) assumedBitrate = 8000; // 8 Mbps for 1080p+
                else if (height >= 720) assumedBitrate = 4000; // 4 Mbps for 720p
                else if (height >= 480) assumedBitrate = 2000; // 2 Mbps for 480p
                else assumedBitrate = 1000; // 1 Mbps for lower resolutions
            } else if (format?.acodec) {
                // Audio format - estimate based on quality
                const abr = format?.abr || 192;
                assumedBitrate = abr;
            }
            
            return (assumedBitrate * 1000 / 8) * duration;
        }
        
        return 0;
    }

    function updateSizeEstimates() {
        if (!state.mediaInfo) {
            console.log('No media info available');
            return;
        }

        const selectedMediaType = document.querySelector('.format-tab.active').dataset.mediaType;
        let estimatedSize = 0;
        let sizeEstimateEl;
        const duration = state.mediaInfo.duration || 0;

        console.log('Updating size estimates:', {
            selectedMediaType,
            duration,
            videoFormats: state.mediaInfo.video_formats?.length || 0,
            audioFormats: state.mediaInfo.audio_formats?.length || 0
        });

        if (selectedMediaType === 'video') {
            sizeEstimateEl = dom.videoSizeEstimate;
            const quality = dom.videoQuality.value;
            const videoFormats = state.mediaInfo.video_formats || [];
            const allAudioFormats = [...(state.mediaInfo.audio_formats || [])].sort((a, b) => (b.abr || 0) - (a.abr || 0));
            const bestAudio = allAudioFormats.length > 0 ? allAudioFormats[0] : null;

            console.log('Video size calculation:', {
                quality,
                videoFormatsCount: videoFormats.length,
                bestAudio: bestAudio ? { abr: bestAudio.abr, ext: bestAudio.ext } : null
            });

            if (quality === 'best') {
                const bestVideo = [...videoFormats].sort((a, b) => (b.height || 0) - (a.height || 0) || (b.tbr || 0) - (a.tbr || 0))[0];
                const videoSize = getFormatSize(bestVideo, duration);
                const audioSize = getFormatSize(bestAudio, duration);
                estimatedSize = videoSize + audioSize;
                console.log('Best quality calculation:', { videoSize, audioSize, total: estimatedSize });
            } else {
                const selectedHeight = parseInt(quality);
                // First try to find a pre-merged format (video + audio)
                const premergedFormat = videoFormats.find(f => f.height === selectedHeight && f.vcodec && f.acodec);
                if (premergedFormat) {
                    estimatedSize = getFormatSize(premergedFormat, duration);
                    console.log('Pre-merged format found:', { height: premergedFormat.height, size: estimatedSize });
                } else {
                    // Find best video for selected height
                    const bestVideoForHeight = videoFormats.filter(f => f.height === selectedHeight && f.vcodec && !f.acodec).sort((a, b) => (b.tbr || 0) - (a.tbr || 0))[0];
                    if (bestVideoForHeight) {
                        const videoSize = getFormatSize(bestVideoForHeight, duration);
                        const audioSize = getFormatSize(bestAudio, duration);
                        estimatedSize = videoSize + audioSize;
                        console.log('Separate video+audio calculation:', { videoSize, audioSize, total: estimatedSize });
                    } else {
                        // Fallback to any video format with selected height
                        const anyVideoForHeight = videoFormats.find(f => f.height === selectedHeight);
                        const videoSize = getFormatSize(anyVideoForHeight, duration);
                        const audioSize = getFormatSize(bestAudio, duration);
                        estimatedSize = videoSize + audioSize;
                        console.log('Fallback calculation:', { videoSize, audioSize, total: estimatedSize });
                    }
                }
            }
        } else { // audio
            sizeEstimateEl = dom.audioSizeEstimate;
            const quality = dom.audioQuality.value;
            const formatType = dom.audioFormat.value;
            
            console.log('Audio size calculation:', { quality, formatType });
            
            // Find best matching audio format
            const audioFormats = state.mediaInfo.audio_formats || [];
            let bestMatch = audioFormats.find(f => f.ext === formatType) || audioFormats[0];
            
            if (bestMatch) {
                estimatedSize = getFormatSize(bestMatch, duration);
                console.log('Audio format match found:', { ext: bestMatch.ext, abr: bestMatch.abr, size: estimatedSize });
            } else {
                // Fallback calculation based on quality and format
                let fallbackBitrate = parseInt(quality);
                if (formatType === 'flac' || formatType === 'wav' || formatType === 'alac') {
                    fallbackBitrate = 1000; // Average for lossless formats
                }
                
                if (duration > 0) {
                    estimatedSize = (duration * fallbackBitrate * 1000) / 8;
                    console.log('Audio fallback calculation:', { fallbackBitrate, duration, size: estimatedSize });
                }
            }
        }

        console.log('Final estimated size:', estimatedSize);

        if (estimatedSize > 0) {
            const formattedSize = formatBytes(estimatedSize);
            sizeEstimateEl.textContent = `${t('sizeEstimateDefault').replace('--', formattedSize)}`;
            sizeEstimateEl.style.display = 'block';
            console.log('Size estimate updated:', formattedSize);
        } else {
            sizeEstimateEl.style.display = 'none';
            console.log('No size estimate available');
        }
    }
    
    // --- UTILITY FUNCTIONS ---
    function showError(message) {
        alert(message);
    }
    const formatDuration = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2, '0')}`;
    const formatViews = (n) => n > 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n > 1000 ? `${(n/1000).toFixed(1)}K` : n.toString();
    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes'
        const k = 1024
        const dm = decimals < 0 ? 0 : decimals
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
    }
    const getQualityLabel = (h) => {
        if (h >= 3840) return `4K UHD (${h}p)`;
        if (h >= 2160) return `4K UHD (${h}p)`;
        if (h >= 1440) return `2K QHD (${h}p)`;
        if (h >= 1080) return `Full HD (${h}p)`;
        if (h >= 720) return `HD (${h}p)`;
        return `${h}p`;
    };
});
