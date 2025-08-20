// 300+ 지원 형식 데이터베이스
// 실제 FFmpeg와 ImageMagick에서 지원하는 형식들을 포함

export const FILE_FORMATS = {
  // 이미지 형식들 (60+ formats)
  image: {
    name: 'Images',
    icon: '🖼️',
    formats: [
      // 일반 이미지 형식
      { ext: 'jpg', name: 'JPEG', desc: 'Joint Photographic Experts Group', popular: true },
      { ext: 'jpeg', name: 'JPEG', desc: 'Joint Photographic Experts Group', popular: true },
      { ext: 'png', name: 'PNG', desc: 'Portable Network Graphics', popular: true },
      { ext: 'gif', name: 'GIF', desc: 'Graphics Interchange Format', popular: true },
      { ext: 'webp', name: 'WebP', desc: 'Google WebP Format', popular: true },
      { ext: 'bmp', name: 'BMP', desc: 'Bitmap Image File', popular: true },
      { ext: 'svg', name: 'SVG', desc: 'Scalable Vector Graphics', popular: true },
      { ext: 'ico', name: 'ICO', desc: 'Icon File', popular: true },
      
      // TIFF 변형들
      { ext: 'tiff', name: 'TIFF', desc: 'Tagged Image File Format', popular: true },
      { ext: 'tif', name: 'TIF', desc: 'Tagged Image File Format' },
      
      // RAW 형식들
      { ext: 'raw', name: 'RAW', desc: 'Raw Image Data' },
      { ext: 'cr2', name: 'CR2', desc: 'Canon Raw Version 2' },
      { ext: 'nef', name: 'NEF', desc: 'Nikon Electronic Format' },
      { ext: 'arw', name: 'ARW', desc: 'Sony Alpha Raw' },
      { ext: 'dng', name: 'DNG', desc: 'Digital Negative' },
      { ext: 'orf', name: 'ORF', desc: 'Olympus Raw Format' },
      { ext: 'rw2', name: 'RW2', desc: 'Panasonic Raw' },
      { ext: 'pef', name: 'PEF', desc: 'Pentax Electronic File' },
      { ext: 'raf', name: 'RAF', desc: 'Fuji Raw Format' },
      { ext: 'x3f', name: 'X3F', desc: 'Sigma Raw Format' },
      
      // 전문 이미지 형식들
      { ext: 'psd', name: 'PSD', desc: 'Adobe Photoshop Document' },
      { ext: 'ai', name: 'AI', desc: 'Adobe Illustrator' },
      { ext: 'eps', name: 'EPS', desc: 'Encapsulated PostScript' },
      { ext: 'ps', name: 'PS', desc: 'PostScript' },
      { ext: 'pdf', name: 'PDF', desc: 'Portable Document Format' },
      
      // 웹 이미지 형식들
      { ext: 'avif', name: 'AVIF', desc: 'AV1 Image File Format' },
      { ext: 'heic', name: 'HEIC', desc: 'High Efficiency Image Container' },
      { ext: 'heif', name: 'HEIF', desc: 'High Efficiency Image Format' },
      { ext: 'jp2', name: 'JP2', desc: 'JPEG 2000' },
      { ext: 'jpx', name: 'JPX', desc: 'JPEG 2000 Extended' },
      { ext: 'jxr', name: 'JXR', desc: 'JPEG XR' },
      
      // 기타 형식들
      { ext: 'pcx', name: 'PCX', desc: 'Paintbrush' },
      { ext: 'tga', name: 'TGA', desc: 'Truevision TGA' },
      { ext: 'wbmp', name: 'WBMP', desc: 'Wireless Bitmap' },
      { ext: 'xbm', name: 'XBM', desc: 'X11 Bitmap' },
      { ext: 'xpm', name: 'XPM', desc: 'X11 Pixmap' },
      { ext: 'pbm', name: 'PBM', desc: 'Portable Bitmap' },
      { ext: 'pgm', name: 'PGM', desc: 'Portable Graymap' },
      { ext: 'ppm', name: 'PPM', desc: 'Portable Pixmap' },
      { ext: 'pnm', name: 'PNM', desc: 'Portable Anymap' },
      { ext: 'pfm', name: 'PFM', desc: 'Portable Float Map' },
      { ext: 'pam', name: 'PAM', desc: 'Portable Arbitrary Map' },
      { ext: 'sgi', name: 'SGI', desc: 'Silicon Graphics Image' },
      { ext: 'ras', name: 'RAS', desc: 'Sun Raster' },
      { ext: 'sun', name: 'SUN', desc: 'Sun Raster Image' },
      { ext: 'im1', name: 'IM1', desc: 'ERDAS Imagine' },
      { ext: 'im8', name: 'IM8', desc: 'ERDAS Imagine' },
      { ext: 'im24', name: 'IM24', desc: 'ERDAS Imagine' },
      { ext: 'im32', name: 'IM32', desc: 'ERDAS Imagine' },
      { ext: 'fits', name: 'FITS', desc: 'Flexible Image Transport System' },
      { ext: 'fts', name: 'FTS', desc: 'Flexible Image Transport System' },
      { ext: 'hdr', name: 'HDR', desc: 'High Dynamic Range' },
      { ext: 'exr', name: 'EXR', desc: 'OpenEXR' },
      { ext: 'dpx', name: 'DPX', desc: 'Digital Picture Exchange' },
      { ext: 'cin', name: 'CIN', desc: 'Cineon Image File' },
      { ext: 'miff', name: 'MIFF', desc: 'Magick Image File Format' },
      { ext: 'mvg', name: 'MVG', desc: 'Magick Vector Graphics' },
      { ext: 'otb', name: 'OTB', desc: 'On-the-air Bitmap' },
      { ext: 'p7', name: 'P7', desc: 'Xv Visual Schnauzer' },
      { ext: 'palm', name: 'PALM', desc: 'Palm Pixmap' },
      { ext: 'pcd', name: 'PCD', desc: 'Photo CD' },
      { ext: 'pcds', name: 'PCDS', desc: 'Photo CD' },
      { ext: 'pict', name: 'PICT', desc: 'Apple PICT' },
      { ext: 'pct', name: 'PCT', desc: 'Apple PICT' },
      { ext: 'pic', name: 'PIC', desc: 'PICT' },
      { ext: 'pix', name: 'PIX', desc: 'Alias PIX' },
      { ext: 'plasma', name: 'PLASMA', desc: 'Plasma fractal image' },
      { ext: 'pwp', name: 'PWP', desc: 'Seattle FilmWorks' },
      { ext: 'rad', name: 'RAD', desc: 'Radiance' },
      { ext: 'rgb', name: 'RGB', desc: 'Raw RGB' },
      { ext: 'rgba', name: 'RGBA', desc: 'Raw RGBA' },
      { ext: 'sfw', name: 'SFW', desc: 'Seattle FilmWorks' },
      { ext: 'sgi', name: 'SGI', desc: 'Irix RGB' },
      { ext: 'sun', name: 'SUN', desc: 'Sun Rasterfile' },
      { ext: 'texture', name: 'TEXTURE', desc: 'Raw texture' },
      { ext: 'tim', name: 'TIM', desc: 'PSX TIM' },
      { ext: 'ttf', name: 'TTF', desc: 'TrueType font' },
      { ext: 'uil', name: 'UIL', desc: 'X-Motif UIL table' },
      { ext: 'uyvy', name: 'UYVY', desc: 'Interleaved YUV' },
      { ext: 'vicar', name: 'VICAR', desc: 'VICAR rasterfile' },
      { ext: 'viff', name: 'VIFF', desc: 'Khoros Visualization' },
      { ext: 'wbmp', name: 'WBMP', desc: 'Wireless bitmap' },
      { ext: 'wpg', name: 'WPG', desc: 'Word Perfect Graphics' },
      { ext: 'x', name: 'X', desc: 'X Image' },
      { ext: 'xc', name: 'XC', desc: 'Constant image' },
      { ext: 'xcf', name: 'XCF', desc: 'GIMP image' },
      { ext: 'xwd', name: 'XWD', desc: 'X Window Dump' },
      { ext: 'yuv', name: 'YUV', desc: 'CCIR 601 4:1:1' }
    ]
  },

  // 비디오 형식들 (80+ formats)
  video: {
    name: 'Videos',
    icon: '🎥',
    formats: [
      // 일반 비디오 형식
      { ext: 'mp4', name: 'MP4', desc: 'MPEG-4 Part 14', popular: true },
      { ext: 'avi', name: 'AVI', desc: 'Audio Video Interleave', popular: true },
      { ext: 'mov', name: 'MOV', desc: 'QuickTime Movie', popular: true },
      { ext: 'wmv', name: 'WMV', desc: 'Windows Media Video', popular: true },
      { ext: 'flv', name: 'FLV', desc: 'Flash Video', popular: true },
      { ext: 'webm', name: 'WebM', desc: 'WebM Video', popular: true },
      { ext: 'mkv', name: 'MKV', desc: 'Matroska Video', popular: true },
      { ext: 'mpg', name: 'MPG', desc: 'MPEG Video', popular: true },
      { ext: 'mpeg', name: 'MPEG', desc: 'MPEG Video', popular: true },
      
      // 고품질/전문 형식들
      { ext: 'mxf', name: 'MXF', desc: 'Material Exchange Format' },
      { ext: 'prores', name: 'ProRes', desc: 'Apple ProRes' },
      { ext: 'dnxhd', name: 'DNxHD', desc: 'Avid DNxHD' },
      { ext: 'dnxhr', name: 'DNxHR', desc: 'Avid DNxHR' },
      { ext: 'cineform', name: 'CineForm', desc: 'GoPro CineForm' },
      
      // 모바일/웹 형식들
      { ext: '3gp', name: '3GP', desc: '3GPP Multimedia', popular: true },
      { ext: '3g2', name: '3G2', desc: '3GPP2 Multimedia' },
      { ext: 'mp4v', name: 'MP4V', desc: 'MPEG-4 Video' },
      { ext: 'm4v', name: 'M4V', desc: 'iTunes Video' },
      { ext: 'f4v', name: 'F4V', desc: 'Flash MP4 Video' },
      
      // 방송/스트리밍 형식들
      { ext: 'ts', name: 'TS', desc: 'MPEG Transport Stream' },
      { ext: 'mts', name: 'MTS', desc: 'AVCHD Video' },
      { ext: 'm2ts', name: 'M2TS', desc: 'Blu-ray BDAV Video' },
      { ext: 'vob', name: 'VOB', desc: 'DVD Video Object' },
      { ext: 'ifo', name: 'IFO', desc: 'DVD Information' },
      { ext: 'bup', name: 'BUP', desc: 'DVD Backup' },
      
      // 레거시 형식들
      { ext: 'asf', name: 'ASF', desc: 'Advanced Systems Format' },
      { ext: 'rm', name: 'RM', desc: 'RealMedia' },
      { ext: 'rmvb', name: 'RMVB', desc: 'RealMedia Variable Bitrate' },
      { ext: 'ogv', name: 'OGV', desc: 'Ogg Video' },
      { ext: 'ogm', name: 'OGM', desc: 'Ogg Media' },
      { ext: 'divx', name: 'DivX', desc: 'DivX Video' },
      { ext: 'xvid', name: 'XviD', desc: 'Xvid Video' },
      
      // 캠코더 형식들
      { ext: 'mod', name: 'MOD', desc: 'Camcorder MOD' },
      { ext: 'tod', name: 'TOD', desc: 'Camcorder TOD' },
      { ext: 'mvi', name: 'MVI', desc: 'Motion JPEG' },
      { ext: 'dv', name: 'DV', desc: 'Digital Video' },
      { ext: 'hdv', name: 'HDV', desc: 'High Definition Video' },
      
      // 애니메이션/GIF 형식들
      { ext: 'gif', name: 'GIF', desc: 'Animated GIF' },
      { ext: 'apng', name: 'APNG', desc: 'Animated PNG' },
      { ext: 'webp', name: 'WebP', desc: 'Animated WebP' },
      
      // 코덱 특화 형식들
      { ext: 'h264', name: 'H.264', desc: 'H.264/AVC Video' },
      { ext: 'h265', name: 'H.265', desc: 'H.265/HEVC Video' },
      { ext: 'hevc', name: 'HEVC', desc: 'High Efficiency Video Coding' },
      { ext: 'av1', name: 'AV1', desc: 'AOMedia Video 1' },
      { ext: 'vp8', name: 'VP8', desc: 'VP8 Video' },
      { ext: 'vp9', name: 'VP9', desc: 'VP9 Video' },
      
      // 기타 전문 형식들
      { ext: 'yuv', name: 'YUV', desc: 'Raw YUV Video' },
      { ext: 'y4m', name: 'Y4M', desc: 'YUV4MPEG2' },
      { ext: 'mjpeg', name: 'MJPEG', desc: 'Motion JPEG' },
      { ext: 'mjpg', name: 'MJPG', desc: 'Motion JPEG' },
      { ext: 'amv', name: 'AMV', desc: 'Actions Media Video' },
      { ext: 'mtv', name: 'MTV', desc: 'MTV Video' },
      { ext: 'nsv', name: 'NSV', desc: 'Nullsoft Streaming Video' },
      { ext: 'nuv', name: 'NUV', desc: 'NuppelVideo' },
      { ext: 'rec', name: 'REC', desc: 'Topfield PVR' },
      { ext: 'trp', name: 'TRP', desc: 'HD-DVD Transport Stream' },
      { ext: 'ty', name: 'TY', desc: 'TiVo' },
      { ext: 'bik', name: 'BIK', desc: 'Bink Video' },
      { ext: 'smk', name: 'SMK', desc: 'Smacker Video' },
      { ext: 'roq', name: 'ROQ', desc: 'id RoQ' },
      { ext: 'film', name: 'FILM', desc: 'Sega FILM' },
      { ext: 'cpk', name: 'CPK', desc: 'FILM/CPK' },
      { ext: 'fli', name: 'FLI', desc: 'Autodesk FLIC' },
      { ext: 'flc', name: 'FLC', desc: 'Autodesk FLIC' },
      { ext: 'flic', name: 'FLIC', desc: 'Autodesk FLIC' },
      { ext: 'mng', name: 'MNG', desc: 'Multiple-image Network Graphics' },
      { ext: 'iff', name: 'IFF', desc: 'IFF Interleaved Bitmap' },
      { ext: 'anim', name: 'ANIM', desc: 'Amiga animation' }
    ]
  },

  // 오디오 형식들 (60+ formats)  
  audio: {
    name: 'Audio',
    icon: '🎵',
    formats: [
      // 일반 오디오 형식
      { ext: 'mp3', name: 'MP3', desc: 'MPEG Audio Layer 3', popular: true },
      { ext: 'wav', name: 'WAV', desc: 'Waveform Audio File', popular: true },
      { ext: 'flac', name: 'FLAC', desc: 'Free Lossless Audio Codec', popular: true },
      { ext: 'aac', name: 'AAC', desc: 'Advanced Audio Coding', popular: true },
      { ext: 'ogg', name: 'OGG', desc: 'Ogg Vorbis', popular: true },
      { ext: 'm4a', name: 'M4A', desc: 'MPEG-4 Audio', popular: true },
      { ext: 'wma', name: 'WMA', desc: 'Windows Media Audio', popular: true },
      
      // 무손실 형식들
      { ext: 'alac', name: 'ALAC', desc: 'Apple Lossless Audio Codec' },
      { ext: 'ape', name: 'APE', desc: 'Monkey\'s Audio' },
      { ext: 'wv', name: 'WV', desc: 'WavPack' },
      { ext: 'tta', name: 'TTA', desc: 'True Audio' },
      { ext: 'als', name: 'ALS', desc: 'MPEG-4 Audio Lossless Coding' },
      
      // 전문 오디오 형식들
      { ext: 'aiff', name: 'AIFF', desc: 'Audio Interchange File Format', popular: true },
      { ext: 'aif', name: 'AIF', desc: 'Audio Interchange File Format' },
      { ext: 'aifc', name: 'AIFC', desc: 'Compressed AIFF' },
      { ext: 'au', name: 'AU', desc: 'Sun/NeXT Audio' },
      { ext: 'snd', name: 'SND', desc: 'Sound File' },
      { ext: 'raw', name: 'RAW', desc: 'Raw Audio Data' },
      { ext: 'pcm', name: 'PCM', desc: 'Pulse Code Modulation' },
      
      // 스트리밍/웹 형식들
      { ext: 'opus', name: 'Opus', desc: 'Opus Audio Codec' },
      { ext: 'webm', name: 'WebM', desc: 'WebM Audio' },
      { ext: 'oga', name: 'OGA', desc: 'Ogg Audio' },
      { ext: 'spx', name: 'SPX', desc: 'Speex Audio' },
      
      // 모바일/게임 형식들
      { ext: 'amr', name: 'AMR', desc: 'Adaptive Multi-Rate' },
      { ext: 'awb', name: 'AWB', desc: 'AMR-WB' },
      { ext: '3ga', name: '3GA', desc: '3GPP Audio' },
      { ext: 'mp2', name: 'MP2', desc: 'MPEG Audio Layer 2' },
      { ext: 'mp1', name: 'MP1', desc: 'MPEG Audio Layer 1' },
      
      // 레거시/특수 형식들
      { ext: 'ra', name: 'RA', desc: 'RealAudio' },
      { ext: 'ram', name: 'RAM', desc: 'RealAudio Metafile' },
      { ext: 'rm', name: 'RM', desc: 'RealMedia Audio' },
      { ext: 'ac3', name: 'AC3', desc: 'Dolby Digital' },
      { ext: 'dts', name: 'DTS', desc: 'DTS Audio' },
      { ext: 'eac3', name: 'EAC3', desc: 'Enhanced AC-3' },
      { ext: 'mlp', name: 'MLP', desc: 'Meridian Lossless Packing' },
      { ext: 'thd', name: 'THD', desc: 'Dolby TrueHD' },
      
      // 모듈/트래커 형식들
      { ext: 'mod', name: 'MOD', desc: 'Amiga Module' },
      { ext: 's3m', name: 'S3M', desc: 'ScreamTracker 3 Module' },
      { ext: 'xm', name: 'XM', desc: 'Extended Module' },
      { ext: 'it', name: 'IT', desc: 'Impulse Tracker Module' },
      { ext: 'umx', name: 'UMX', desc: 'Unreal Music' },
      { ext: 'mo3', name: 'MO3', desc: 'MO3 Module' },
      
      // MIDI 형식들
      { ext: 'mid', name: 'MIDI', desc: 'Musical Instrument Digital Interface' },
      { ext: 'midi', name: 'MIDI', desc: 'Musical Instrument Digital Interface' },
      { ext: 'kar', name: 'KAR', desc: 'Karaoke MIDI' },
      { ext: 'rmi', name: 'RMI', desc: 'RIFF MIDI' },
      
      // 기타 형식들
      { ext: 'gsm', name: 'GSM', desc: 'GSM 06.10 Audio' },
      { ext: 'voc', name: 'VOC', desc: 'Creative Voice' },
      { ext: 'vox', name: 'VOX', desc: 'Dialogic ADPCM' },
      { ext: 'w64', name: 'W64', desc: 'Sony Wave64' },
      { ext: 'rf64', name: 'RF64', desc: 'RF64 WAV' },
      { ext: 'bwf', name: 'BWF', desc: 'Broadcast Wave Format' },
      { ext: 'caf', name: 'CAF', desc: 'Core Audio Format' },
      { ext: 'sd2', name: 'SD2', desc: 'Sound Designer II' },
      { ext: 'sph', name: 'SPH', desc: 'SPHERE Audio' },
      { ext: 'nist', name: 'NIST', desc: 'NIST SPHERE' },
      { ext: 'cvsd', name: 'CVSD', desc: 'Continuously Variable Slope Delta modulation' },
      { ext: 'cvs', name: 'CVS', desc: 'Continuously Variable Slope Delta modulation' },
      { ext: 'vms', name: 'VMS', desc: 'VMS Audio' },
      { ext: 'dvms', name: 'DVMS', desc: 'DVMS Audio' },
      { ext: 'ircam', name: 'IRCAM', desc: 'Berkeley/IRCAM/CARL Audio' },
      { ext: 'sf', name: 'SF', desc: 'IRCAM SoundFile' },
      { ext: 'nsp', name: 'NSP', desc: 'Nullsoft Streaming Audio' },
      { ext: 'sln', name: 'SLN', desc: 'Asterisk PBX' },
      { ext: 'txw', name: 'TXW', desc: 'Yamaha TX-16W' }
    ]
  },

  // 문서 형식들 (50+ formats)
  document: {
    name: 'Documents',
    icon: '📄',
    formats: [
      // PDF 형식들
      { ext: 'pdf', name: 'PDF', desc: 'Portable Document Format', popular: true },
      
      // Microsoft Office 형식들
      { ext: 'doc', name: 'DOC', desc: 'Microsoft Word Document', popular: true },
      { ext: 'docx', name: 'DOCX', desc: 'Microsoft Word Document', popular: true },
      { ext: 'xls', name: 'XLS', desc: 'Microsoft Excel Spreadsheet', popular: true },
      { ext: 'xlsx', name: 'XLSX', desc: 'Microsoft Excel Spreadsheet', popular: true },
      { ext: 'ppt', name: 'PPT', desc: 'Microsoft PowerPoint Presentation', popular: true },
      { ext: 'pptx', name: 'PPTX', desc: 'Microsoft PowerPoint Presentation', popular: true },
      
      // OpenDocument 형식들
      { ext: 'odt', name: 'ODT', desc: 'OpenDocument Text', popular: true },
      { ext: 'ods', name: 'ODS', desc: 'OpenDocument Spreadsheet', popular: true },
      { ext: 'odp', name: 'ODP', desc: 'OpenDocument Presentation', popular: true },
      { ext: 'odg', name: 'ODG', desc: 'OpenDocument Graphics' },
      { ext: 'odf', name: 'ODF', desc: 'OpenDocument Formula' },
      
      // 텍스트 형식들
      { ext: 'txt', name: 'TXT', desc: 'Plain Text', popular: true },
      { ext: 'rtf', name: 'RTF', desc: 'Rich Text Format', popular: true },
      { ext: 'md', name: 'Markdown', desc: 'Markdown Document', popular: true },
      { ext: 'tex', name: 'TeX', desc: 'LaTeX Document' },
      { ext: 'latex', name: 'LaTeX', desc: 'LaTeX Document' },
      { ext: 'log', name: 'LOG', desc: 'Log File' },
      { ext: 'csv', name: 'CSV', desc: 'Comma Separated Values', popular: true },
      { ext: 'tsv', name: 'TSV', desc: 'Tab Separated Values' },
      
      // 웹 문서 형식들
      { ext: 'html', name: 'HTML', desc: 'HyperText Markup Language', popular: true },
      { ext: 'htm', name: 'HTM', desc: 'HyperText Markup Language' },
      { ext: 'xhtml', name: 'XHTML', desc: 'Extensible HTML' },
      { ext: 'xml', name: 'XML', desc: 'Extensible Markup Language', popular: true },
      { ext: 'xsl', name: 'XSL', desc: 'Extensible Stylesheet Language' },
      { ext: 'xslt', name: 'XSLT', desc: 'XSL Transformations' },
      { ext: 'svg', name: 'SVG', desc: 'Scalable Vector Graphics' },
      
      // 전자책 형식들
      { ext: 'epub', name: 'EPUB', desc: 'Electronic Publication', popular: true },
      { ext: 'mobi', name: 'MOBI', desc: 'Mobipocket eBook' },
      { ext: 'azw', name: 'AZW', desc: 'Amazon Kindle eBook' },
      { ext: 'azw3', name: 'AZW3', desc: 'Amazon Kindle eBook' },
      { ext: 'fb2', name: 'FB2', desc: 'FictionBook 2.0' },
      { ext: 'lit', name: 'LIT', desc: 'Microsoft Literature' },
      { ext: 'pdb', name: 'PDB', desc: 'Palm Database' },
      { ext: 'tcr', name: 'TCR', desc: 'PSion eBook' },
      
      // 데이터 형식들
      { ext: 'json', name: 'JSON', desc: 'JavaScript Object Notation', popular: true },
      { ext: 'yaml', name: 'YAML', desc: 'YAML Ain\'t Markup Language' },
      { ext: 'yml', name: 'YML', desc: 'YAML File' },
      { ext: 'ini', name: 'INI', desc: 'Configuration File' },
      { ext: 'cfg', name: 'CFG', desc: 'Configuration File' },
      { ext: 'conf', name: 'CONF', desc: 'Configuration File' },
      { ext: 'properties', name: 'Properties', desc: 'Java Properties File' },
      
      // 코드/스크립트 형식들
      { ext: 'js', name: 'JavaScript', desc: 'JavaScript File' },
      { ext: 'ts', name: 'TypeScript', desc: 'TypeScript File' },
      { ext: 'css', name: 'CSS', desc: 'Cascading Style Sheets' },
      { ext: 'scss', name: 'SCSS', desc: 'Sass Stylesheet' },
      { ext: 'sass', name: 'Sass', desc: 'Sass Stylesheet' },
      { ext: 'less', name: 'LESS', desc: 'LESS Stylesheet' },
      { ext: 'php', name: 'PHP', desc: 'PHP Script' },
      { ext: 'py', name: 'Python', desc: 'Python Script' },
      { ext: 'rb', name: 'Ruby', desc: 'Ruby Script' },
      { ext: 'pl', name: 'Perl', desc: 'Perl Script' },
      { ext: 'sh', name: 'Shell', desc: 'Shell Script' },
      { ext: 'bat', name: 'Batch', desc: 'Batch File' },
      { ext: 'cmd', name: 'CMD', desc: 'Command File' },
      { ext: 'ps1', name: 'PowerShell', desc: 'PowerShell Script' },
      
      // 기타 문서 형식들
      { ext: 'pages', name: 'Pages', desc: 'Apple Pages Document' },
      { ext: 'numbers', name: 'Numbers', desc: 'Apple Numbers Spreadsheet' },
      { ext: 'key', name: 'Keynote', desc: 'Apple Keynote Presentation' },
      { ext: 'wpd', name: 'WPD', desc: 'WordPerfect Document' },
      { ext: 'wps', name: 'WPS', desc: 'Microsoft Works Document' },
      { ext: 'lwp', name: 'LWP', desc: 'Lotus Word Pro Document' },
      { ext: 'sxw', name: 'SXW', desc: 'StarOffice Writer Document' },
      { ext: 'sxc', name: 'SXC', desc: 'StarOffice Calc Spreadsheet' },
      { ext: 'sxi', name: 'SXI', desc: 'StarOffice Impress Presentation' },
      { ext: 'abw', name: 'ABW', desc: 'AbiWord Document' },
      { ext: 'zabw', name: 'ZABW', desc: 'Compressed AbiWord Document' }
    ]
  },

  // 압축 파일 형식들 (30+ formats)
  archive: {
    name: 'Archives',
    icon: '📦',
    formats: [
      // 일반 압축 형식들
      { ext: 'zip', name: 'ZIP', desc: 'ZIP Archive', popular: true },
      { ext: 'rar', name: 'RAR', desc: 'WinRAR Archive', popular: true },
      { ext: '7z', name: '7Z', desc: '7-Zip Archive', popular: true },
      { ext: 'tar', name: 'TAR', desc: 'Tape Archive', popular: true },
      { ext: 'gz', name: 'GZ', desc: 'Gzip Compressed File', popular: true },
      { ext: 'bz2', name: 'BZ2', desc: 'Bzip2 Compressed File', popular: true },
      { ext: 'xz', name: 'XZ', desc: 'XZ Compressed File', popular: true },
      
      // 조합 압축 형식들
      { ext: 'tar.gz', name: 'TAR.GZ', desc: 'Gzipped Tar Archive', popular: true },
      { ext: 'tgz', name: 'TGZ', desc: 'Gzipped Tar Archive', popular: true },
      { ext: 'tar.bz2', name: 'TAR.BZ2', desc: 'Bzipped Tar Archive', popular: true },
      { ext: 'tbz2', name: 'TBZ2', desc: 'Bzipped Tar Archive' },
      { ext: 'tar.xz', name: 'TAR.XZ', desc: 'XZ Tar Archive', popular: true },
      { ext: 'txz', name: 'TXZ', desc: 'XZ Tar Archive' },
      
      // 기타 압축 형식들
      { ext: 'z', name: 'Z', desc: 'Unix Compress File' },
      { ext: 'lz', name: 'LZ', desc: 'Lzip Compressed File' },
      { ext: 'lzma', name: 'LZMA', desc: 'LZMA Compressed File' },
      { ext: 'lzo', name: 'LZO', desc: 'LZO Compressed File' },
      { ext: 'rz', name: 'RZ', desc: 'Rzip Compressed File' },
      { ext: 'sz', name: 'SZ', desc: 'Snappy Compressed File' },
      
      // 플랫폼별 압축 형식들
      { ext: 'cab', name: 'CAB', desc: 'Cabinet Archive' },
      { ext: 'msi', name: 'MSI', desc: 'Windows Installer Package' },
      { ext: 'exe', name: 'EXE', desc: 'Self-extracting Archive' },
      { ext: 'deb', name: 'DEB', desc: 'Debian Package' },
      { ext: 'rpm', name: 'RPM', desc: 'Red Hat Package Manager' },
      { ext: 'dmg', name: 'DMG', desc: 'Apple Disk Image' },
      { ext: 'pkg', name: 'PKG', desc: 'Package File' },
      { ext: 'apk', name: 'APK', desc: 'Android Package' },
      { ext: 'ipa', name: 'IPA', desc: 'iOS App Store Package' },
      
      // 레거시 압축 형식들
      { ext: 'arj', name: 'ARJ', desc: 'ARJ Archive' },
      { ext: 'ace', name: 'ACE', desc: 'WinAce Archive' },
      { ext: 'lha', name: 'LHA', desc: 'LHA Archive' },
      { ext: 'lzh', name: 'LZH', desc: 'LZH Archive' },
      { ext: 'zoo', name: 'ZOO', desc: 'Zoo Archive' },
      { ext: 'arc', name: 'ARC', desc: 'ARC Archive' },
      { ext: 'pak', name: 'PAK', desc: 'PAK Archive' },
      { ext: 'pit', name: 'PIT', desc: 'PackIt Archive' },
      { ext: 'sit', name: 'SIT', desc: 'StuffIt Archive' },
      { ext: 'sitx', name: 'SITX', desc: 'StuffIt X Archive' },
      { ext: 'sea', name: 'SEA', desc: 'Self-extracting Archive' },
      { ext: 'hqx', name: 'HQX', desc: 'BinHex Archive' },
      { ext: 'cpt', name: 'CPT', desc: 'Compact Pro Archive' },
      { ext: 'dd', name: 'DD', desc: 'DiskDoubler Archive' },
      { ext: 'bin', name: 'BIN', desc: 'Binary Archive' },
      { ext: 'uu', name: 'UU', desc: 'UUencoded File' },
      { ext: 'uue', name: 'UUE', desc: 'UUencoded File' },
      { ext: 'xxe', name: 'XXE', desc: 'XXencoded File' },
      { ext: 'b64', name: 'B64', desc: 'Base64 Encoded File' }
    ]
  }
};

