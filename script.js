document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let state = {
        files: [],
        currentFileIndex: -1,
        conversions: new Map(),
        eventSources: new Map()
    };

    // --- CONFIGURATION ---
    // API endpoints for converter service
    // Local development: http://localhost:5001
    // Cloudflare deployment: https://converter-workers.your-subdomain.workers.dev
    const API_BASE_URL = 'http://localhost:5001';

    // Supported file formats by category
    const FORMATS = {
        popular: ['pdf', 'jpg', 'png', 'mp4', 'mp3', 'docx', 'zip'],
        video: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', '3gp', 'm4v', 'mpg', 'mpeg', 'ogv'],
        audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'aiff', 'au', 'ra', 'amr', 'ac3'],
        image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tga', 'ico', 'psd', 'raw'],
        document: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'rtf', 'odt', 'ods', 'odp'],
        archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tar.gz', 'tar.bz2', 'tar.xz']
    };

    // Advanced settings by format type
    const ADVANCED_SETTINGS = {
        video: {
            quality: { label: 'Quality', type: 'select', options: ['high', 'medium', 'low'], default: 'high' },
            resolution: { label: 'Resolution', type: 'select', options: ['original', '1080p', '720p', '480p', '360p'], default: 'original' },
            codec: { label: 'Codec', type: 'select', options: ['h264', 'h265', 'vp9', 'av1'], default: 'h264' },
            bitrate: { label: 'Bitrate (kbps)', type: 'number', min: 100, max: 50000, default: 2000 }
        },
        audio: {
            quality: { label: 'Quality', type: 'select', options: ['high', 'medium', 'low'], default: 'high' },
            bitrate: { label: 'Bitrate (kbps)', type: 'number', min: 32, max: 320, default: 192 },
            sampleRate: { label: 'Sample Rate', type: 'select', options: ['44100', '48000', '96000'], default: '44100' },
            channels: { label: 'Channels', type: 'select', options: ['mono', 'stereo'], default: 'stereo' }
        },
        image: {
            quality: { label: 'Quality (%)', type: 'number', min: 1, max: 100, default: 85 },
            resize: { label: 'Resize', type: 'select', options: ['none', '50%', '75%', '125%', '150%'], default: 'none' },
            dpi: { label: 'DPI', type: 'number', min: 72, max: 300, default: 72 }
        },
        document: {
            quality: { label: 'Quality', type: 'select', options: ['high', 'medium', 'low'], default: 'high' },
            pageRange: { label: 'Page Range', type: 'text', placeholder: 'e.g., 1-5, 7, 9-12' }
        }
    };

    // --- DOM ELEMENT CACHE ---
    const dom = {
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        languageSelectorBtn: document.getElementById('language-selector-btn'),
        languageOptions: document.getElementById('language-options'),
        uploadZone: document.getElementById('uploadZone'),
        fileInput: document.getElementById('fileInput'),
        uploadBtn: document.getElementById('uploadBtn'),
        fileListSection: document.getElementById('fileListSection'),
        fileList: document.getElementById('fileList'),
        clearAllBtn: document.getElementById('clearAllBtn'),
        convertAllBtn: document.getElementById('convertAllBtn'),
        conversionModal: document.getElementById('conversionModal'),
        modalCloseBtn: document.getElementById('modalCloseBtn'),
        fileIcon: document.getElementById('fileIcon'),
        fileName: document.getElementById('fileName'),
        fileSize: document.getElementById('fileSize'),
        formatCategories: document.querySelectorAll('.format-category'),
        formatOptions: document.getElementById('formatOptions'),
        advancedSettings: document.getElementById('advancedSettings'),
        settingsGrid: document.getElementById('settingsGrid'),
        advancedToggle: document.getElementById('advancedToggle'),
        startConversionBtn: document.getElementById('startConversionBtn')
    };

    // --- THEME MANAGEMENT ---
    const currentTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.body.setAttribute('data-theme', currentTheme);

    // --- EVENT LISTENERS ---
    dom.themeToggleBtn.addEventListener('click', handleThemeToggle);
    dom.languageSelectorBtn.addEventListener('click', toggleLanguageOptions);
    dom.languageOptions.addEventListener('click', handleLanguageChange);
    
    // File upload listeners
    dom.uploadZone.addEventListener('click', () => dom.fileInput.click());
    dom.uploadZone.addEventListener('dragover', handleDragOver);
    dom.uploadZone.addEventListener('dragleave', handleDragLeave);
    dom.uploadZone.addEventListener('drop', handleFileDrop);
    dom.fileInput.addEventListener('change', handleFileSelect);
    dom.uploadBtn.addEventListener('click', () => dom.fileInput.click());
    
    // File list actions
    dom.clearAllBtn.addEventListener('click', clearAllFiles);
    dom.convertAllBtn.addEventListener('click', convertAllFiles);
    
    // Modal listeners
    dom.modalCloseBtn.addEventListener('click', closeModal);
    dom.conversionModal.addEventListener('click', (e) => {
        if (e.target === dom.conversionModal) closeModal();
    });
    
    // Format selection listeners
    dom.formatCategories.forEach(category => {
        category.addEventListener('click', () => handleCategorySelect(category.dataset.category));
    });
    
    dom.advancedToggle.addEventListener('click', toggleAdvancedSettings);
    dom.startConversionBtn.addEventListener('click', startConversion);

    // Global listeners
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // --- HANDLER FUNCTIONS ---
    
    function handleThemeToggle() {
        const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    function toggleLanguageOptions() {
        const switcher = dom.languageSelectorBtn.parentElement;
        switcher.classList.toggle('open');
    }

    function handleLanguageChange(e) {
        if (e.target.dataset.lang) {
            const lang = e.target.dataset.lang;
            const langName = e.target.textContent;
            
            localStorage.setItem('language', lang);
            document.getElementById('current-language').textContent = langName;
            
            // Close language options
            dom.languageSelectorBtn.parentElement.classList.remove('open');
            
            // Update page language
            updatePageLanguage(lang);
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        dom.uploadZone.classList.add('dragover');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        if (!dom.uploadZone.contains(e.relatedTarget)) {
            dom.uploadZone.classList.remove('dragover');
        }
    }

    function handleFileDrop(e) {
        e.preventDefault();
        dom.uploadZone.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        addFiles(files);
    }

    function handleFileSelect(e) {
        const files = Array.from(e.target.files);
        addFiles(files);
        e.target.value = ''; // Clear input for reuse
    }

    function addFiles(files) {
        files.forEach(file => {
            // Validate file size (100MB limit for free tier)
            if (file.size > 100 * 1024 * 1024) {
                showToast(`File "${file.name}" exceeds 100MB limit`, 'error');
                return;
            }

            // Check if file already exists
            const existingFile = state.files.find(f => f.name === file.name && f.size === file.size);
            if (existingFile) {
                showToast(`File "${file.name}" already added`, 'warning');
                return;
            }

            // Add file to state
            const fileObj = {
                id: generateId(),
                file: file,
                name: file.name,
                size: file.size,
                type: file.type,
                extension: getFileExtension(file.name),
                status: 'ready',
                progress: 0,
                outputFormat: null,
                settings: {}
            };

            state.files.push(fileObj);
        });

        updateFileList();
        showFileListSection();
    }

    function updateFileList() {
        dom.fileList.innerHTML = '';
        
        state.files.forEach(fileObj => {
            const fileItem = createFileItem(fileObj);
            dom.fileList.appendChild(fileItem);
        });
    }

    function createFileItem(fileObj) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.dataset.fileId = fileObj.id;

        item.innerHTML = `
            <i class="file-icon ${getFileIcon(fileObj.extension)}"></i>
            <div class="file-info">
                <div class="file-name">${fileObj.name}</div>
                <div class="file-size">${formatFileSize(fileObj.size)}</div>
                <div class="file-progress" style="${fileObj.status === 'ready' ? 'display: none' : ''}">
                    <div class="progress-fill" style="width: ${fileObj.progress}%"></div>
                </div>
                <div class="file-status" style="${fileObj.status === 'ready' ? 'display: none' : ''}">${getStatusText(fileObj.status)}</div>
            </div>
            <div class="file-actions">
                <button class="convert-btn" onclick="openConversionModal('${fileObj.id}')" ${fileObj.status !== 'ready' ? 'disabled' : ''}>
                    <i class="fas fa-magic"></i>
                    <span>Convert</span>
                </button>
                <button class="remove-btn" onclick="removeFile('${fileObj.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        return item;
    }

    function showFileListSection() {
        dom.fileListSection.style.display = 'block';
    }

    function clearAllFiles() {
        if (confirm(t('confirmClearAll') || 'Are you sure you want to remove all files?')) {
            // Cancel any ongoing conversions
            state.eventSources.forEach(source => source.close());
            state.eventSources.clear();
            state.conversions.clear();
            
            state.files = [];
            updateFileList();
            dom.fileListSection.style.display = 'none';
        }
    }

    function convertAllFiles() {
        const readyFiles = state.files.filter(f => f.status === 'ready');
        if (readyFiles.length === 0) {
            showToast('No files ready for conversion', 'warning');
            return;
        }

        // For batch conversion, we'll open modal for the first file
        // and use default popular formats for others
        readyFiles.forEach((fileObj, index) => {
            if (index === 0) {
                openConversionModal(fileObj.id);
            } else {
                // Auto-assign popular format based on file type
                const suggestedFormat = getSuggestedFormat(fileObj.extension);
                fileObj.outputFormat = suggestedFormat;
                // Start conversion with default settings
                setTimeout(() => startFileConversion(fileObj), index * 1000);
            }
        });
    }

    function removeFile(fileId) {
        const index = state.files.findIndex(f => f.id === fileId);
        if (index === -1) return;

        const fileObj = state.files[index];
        
        // Cancel conversion if in progress
        if (state.eventSources.has(fileId)) {
            state.eventSources.get(fileId).close();
            state.eventSources.delete(fileId);
        }
        
        // Remove from state
        state.files.splice(index, 1);
        updateFileList();

        // Hide file list section if no files
        if (state.files.length === 0) {
            dom.fileListSection.style.display = 'none';
        }

        showToast(`Removed "${fileObj.name}"`, 'success');
    }

    function openConversionModal(fileId) {
        const fileObj = state.files.find(f => f.id === fileId);
        if (!fileObj) return;

        state.currentFileIndex = state.files.indexOf(fileObj);
        
        // Update modal with file info
        dom.fileIcon.className = `${getFileIcon(fileObj.extension)}`;
        dom.fileName.textContent = fileObj.name;
        dom.fileSize.textContent = formatFileSize(fileObj.size);

        // Set initial category based on file type
        const initialCategory = getCategoryFromExtension(fileObj.extension);
        handleCategorySelect(initialCategory);

        // Show modal
        dom.conversionModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        dom.conversionModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        state.currentFileIndex = -1;
    }

    function handleCategorySelect(category) {
        // Update active category
        dom.formatCategories.forEach(cat => {
            cat.classList.toggle('active', cat.dataset.category === category);
        });

        // Populate format options
        const formats = FORMATS[category] || [];
        dom.formatOptions.innerHTML = '';

        formats.forEach(format => {
            const option = document.createElement('div');
            option.className = 'format-option';
            option.textContent = format.toUpperCase();
            option.dataset.format = format;
            option.addEventListener('click', () => selectFormat(format, category));
            dom.formatOptions.appendChild(option);
        });
    }

    function selectFormat(format, category) {
        // Update visual selection
        dom.formatOptions.querySelectorAll('.format-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.format === format);
        });

        // Update file object
        if (state.currentFileIndex >= 0) {
            const fileObj = state.files[state.currentFileIndex];
            fileObj.outputFormat = format;
            fileObj.category = category;
        }

        // Show/hide advanced settings based on format type
        updateAdvancedSettings(category, format);
    }

    function updateAdvancedSettings(category, format) {
        const settings = ADVANCED_SETTINGS[category];
        if (!settings) {
            dom.advancedSettings.style.display = 'none';
            return;
        }

        dom.settingsGrid.innerHTML = '';
        
        Object.entries(settings).forEach(([key, config]) => {
            const settingItem = document.createElement('div');
            settingItem.className = 'setting-item';
            
            let input = '';
            if (config.type === 'select') {
                const options = config.options.map(opt => 
                    `<option value="${opt}" ${opt === config.default ? 'selected' : ''}>${opt}</option>`
                ).join('');
                input = `<select id="setting-${key}">${options}</select>`;
            } else if (config.type === 'number') {
                input = `<input type="number" id="setting-${key}" min="${config.min || 0}" max="${config.max || 999999}" value="${config.default || 0}">`;
            } else {
                input = `<input type="text" id="setting-${key}" placeholder="${config.placeholder || ''}" value="${config.default || ''}">`;
            }

            settingItem.innerHTML = `
                <label for="setting-${key}">${config.label}</label>
                ${input}
            `;

            dom.settingsGrid.appendChild(settingItem);
        });
    }

    function toggleAdvancedSettings() {
        const isVisible = dom.advancedSettings.style.display !== 'none';
        dom.advancedSettings.style.display = isVisible ? 'none' : 'block';
        
        const icon = dom.advancedToggle.querySelector('i');
        icon.className = isVisible ? 'fas fa-cog' : 'fas fa-times';
    }

    function startConversion() {
        if (state.currentFileIndex < 0) return;

        const fileObj = state.files[state.currentFileIndex];
        if (!fileObj.outputFormat) {
            showToast('Please select an output format', 'error');
            return;
        }

        // Collect advanced settings
        const settingsElements = dom.settingsGrid.querySelectorAll('input, select');
        settingsElements.forEach(element => {
            const key = element.id.replace('setting-', '');
            fileObj.settings[key] = element.value;
        });

        closeModal();
        startFileConversion(fileObj);
    }

    async function startFileConversion(fileObj) {
        fileObj.status = 'uploading';
        fileObj.progress = 0;
        updateFileItem(fileObj);

        try {
            // Create FormData
            const formData = new FormData();
            formData.append('file', fileObj.file);
            formData.append('outputFormat', fileObj.outputFormat);
            formData.append('settings', JSON.stringify(fileObj.settings));

            // Start conversion
            const response = await fetch(`${API_BASE_URL}/convert`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Conversion failed');
            }

            // Start progress monitoring
            startProgressMonitor(fileObj.id, data.task_id);

        } catch (error) {
            console.error('Conversion Error:', error);
            fileObj.status = 'error';
            fileObj.progress = 0;
            updateFileItem(fileObj);
            showToast(`Error converting "${fileObj.name}": ${error.message}`, 'error');
        }
    }

    function startProgressMonitor(fileId, taskId) {
        if (state.eventSources.has(fileId)) {
            state.eventSources.get(fileId).close();
        }

        const eventSource = new EventSource(`${API_BASE_URL}/stream-progress/${taskId}`);
        state.eventSources.set(fileId, eventSource);
        state.conversions.set(fileId, taskId);

        const fileObj = state.files.find(f => f.id === fileId);
        if (!fileObj) return;

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                fileObj.progress = data.percentage || 0;
                fileObj.status = data.status || 'processing';
                
                updateFileItem(fileObj);

                if (data.status === 'completed') {
                    handleConversionComplete(fileId, taskId);
                } else if (data.status === 'error') {
                    throw new Error(data.message || 'Conversion failed');
                }
            } catch (error) {
                console.error('Progress Monitor Error:', error);
                fileObj.status = 'error';
                updateFileItem(fileObj);
                showToast(`Error processing "${fileObj.name}": ${error.message}`, 'error');
                cleanupConversion(fileId);
            }
        };

        eventSource.onerror = (error) => {
            console.error('SSE Error:', error);
            fileObj.status = 'error';
            updateFileItem(fileObj);
            showToast(`Connection lost for "${fileObj.name}"`, 'error');
            cleanupConversion(fileId);
        };
    }

    function handleConversionComplete(fileId, taskId) {
        const fileObj = state.files.find(f => f.id === fileId);
        if (!fileObj) return;

        fileObj.status = 'completed';
        fileObj.progress = 100;
        updateFileItem(fileObj);

        // Start download
        const downloadUrl = `${API_BASE_URL}/download/${taskId}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = getOutputFilename(fileObj.name, fileObj.outputFormat);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(`"${fileObj.name}" converted successfully!`, 'success');
        cleanupConversion(fileId);
    }

    function cleanupConversion(fileId) {
        if (state.eventSources.has(fileId)) {
            state.eventSources.get(fileId).close();
            state.eventSources.delete(fileId);
        }
        state.conversions.delete(fileId);
    }

    function updateFileItem(fileObj) {
        const fileItem = document.querySelector(`[data-file-id="${fileObj.id}"]`);
        if (!fileItem) return;

        const progressElement = fileItem.querySelector('.file-progress');
        const statusElement = fileItem.querySelector('.file-status');
        const progressFill = fileItem.querySelector('.progress-fill');
        const convertBtn = fileItem.querySelector('.convert-btn');

        if (fileObj.status === 'ready') {
            progressElement.style.display = 'none';
            statusElement.style.display = 'none';
            convertBtn.disabled = false;
        } else {
            progressElement.style.display = 'block';
            statusElement.style.display = 'block';
            statusElement.textContent = getStatusText(fileObj.status);
            progressFill.style.width = `${fileObj.progress}%`;
            convertBtn.disabled = true;
        }
    }

    // --- UTILITY FUNCTIONS ---
    
    function generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    function getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    function getFileIcon(extension) {
        const iconMap = {
            // Video
            mp4: 'fas fa-file-video', avi: 'fas fa-file-video', mov: 'fas fa-file-video',
            mkv: 'fas fa-file-video', webm: 'fas fa-file-video', flv: 'fas fa-file-video',
            
            // Audio
            mp3: 'fas fa-file-audio', wav: 'fas fa-file-audio', flac: 'fas fa-file-audio',
            aac: 'fas fa-file-audio', ogg: 'fas fa-file-audio', m4a: 'fas fa-file-audio',
            
            // Image
            jpg: 'fas fa-file-image', jpeg: 'fas fa-file-image', png: 'fas fa-file-image',
            gif: 'fas fa-file-image', webp: 'fas fa-file-image', svg: 'fas fa-file-image',
            
            // Document
            pdf: 'fas fa-file-pdf', doc: 'fas fa-file-word', docx: 'fas fa-file-word',
            ppt: 'fas fa-file-powerpoint', pptx: 'fas fa-file-powerpoint',
            xls: 'fas fa-file-excel', xlsx: 'fas fa-file-excel', txt: 'fas fa-file-alt',
            
            // Archive
            zip: 'fas fa-file-archive', rar: 'fas fa-file-archive', '7z': 'fas fa-file-archive'
        };
        
        return iconMap[extension] || 'fas fa-file';
    }

    function getCategoryFromExtension(extension) {
        for (const [category, formats] of Object.entries(FORMATS)) {
            if (formats.includes(extension)) {
                return category;
            }
        }
        return 'popular';
    }

    function getSuggestedFormat(extension) {
        const suggestions = {
            // Video to MP4
            avi: 'mp4', mov: 'mp4', mkv: 'mp4', webm: 'mp4', flv: 'mp4',
            // Audio to MP3
            wav: 'mp3', flac: 'mp3', aac: 'mp3', ogg: 'mp3', m4a: 'mp3',
            // Image to JPG
            png: 'jpg', gif: 'jpg', webp: 'jpg', bmp: 'jpg', tiff: 'jpg',
            // Document to PDF
            doc: 'pdf', docx: 'pdf', ppt: 'pdf', pptx: 'pdf', xls: 'pdf', xlsx: 'pdf'
        };
        
        return suggestions[extension] || 'pdf';
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function getStatusText(status) {
        const statusMap = {
            uploading: 'Uploading...',
            processing: 'Processing...',
            converting: 'Converting...',
            completed: 'Completed',
            error: 'Error',
            ready: 'Ready'
        };
        return statusMap[status] || status;
    }

    function getOutputFilename(originalName, outputFormat) {
        const baseName = originalName.replace(/\.[^/.]+$/, '');
        return `${baseName}.${outputFormat}`;
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    function updatePageLanguage(lang) {
        // This would integrate with i18n system
        // For now, just store the preference
        console.log('Language updated to:', lang);
    }

    // Simple translation function (to be replaced with proper i18n)
    function t(key, params = {}) {
        const translations = {
            en: {
                confirmClearAll: 'Are you sure you want to remove all files?',
                uploadMainText: 'Drop files here or click to upload',
                uploadSubText: 'Support for 300+ file formats • Max file size: 100MB',
                selectFiles: 'Select Files'
            }
        };
        
        const currentLang = localStorage.getItem('language') || 'en';
        const translation = translations[currentLang]?.[key] || key;
        
        // Simple parameter replacement
        return Object.keys(params).reduce((str, param) => {
            return str.replace(`{${param}}`, params[param]);
        }, translation);
    }

    // Make functions available globally for onclick handlers
    window.openConversionModal = openConversionModal;
    window.removeFile = removeFile;

    // Initialize language
    const savedLang = localStorage.getItem('language') || 'en';
    if (savedLang !== 'en') {
        updatePageLanguage(savedLang);
    }
});