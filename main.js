const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');

// Set application name and App User Model ID for Windows
app.setName('Video Toolbox');
if (process.platform === 'win32') {
    app.setAppUserModelId('com.fax1015.videotoolbox');
}

// Remove the default menu
Menu.setApplicationMenu(null);


const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const FFMPEG_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'bin', 'ffmpeg.exe')
    : path.join(__dirname, 'bin', 'ffmpeg.exe');
let currentFfmpegProcess = null;

function createWindow() {
    const win = new BrowserWindow({
        title: 'Video Toolbox',
        titleBarStyle: 'hidden',
        width: 1000,
        height: 700,
        minWidth: 800,
        minHeight: 700,
        show: false,
        backgroundColor: '#0a0f0e',
        icon: path.join(__dirname, 'assets', 'icons', 'favicon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        ...(process.platform !== 'darwin' ? {
            titleBarOverlay: {
                color: '#00000000',
                symbolColor: '#c5c5c5ff',
                height: 36
            }
        } : {})
    });

    win.once('ready-to-show', () => {
        win.show();
    });

    win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    // IPC Handlers
    ipcMain.handle('select-file', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Videos', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv'] }]
        });
        return canceled ? null : filePaths[0];
    });

    ipcMain.handle('select-folder', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openDirectory']
        });
        return canceled ? null : filePaths[0];
    });

    ipcMain.handle('list-files', async (event, folderPath) => {
        try {
            const files = await fs.promises.readdir(folderPath);
            const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.wmv'];
            return files
                .filter(file => videoExtensions.includes(path.extname(file).toLowerCase()))
                .map(file => path.join(folderPath, file));
        } catch (err) {
            console.error('Error listing files:', err);
            return [];
        }
    });

    ipcMain.handle('get-encoders', async () => {
        return new Promise((resolve) => {
            const ffmpeg = spawn(FFMPEG_PATH, ['-encoders']);
            let output = '';
            ffmpeg.stdout.on('data', (data) => output += data.toString());
            ffmpeg.on('close', () => {
                const encoders = {
                    nvenc: output.includes('nvenc'),
                    amf: output.includes('amf'),
                    qsv: output.includes('qsv')
                };
                resolve(encoders);
            });
        });
    });

    ipcMain.handle('get-metadata', async (event, filePath) => {
        return new Promise((resolve, reject) => {
            const ffprobe = spawn(FFMPEG_PATH, ['-i', filePath]);
            let output = '';
            ffprobe.stderr.on('data', (data) => output += data.toString());
            ffprobe.on('close', () => {
                const metadata = {
                    resolution: 'Unknown',
                    duration: '00:00:00',
                    bitrate: '0 kbps'
                };

                const resMatch = output.match(/Stream #.*Video:.* (\d+x\d+)/);
                if (resMatch) metadata.resolution = resMatch[1];

                const durMatch = output.match(/Duration: (\d{2}:\d{2}:\d{2}\.\d{2})/);
                if (durMatch) metadata.duration = durMatch[1].split('.')[0];

                const bitMatch = output.match(/bitrate: (\d+ kb\/s)/);
                if (bitMatch) metadata.bitrate = bitMatch[1];

                resolve(metadata);
            });
        });
    });

    ipcMain.on('start-encode', (event, options) => {
        const {
            input, format, codec, preset, audioCodec, crf, audioBitrate,
            outputSuffix, fps, rateMode, bitrate, twoPass,
            audioTracks, subtitleTracks, chaptersFile, customArgs
        } = options;

        const outputExt = format;
        const suffix = outputSuffix || '_encoded';
        const outputPath = input.replace(/\.[^.]+$/, `${suffix}.${outputExt}`);

        // Construct input arguments
        const args = ['-i', input];
        let inputCount = 1;

        // Add external audio tracks
        const externalAudioIdxs = [];
        if (audioTracks && audioTracks.length > 0) {
            audioTracks.forEach((track, index) => {
                if (track.path) {
                    args.push('-i', track.path);
                    externalAudioIdxs[index] = inputCount;
                    inputCount++;
                }
            });
        }

        // Add external subtitle tracks
        const externalSubtitleIdxs = [];
        if (subtitleTracks && subtitleTracks.length > 0) {
            subtitleTracks.forEach((track, index) => {
                if (track.path) {
                    args.push('-i', track.path);
                    externalSubtitleIdxs[index] = inputCount;
                    inputCount++;
                }
            });
        }

        // Add chapters file
        let chaptersInputIdx = -1;
        if (chaptersFile) {
            args.push('-i', chaptersFile);
            chaptersInputIdx = inputCount;
            inputCount++;
        }

        args.push('-y'); // Overwrite

        // Mapping logic
        // Map original video (Input 0, Video 0)
        args.push('-map', '0:v:0');

        // Map audio
        if (audioCodec === 'none' || (audioTracks && audioTracks.length === 0)) {
            // No audio from any source
            args.push('-an');
        } else {
            // Loop through audioTracks and map them
            audioTracks.forEach((track, index) => {
                if (track.isSource) {
                    args.push('-map', '0:a:0');
                } else if (externalAudioIdxs[index] !== undefined) {
                    args.push('-map', `${externalAudioIdxs[index]}:a`);
                }
            });
        }

        // Map subtitles
        // Map original subtitles
        args.push('-map', '0:s?');
        // Map external subtitles
        if (subtitleTracks && subtitleTracks.length > 0) {
            subtitleTracks.forEach((track, index) => {
                if (externalSubtitleIdxs[index] !== undefined) {
                    args.push('-map', `${externalSubtitleIdxs[index]}:s`);
                }
            });
        }

        // Chapters mapping
        if (chaptersInputIdx !== -1) {
            args.push('-map_metadata', `${chaptersInputIdx}`);
        }

        // Video settings
        if (codec === 'copy') {
            args.push('-c:v', 'copy');
        } else {
            const vCodecMap = {
                'h264': 'libx264',
                'h265': 'libx265',
                'vp9': 'libvpx-vp9',
                'h264_nvenc': 'h264_nvenc',
                'hevc_nvenc': 'hevc_nvenc',
                'h264_amf': 'h264_amf',
                'hevc_amf': 'hevc_amf',
                'h264_qsv': 'h264_qsv',
                'hevc_qsv': 'hevc_qsv'
            };
            args.push('-c:v', vCodecMap[codec] || 'libx264');

            // Presets
            if (codec.includes('nvenc')) {
                const nvencPresets = {
                    'ultrafast': 'p1', 'superfast': 'p2', 'veryfast': 'p3',
                    'faster': 'p4', 'fast': 'p5', 'medium': 'p6', 'slow': 'p7',
                    'slower': 'p7', 'veryslow': 'p7'
                };
                args.push('-preset', nvencPresets[preset] || 'p4');
            } else if (codec.includes('amf')) {
                const amfQuality = {
                    'ultrafast': 'speed', 'superfast': 'speed', 'veryfast': 'speed',
                    'faster': 'speed', 'fast': 'balanced', 'medium': 'balanced',
                    'slow': 'quality', 'slower': 'quality', 'veryslow': 'quality'
                };
                args.push('-quality', amfQuality[preset] || 'balanced');
            } else {
                args.push('-preset', preset);
            }

            // Rate Control
            if (rateMode === 'bitrate') {
                args.push('-b:v', `${bitrate}k`);
                // For average bitrate, we often want a max bitrate or buffer too, but simplified for now
            } else {
                args.push('-crf', crf.toString());
            }

            // FPS
            if (fps && fps !== 'source') {
                args.push('-r', fps);
            }
        }

        // Audio codec
        if (audioCodec !== 'none') {
            if (audioCodec === 'copy') {
                args.push('-c:a', 'copy');
            } else {
                const aCodecMap = { 'aac': 'aac', 'opus': 'libopus' };
                args.push('-c:a', aCodecMap[audioCodec] || 'aac');
                args.push('-b:a', audioBitrate);
            }
        }

        // Subtitle codec (default to copy for simplicity, or mov_text/srt based on format)
        if (format === 'mp4' || format === 'mov') {
            args.push('-c:s', 'mov_text');
        } else {
            args.push('-c:s', 'copy'); // MKV handles most subs as copy
        }

        // Advanced custom args
        if (customArgs) {
            const cArgs = customArgs.split(' ').filter(arg => arg.trim() !== '');
            args.push(...cArgs);
        }

        args.push(outputPath);

        console.log('Running FFmpeg with args:', args.join(' '));

        currentFfmpegProcess = spawn(FFMPEG_PATH, args);

        let durationInSeconds = 0;

        currentFfmpegProcess.stderr.on('data', (data) => {
            const str = data.toString();

            if (!durationInSeconds) {
                const durMatch = str.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.\d{2}/);
                if (durMatch) {
                    durationInSeconds = parseInt(durMatch[1]) * 3600 + parseInt(durMatch[2]) * 60 + parseInt(durMatch[3]);
                }
            }

            const timeMatch = str.match(/time=(\d{2}):(\d{2}):(\d{2})\.\d{2}/);
            const speedMatch = str.match(/speed=\s*(\d+\.?\d*x)/);

            if (timeMatch && durationInSeconds) {
                const currentTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]);
                const percent = Math.min(99, Math.round((currentTime / durationInSeconds) * 100));

                event.reply('encode-progress', {
                    percent,
                    time: timeMatch[1] + ':' + timeMatch[2] + ':' + timeMatch[3],
                    speed: speedMatch ? speedMatch[1] : '0.00x'
                });
            }
        });

        currentFfmpegProcess.on('close', (code) => {
            currentFfmpegProcess = null;
            if (code === 0) {
                event.reply('encode-complete', { outputPath });
            } else {
                event.reply('encode-error', { message: `FFmpeg exited with code ${code}` });
            }
        });
    });


    ipcMain.on('cancel-encode', () => {
        if (currentFfmpegProcess) {
            currentFfmpegProcess.kill();
        }
    });

    ipcMain.on('open-file', (event, path) => shell.openPath(path));
    ipcMain.on('open-folder', (event, path) => shell.showItemInFolder(path));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