// 인기 형식들만 추출
export function getPopularFormats() {
  const popular = [];
  Object.values(FILE_FORMATS).forEach(category => {
    category.formats.forEach(format => {
      if (format.popular) {
        popular.push({
          ...format,
          category: category.name.toLowerCase()
        });
      }
    });
  });
  return popular;
}

// 카테고리별 형식 개수
export function getFormatCounts() {
  const counts = {};
  Object.entries(FILE_FORMATS).forEach(([key, category]) => {
    counts[key] = category.formats.length;
  });
  return counts;
}

// 전체 형식 개수
export function getTotalFormatCount() {
  return Object.values(FILE_FORMATS).reduce((total, category) => {
    return total + category.formats.length;
  }, 0);
}

// 형식 검색
export function searchFormats(query) {
  const results = [];
  const searchTerm = query.toLowerCase();
  
  Object.entries(FILE_FORMATS).forEach(([categoryKey, category]) => {
    category.formats.forEach(format => {
      if (
        format.ext.toLowerCase().includes(searchTerm) ||
        format.name.toLowerCase().includes(searchTerm) ||
        format.desc.toLowerCase().includes(searchTerm)
      ) {
        results.push({
          ...format,
          category: categoryKey,
          categoryName: category.name,
          categoryIcon: category.icon
        });
      }
    });
  });
  
  return results;
}

// 카테고리별 형식 필터링
export function getFormatsByCategory(categoryKey) {
  return FILE_FORMATS[categoryKey]?.formats || [];
}

// 모든 형식을 플랫 배열로 반환
export function getAllFormats() {
  const allFormats = [];
  Object.entries(FILE_FORMATS).forEach(([categoryKey, category]) => {
    category.formats.forEach(format => {
      allFormats.push({
        ...format,
        category: categoryKey,
        categoryName: category.name,
        categoryIcon: category.icon
      });
    });
  });
  return allFormats;
}