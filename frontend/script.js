// DOM이 완전히 로드된 후 한 번만 초기화
function initializeApp() {
    // --- FEATURE FLAGS CHECK ---
    // Social Media 기능 비활성화 처리
    if (window.FEATURES && !window.FEATURES.SOCIAL_MEDIA) {
        const socialBtn = document.getElementById('socialCategoryBtn');
        const socialSection = document.getElementById('socialMediaSection');
        if (socialBtn) socialBtn.style.display = 'none';
        if (socialSection) socialSection.style.display = 'none';
    }

    // --- STATE MANAGEMENT ---
    let state = {
        files: [],
        currentFileIndex: -1,
        conversions: new Map(),
        eventSources: new Map(),
        batchFiles: null
    };

    // --- CONFIGURATION ---
    // 클라이언트 사이드 변환 모드 (브라우저에서 직접 변환)
    const CLIENT_SIDE_MODE = true;
    
    // API endpoints for converter service
    // Local development: http://localhost:8787
    // Cloudflare deployment: https://converter-workers.your-subdomain.workers.dev
    const API_BASE_URL = 'http://localhost:8787';

    // Supported file formats by category
    const FORMATS = {
        video: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', '3gp', 'm4v', 'mpg', 'mpeg', 'ogv'],
        audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'aiff', 'au', 'ra', 'amr', 'ac3'],
        image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tga', 'ico', 'psd', 'raw'],
        document: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'rtf', 'odt', 'ods', 'odp'],
        archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tar.gz', 'tar.bz2', 'tar.xz'],
        social: ['youtube', 'facebook', 'instagram', 'tiktok', 'twitter', 'vimeo', 'twitch', 'dailymotion', 'reddit', 'soundcloud', 'spotify', 'linkedin']
    };

    // Feature flag: social media 비활성화 처리
    if (window.FEATURES && !window.FEATURES.SOCIAL_MEDIA) {
        delete FORMATS.social;
    }

    // Cross-category conversion compatibility matrix
    // 크로스 카테고리 변환 호환성 매트릭스
    const CROSS_CATEGORY_COMPATIBILITY = {
        // IMAGE ↔ DOCUMENT (12.3M+ 월간 검색량)
        image: {
            allowedCategories: ['image', 'document'], // 이미지는 문서 카테고리로도 변환 가능
            formatRestrictions: {
                // 이미지 → PDF만 가능 (다른 문서 형식은 불가)
                document: ['pdf']
            }
        },
        document: {
            allowedCategories: ['document', 'image'], // 문서는 이미지 카테고리로도 변환 가능
            formatRestrictions: {
                // PDF → 이미지만 가능 (다른 문서는 이미지로 변환 불가)
                image: {
                    sourceFormats: ['pdf'], // PDF만 이미지로 변환 가능
                    targetFormats: ['jpg', 'jpeg', 'png'] // JPG, PNG만 지원
                }
            }
        },
        // VIDEO ↔ AUDIO (8M+ 월간 검색량)
        video: {
            allowedCategories: ['video', 'audio', 'image'], // 비디오는 오디오, 이미지로도 변환 가능
            formatRestrictions: {
                audio: null, // 모든 비디오 형식 → 모든 오디오 형식 가능
                image: ['gif'] // 비디오 → GIF만 가능
            }
        },
        audio: {
            allowedCategories: ['audio', 'video'], // 오디오는 비디오로도 변환 가능
            formatRestrictions: {
                video: null // 모든 오디오 형식 → 모든 비디오 형식 가능 (오디오 트랙으로)
            }
        },
        // ARCHIVE는 크로스 카테고리 없음
        archive: {
            allowedCategories: ['archive'],
            formatRestrictions: {}
        }
    };

    // Advanced settings by format type - 원본 품질 기준 설정
    const ADVANCED_SETTINGS = {
        video: {
            quality: { label: 'Quality', type: 'select', options: ['original', 'high', 'medium', 'low'], default: 'original' },
            resolution: { label: 'Resolution', type: 'select', options: ['original', '1080p', '720p', '480p', '360p'], default: 'original' },
            codec: { label: 'Codec', type: 'select', options: ['original', 'h264', 'h265', 'vp9', 'av1'], default: 'original' },
            bitrate: { label: 'Bitrate (%)', type: 'number', min: 50, max: 200, default: 100 }
        },
        audio: {
            quality: { label: 'Quality', type: 'select', options: ['original', 'high', 'medium', 'low'], default: 'original' },
            bitrate: { label: 'Bitrate (%)', type: 'number', min: 50, max: 200, default: 100 },
            sampleRate: { label: 'Sample Rate', type: 'select', options: ['original', '44100', '48000', '96000'], default: 'original' },
            channels: { label: 'Channels', type: 'select', options: ['original', 'mono', 'stereo'], default: 'original' }
        },
        image: {
            quality: { label: 'Quality (%)', type: 'number', min: 1, max: 100, default: 100 },
            resize: { label: 'Resize', type: 'select', options: ['original', '50%', '75%', '125%', '150%'], default: 'original' },
            compression: { label: 'Compression', type: 'select', options: ['none', 'low', 'medium', 'high'], default: 'none' },
            dpi: { label: 'DPI', type: 'select', options: ['original', '72', '150', '300'], default: 'original' }
        },
        document: {
            quality: { label: 'Quality', type: 'select', options: ['original', 'high', 'medium', 'low'], default: 'original' },
            pageRange: { label: 'Page Range', type: 'text', placeholder: 'e.g., 1-5, 7, 9-12' }
        },
        social: {
            quality: { label: 'Quality', type: 'select', options: ['best', 'high', 'medium', 'low'], default: 'best' },
            format: { label: 'Format', type: 'select', options: ['mp4', 'mp3', 'webm', 'm4a'], default: 'mp4' },
            resolution: { label: 'Resolution', type: 'select', options: ['best', '1080p', '720p', '480p', '360p'], default: 'best' },
            subtitles: { label: 'Include Subtitles', type: 'select', options: ['no', 'yes'], default: 'no' }
        }
    };

    // Feature flag: social media advanced settings 비활성화 처리
    if (window.FEATURES && !window.FEATURES.SOCIAL_MEDIA) {
        delete ADVANCED_SETTINGS.social;
    }

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

    // 햄버거 메뉴 이벤트 리스너
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    if (hamburgerMenu && mobileMenuOverlay) {
        hamburgerMenu.addEventListener('click', toggleMobileMenu);

        // document 전체에서 클릭 감지하여 메뉴 바깥 클릭 시 닫기
        document.addEventListener('click', (e) => {
            // 메뉴가 열려있고, 햄버거 버튼도 아니고, 메뉴 박스 바깥 클릭인 경우
            if (mobileMenuOverlay.classList.contains('show') &&
                !e.target.closest('#hamburgerMenu') &&
                !e.target.closest('.mobile-menu-box')) {
                closeMobileMenu();
            }
        });

        // 모바일 메뉴 링크 클릭 시 메뉴 닫기
        document.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                // 기존 네비게이션 로직 사용
                document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(l => l.classList.remove('active'));
                document.querySelectorAll(`[data-section="${section}"]`).forEach(l => l.classList.add('active'));
                closeMobileMenu();
            });
        });

        // 모바일 토글 버튼 이벤트 리스너
        const mobileThemeToggleBtn = document.getElementById('mobileThemeToggleBtn');
        const mobileLanguageSelectorBtn = document.getElementById('mobileLanguageSelectorBtn');
        const mobileLanguageOptions = document.getElementById('mobileLanguageOptions');

        if (mobileThemeToggleBtn) {
            mobileThemeToggleBtn.addEventListener('click', handleThemeToggle);
        }

        if (mobileLanguageSelectorBtn && mobileLanguageOptions) {
            mobileLanguageSelectorBtn.addEventListener('click', () => {
                mobileLanguageOptions.classList.toggle('show');
            });

            mobileLanguageOptions.addEventListener('click', async (e) => {
                if (e.target.dataset.lang) {
                    e.preventDefault(); // Prevent default <a> tag behavior
                    const lang = e.target.dataset.lang;

                    // Close mobile language selector
                    mobileLanguageOptions.classList.remove('show');

                    // Update URL with new language (this will navigate)
                    i18n.updateURLWithLanguage(lang);

                    // If updateURLWithLanguage didn't navigate (stayed on same page),
                    // change language without reload
                    if (window.location.pathname === window.location.pathname) {
                        await i18n.changeLanguage(lang);
                        document.getElementById('mobileCurrentLanguage').textContent = e.target.textContent;
                    }
                }
            });
        }
    }

    // File upload listeners - 모바일에서는 버튼만, 데스크톱에서는 전체 영역 클릭 가능
    function triggerFileInput(e) {
        // 버튼 클릭은 별도 이벤트 리스너에서 처리하므로 여기서는 제외
        if (e.target.closest('#uploadBtn')) {
            return;
        }

        // 모바일 디바이스 체크
        const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (!isMobile) {
            // 데스크톱에서만 업로드 영역 클릭으로 파일 입력창 열기
            e.preventDefault();
            e.stopPropagation();
            dom.fileInput.click();
        }
        // 모바일에서는 아무것도 하지 않음 (드래그앤드롭만 허용)
    }

    dom.uploadZone.addEventListener('click', triggerFileInput);
    dom.uploadZone.addEventListener('touchend', triggerFileInput);
    dom.uploadZone.addEventListener('dragover', handleDragOver);
    dom.uploadZone.addEventListener('dragleave', handleDragLeave);
    dom.uploadZone.addEventListener('drop', handleFileDrop);
    dom.fileInput.addEventListener('change', handleFileSelect);

    // Upload button toggle functionality
    dom.uploadBtn.addEventListener('click', (e) => {
        // collapsed 상태에서 클릭하면 패널 확장만 하고 파일 선택 방지
        if (dom.uploadZone.classList.contains('collapsed')) {
            e.preventDefault();
            e.stopPropagation();
            dom.uploadZone.classList.remove('collapsed');
            // fileInput도 클릭 방지
            dom.fileInput.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
            };
            // 다음 클릭에서는 정상 작동하도록 복구
            setTimeout(() => {
                dom.fileInput.onclick = null;
            }, 100);
        }
        // expanded 상태에서는 정상적으로 파일 선택
    });

    // File list actions
    dom.clearAllBtn.addEventListener('click', clearAllFiles);
    if (dom.convertAllBtn) {
        console.log('Convert All 버튼 이벤트 리스너 연결됨');
        dom.convertAllBtn.addEventListener('click', (e) => {
            console.log('Convert All 버튼 클릭됨!', e);
            convertAllFiles();
        });
    } else {
        console.error('Convert All 버튼을 찾을 수 없음');
    }

    // 확장 버튼 이벤트 리스너
    document.querySelectorAll('.expand-formats-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = btn.getAttribute('data-category');
            const formatGroup = btn.closest('.format-group');
            const extendedFormats = document.querySelector(`.format-badges-extended.${category}-extended`);

            if (extendedFormats && formatGroup) {
                const isExpanded = formatGroup.classList.contains('expanded');

                if (isExpanded) {
                    // 숨기기
                    formatGroup.classList.remove('expanded');
                    btn.classList.remove('expanded');
                } else {
                    // 보이기
                    formatGroup.classList.add('expanded');
                    btn.classList.add('expanded');

                    // scrollIntoView 제거 - 브라우저 먹통 방지
                    // 사용자가 필요시 직접 스크롤 가능
                }
            }
        });
    });

    // Site Map 확장 버튼 이벤트 리스너
    const sitemapExpandBtn = document.getElementById('sitemapExpandBtn');
    const categoryIconBtns = document.querySelectorAll('.category-icon-btn');

    if (sitemapExpandBtn) {
        sitemapExpandBtn.addEventListener('click', () => {
            const isExpanded = sitemapExpandBtn.classList.contains('expanded');
            let activeCategory = document.querySelector('.conversion-category.active');

            if (isExpanded) {
                // 숨기기
                sitemapExpandBtn.classList.remove('expanded');
                if (activeCategory) {
                    activeCategory.classList.remove('show-badges');
                }
            } else {
                // 보이기
                sitemapExpandBtn.classList.add('expanded');

                // 활성 카테고리가 없으면 첫 번째 카테고리를 자동 선택
                if (!activeCategory) {
                    const firstIconBtn = categoryIconBtns[0];
                    const firstCategory = document.querySelector('.conversion-category');

                    if (firstIconBtn && firstCategory) {
                        firstIconBtn.classList.add('active');
                        firstCategory.classList.add('active');
                        activeCategory = firstCategory;
                    }
                }

                if (activeCategory) {
                    activeCategory.classList.add('show-badges');
                }
            }
        });
    }

    // 카테고리 아이콘 버튼 클릭 시 배지 표시 상태 유지
    categoryIconBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            const isExpanded = sitemapExpandBtn && sitemapExpandBtn.classList.contains('expanded');

            // +버튼이 아직 펼쳐지지 않았으면 자동으로 펼치기
            if (!isExpanded && sitemapExpandBtn) {
                sitemapExpandBtn.click();
            }

            // 모든 카테고리 아이콘 버튼에서 active 제거
            categoryIconBtns.forEach(b => b.classList.remove('active'));
            // 클릭한 버튼에 active 추가
            btn.classList.add('active');

            // 모든 카테고리에서 active와 show-badges 제거
            const allCategories = document.querySelectorAll('.conversion-category');
            allCategories.forEach(cat => {
                cat.classList.remove('active');
                cat.classList.remove('show-badges');
            });

            // 클릭한 카테고리를 active로 설정
            const targetCategory = document.querySelector(`.conversion-category[data-category="${category}"]`);
            if (targetCategory) {
                targetCategory.classList.add('active');

                // +버튼이 펼쳐진 상태이므로 배지 표시
                targetCategory.classList.add('show-badges');
            }
        });
    });

    // Modal listeners
    dom.modalCloseBtn.addEventListener('click', closeModal);
    dom.conversionModal.addEventListener('click', (e) => {
        if (e.target === dom.conversionModal) closeModal();
    });
    
    // Format selection listeners
    dom.formatCategories.forEach(category => {
        const categoryType = category.dataset.category;
        category.addEventListener('click', () => handleCategorySelect(categoryType));
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

    // 햄버거 메뉴 토글 함수들
    function toggleMobileMenu() {
        const hamburgerMenu = document.getElementById('hamburgerMenu');
        const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

        hamburgerMenu.classList.toggle('active');
        mobileMenuOverlay.classList.toggle('show');

        // 모바일 메뉴가 열릴 때 토글 버튼들 강제 표시
        if (mobileMenuOverlay.classList.contains('show')) {
            const mobileControls = document.querySelector('.mobile-menu-controls');
            const mobileControlItems = document.querySelectorAll('.mobile-control-item');
            const mobileThemeBtn = document.getElementById('mobileThemeToggleBtn');
            const mobileLangBtn = document.getElementById('mobileLanguageSelectorBtn');

            if (mobileControls) {
                mobileControls.style.display = 'block';
                mobileControls.style.visibility = 'visible';
                mobileControls.style.opacity = '1';
            }

            mobileControlItems.forEach(item => {
                item.style.display = 'flex';
                item.style.visibility = 'visible';
                item.style.opacity = '1';
            });

            if (mobileThemeBtn) {
                mobileThemeBtn.style.display = 'flex';
                mobileThemeBtn.style.visibility = 'visible';
                mobileThemeBtn.style.opacity = '1';
            }

            if (mobileLangBtn) {
                mobileLangBtn.style.display = 'flex';
                mobileLangBtn.style.visibility = 'visible';
                mobileLangBtn.style.opacity = '1';
            }
        }
    }

    function closeMobileMenu() {
        const hamburgerMenu = document.getElementById('hamburgerMenu');
        const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

        hamburgerMenu.classList.remove('active');
        mobileMenuOverlay.classList.remove('show');
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
            const extension = getFileExtension(file.name);
            const category = detectFileCategory(extension);
            const recommendedFormats = getRecommendedFormats(extension, category);

            const fileObj = {
                id: generateId(),
                file: file,
                name: file.name,
                size: file.size,
                type: file.type,
                extension: extension,
                category: category,
                recommendedFormats: recommendedFormats,
                status: 'ready',
                progress: 0,
                outputFormat: null,
                settings: {}
            };

            // URL 라우터 프리셋 변환 설정 자동 적용
            const presetFrom = sessionStorage.getItem('preset_from_format');
            const presetTo = sessionStorage.getItem('preset_to_format');
            if (presetFrom && presetTo && extension.toUpperCase() === presetFrom) {
                fileObj.outputFormat = presetTo;
                console.log(`URLRouter: Auto-set output format to ${presetTo} for ${file.name}`);
            }

            state.files.push(fileObj);
        });

        updateFileList();
        showFileListSection();
        showAdBanner(); // 파일 업로드 시 배너 표시
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
                ${fileObj.status === 'completed' ? `
                    <button class="download-btn" onclick="downloadConvertedFile(findFileById('${fileObj.id}'))">
                        <i class="fas fa-download"></i>
                        <span>Download</span>
                    </button>
                ` : ''}
                <button class="convert-btn ${fileObj.status === 'completed' ? 'reconvert' : ''}" onclick="openConversionModal('${fileObj.id}')" ${fileObj.status === 'converting' || fileObj.status === 'uploading' ? 'disabled' : ''}>
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
        // 파일이 추가되면 업로드 패널 축소
        dom.uploadZone.classList.add('collapsed');
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
            // 파일이 모두 제거되면 업로드 패널 확장
            dom.uploadZone.classList.remove('collapsed');
            hideAdBanner(); // 모든 파일 제거 시 배너 숨김
        }
    }

    function convertAllFiles() {
        console.log('convertAllFiles 호출됨');
        console.log('전체 파일 목록:', state.files.map(f => ({ name: f.name, status: f.status })));

        // 변환 중이 아닌 모든 파일을 변환 대상으로 포함 (ready, completed, error 상태)
        const availableFiles = state.files.filter(f => f.status !== 'converting');
        console.log('변환 가능한 파일:', availableFiles.length, availableFiles.map(f => f.name));

        if (availableFiles.length === 0) {
            showToast('변환할 수 있는 파일이 없습니다', 'warning');
            return;
        }

        // Open conversion modal for multiple files
        if (availableFiles.length === 1) {
            console.log('단일 파일 모드로 변환 모달 열기');
            openConversionModal(availableFiles[0].id);
        } else {
            console.log('배치 모드로 변환 모달 열기');
            openBatchConversionModal(availableFiles);
        }
    }

    function findFileById(fileId) {
        return state.files.find(f => f.id === fileId);
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
            // 파일이 모두 제거되면 업로드 패널 확장
            dom.uploadZone.classList.remove('collapsed');
            hideAdBanner(); // 파일이 모두 제거되면 배너 숨김
        }

        showToast(`Removed "${fileObj.name}"`, 'success');
    }

    function openConversionModal(fileId) {
        const fileObj = state.files.find(f => f.id === fileId);
        if (!fileObj) return;

        state.currentFileIndex = state.files.indexOf(fileObj);

        // Show single file preview, hide multiple files preview
        const singleFilePreview = document.getElementById('singleFilePreview');
        const multipleFilesPreview = document.getElementById('multipleFilesPreview');

        if (singleFilePreview) {
            singleFilePreview.style.display = 'flex';
        }
        if (multipleFilesPreview) {
            multipleFilesPreview.style.display = 'none';
        }

        // Update modal with file info
        dom.fileIcon.className = `${getFileIcon(fileObj.extension)}`;
        dom.fileName.textContent = fileObj.name;
        dom.fileSize.textContent = formatFileSize(fileObj.size);

        // Set initial category based on file type (더 정확한 감지 사용)
        const initialCategory = fileObj.category || detectFileCategory(fileObj.extension);

        // 파일 카테고리에 따라 허용되는 변환 카테고리 필터링
        filterAvailableCategories(initialCategory);

        handleCategorySelect(initialCategory, fileObj.recommendedFormats);

        // Show modal
        dom.conversionModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function openBatchConversionModal(files) {
        console.log('openBatchConversionModal 호출됨, 파일 수:', files.length);

        // Hide single file preview since we're in batch mode
        const singleFilePreview = document.getElementById('singleFilePreview');
        if (singleFilePreview) {
            singleFilePreview.style.display = 'none';
        }

        // Set initial category based on first file's type
        const firstFileCategory = files.length > 0 ? detectFileCategory(files[0].extension) : 'document';
        console.log('첫 번째 파일 카테고리:', firstFileCategory);

        // 파일 카테고리에 따라 허용되는 변환 카테고리 필터링
        filterAvailableCategories(firstFileCategory);

        handleCategorySelect(firstFileCategory);

        // Store files for batch conversion
        state.batchFiles = files;
        state.currentFileIndex = -1; // Indicate batch mode
        console.log('state.batchFiles 설정됨:', state.batchFiles.length);

        // Show modal
        dom.conversionModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        dom.conversionModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        state.currentFileIndex = -1;
        state.batchFiles = null;
    }

    // 파일 카테고리에 따라 허용되는 변환 카테고리 필터링
    function filterAvailableCategories(fileCategory) {
        // 크로스 카테고리 호환성 매트릭스 사용
        const compatibility = CROSS_CATEGORY_COMPATIBILITY[fileCategory];
        const allowed = compatibility ? compatibility.allowedCategories : [fileCategory];

        // 모든 카테고리 버튼 처리
        dom.formatCategories.forEach(cat => {
            const category = cat.dataset.category;
            const isAllowed = allowed.includes(category);

            if (isAllowed) {
                cat.classList.remove('disabled');
                cat.style.pointerEvents = 'auto';
                cat.style.opacity = '1';
            } else {
                cat.classList.add('disabled');
                cat.style.pointerEvents = 'none';
                cat.style.opacity = '0.3';
            }
        });
    }

    function handleCategorySelect(category, recommendedFormats = []) {
        // Update active category
        dom.formatCategories.forEach(cat => {
            cat.classList.toggle('active', cat.dataset.category === category);
        });

        // 현재 파일 정보 가져오기 (크로스 카테고리 제한 확인용)
        let sourceFileObj = null;
        let sourceCategory = category;
        let sourceExtension = '';

        if (state.currentFileIndex >= 0) {
            sourceFileObj = state.files[state.currentFileIndex];
            sourceCategory = sourceFileObj.category;
            sourceExtension = sourceFileObj.extension.toLowerCase();
        } else if (state.batchFiles && state.batchFiles.length > 0) {
            sourceFileObj = state.batchFiles[0];
            sourceCategory = sourceFileObj.category;
            sourceExtension = sourceFileObj.extension.toLowerCase();
        }

        // Populate format options - 단순한 그리드 형태로
        const formats = FORMATS[category] || [];
        dom.formatOptions.innerHTML = '';

        const formatGrid = document.createElement('div');
        formatGrid.className = 'format-grid';

        formats.forEach(format => {
            const option = document.createElement('div');
            option.className = `format-badge ${category}`; // 카테고리별 색상 적용
            option.textContent = format.toUpperCase();
            option.dataset.format = format;

            // 크로스 카테고리 변환인 경우 제한 사항 확인
            let isRestricted = false;
            if (sourceCategory !== category && sourceCategory) {
                isRestricted = !isFormatAllowedForConversion(sourceCategory, sourceExtension, category, format);
            }

            if (isRestricted) {
                option.classList.add('disabled');
                option.style.opacity = '0.4';
                option.style.pointerEvents = 'none';
                option.style.cursor = 'not-allowed';
                option.title = 'This conversion is not supported';
            } else {
                option.addEventListener('click', () => selectFormat(format, category));
            }

            formatGrid.appendChild(option);
        });

        dom.formatOptions.appendChild(formatGrid);
    }

    // 크로스 카테고리 변환 가능 여부 확인
    function isFormatAllowedForConversion(sourceCategory, sourceExtension, targetCategory, targetFormat) {
        // 같은 카테고리 내 변환은 항상 허용
        if (sourceCategory === targetCategory) {
            return true;
        }

        // 크로스 카테고리 호환성 확인
        const compatibility = CROSS_CATEGORY_COMPATIBILITY[sourceCategory];
        if (!compatibility) {
            return false;
        }

        // 타겟 카테고리가 허용되는지 확인
        if (!compatibility.allowedCategories.includes(targetCategory)) {
            return false;
        }

        // 형식 제한 확인
        const restrictions = compatibility.formatRestrictions[targetCategory];

        // 제한이 없으면 모두 허용
        if (restrictions === null || restrictions === undefined) {
            return true;
        }

        // 배열 형식 제한 (타겟 형식만 제한)
        if (Array.isArray(restrictions)) {
            return restrictions.includes(targetFormat);
        }

        // 객체 형식 제한 (소스 + 타겟 모두 제한)
        if (restrictions.sourceFormats && restrictions.targetFormats) {
            const sourceAllowed = restrictions.sourceFormats.includes(sourceExtension);
            const targetAllowed = restrictions.targetFormats.includes(targetFormat);
            return sourceAllowed && targetAllowed;
        }

        return true;
    }

    function selectFormat(format, category) {
        // Update visual selection
        dom.formatOptions.querySelectorAll('.format-badge').forEach(opt => {
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
        console.log('startConversion 호출됨');
        console.log('state.currentFileIndex:', state.currentFileIndex);
        console.log('state.batchFiles:', state.batchFiles);

        // Check if this is batch mode
        if (state.currentFileIndex < 0 && state.batchFiles) {
            console.log('배치 모드로 변환 시작');
            return startBatchConversion();
        }

        if (state.currentFileIndex < 0) {
            console.log('currentFileIndex가 -1이므로 리턴');
            return;
        }

        const fileObj = state.files[state.currentFileIndex];
        console.log('단일 파일 변환:', fileObj?.name);
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

        // 모달 닫기
        closeModal();

        // 모달 닫힌 후 Vignette 광고 실행 (중복 방지)
        if (!document.querySelector('script[data-zone="10017255"]')) {
            try {
                // 광고 스크립트 직접 실행
                const adScript = document.createElement('script');
                adScript.dataset.zone = '10017255';
                adScript.src = 'https://groleegni.net/vignette.min.js';
                const targetElement = [document.documentElement, document.body].filter(Boolean).pop();
                targetElement.appendChild(adScript);
                console.log('Vignette 광고 로드 시작');
            } catch (error) {
                console.error('Vignette 광고 로드 실패:', error);
            }
        }

        // 광고 표시 후 짧은 지연 후 변환 시작
        setTimeout(() => {
            startFileConversion(fileObj);
        }, 1000);
    }

    function startBatchConversion() {
        console.log('startBatchConversion 호출됨');
        const selectedFormat = document.querySelector('.conversion-format-badge.selected');
        console.log('선택된 형식:', selectedFormat?.dataset?.format);

        if (!selectedFormat) {
            console.log('선택된 형식이 없음');
            showToast('Please select an output format', 'error');
            return;
        }

        // Check if batch files exist
        console.log('state.batchFiles 확인:', state.batchFiles);
        if (!state.batchFiles || !Array.isArray(state.batchFiles) || state.batchFiles.length === 0) {
            console.log('배치 파일이 없음');
            showToast('No files available for batch conversion', 'error');
            return;
        }

        const outputFormat = selectedFormat.dataset.format;
        console.log('변환할 형식:', outputFormat);

        // Collect advanced settings
        const settings = {};
        const settingsElements = dom.settingsGrid.querySelectorAll('input, select');
        settingsElements.forEach(element => {
            const key = element.id.replace('setting-', '');
            settings[key] = element.value;
        });

        // Apply format and settings to all batch files
        state.batchFiles.forEach(file => {
            file.outputFormat = outputFormat;
            file.settings = { ...settings };
        });

        // Store batch files before closing modal
        const batchFilesToConvert = [...state.batchFiles];
        console.log('배치 변환 시작 전 파일 수:', batchFilesToConvert.length);

        // 모달 닫기
        closeModal();

        // 모달 닫힌 후 Vignette 광고 실행 (중복 방지)
        if (!document.querySelector('script[data-zone="10017255"]')) {
            try {
                // 광고 스크립트 직접 실행
                const adScript = document.createElement('script');
                adScript.dataset.zone = '10017255';
                adScript.src = 'https://groleegni.net/vignette.min.js';
                const targetElement = [document.documentElement, document.body].filter(Boolean).pop();
                targetElement.appendChild(adScript);
                console.log('Vignette 광고 로드 시작 (배치 모드)');
            } catch (error) {
                console.error('Vignette 광고 로드 실패:', error);
            }
        }

        // 광고 표시 후 짧은 지연 후 배치 변환 시작
        setTimeout(() => {
            startBatchFileConversions(batchFilesToConvert);
        }, 1000);
    }

    async function startBatchFileConversions(files) {
        if (!files || !Array.isArray(files) || files.length === 0) {
            showToast('No files to convert', 'error');
            return;
        }

        showToast(`Starting conversion of ${files.length} files`, 'info');

        let completedCount = 0;
        let failedCount = 0;

        for (const file of files) {
            try {
                await startFileConversion(file);
                completedCount++;
                // Add small delay between conversions
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`Failed to convert ${file.name}:`, error);
                failedCount++;
            }
        }

        // 배치 변환 완료 후 모든 파일 다운로드
        const convertedFiles = files.filter(file => file.status === 'completed');

        if (convertedFiles.length > 0) {
            showToast(`배치 변환 완료! ${completedCount}개 파일 다운로드 시작... (실패: ${failedCount}개)`, 'success');

            // 모든 완료된 파일을 순차적으로 다운로드
            for (let i = 0; i < convertedFiles.length; i++) {
                const file = convertedFiles[i];
                setTimeout(() => {
                    downloadConvertedFile(file);
                }, i * 800); // 800ms 간격으로 다운로드
            }
        } else {
            showToast(`배치 변환 실패: ${failedCount}개 파일 모두 실패`, 'error');
        }
    }

    // 백엔드가 필요한 파일 형식들 정의
    const SERVER_SIDE_FORMATS = {
        input: ['psd', 'ai', 'sketch', 'fig', 'raw', 'cr2', 'nef', 'arw', 'dng'],
        output: ['psd', 'ai', 'indd', 'eps'],
        document: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx']
    };

    // 파일이 서버 사이드 변환이 필요한지 확인
    function needsServerSideConversion(fileObj) {
        const inputExt = fileObj.extension.toLowerCase();
        const outputExt = fileObj.outputFormat.toLowerCase();

        // 입력 파일이 복잡한 형식이거나 출력 형식이 복잡한 경우
        return SERVER_SIDE_FORMATS.input.includes(inputExt) ||
               SERVER_SIDE_FORMATS.output.includes(outputExt) ||
               (SERVER_SIDE_FORMATS.document.includes(inputExt) &&
                SERVER_SIDE_FORMATS.document.includes(outputExt));
    }

    async function startFileConversion(fileObj) {
        fileObj.status = 'uploading';
        fileObj.progress = 0;
        updateFileItem(fileObj);

        try {
            // 하이브리드 모드: 파일 형식에 따라 클라이언트/서버 결정
            if (CLIENT_SIDE_MODE && !needsServerSideConversion(fileObj)) {
                console.log(`클라이언트 사이드 변환: ${fileObj.name} → ${fileObj.outputFormat}`);
                await clientSideConversion(fileObj);
            } else {
                console.log(`서버 사이드 변환: ${fileObj.name} → ${fileObj.outputFormat}`);
                await serverSideConversion(fileObj);
            }
        } catch (error) {
            console.error('Conversion Error:', error);
            fileObj.status = 'error';
            fileObj.progress = 0;
            updateFileItem(fileObj);
            showToast(`Error converting "${fileObj.name}": ${error.message}`, 'error');
        }
    }

    // 클라이언트 사이드 변환 함수
    async function clientSideConversion(fileObj) {
        try {
            fileObj.status = 'converting';
            updateFileItem(fileObj);

            // 변환 엔진 확인
            if (!window.converterEngine) {
                throw new Error('변환 엔진을 로드할 수 없습니다');
            }

            // 진행률 콜백 설정
            const progressCallback = (progress, message) => {
                fileObj.progress = Math.round(progress);
                fileObj.status = progress < 100 ? 'converting' : 'completed';
                updateFileItem(fileObj);
                console.log(`변환 진행: ${progress}% - ${message}`);
            };

            // 변환 실행
            fileObj.status = 'converting';
            fileObj.progress = 0;
            updateFileItem(fileObj);
            
            const blob = await window.converterEngine.convert(
                fileObj.file,
                fileObj.outputFormat,
                fileObj.settings,
                progressCallback
            );

            // 다운로드 링크 생성
            const url = URL.createObjectURL(blob);
            const fileName = fileObj.file.name.replace(/\.[^/.]+$/, '') + '.' + fileObj.outputFormat;
            
            fileObj.downloadUrl = url;
            fileObj.outputFileName = fileName;
            fileObj.status = 'completed';
            fileObj.progress = 100;
            updateFileItem(fileObj);

            // 단일 파일 변환 완료
            if (state.batchFiles && state.batchFiles.length > 1) {
                // 배치 모드에서는 개별 다운로드 안함
                showToast(`변환 완료! "${fileName}"`, 'success');
            } else {
                // 단일 파일 모드에서는 자동 다운로드
                showToast(`변환 완료! "${fileName}" 자동 다운로드 시작...`, 'success');
                setTimeout(() => downloadConvertedFile(fileObj), 500);
            }

        } catch (error) {
            throw error;
        }
    }

    // 서버 사이드 변환 함수 (기존 코드)
    async function serverSideConversion(fileObj) {
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
            throw error;
        }
    }

    // 변환된 파일 다운로드
    function downloadConvertedFile(fileObj) {
        if (!fileObj.downloadUrl) return;
        
        const a = document.createElement('a');
        a.href = fileObj.downloadUrl;
        a.download = fileObj.outputFileName || 'converted.' + fileObj.outputFormat;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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

            // 변환 중이거나 업로드 중일 때만 버튼 비활성화
            // 완료된 파일은 재변환 가능하도록 활성화 상태 유지
            convertBtn.disabled = (fileObj.status === 'converting' || fileObj.status === 'uploading');

            // 버튼 텍스트 동적 변경
            const buttonText = convertBtn.querySelector('span');
            buttonText.textContent = 'Convert';
            if (fileObj.status === 'completed') {
                convertBtn.classList.add('reconvert');
            } else {
                convertBtn.classList.remove('reconvert');
            }
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
        return 'document';
    }

    // 파일 카테고리 감지 (더 정확한 버전)
    function detectFileCategory(extension) {
        const categories = {
            image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico', 'heic', 'raw', 'psd'],
            video: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', '3gp', 'ogv'],
            audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus'],
            document: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'pages', 'tex'],
            archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']
        };

        for (const [category, formats] of Object.entries(categories)) {
            if (formats.includes(extension.toLowerCase())) {
                return category;
            }
        }
        return 'document'; // 기본값
    }

    // 추천 변환 형식 생성
    function getRecommendedFormats(extension, category) {
        const recommendations = {
            image: {
                png: ['jpg', 'webp', 'pdf', 'svg'],
                jpg: ['png', 'webp', 'pdf', 'gif'],
                jpeg: ['png', 'webp', 'pdf', 'gif'],
                gif: ['mp4', 'webp', 'png', 'jpg'],
                webp: ['jpg', 'png', 'gif'],
                svg: ['png', 'jpg', 'pdf'],
                bmp: ['jpg', 'png', 'webp'],
                tiff: ['jpg', 'png', 'pdf'],
                heic: ['jpg', 'png', 'webp'],
                psd: ['png', 'jpg', 'pdf'],
                raw: ['jpg', 'png', 'tiff']
            },
            video: {
                mp4: ['avi', 'mov', 'webm', 'gif'],
                avi: ['mp4', 'mov', 'webm'],
                mov: ['mp4', 'avi', 'webm'],
                mkv: ['mp4', 'avi', 'webm'],
                webm: ['mp4', 'avi', 'gif'],
                flv: ['mp4', 'avi', 'webm']
            },
            audio: {
                mp3: ['wav', 'flac', 'aac', 'ogg'],
                wav: ['mp3', 'flac', 'aac'],
                flac: ['mp3', 'wav', 'aac'],
                aac: ['mp3', 'wav', 'ogg'],
                ogg: ['mp3', 'wav', 'aac'],
                m4a: ['mp3', 'wav', 'aac']
            },
            document: {
                pdf: ['word', 'txt', 'jpg', 'png'],
                doc: ['pdf', 'docx', 'txt'],
                docx: ['pdf', 'doc', 'txt'],
                txt: ['pdf', 'doc', 'docx']
            }
        };

        const categoryRecs = recommendations[category];
        if (categoryRecs && categoryRecs[extension.toLowerCase()]) {
            return categoryRecs[extension.toLowerCase()];
        }

        // 기본 추천
        const defaultRecs = {
            image: ['jpg', 'png', 'webp', 'pdf'],
            video: ['mp4', 'webm', 'gif'],
            audio: ['mp3', 'wav', 'aac'],
            document: ['pdf', 'docx', 'txt']
        };

        return defaultRecs[category] || ['pdf', 'jpg', 'txt'];
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
                uploadSubText: 'Support for 300+ file formats',
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

    // ===== CLOUD STORAGE INTEGRATION =====

    // Dropbox integration
    function initializeDropbox() {
        const dropboxBtn = document.getElementById('dropboxBtn');
        if (dropboxBtn) {
            dropboxBtn.addEventListener('click', () => {
                if (typeof Dropbox !== 'undefined') {
                    Dropbox.choose({
                        success: function(files) {
                            files.forEach(file => {
                                // Convert Dropbox file to File object
                                fetch(file.link)
                                    .then(response => response.blob())
                                    .then(blob => {
                                        const fileObj = new File([blob], file.name, { type: blob.type });
                                        processFiles([fileObj]);
                                        showToast(`${file.name} loaded from Dropbox`, 'success');
                                    })
                                    .catch(error => {
                                        console.error('Error loading from Dropbox:', error);
                                        showToast('Failed to load file from Dropbox', 'error');
                                    });
                            });
                        },
                        cancel: function() {
                            console.log('Dropbox selection cancelled');
                        },
                        linkType: "direct",
                        multiselect: true,
                        extensions: Object.values(FORMATS).flat()
                    });
                } else {
                    showToast('Dropbox API is not configured. Please add your Dropbox app key.', 'info');
                }
            });
        }
    }

    // Google Drive integration
    function initializeGoogleDrive() {
        // Get API keys from localStorage or use defaults
        const CLIENT_ID = localStorage.getItem('googleDriveClientId') || 'YOUR_GOOGLE_CLIENT_ID';
        const API_KEY = localStorage.getItem('googleDriveApiKey') || 'YOUR_GOOGLE_API_KEY';

        // Skip initialization if API keys are not configured
        if (CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID' || API_KEY === 'YOUR_GOOGLE_API_KEY') {
            const gdriveBtn = document.getElementById('gdriveBtn');
            if (gdriveBtn) {
                gdriveBtn.disabled = false;
                gdriveBtn.title = 'Click to configure Google Drive API';
                gdriveBtn.addEventListener('click', () => {
                    showGoogleDriveSetupModal();
                });
            }
            return;
        }

        const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
        const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

        let tokenClient;
        let gapiInited = false;
        let gisInited = false;

        function gapiLoaded() {
            gapi.load('client', async () => {
                await gapi.client.init({
                    apiKey: API_KEY,
                    discoveryDocs: [DISCOVERY_DOC],
                });
                gapiInited = true;
                maybeEnableButtons();
            });
        }

        function gisLoaded() {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '', // defined later
            });
            gisInited = true;
            maybeEnableButtons();
        }

        function maybeEnableButtons() {
            if (gapiInited && gisInited) {
                const gdriveBtn = document.getElementById('gdriveBtn');
                if (gdriveBtn) {
                    gdriveBtn.disabled = false;
                }
            }
        }

        async function handleGoogleDriveAuth() {
            tokenClient.callback = async (resp) => {
                if (resp.error !== undefined) {
                    throw (resp);
                }
                await showGoogleDrivePicker();
            };

            if (gapi.client.getToken() === null) {
                tokenClient.requestAccessToken({prompt: 'consent'});
            } else {
                tokenClient.requestAccessToken({prompt: ''});
            }
        }

        async function showGoogleDrivePicker() {
            try {
                const response = await gapi.client.drive.files.list({
                    pageSize: 10,
                    fields: 'nextPageToken, files(id, name, mimeType, size)',
                });

                const files = response.result.files;
                if (files && files.length > 0) {
                    // Simple file selection (in a real implementation, you'd show a proper picker)
                    const selectedFile = files[0]; // For demo, just pick the first file
                    await downloadFromGoogleDrive(selectedFile.id, selectedFile.name);
                } else {
                    showToast('No files found in Google Drive', 'info');
                }
            } catch (error) {
                console.error('Error listing Google Drive files:', error);
                showToast('Failed to access Google Drive', 'error');
            }
        }

        async function downloadFromGoogleDrive(fileId, fileName) {
            try {
                const response = await gapi.client.drive.files.get({
                    fileId: fileId,
                    alt: 'media'
                });

                // Convert response to blob and create File object
                const blob = new Blob([response.body]);
                const fileObj = new File([blob], fileName, { type: blob.type });
                processFiles([fileObj]);
                showToast(`${fileName} loaded from Google Drive`, 'success');
            } catch (error) {
                console.error('Error downloading from Google Drive:', error);
                showToast('Failed to download file from Google Drive', 'error');
            }
        }

        // Initialize Google Drive
        const gdriveBtn = document.getElementById('gdriveBtn');
        if (gdriveBtn) {
            gdriveBtn.disabled = true; // Initially disabled until APIs are loaded
            gdriveBtn.addEventListener('click', handleGoogleDriveAuth);
        }

        // Load Google APIs
        if (typeof gapi !== 'undefined') {
            gapiLoaded();
        }
        if (typeof google !== 'undefined') {
            gisLoaded();
        }
    }

    // Google Drive API Setup Modal
    function showGoogleDriveSetupModal() {
        const modalHTML = `
            <div class="modal-overlay" id="apiSetupModal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2>Google Drive API 설정</h2>
                        <button class="modal-close" onclick="document.getElementById('apiSetupModal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom: 1.5rem; color: #666;">
                            Google Drive에서 파일을 가져오려면 API 키가 필요합니다.
                        </p>

                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                                Google API Key
                            </label>
                            <input type="text" id="googleApiKeyInput"
                                   placeholder="AIzaSyBkXXXXXXXXXXXXXXXXXXXXXXXX"
                                   style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9rem;"
                                   value="${localStorage.getItem('googleDriveApiKey') || ''}">
                        </div>

                        <div style="margin-bottom: 1.5rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                                Google Client ID
                            </label>
                            <input type="text" id="googleClientIdInput"
                                   placeholder="1084326875199-xxxxx.apps.googleusercontent.com"
                                   style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9rem;"
                                   value="${localStorage.getItem('googleDriveClientId') || ''}">
                        </div>

                        <details style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                            <summary style="cursor: pointer; font-weight: 500; margin-bottom: 1rem;">
                                📖 API 키 발급 방법
                            </summary>
                            <ol style="margin-left: 1.5rem; line-height: 1.8;">
                                <li><a href="https://console.cloud.google.com/" target="_blank" style="color: #2563EB;">Google Cloud Console</a> 접속</li>
                                <li>프로젝트 생성 또는 선택</li>
                                <li>"APIs & Services → Library" 이동</li>
                                <li>"Google Drive API" 및 "Google Picker API" 활성화</li>
                                <li>"Credentials" 탭에서:
                                    <ul style="margin-left: 1rem; margin-top: 0.5rem;">
                                        <li>"API key" 생성 (첫 번째 입력란)</li>
                                        <li>"OAuth client ID" 생성 (두 번째 입력란)</li>
                                    </ul>
                                </li>
                                <li>Authorized JavaScript origins에 <code>https://converter.hqmx.net</code> 추가</li>
                            </ol>
                        </details>

                        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                            <button onclick="document.getElementById('apiSetupModal').remove()"
                                    style="padding: 0.75rem 1.5rem; border: 1px solid #ddd; background: white; border-radius: 8px; cursor: pointer;">
                                취소
                            </button>
                            <button onclick="saveGoogleDriveApiKeys()"
                                    style="padding: 0.75rem 1.5rem; background: linear-gradient(45deg, #2563EB, #3b82f6); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                                저장 및 활성화
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Close on overlay click
        document.getElementById('apiSetupModal').addEventListener('click', (e) => {
            if (e.target.id === 'apiSetupModal') {
                e.target.remove();
            }
        });
    }

    // Save Google Drive API Keys
    window.saveGoogleDriveApiKeys = function() {
        const apiKey = document.getElementById('googleApiKeyInput').value.trim();
        const clientId = document.getElementById('googleClientIdInput').value.trim();

        if (!apiKey || !clientId) {
            showToast('API Key와 Client ID를 모두 입력해주세요.', 'error');
            return;
        }

        localStorage.setItem('googleDriveApiKey', apiKey);
        localStorage.setItem('googleDriveClientId', clientId);

        document.getElementById('apiSetupModal').remove();
        showToast('Google Drive API가 설정되었습니다. 페이지를 새로고침해주세요.', 'success');

        setTimeout(() => {
            location.reload();
        }, 2000);
    };

    // Dropbox is always available (using Chooser API which doesn't need app key for basic usage)
    // But we can add a settings option if needed

    // Initialize cloud storage integrations
    initializeDropbox();
    initializeGoogleDrive();

    // ========================================
    // Supported Conversions - Expand/Collapse 기능
    // ========================================
    function initializeSupportedConversions() {
        const categoryHeaders = document.querySelectorAll('.category-header');

        categoryHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const container = this.nextElementSibling;
                const isExpanded = this.classList.contains('expanded');

                // Toggle expanded state
                if (isExpanded) {
                    this.classList.remove('expanded');
                    container.classList.remove('show');
                    container.style.display = 'none';
                } else {
                    this.classList.add('expanded');
                    container.style.display = 'block';
                    // Small delay for smooth animation
                    setTimeout(() => {
                        container.classList.add('show');
                    }, 10);
                }
            });
        });
    }

    // Initialize Supported Conversions if section exists
    if (document.querySelector('.supported-conversions')) {
        initializeSupportedConversions();
    }

    // 스크롤 시 헤더 blur 효과
    const topNav = document.querySelector('.top-nav');

    function handleScroll() {
        if (window.scrollY > 0) {
            topNav.classList.add('scrolled');
        } else {
            topNav.classList.remove('scrolled');
        }
    }

    // 초기 상태 확인
    handleScroll();

    // 스크롤 이벤트 리스너 추가
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Category icon navigation
    initializeCategoryTabs();

    // Show more buttons for conversion badges
    initializeShowMoreButtons();
}

// Category tabs functionality
function initializeCategoryTabs() {
    const categoryButtons = document.querySelectorAll('.category-icon-btn');
    const categories = document.querySelectorAll('.conversion-category');

    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetCategory = button.getAttribute('data-category');

            // Remove active class from all buttons
            categoryButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            button.classList.add('active');

            // Hide all categories
            categories.forEach(cat => cat.classList.remove('active'));

            // Show target category
            const targetCat = document.querySelector(`.conversion-category[data-category="${targetCategory}"]`);
            if (targetCat) {
                targetCat.classList.add('active');
            }
        });
    });
}

// Show More functionality for conversion badges
function initializeShowMoreButtons() {
    const subcategories = document.querySelectorAll('.conversion-subcategory');

    subcategories.forEach(subcategory => {
        const badgeContainer = subcategory.querySelector('.conversion-badges');
        if (!badgeContainer) return;

        const badges = Array.from(badgeContainer.querySelectorAll('.conversion-badge'));

        // Determine visible limit based on screen size
        const getVisibleLimit = () => {
            if (window.innerWidth >= 1024) {
                return 32; // 8 columns × 4 rows
            } else {
                return 24; // 3 columns × 8 rows
            }
        };

        const limit = getVisibleLimit();

        // Only add show more button if there are more badges than the limit
        if (badges.length > limit) {
            // Hide badges beyond the limit
            badges.forEach((badge, index) => {
                if (index >= limit) {
                    badge.classList.add('hidden');
                }
            });

            // Create show more button
            const showMoreBtn = document.createElement('button');
            showMoreBtn.className = 'show-more-conversions-btn';
            showMoreBtn.textContent = '+';
            showMoreBtn.setAttribute('aria-label', 'Show more conversions');

            // Insert button after the badge container
            badgeContainer.insertAdjacentElement('afterend', showMoreBtn);

            // Toggle hidden badges on button click
            showMoreBtn.addEventListener('click', () => {
                const isExpanded = showMoreBtn.classList.contains('expanded');

                badges.forEach((badge, index) => {
                    if (index >= limit) {
                        if (isExpanded) {
                            badge.classList.add('hidden');
                        } else {
                            badge.classList.remove('hidden');
                        }
                    }
                });

                showMoreBtn.classList.toggle('expanded');
                showMoreBtn.textContent = isExpanded ? '+' : '×';
            });
        }
    });
}

// Adsterra Banner 표시/숨김 함수
function showAdBanner() {
    const banner = document.getElementById('adsterra-banner-728x90');
    if (banner) {
        banner.style.display = 'flex';
        console.log('Adsterra 배너 표시');
    }
}

function hideAdBanner() {
    const banner = document.getElementById('adsterra-banner-728x90');
    if (banner) {
        banner.style.display = 'none';
        console.log('Adsterra 배너 숨김');
    }
}

// DOM이 완전히 로드된 후 한 번만 초기화 실행
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}