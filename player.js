const FALLBACK_POSTER = 'assets/fallback/poster.svg';
const catalog = window.STREAMX_CATALOG || [];
const movieDB = window.STREAMX_MOVIE_DB || {};
const APP_SETTINGS_KEY = 'streamx_app_settings';

let player = null;
let isMuted = false;
let isPlaying = false;
let originalWatchUrl = '';
let appSettings = {
    themeMode: 'dark',
    accentColor: '#ff2c1f',
    shortcutsEnabled: true,
    defaultVolume: 70,
    startMuted: false
};

function normalizeTitle(value) {
    return (value || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^a-z0-9:()&.\- ]/g, '')
        .trim();
}

function getQueryData() {
    let params = new URLSearchParams(window.location.search);
    return {
        watchUrl: params.get('watch') || '',
        title: params.get('title') || ''
    };
}

function sanitizeExternalUrl(url) {
    try {
        let parsed = new URL(url, window.location.href);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
        return '#';
    } catch {
        return '#';
    }
}

function readAppSettings() {
    try {
        let raw = localStorage.getItem(APP_SETTINGS_KEY);
        let parsed = raw ? JSON.parse(raw) : {};
        return {
            themeMode: parsed?.themeMode || 'dark',
            accentColor: parsed?.accentColor || '#ff2c1f',
            shortcutsEnabled: parsed?.shortcutsEnabled !== false,
            defaultVolume: Number.isFinite(parsed?.defaultVolume) ? Math.max(0, Math.min(100, parsed.defaultVolume)) : 70,
            startMuted: !!parsed?.startMuted
        };
    } catch {
        return { themeMode: 'dark', accentColor: '#ff2c1f', shortcutsEnabled: true, defaultVolume: 70, startMuted: false };
    }
}

function applyThemeMode(themeMode) {
    let resolved = themeMode;
    if (themeMode === 'system') {
        resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.body.classList.toggle('modern-minimal', resolved === 'light');
}

function applyAccentColor(color) {
    document.documentElement.style.setProperty('--main-color', color || '#ff2c1f');
}

function showRedirectNotice(message) {
    let notice = document.getElementById('redirect-notice');
    let noticeText = document.getElementById('redirect-notice-text');
    if (!notice || !noticeText) return;
    noticeText.textContent = message || 'Redirecting to YouTube...';
    notice.classList.add('show');
}

function redirectToOriginalWatchUrl(reasonText) {
    let safeUrl = sanitizeExternalUrl(originalWatchUrl);
    if (safeUrl === '#') {
        showUnsupportedMessage(reasonText || 'This title cannot be played right now.');
        return;
    }
    showRedirectNotice(reasonText || 'Redirecting to YouTube...');
    setTimeout(() => {
        window.location.href = safeUrl;
    }, 1000);
}

function getYouTubeEmbedConfig(url) {
    if (!url) return null;
    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return null;
    }

    let host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    let videoId = '';
    let playlistId = '';

    if (host === 'youtu.be') {
        videoId = parsed.pathname.slice(1);
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
        if (parsed.pathname === '/watch') {
            videoId = parsed.searchParams.get('v') || '';
            playlistId = parsed.searchParams.get('list') || '';
        } else if (parsed.pathname.startsWith('/embed/')) {
            videoId = parsed.pathname.split('/embed/')[1] || '';
        } else if (parsed.pathname === '/playlist') {
            playlistId = parsed.searchParams.get('list') || '';
        } else if (parsed.pathname.startsWith('/shorts/')) {
            videoId = parsed.pathname.split('/shorts/')[1] || '';
        }
    }

    videoId = (videoId || '').trim();
    playlistId = (playlistId || '').trim();

    if (!videoId && !playlistId) return null;
    return { videoId, playlistId };
}

function buildMovieDetails(title) {
    let normalized = normalizeTitle(title);
    let item = catalog.find((entry) => normalizeTitle(entry.title) === normalized);
    let info = movieDB[normalized] || { rating: '—', desc: 'No description available for this title.' };
    return {
        title: item?.title || title || 'Unknown Title',
        year: item?.year || '—',
        genre: item?.genre || '',
        poster: item?.poster || FALLBACK_POSTER,
        rating: info.rating || '—',
        desc: info.desc || 'No description available for this title.'
    };
}

function renderDetails(details) {
    let posterEl = document.getElementById('movie-poster');
    let titleEl = document.getElementById('movie-title');
    let yearEl = document.getElementById('movie-year');
    let ratingEl = document.getElementById('movie-rating');
    let descEl = document.getElementById('movie-desc');
    let genresEl = document.getElementById('movie-genres');

    posterEl.src = details.poster;
    posterEl.alt = details.title;
    posterEl.onerror = () => {
        posterEl.src = FALLBACK_POSTER;
    };

    titleEl.textContent = details.title;
    yearEl.textContent = details.year;
    ratingEl.textContent = details.rating;
    descEl.textContent = details.desc;

    genresEl.innerHTML = '';
    details.genre.split(' ').filter(Boolean).forEach((genre) => {
        let tag = document.createElement('span');
        tag.className = 'genre-tag';
        tag.textContent = genre.charAt(0).toUpperCase() + genre.slice(1);
        genresEl.appendChild(tag);
    });
}

