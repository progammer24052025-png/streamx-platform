const PROFILE_KEY = 'streamx_user_profile';
const APP_SETTINGS_KEY = 'streamx_app_settings';
const DEFAULT_PROFILE = { name: 'Guest', emoji: '🙂' };
const DEFAULT_SETTINGS = {
    themeMode: 'dark',
    accentColor: '#ff2c1f',
    celebrationEnabled: true,
    shortcutsEnabled: true,
    defaultVolume: 70,
    startMuted: false
};

let currentEmoji = DEFAULT_PROFILE.emoji;

function readProfile() {
    try {
        let raw = localStorage.getItem(PROFILE_KEY);
        let parsed = raw ? JSON.parse(raw) : null;
        if (!parsed) return { ...DEFAULT_PROFILE };
        return {
            name: (parsed.name || DEFAULT_PROFILE.name).trim() || DEFAULT_PROFILE.name,
            emoji: parsed.emoji || DEFAULT_PROFILE.emoji
        };
    } catch {
        return { ...DEFAULT_PROFILE };
    }
}

function writeProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function readAppSettings() {
    try {
        let raw = localStorage.getItem(APP_SETTINGS_KEY);
        let parsed = raw ? JSON.parse(raw) : {};
        return {
            themeMode: parsed?.themeMode || DEFAULT_SETTINGS.themeMode,
            accentColor: parsed?.accentColor || DEFAULT_SETTINGS.accentColor,
            celebrationEnabled: parsed?.celebrationEnabled !== false,
            shortcutsEnabled: parsed?.shortcutsEnabled !== false,
            defaultVolume: Number.isFinite(parsed?.defaultVolume) ? Math.max(0, Math.min(100, parsed.defaultVolume)) : DEFAULT_SETTINGS.defaultVolume,
            startMuted: !!parsed?.startMuted
        };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

function writeAppSettings(settings) {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
}

function setFeedback(message, type) {
    let feedback = document.getElementById('settings-feedback');
    if (!feedback) return;
    feedback.textContent = message || '';
    feedback.classList.remove('success', 'error');
    if (type) feedback.classList.add(type);
}

function applyThemeMode(themeMode) {
    let resolved = themeMode;
    if (themeMode === 'system') {
        resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.body.classList.toggle('modern-minimal', resolved === 'light');
}

function applyAccentColor(color) {
    let value = color || DEFAULT_SETTINGS.accentColor;
    document.documentElement.style.setProperty('--main-color', value);
}

function updatePreview(name, emoji) {
    let previewName = document.getElementById('preview-name');
    let previewEmoji = document.getElementById('preview-emoji');
    if (previewName) previewName.textContent = name || DEFAULT_PROFILE.name;
    if (previewEmoji) previewEmoji.textContent = emoji || DEFAULT_PROFILE.emoji;
}

function highlightSelectedEmoji() {
    document.querySelectorAll('.emoji-option').forEach((button) => {
        button.classList.toggle('active', button.dataset.emoji === currentEmoji);
    });
}

function hydrateForm() {
    let profile = readProfile();
    let settings = readAppSettings();
    currentEmoji = profile.emoji;
    let usernameInput = document.getElementById('settings-username');
    if (usernameInput) usernameInput.value = profile.name;
    updatePreview(profile.name, profile.emoji);
    highlightSelectedEmoji();

    let themeModeEl = document.getElementById('theme-mode');
    let accentColorEl = document.getElementById('accent-color');
    let celebrationEl = document.getElementById('celebration-enabled');
    let shortcutsEl = document.getElementById('shortcuts-enabled');
    let volumeEl = document.getElementById('default-volume');
    let volumeValueEl = document.getElementById('volume-value');
    let startMutedEl = document.getElementById('start-muted');

    if (themeModeEl) themeModeEl.value = settings.themeMode;
    if (accentColorEl) accentColorEl.value = settings.accentColor;
    if (celebrationEl) celebrationEl.checked = settings.celebrationEnabled;
    if (shortcutsEl) shortcutsEl.checked = settings.shortcutsEnabled;
    if (volumeEl) volumeEl.value = String(settings.defaultVolume);
    if (volumeValueEl) volumeValueEl.textContent = String(settings.defaultVolume);
    if (startMutedEl) startMutedEl.checked = settings.startMuted;

    applyThemeMode(settings.themeMode);
    applyAccentColor(settings.accentColor);
}

function bindEmojiPicker() {
    document.querySelectorAll('.emoji-option').forEach((button) => {
        button.addEventListener('click', () => {
            currentEmoji = button.dataset.emoji || DEFAULT_PROFILE.emoji;
            highlightSelectedEmoji();
            let username = document.getElementById('settings-username')?.value.trim() || DEFAULT_PROFILE.name;
            updatePreview(username, currentEmoji);
        });
    });
}

function bindUsernamePreview() {
    let usernameInput = document.getElementById('settings-username');
    if (!usernameInput) return;
    usernameInput.addEventListener('input', () => {
        updatePreview(usernameInput.value.trim() || DEFAULT_PROFILE.name, currentEmoji);
    });
}

function bindInlineSettingPreview() {
    let themeModeEl = document.getElementById('theme-mode');
    let accentColorEl = document.getElementById('accent-color');
    let volumeEl = document.getElementById('default-volume');
    let volumeValueEl = document.getElementById('volume-value');

    themeModeEl?.addEventListener('change', () => {
        applyThemeMode(themeModeEl.value);
    });

    accentColorEl?.addEventListener('change', () => {
        applyAccentColor(accentColorEl.value);
    });

    volumeEl?.addEventListener('input', () => {
        if (volumeValueEl) volumeValueEl.textContent = volumeEl.value;
    });
}

function bindSave() {
    let form = document.getElementById('settings-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        let username = (document.getElementById('settings-username')?.value || '').trim();
        if (username.length < 2) {
            setFeedback('Username must be at least 2 characters.', 'error');
            return;
        }
        let profile = { name: username, emoji: currentEmoji || DEFAULT_PROFILE.emoji };
        let settings = {
            themeMode: document.getElementById('theme-mode')?.value || DEFAULT_SETTINGS.themeMode,
            accentColor: document.getElementById('accent-color')?.value || DEFAULT_SETTINGS.accentColor,
            celebrationEnabled: !!document.getElementById('celebration-enabled')?.checked,
            shortcutsEnabled: !!document.getElementById('shortcuts-enabled')?.checked,
            defaultVolume: Number(document.getElementById('default-volume')?.value || DEFAULT_SETTINGS.defaultVolume),
            startMuted: !!document.getElementById('start-muted')?.checked
        };
        writeProfile(profile);
        writeAppSettings(settings);
        applyThemeMode(settings.themeMode);
        applyAccentColor(settings.accentColor);
        updatePreview(profile.name, profile.emoji);
        setFeedback('Settings saved successfully.', 'success');
    });
}

function bindReset() {
    let resetBtn = document.getElementById('reset-profile-btn');
    if (!resetBtn) return;

    resetBtn.addEventListener('click', () => {
        writeProfile({ ...DEFAULT_PROFILE });
        writeAppSettings({ ...DEFAULT_SETTINGS });
        hydrateForm();
        setFeedback('Profile reset to default.', 'success');
    });
}

function bindClearData() {
    let clearBtn = document.getElementById('clear-local-data-btn');
    if (!clearBtn) return;

    clearBtn.addEventListener('click', () => {
        localStorage.removeItem(PROFILE_KEY);
        localStorage.removeItem(APP_SETTINGS_KEY);
        localStorage.removeItem('streamx_watch_history');
        localStorage.removeItem('streamx_watchlist');
        hydrateForm();
        setFeedback('All local StreamX data has been cleared.', 'success');
    });
}

hydrateForm();
bindEmojiPicker();
bindUsernamePreview();
bindInlineSettingPreview();
bindSave();
bindReset();
bindClearData();
