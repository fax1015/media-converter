// Main entry point for Video Toolbox renderer
// This imports modularized code and initializes the application

import { DEFAULT_SETTINGS, ACCENT_COLORS, BUILT_IN_PRESETS, TOOL_REGISTRY, APP_SETTINGS_KEY } from './constants.js';
import { get, getLoaderHTML, showPopup, showConfirm, setupCustomSelects, showView, toggleSidebar, resetNav, resetProgress, renderAudioTracks, renderSubtitleTracks, updateTextContent } from './modules/ui-utils.js';
import { loadInspectorFile, setupInspectorHandlers } from './modules/inspector.js';
import { addToQueue, updateQueueUI, updateQueueProgress, renderQueue, processQueue, updateQueueStatusUI, setupQueueHandlers } from './modules/queue.js';
import { setupTrimmerHandlers, handleTrimFileSelection, loadTrimQueueItem } from './modules/trimmer.js';
import { setupEncoderHandlers, handleFileSelection, handleFolderSelection, getOptionsFromUI, applyOptionsToUI, updateEstFileSize } from './modules/encoder.js';
import { setupDownloaderHandlers, showDownloader, processVideoUrl } from './modules/downloader.js';
import { setupExtractAudioHandlers, handleExtractFileSelection, updateExtractBitrateVisibility } from './modules/extract-audio.js';
import { setupAppsHandlers } from './modules/apps.js';
import * as state from './modules/state.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Renderer initialized');

    const appVersionEl = get('app-version');
    if (appVersionEl && window.electron?.getAppVersion) {
        window.electron.getAppVersion().then((version) => {
            if (version) appVersionEl.textContent = `v${version}`;
        }).catch(() => {
            // Ignore version lookup errors and keep default text
        });
    }

    // Initialize app settings from defaults
    state.setAppSettings({ ...DEFAULT_SETTINGS });

    window.getOptionsFromUI = getOptionsFromUI;

    // DOM element references (keeping centralized for now)
    const dropZone = get('drop-zone');
    const folderDropZone = get('folder-drop-zone');
    const extractAudioDropZone = get('extract-audio-drop-zone');
    const extractAudioDashboard = get('extract-audio-dashboard');
    const trimDropZone = get('trim-drop-zone');
    const trimDashboard = get('trim-dashboard');
    const dashboard = get('file-dashboard');
    const progressView = get('progress-view');
    const completeView = get('complete-view');
    const settingsView = get('settings-view');
    const queueView = get('queue-view');

    const filenameEl = get('filename');
    const resolutionEl = get('file-resolution');
    const durationEl = get('file-duration');
    const bitrateEl = get('file-bitrate');
    const fileIcon = get('file-icon');

    const backBtn = get('back-btn');
    const settingsBackBtn = get('settings-back-btn');
    const convertBtn = get('convert-btn');
    const cancelBtn = get('cancel-btn');

    const formatSelect = get('format-select');
    const codecSelect = get('codec-select');
    const presetSelect = get('preset-select');
    const audioSelect = get('audio-select');
    const crfSlider = get('crf-slider');
    const crfValue = get('crf-value');
    const audioBitrateSelect = get('audio-bitrate');

    const progressPercent = get('progress-percent');
    const progressRing = get('progress-ring');
    const progressTitle = get('progress-title');
    const timeElapsed = get('time-elapsed');
    const encodeSpeed = get('encode-speed');
    const progressFilename = get('progress-filename');
    const timePosition = get('time-position');
    const completeTitle = get('complete-title');

    const outputPathEl = get('output-path');
    const openFileBtn = get('open-file-btn');
    const openFolderBtn = get('open-folder-btn');
    const newEncodeBtn = get('new-encode-btn');

    const navVideo = get('nav-video');
    const navFolder = get('nav-folder');
    const navTrim = get('nav-trim');
    const navExtractAudio = get('nav-extract-audio');
    const navSettings = get('nav-settings');
    const navQueue = get('nav-queue');
    const navApps = get('nav-apps');
    const navDownloader = get('nav-downloader');
    const navInspector = get('nav-inspector');

    const appsDashboard = get('apps-dashboard');

    const addQueueBtn = get('add-queue-btn');

    const hwAccelSelect = get('hw-accel');
    const outputSuffixInput = get('output-suffix');
    const defaultFormatSelect = get('default-format');
    const themeSelectAttr = get('theme-select');
    const accentColorSelect = get('accent-color-select');
    const workPrioritySelect = get('work-priority-select');
    const cpuThreadsInput = get('cpu-threads');
    const outputFolderInput = get('output-folder');
    const selectOutputFolderBtn = get('select-output-folder-btn');
    const overwriteFilesCheckbox = get('overwrite-files');
    const notifyOnCompleteCheckbox = get('notify-on-complete');
    const hwAutoTag = get('hw-auto-tag');
    const showBlobsCheckbox = get('show-blobs');
    const toggleAdvancedBtn = get('toggle-advanced-btn');
    const advancedPanel = get('advanced-panel');
    const customFfmpegArgs = get('custom-ffmpeg-args');
    const revertVideoBtn = get('revert-video-btn');
    const resolutionSelect = get('resolution-select');
    const fpsSelect = get('fps-select');
    const vBitrateInput = get('v-bitrate');
    const twoPassCheckbox = get('two-pass');
    const crfContainer = get('crf-container');
    const bitrateContainer = get('bitrate-container');
    const addAudioBtn = get('add-audio-btn');
    const audioTrackList = get('audio-track-list');
    const subtitleDropZone = get('subtitle-drop-zone');
    const subtitleTrackList = get('subtitle-track-list');
    const chapterImportZone = get('chapter-import-zone');
    const chaptersInfo = get('chapters-info');
    const chaptersFilename = get('chapters-filename');
    const removeChaptersBtn = get('remove-chapters-btn');
    const estFileSizeEl = get('est-file-size');

    const presetMenuBtn = get('preset-menu-btn');
    const presetDropdown = get('preset-dropdown');
    const currentPresetName = get('current-preset-name');
    const customPresetsList = get('custom-presets-list');
    const savePresetBtn = get('save-preset-btn');

    // Check for electron bridge
    if (!window.electron) {
        console.error('Electron bridge not found! Check preload script configuration.');
        return;
    }

    const { electron } = window;

    // ==================== SETTINGS MANAGEMENT ====================
    function loadSettings() {
        const saved = localStorage.getItem(APP_SETTINGS_KEY);
        if (saved) {
            try {
                state.setAppSettings({ ...state.appSettings, ...JSON.parse(saved) });
            } catch (e) {
                console.error('Error parsing settings', e);
            }
        }
        applySettings();
    }

    function saveSettings() {
        if (state.isApplyingSettings) return;
        
        if (hwAccelSelect) {
            const selected = hwAccelSelect.value;
            if (selected === 'auto') {
                state.appSettings.hwAccel = 'auto';
            } else {
                const resolved = getAutoEncoder();
                if (state.appSettings.hwAccel === 'auto' && selected === resolved) {
                    state.appSettings.hwAccel = 'auto';
                } else {
                    state.appSettings.hwAccel = selected;
                }
            }
        }
        
        if (outputSuffixInput) state.appSettings.outputSuffix = outputSuffixInput.value;
        if (defaultFormatSelect) state.appSettings.defaultFormat = defaultFormatSelect.value;
        if (themeSelectAttr) state.appSettings.theme = themeSelectAttr.value;
        if (accentColorSelect) state.appSettings.accentColor = accentColorSelect.value;
        if (workPrioritySelect) state.appSettings.workPriority = workPrioritySelect.value;
        if (outputFolderInput) state.appSettings.outputFolder = outputFolderInput.value;
        if (overwriteFilesCheckbox) state.appSettings.overwriteFiles = overwriteFilesCheckbox.checked;
        if (notifyOnCompleteCheckbox) state.appSettings.notifyOnComplete = notifyOnCompleteCheckbox.checked;
        if (showBlobsCheckbox) state.appSettings.showBlobs = showBlobsCheckbox.checked;
        if (cpuThreadsInput) state.appSettings.cpuThreads = parseInt(cpuThreadsInput.value) || 0;

        if (!state.appSettings.pinnedApps) state.appSettings.pinnedApps = ['converter', 'folder', 'trim', 'extract-audio'];

        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(state.appSettings));
        applySettings();
    }

    function applySettings() {
        state.setApplyingSettings(true);
        try {
            if (hwAccelSelect) {
                if (state.appSettings.hwAccel === 'auto') {
                    const resolved = getAutoEncoder();
                    hwAccelSelect.value = resolved !== 'none' ? resolved : 'none';
                    hwAccelSelect.dataset.auto = 'true';
                } else {
                    hwAccelSelect.value = state.appSettings.hwAccel;
                    delete hwAccelSelect.dataset.auto;
                }
            }
            if (outputSuffixInput) outputSuffixInput.value = state.appSettings.outputSuffix;
            if (defaultFormatSelect) defaultFormatSelect.value = state.appSettings.defaultFormat;
            if (themeSelectAttr) themeSelectAttr.value = state.appSettings.theme || 'default';
            if (accentColorSelect) accentColorSelect.value = state.appSettings.accentColor;
            if (workPrioritySelect) workPrioritySelect.value = state.appSettings.workPriority;
            if (outputFolderInput) outputFolderInput.value = state.appSettings.outputFolder;
            if (overwriteFilesCheckbox) overwriteFilesCheckbox.checked = state.appSettings.overwriteFiles;
            if (notifyOnCompleteCheckbox) notifyOnCompleteCheckbox.checked = state.appSettings.notifyOnComplete;
            if (showBlobsCheckbox) showBlobsCheckbox.checked = (state.appSettings.showBlobs !== false);
            if (cpuThreadsInput) cpuThreadsInput.value = state.appSettings.cpuThreads || 0;

            document.body.classList.toggle('no-blobs', state.appSettings.showBlobs === false);

            document.body.classList.remove('oled-theme', 'light-theme', 'high-contrast-theme');
            if (state.appSettings.theme === 'oled') document.body.classList.add('oled-theme');
            if (state.appSettings.theme === 'light') document.body.classList.add('light-theme');
            if (state.appSettings.theme === 'high-contrast') document.body.classList.add('high-contrast-theme');

            if (themeSelectAttr) {
                themeSelectAttr.value = state.appSettings.theme;
                themeSelectAttr.dispatchEvent(new Event('change'));
            }

            if (accentColorSelect) {
                accentColorSelect.disabled = (state.appSettings.theme === 'high-contrast');
                accentColorSelect.dispatchEvent(new Event('change'));
            }

            applyAccentColor();
            updateHardwareAutoTag();

            if (formatSelect && !state.currentEditingQueueId) {
                formatSelect.value = state.appSettings.defaultFormat;
            }
        } finally {
            state.setApplyingSettings(false);
        }
    }

    function applyAccentColor() {
        const colorName = state.appSettings.accentColor || 'green';
        const color = ACCENT_COLORS[colorName] || ACCENT_COLORS.green;

        document.body.dataset.accent = colorName;
        document.documentElement.style.setProperty('--accent-primary', color.primary);
        document.documentElement.style.setProperty('--accent-secondary', color.secondary);
    }

    async function detectHardware() {
        try {
            const encoders = await electron.getEncoders();
            state.setDetectedEncoders(encoders);
            console.log('Detected encoders:', encoders);

            if (state.appSettings.hwAccel === 'auto' && hwAccelSelect) {
                const resolved = getAutoEncoder();
                hwAccelSelect.value = resolved !== 'none' ? resolved : 'none';
                hwAccelSelect.dataset.auto = 'true';
            }
            updateHardwareAutoTag();
        } catch (e) {
            console.error('Error detecting hardware:', e);
        }
    }

    function updateHardwareAutoTag() {
        if (!hwAutoTag) return;
        if (state.appSettings.hwAccel === 'auto') {
            const selected = getAutoEncoder();
            hwAutoTag.textContent = selected === 'none' ? '(none found)' : `(selected: ${selected.toUpperCase()})`;
            hwAutoTag.classList.remove('hidden');
        } else {
            hwAutoTag.classList.add('hidden');
        }
    }

    function getAutoEncoder() {
        if (state.detectedEncoders.nvenc) return 'nvenc';
        if (state.detectedEncoders.amf) return 'amf';
        if (state.detectedEncoders.qsv) return 'qsv';
        return 'none';
    }

    // Load settings immediately to prevent theme flash
    loadSettings();

    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => detectHardware());
    } else {
        setTimeout(() => detectHardware(), 0);
    }

    // Setup settings change handlers
    const changeElements = [outputSuffixInput, defaultFormatSelect, themeSelectAttr, accentColorSelect, workPrioritySelect, overwriteFilesCheckbox, notifyOnCompleteCheckbox, outputFolderInput, showBlobsCheckbox, cpuThreadsInput];
    if (hwAccelSelect) {
        hwAccelSelect.addEventListener('change', () => {
            delete hwAccelSelect.dataset.auto;
            saveSettings();
        });
    }
    changeElements.forEach(el => {
        if (el) {
            el.addEventListener('change', () => {
                if (!state.isApplyingSettings) saveSettings();
            });
        }
    });

    if (selectOutputFolderBtn) {
        selectOutputFolderBtn.addEventListener('click', async () => {
            const path = await electron.selectFolder();
            if (path) {
                outputFolderInput.value = path;
                saveSettings();
            }
        });
    }

    // Initialize modules
    setupCustomSelects();
    setupInspectorHandlers();
    setupQueueHandlers();
    setupEncoderHandlers();
    setupTrimmerHandlers();
    setupDownloaderHandlers();
    setupExtractAudioHandlers();
    setupAppsHandlers();

    // Navigation handlers
    if (navVideo) {
        navVideo.addEventListener('click', () => {
            resetNav();
            navVideo.classList.add('active');
            showView(dropZone);
        });
    }

    if (navFolder) {
        navFolder.addEventListener('click', () => {
            resetNav();
            navFolder.classList.add('active');
            showView(folderDropZone);
        });
    }

    if (navQueue) {
        navQueue.addEventListener('click', () => {
            resetNav();
            navQueue.classList.add('active');
            showView(queueView);
            renderQueue();
        });
    }

    if (navSettings) {
        navSettings.addEventListener('click', () => {
            resetNav();
            navSettings.classList.add('active');
            showView(settingsView);
        });
    }

    if (navTrim) {
        navTrim.addEventListener('click', () => {
            resetNav();
            navTrim.classList.add('active');
            showView(trimDropZone);
        });
    }

    if (navExtractAudio) {
        navExtractAudio.addEventListener('click', () => {
            resetNav();
            navExtractAudio.classList.add('active');
            showView(extractAudioDropZone);
        });
    }

    if (navDownloader) {
        navDownloader.addEventListener('click', () => {
            showDownloader();
        });
    }

    if (navInspector) {
        navInspector.addEventListener('click', () => {
            resetNav();
            navInspector.classList.add('active');
            showView(get('inspector-drop-zone'));
        });
    }

    // Cancel encoding button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (window.electron && window.electron.cancelEncode) {
                window.electron.cancelEncode();
            }
            // Return to main drop zone
            const dropZone = get('drop-zone');
            const navEncode = get('nav-encode');
            if (dropZone) showView(dropZone);
            resetNav();
            if (navEncode) navEncode.classList.add('active');
            toggleSidebar(false);
            showPopup('Encoding cancelled.');
        });
    }

    // Progress event handlers
    electron.onProgress((data) => {
        if (state.isQueueRunning && state.currentlyEncodingItemId !== null) {
            const item = state.encodingQueue.find(i => i.id === state.currentlyEncodingItemId);
            if (item) {
                item.progress = data.percent;
                updateQueueProgress();
            }
        } else {
            if (progressPercent) progressPercent.textContent = `${data.percent}%`;
            if (progressRing) {
                const offset = 502 - (data.percent / 100) * 502;
                progressRing.style.strokeDashoffset = offset;
            }
            if (timeElapsed) timeElapsed.textContent = data.time;
            if (timePosition) timePosition.textContent = data.time;
            if (encodeSpeed) encodeSpeed.textContent = data.speed;
        }
    });

    electron.onComplete((data) => {
        state.setEncodingState(false);
        const wasExtracting = state.isExtracting;
        const wasTrimming = state.isTrimming;
        state.setExtracting(false);
        state.setTrimming(false);
        
        if (completeTitle) {
            if (wasExtracting) completeTitle.textContent = 'Extraction Complete!';
            else if (wasTrimming) completeTitle.textContent = 'Trim Complete!';
            else completeTitle.textContent = 'Encoding Complete!';
        }
        
        if (state.appSettings.notifyOnComplete) {
            const action = wasExtracting ? 'Extraction' : (wasTrimming ? 'Trim' : 'Encoding');
            new Notification(action + ' Complete', { body: `File saved to: ${data.outputPath}` });
        }

        if (state.isQueueRunning && state.currentlyEncodingItemId !== null) {
            const item = state.encodingQueue.find(i => i.id === state.currentlyEncodingItemId);
            if (item) {
                item.status = 'completed';
                item.progress = 100;
            }
            updateQueueUI();
            setTimeout(processQueue, 500);
        } else {
            if (outputPathEl) outputPathEl.textContent = data.outputPath;
            state.setCurrentOutputPath(data.outputPath);
            showView(completeView);
            toggleSidebar(false);
        }
    });

    electron.onError((data) => {
        state.setEncodingState(false);
        state.setExtracting(false);
        state.setTrimming(false);
        alert(`Error: ${data.message}`);
        
        if (state.isQueueRunning && state.currentlyEncodingItemId !== null) {
            const item = state.encodingQueue.find(i => i.id === state.currentlyEncodingItemId);
            if (item) {
                item.status = 'error';
            }
            updateQueueUI();
            state.setQueueRunning(false);
            updateQueueStatusUI();
            toggleSidebar(false);
        } else {
            if (state.encodingQueue.length > 0) {
                showView(queueView);
                resetNav();
                navQueue.classList.add('active');
            } else {
                showView(dashboard);
            }
            toggleSidebar(false);
        }
    });

    // Encoder completion button handlers
    if (openFileBtn) {
        openFileBtn.addEventListener('click', () => {
            if (state.currentOutputPath) {
                window.electron.openFile(state.currentOutputPath);
            }
        });
    }
    
    if (openFolderBtn) {
        openFolderBtn.addEventListener('click', () => {
            if (state.currentOutputPath) {
                window.electron.openFolder(state.currentOutputPath);
            }
        });
    }
    
    if (newEncodeBtn) {
        newEncodeBtn.addEventListener('click', () => {
            if (state.lastActiveViewId === 'trimDropZone') {
                showView(trimDropZone);
                resetNav();
                if (navTrim) navTrim.classList.add('active');
            } else if (state.lastActiveViewId === 'extractAudioDropZone') {
                showView(extractAudioDropZone);
                resetNav();
                if (navExtractAudio) navExtractAudio.classList.add('active');
            } else {
                showView(dropZone);
                resetNav();
                if (navVideo) navVideo.classList.add('active');
            }
        });
    }

    // Queue item selection/editing handlers
    window.loadQueueItem = (id) => {
        if (state.isQueueRunning) {
            showPopup('Cannot edit queue items while the queue is running.');
            return;
        }
        const item = state.encodingQueue.find(i => i.id === id);
        if (item && item.status === 'completed') {
            return;
        }

        if (item && item.taskType === 'download') {
            loadDownloadItemToDashboard(id);
            return;
        }

        if (item && item.taskType === 'trim') {
            state.setCurrentEditingQueueId(id);
            loadTrimQueueItem(item).then(() => {
                showView(trimDashboard);
                resetNav();
                if (navTrim) navTrim.classList.add('active');
            });
            return;
        }

        if (item && item.taskType === 'extract') {
            state.setCurrentEditingQueueId(id);
            handleExtractFileSelection(item.options.input, {
                format: item.options.format,
                bitrate: item.options.bitrate
            }).then(() => {
                updateExtractBitrateVisibility();
                const extractAddQueueBtn = get('extract-add-queue-btn');
                if (extractAddQueueBtn) {
                    extractAddQueueBtn.innerHTML = `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                        </svg>
                        Update Item
                    `;
                }
                showView(extractAudioDashboard);
                resetNav();
                if (navExtractAudio) navExtractAudio.classList.add('active');
            });
            return;
        }
        loadQueueItemToDashboard(id);
    };

    window.removeQueueItem = (id) => {
        const index = state.encodingQueue.findIndex(item => item.id === id);
        if (index !== -1) {
            if (id === state.currentlyEncodingItemId) {
                electron.cancelEncode();
                state.setCurrentlyEncodingItemId(null);
                const item = state.encodingQueue[index];
                if (item) {
                    item.status = 'pending';
                    item.state = 'pending';
                    item.progress = 0;
                }
                toggleSidebar(false);
            } else {
                state.encodingQueue.splice(index, 1);
            }
            updateQueueUI();
            if (state.encodingQueue.length === 0) {
                state.setQueueRunning(false);
                updateQueueStatusUI();
                toggleSidebar(false);
            }
        }
    };

    async function loadDownloadItemToDashboard(id) {
        const item = state.encodingQueue.find(i => i.id === id);
        if (!item) return;

        state.setCurrentEditingQueueId(id);
        
        const dlUrlInput = get('dl-url');
        const dlModeSelect = get('dl-mode');
        const dlQualitySelect = get('dl-quality');
        const dlFormatSelect = get('dl-format');
        const dlFpsSelect = get('dl-fps');
        const dlVideoBitrateSelect = get('dl-video-bitrate');
        const dlVideoCodecSelect = get('dl-video-codec');
        const dlAudioFormatSelect = get('dl-audio-format');
        const dlAudioBitrateSelect = get('dl-audio-bitrate');
        const dlStartBtn = get('dl-start-btn');
        const downloaderDashboard = get('downloader-dashboard');

        showView(downloaderDashboard);
        resetNav();
        if (navDownloader) navDownloader.classList.add('active');

        if (dlUrlInput) dlUrlInput.value = item.options.url;

        await processVideoUrl(item.options.url);

        if (dlModeSelect) {
            dlModeSelect.value = item.options.mode;
            dlModeSelect.dispatchEvent(new Event('change'));
        }
        if (dlQualitySelect) dlQualitySelect.value = item.options.quality;
        if (dlFormatSelect) dlFormatSelect.value = item.options.format;
        if (dlFpsSelect && item.options.fps) dlFpsSelect.value = item.options.fps;
        if (dlVideoBitrateSelect && item.options.videoBitrate) dlVideoBitrateSelect.value = item.options.videoBitrate;
        if (dlVideoCodecSelect && item.options.videoCodec) dlVideoCodecSelect.value = item.options.videoCodec;
        if (dlAudioFormatSelect && item.options.audioFormat) dlAudioFormatSelect.value = item.options.audioFormat;
        if (dlAudioBitrateSelect && item.options.audioBitrate) dlAudioBitrateSelect.value = item.options.audioBitrate;

        if (dlStartBtn) {
            dlStartBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
                Update Queue Item
            `;
        }
    }

    async function loadQueueItemToDashboard(id) {
        const item = state.encodingQueue.find(i => i.id === id);
        if (!item) return;

        state.setCurrentEditingQueueId(id);
        state.setCurrentFile(item.options.input);

        const name = item.options.input.split(/[\\/]/).pop();
        const ext = name.split('.').pop().toUpperCase();

        if (filenameEl) filenameEl.textContent = name;
        if (fileIcon) fileIcon.textContent = ext;

        applyOptionsToUI(item.options);

        if (chaptersInfo) {
            if (state.chaptersFile) {
                if (chaptersFilename) chaptersFilename.textContent = state.chaptersFile.split(/[\\/]/).pop();
                chaptersInfo.classList.remove('hidden');
                if (chapterImportZone) chapterImportZone.classList.add('hidden');
            } else {
                chaptersInfo.classList.add('hidden');
                if (chapterImportZone) chapterImportZone.classList.remove('hidden');
            }
        }

        if (addQueueBtn) addQueueBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
            Update Item
        `;

        showView(dashboard);
        resetNav();
        if (navVideo) navVideo.classList.add('active');

        try {
            const metadata = await electron.getMetadata(item.options.input);
            if (resolutionEl) resolutionEl.textContent = metadata.resolution;
            if (durationEl) durationEl.textContent = metadata.duration;
            if (bitrateEl) bitrateEl.textContent = metadata.bitrate;
            state.setCurrentFile(
                item.options.input,
                metadata.durationSeconds || 0,
                metadata.width || 0,
                metadata.height || 0,
                metadata.fps || 30
            );
            updateEstFileSize();
        } catch (err) {
            console.warn('Could not read metadata:', err);
        }
    }

    console.log('Video Toolbox initialized successfully with modular structure');
});