function updatePlayPauseButton() {
    let button = document.getElementById('play-pause-btn');
    button.innerHTML = isPlaying
        ? "<i class='bx bx-pause'></i> Pause"
        : "<i class='bx bx-play'></i> Play";
}

function updateMuteButton() {
    let button = document.getElementById('mute-btn');
    button.innerHTML = isMuted
        ? "<i class='bx bx-volume-mute'></i> Unmute"
        : "<i class='bx bx-volume-full'></i> Mute";
}

function attachControls() {
    let playPauseBtn = document.getElementById('play-pause-btn');
    let rewindBtn = document.getElementById('rewind-btn');
    let forwardBtn = document.getElementById('forward-btn');
    let muteBtn = document.getElementById('mute-btn');

    playPauseBtn.addEventListener('click', () => {
        if (!player) return;
        let state = player.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    });

    rewindBtn.addEventListener('click', () => {
        if (!player) return;
        let nextTime = Math.max((player.getCurrentTime() || 0) - 10, 0);
        player.seekTo(nextTime, true);
    });

    forwardBtn.addEventListener('click', () => {
        if (!player) return;
        let duration = player.getDuration() || 0;
        let nextTime = Math.min((player.getCurrentTime() || 0) + 10, duration || Number.MAX_SAFE_INTEGER);
        player.seekTo(nextTime, true);
    });

    muteBtn.addEventListener('click', () => {
        if (!player) return;
        if (player.isMuted()) {
            player.unMute();
            isMuted = false;
        } else {
            player.mute();
            isMuted = true;
        }
        updateMuteButton();
    });
}

function attachKeyboardControls() {
    if (!appSettings.shortcutsEnabled) return;

    document.addEventListener('keydown', (event) => {
        let tag = event.target?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        if (!player) return;

        let key = event.key.toLowerCase();

        if (key === ' ' || key === 'k') {
            event.preventDefault();
            let state = player.getPlayerState();
            if (state === YT.PlayerState.PLAYING) player.pauseVideo();
            else player.playVideo();
            return;
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            player.seekTo(Math.max((player.getCurrentTime() || 0) - 10, 0), true);
            return;
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            let duration = player.getDuration() || 0;
            let nextTime = Math.min((player.getCurrentTime() || 0) + 10, duration || Number.MAX_SAFE_INTEGER);
            player.seekTo(nextTime, true);
            return;
        }

        if (key === 'm') {
            event.preventDefault();
            if (player.isMuted()) {
                player.unMute();
                isMuted = false;
            } else {
                player.mute();
                isMuted = true;
            }
            updateMuteButton();
        }
    });
}

function initYoutubePlayer(config) {
    window.onYouTubeIframeAPIReady = function () {
        let vars = {
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3
        };

        if (config.playlistId) {
            vars.listType = 'playlist';
            vars.list = config.playlistId;
        }

        player = new YT.Player('player', {
            videoId: config.videoId || undefined,
            playerVars: vars,
            events: {
                onReady: () => {
                    if (player && typeof player.setVolume === 'function') {
                        player.setVolume(appSettings.defaultVolume);
                    }
                    if (player) {
                        if (appSettings.startMuted) {
                            player.mute();
                            isMuted = true;
                        } else {
                            player.unMute();
                            isMuted = false;
                        }
                    }
                    updatePlayPauseButton();
                    updateMuteButton();
                },
                onStateChange: (event) => {
                    isPlaying = event.data === YT.PlayerState.PLAYING;
                    isMuted = player ? player.isMuted() : false;
                    updatePlayPauseButton();
                    updateMuteButton();
                },
                onError: (event) => {
                    if (event.data === 101 || event.data === 150) {
                        redirectToOriginalWatchUrl('Embedding is disabled for this video.');
                        return;
                    }

                    if (event.data === 100) {
                        redirectToOriginalWatchUrl('This video is unavailable.');
                        return;
                    }

                    redirectToOriginalWatchUrl('Playback failed for this title.');
                }
            }
        });
    };

    let script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.body.appendChild(script);
}

function showUnsupportedMessage(message) {
    let playerRoot = document.getElementById('player');
    let safeUrl = sanitizeExternalUrl(originalWatchUrl);
    let cta = safeUrl === '#'
        ? ''
        : `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="btn" style="margin-top:1rem;display:inline-flex;align-items:center;gap:0.35rem;"><i class='bx bx-link-external'></i> Watch on YouTube</a>`;
    playerRoot.innerHTML = `
        <div style="padding:2rem;color:#fff;text-align:center;">
            <p>${message || 'This link cannot be embedded. Please choose another title.'}</p>
            ${cta}
        </div>
    `;
}

function init() {
    appSettings = readAppSettings();
    applyThemeMode(appSettings.themeMode);
    applyAccentColor(appSettings.accentColor);

    let { watchUrl, title } = getQueryData();
    originalWatchUrl = watchUrl;
    let details = buildMovieDetails(title);
    renderDetails(details);

    let embedConfig = getYouTubeEmbedConfig(watchUrl);
    if (!embedConfig) {
        showUnsupportedMessage('This video URL is not supported for in-site playback.');
        return;
    }

    attachControls();
    attachKeyboardControls();
    initYoutubePlayer(embedConfig);
}

init();
