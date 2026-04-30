// ============================================================
// StreamX - Main JavaScript File
// ============================================================
// HOW TO USE THESE COMMENTS:
//   Lines marked "✏️ CHANGE ..." are the easiest things to
//   modify live during a presentation!
// ============================================================


const FALLBACK_POSTER = 'assets/fallback/poster.svg';
const FALLBACK_BANNER = 'assets/fallback/banner.svg';
const catalog = window.STREAMX_CATALOG || [];
const PROFILE_KEY = 'streamx_user_profile';
const APP_SETTINGS_KEY = 'streamx_app_settings';

let celebrationCanvas = null;
let celebrationCtx = null;
let celebrationParticles = [];
let celebrationAnimationId = null;

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeWatchUrl(url) {
    try {
        let parsed = new URL(url, window.location.href);
        return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? parsed.href : '#';
    } catch {
        return '#';
    }
}

function readProfile() {
    try {
        let raw = localStorage.getItem(PROFILE_KEY);
        let parsed = raw ? JSON.parse(raw) : {};
        return {
            name: (parsed?.name || 'Guest').trim() || 'Guest',
            emoji: parsed?.emoji || '🙂'
        };
    } catch {
        return { name: 'Guest', emoji: '🙂' };
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
            themeMode: parsed?.themeMode || 'dark',
            accentColor: parsed?.accentColor || '#ff2c1f',
            celebrationEnabled: parsed?.celebrationEnabled !== false
        };
    } catch {
        return { themeMode: 'dark', accentColor: '#ff2c1f', celebrationEnabled: true };
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

function applyAppSettings() {
    let settings = readAppSettings();
    applyThemeMode(settings.themeMode);
    applyAccentColor(settings.accentColor);
    return settings;
}

function renderProfileChip() {
    let profile = readProfile();
    let emojiEl = document.getElementById('profile-chip-emoji');
    let nameEl = document.getElementById('profile-chip-name');
    if (emojiEl) emojiEl.textContent = profile.emoji;
    if (nameEl) nameEl.textContent = profile.name;
}

function resizeCelebrationCanvas() {
    if (!celebrationCanvas) return;
    let dpr = window.devicePixelRatio || 1;
    celebrationCanvas.width = Math.floor(window.innerWidth * dpr);
    celebrationCanvas.height = Math.floor(window.innerHeight * dpr);
    celebrationCanvas.style.width = `${window.innerWidth}px`;
    celebrationCanvas.style.height = `${window.innerHeight}px`;
    celebrationCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function playCelebration() {
    let settings = readAppSettings();
    if (!settings.celebrationEnabled) return;

    celebrationCanvas = celebrationCanvas || document.getElementById('celebration-canvas');
    if (!celebrationCanvas) return;
    celebrationCtx = celebrationCtx || celebrationCanvas.getContext('2d');
    if (!celebrationCtx) return;
    resizeCelebrationCanvas();

    if (celebrationAnimationId) {
        cancelAnimationFrame(celebrationAnimationId);
        celebrationAnimationId = null;
    }

    const colors = ['#ff2c1f', '#ffd166', '#4cc9f0', '#b5179e', '#80ed99', '#ffffff'];
    celebrationParticles = Array.from({ length: 170 }, () => ({
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * window.innerHeight * 0.35,
        vx: (Math.random() - 0.5) * 4.2,
        vy: 1.6 + Math.random() * 4.2,
        size: 2 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 70 + Math.random() * 45
    }));

    let frame = 0;
    function step() {
        frame++;
        celebrationCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        celebrationParticles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.025;
            p.life -= 1;
            celebrationCtx.fillStyle = p.color;
            celebrationCtx.fillRect(p.x, p.y, p.size, p.size * 0.68);
        });

        celebrationParticles = celebrationParticles.filter((p) => p.life > 0 && p.y < window.innerHeight + 40);
        if (celebrationParticles.length > 0 && frame < 240) {
            celebrationAnimationId = requestAnimationFrame(step);
            return;
        }

        celebrationCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        celebrationAnimationId = null;
    }

    celebrationAnimationId = requestAnimationFrame(step);
}

function buildInSitePlayerUrl(watchUrl, title) {
    if (!watchUrl) return '#';
    let params = new URLSearchParams({
        watch: watchUrl,
        title: title || ''
    });
    return `player.html?${params.toString()}`;
}

function ensureFormMessage(form) {
    let existing = form.querySelector('.form-feedback');
    if (existing) return existing;

    let feedback = document.createElement('p');
    feedback.className = 'form-feedback';
    feedback.setAttribute('aria-live', 'polite');
    form.appendChild(feedback);
    return feedback;
}

function setFormMessage(form, message, type) {
    let feedback = ensureFormMessage(form);
    feedback.textContent = message;
    feedback.classList.remove('error', 'success');
    if (type) feedback.classList.add(type);
}

function setImageFallback(imgEl) {
    if (!imgEl) return;
    let source = imgEl.getAttribute('src');
    if (source) {
        imgEl.setAttribute('src', source.replace(/\\/g, '/'));
    }

    imgEl.addEventListener('error', () => {
        if (imgEl.dataset.fallbackApplied === 'true') return;
        imgEl.dataset.fallbackApplied = 'true';
        let fallback = imgEl.closest('.container') ? FALLBACK_BANNER : FALLBACK_POSTER;
        imgEl.setAttribute('src', fallback);
    });
}

function attachImageFallbacks() {
    document.querySelectorAll('img').forEach((imgEl) => setImageFallback(imgEl));
}

function normalizeTitle(value) {
    return (value || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^a-z0-9:()&.\- ]/g, '')
        .trim();
}

function buildHeroLookup() {
    let map = new Map();
    catalog.forEach((item) => {
        let destination = item.category === 'anime'
            ? sanitizeWatchUrl(item.watchUrl)
            : buildInSitePlayerUrl(item.watchUrl, item.title);
        map.set(normalizeTitle(item.title), destination);
    });

    // Aliases for hero headings that include taglines or alternate formatting.
    map.set('master feat. vijay and vijay sethupathi', map.get('master') || '#');
    map.set('uri: the surgical strike', map.get('uri') || '#');
    map.set('kgf: chapter 1', map.get('kgf chapter 1') || '#');
    map.set('spy x family', map.get('spy x family') || '#');
    return map;
}

function resolveHeroWatchUrl(slide, heroMap) {
    let explicit = slide.getAttribute('data-watch-url');
    if (explicit) return sanitizeWatchUrl(explicit);

    let heading = slide.querySelector('.home-text h1');
    let headingText = heading ? heading.textContent : '';
    let normalizedHeading = normalizeTitle(headingText);
    if (heroMap.has(normalizedHeading)) return heroMap.get(normalizedHeading);

    // Soft match for headings that include extra text.
    for (let [title, url] of heroMap.entries()) {
        if (normalizedHeading.includes(title) || title.includes(normalizedHeading)) {
            return url;
        }
    }

    return '#';
}

function setupHeroPlayButtons() {
    let heroMap = buildHeroLookup();
    let heroSlides = document.querySelectorAll('.home .swiper-slide.container');

    heroSlides.forEach((slide) => {
        let play = slide.querySelector('.play');
        if (!play) {
            play = document.createElement('button');
            play.className = 'play hero-play';
            play.type = 'button';
            play.innerHTML = "<i class='bx bx-play'></i>";
            slide.appendChild(play);
        } else {
            play.classList.add('hero-play');
            if (play.tagName.toLowerCase() !== 'button') {
                play.setAttribute('role', 'button');
                play.setAttribute('tabindex', '0');
            }
        }

        let watchUrl = resolveHeroWatchUrl(slide, heroMap);
        play.setAttribute('data-watch-url', watchUrl);
        play.setAttribute('aria-label', 'Play featured title');
        play.classList.toggle('is-disabled', watchUrl === '#');
    });

    document.addEventListener('click', (e) => {
        let trigger = e.target.closest('.hero-play');
        if (!trigger) return;

        let watchUrl = trigger.getAttribute('data-watch-url') || '#';
        if (watchUrl === '#') return;
        window.location.href = watchUrl;
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        let trigger = e.target.closest('.hero-play');
        if (!trigger) return;
        e.preventDefault();
        trigger.click();
    });
}

function renderCatalogSections() {
    if (!Array.isArray(catalog) || catalog.length === 0) return;

    let moviesContainer = document.querySelector('#movies .movies-container');
    let animeContainer = document.querySelector('#anime .movies-container');
    let featuredWrapper = document.querySelector('#coming .coming-container .swiper-wrapper');

    let renderCard = (item) => `
        <a href="${item.category === 'anime' ? sanitizeWatchUrl(item.watchUrl) : buildInSitePlayerUrl(item.watchUrl, item.title)}"
           class="box"
           data-genre="${item.genre}"
           data-year="${item.year}"
           data-category="${item.category}">
            <div class="box-img"><img src="${item.poster}" alt="${item.title}"></div>
            <h3>${item.title}</h3>
        </a>
    `;

    let renderFeatured = (item) => `
        <div class="swiper-slide box">
            <a href="${item.category === 'anime' ? sanitizeWatchUrl(item.watchUrl) : buildInSitePlayerUrl(item.watchUrl, item.title)}">
                <div class="box-img"><img src="${item.poster}" alt="${item.title}"></div>
                <h3>${item.title}</h3>
            </a>
        </div>
    `;

    if (moviesContainer) {
        moviesContainer.innerHTML = catalog
            .filter((item) => item.category === 'movies')
            .map(renderCard)
            .join('');
    }

    if (animeContainer) {
        animeContainer.innerHTML = catalog
            .filter((item) => item.category === 'anime')
            .map(renderCard)
            .join('');
    }

    if (featuredWrapper) {
        featuredWrapper.innerHTML = catalog
            .filter((item) => item.featured)
            .map(renderFeatured)
            .join('');
    }
}

// ============================================================
// SECTION 1: HEADER (Navbar & Scroll Shadow)
// ============================================================

// These lines find the header, hamburger menu, and navbar
// elements on the page so JavaScript can control them.
let header  = document.querySelector('header');
let menu    = document.querySelector('#menu-icon');
let navbar  = document.querySelector('.navbar');

// When the user scrolls, add a dark shadow behind the header.
// This makes the navbar readable over any background.
// ✏️ CHANGE: Replace window.scrollY > 0 with a number like 100
//    to only add the shadow after scrolling 100px down.
window.addEventListener('scroll', () => {
    header.classList.toggle('shadow', window.scrollY > 0);
});


// ============================================================
// SECTION 2: MOBILE MENU TOGGLE
// ============================================================

// When the hamburger icon (☰) is clicked on small screens,
// toggle the navbar open/closed and switch the icon to an X.
// ✏️ CHANGE TEXT: Edit the alert inside if you want a popup.
menu.onclick = () => {
    menu.classList.toggle('bx-x');     // Switches icon: ☰ ↔ ✕
    navbar.classList.toggle('active'); // Shows/hides the menu
};

// When the user scrolls, automatically close the mobile menu.
// This prevents the menu from blocking content while scrolling.
window.onscroll = () => {
    menu.classList.remove('bx-x');
    navbar.classList.remove('active');
};


// ============================================================
// SECTION 3: LOGIN MODAL
// ============================================================
// The "modal" is the Sign In popup window.
// We need to grab these 3 elements to open/close it.

let loginBtn   = document.getElementById('login-btn');   // "Sign In" button in navbar
let loginModal = document.getElementById('login-modal'); // The popup overlay
let loginClose = document.getElementById('login-close'); // The ✕ close button
let signupModal = document.getElementById('signup-modal');
let signupClose = document.getElementById('signup-close');
let openSignupLink = document.getElementById('open-signup');
let backToSigninLink = document.getElementById('back-to-signin');

// Open the modal when "Sign In" button is clicked.
// e.preventDefault() stops the link from jumping to the top of the page.
// ✏️ ADD JAVASCRIPT FUNCTION HERE: You can log analytics or track clicks.
loginBtn.onclick = (e) => {
    e.preventDefault();
    loginModal.classList.add('show'); // 'show' makes the modal visible (see style.css)
    signupModal?.classList.remove('show');
};

// Close the modal when the ✕ button is clicked.
loginClose.onclick = () => {
    loginModal.classList.remove('show');
};

if (signupClose) {
    signupClose.onclick = () => {
        signupModal.classList.remove('show');
    };
}

if (openSignupLink) {
    openSignupLink.onclick = (e) => {
        e.preventDefault();
        loginModal.classList.remove('show');
        signupModal?.classList.add('show');
    };
}

if (backToSigninLink) {
    backToSigninLink.onclick = (e) => {
        e.preventDefault();
        signupModal?.classList.remove('show');
        loginModal.classList.add('show');
    };
}

// Close the modal if the user clicks on the dark background (outside the box).
// event.target is what the user actually clicked on.
window.onclick = (event) => {
    if (event.target == loginModal) {
        loginModal.classList.remove('show');
    }
    if (event.target == signupModal) {
        signupModal.classList.remove('show');
    }
};

// Handle what happens when the login form is submitted.
// ✏️ ADD JAVASCRIPT FUNCTION HERE: Replace the alert() below with
//    a real API call to check username/password on a server.
// ✏️ CHANGE TEXT: Update the alert message to anything you like.
let loginForm = document.querySelector('.login-form');
loginForm.onsubmit = (e) => {
    e.preventDefault();
    let emailEl = loginForm.querySelector('#email');
    let passEl = loginForm.querySelector('#password');
    let email = (emailEl?.value || '').trim();
    let password = passEl?.value || '';

    if (!isValidEmail(email)) {
        setFormMessage(loginForm, 'Please enter a valid email address.', 'error');
        return;
    }

    if (password.length < 6) {
        setFormMessage(loginForm, 'Password must be at least 6 characters.', 'error');
        return;
    }

    setFormMessage(loginForm, 'Signed in successfully. Welcome back!', 'success');
    let profile = readProfile();
    if (profile.name === 'Guest') {
        profile.name = email.split('@')[0] || 'Guest';
        writeProfile(profile);
    }
    renderProfileChip();
    playCelebration();
    setTimeout(() => {
        loginModal.classList.remove('show');
        loginForm.reset();
        setFormMessage(loginForm, '', '');
    }, 500);
};

let signupForm = document.querySelector('.signup-form');
if (signupForm) {
    signupForm.onsubmit = (e) => {
        e.preventDefault();
        let name = (signupForm.querySelector('#signup-name')?.value || '').trim();
        let email = (signupForm.querySelector('#signup-email')?.value || '').trim();
        let password = signupForm.querySelector('#signup-password')?.value || '';

        if (name.length < 2) {
            setFormMessage(signupForm, 'Please enter your full name.', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            setFormMessage(signupForm, 'Please enter a valid email address.', 'error');
            return;
        }

        if (password.length < 6) {
            setFormMessage(signupForm, 'Password must be at least 6 characters.', 'error');
            return;
        }

        setFormMessage(signupForm, 'Account created successfully. Please sign in.', 'success');
        setTimeout(() => {
            signupModal?.classList.remove('show');
            signupForm.reset();
            setFormMessage(signupForm, '', '');
            loginModal.classList.add('show');
        }, 650);
    };
}


// ============================================================
// SECTION 4: HERO BANNER SLIDER (Swiper.js)
// ============================================================
// Swiper.js is a library that creates touch-friendly sliders.
// This is the big full-screen banner at the top of the page.

renderCatalogSections();
setupHeroPlayButtons();

// ✏️ EDIT STYLE: Change `delay: 5000` to speed up/slow down
//    the auto-slide (value is in milliseconds, 1000 = 1 second).
var swiper = new Swiper(".home", {
    spaceBetween: 30,         // Gap between slides (in px)
    centeredSlides: true,     // Keep the active slide centered
    autoplay: {
        delay: 5000,                   // ✏️ CHANGE: Auto-slide every 5 seconds
        disableOnInteraction: false,   // Keep auto-playing after user interaction
    },
    pagination: {
        el: ".swiper-pagination",  // The dots shown at the bottom of the slider
        clickable: true,           // Users can click the dots to jump to a slide
    },
});


// ============================================================
// SECTION 5: FEATURED COLLECTION SLIDER (Swiper.js)
// ============================================================
// This is the horizontal scrolling card carousel in the
// "Featured Collection" section of the page.

// ✏️ EDIT STYLE: Change `delay: 55000` to auto-scroll faster.
// ✏️ EDIT STYLE: Change `slidesPerView` numbers to show more/fewer cards.
var swiper2 = new Swiper(".coming-container", {
    spaceBetween: 20,  // Gap between cards
    loop: true,        // Loop back to start after the last card
    autoplay: {
        delay: 55000,                  // ✏️ CHANGE: Very slow auto-scroll (55 seconds)
        disableOnInteraction: false,
    },
    centeredSlides: true,
    // Breakpoints = how many cards to show at each screen width
    breakpoints: {
        0: {
            slidesPerView: 2,  // Mobile: show 2 cards
        },
        568: {
            slidesPerView: 3,  // Small tablet: show 3 cards
        },
        768: {
            slidesPerView: 4,  // Tablet: show 4 cards
        },
        968: {
            slidesPerView: 5,  // Desktop: show 5 cards ✏️ CHANGE number here
        },
    },
});


// ============================================================
// SECTION 6: COLLAPSIBLE SEARCH BAR + AUTO-SCROLL
// ============================================================

let searchWrapper = document.getElementById('search-wrapper');
let searchIcon    = document.getElementById('search-icon');
let searchInput   = document.getElementById('search-input');

// Toggle search bar open/close
searchIcon.addEventListener('click', () => {
    searchWrapper.classList.toggle('active');

    if (searchWrapper.classList.contains('active')) {
        searchInput.focus();
    } else {
        searchInput.value = '';
        clearSearchResults();
    }
});

// Real-time filtering as user types
searchInput.addEventListener('input', () => {
    filterMovies(searchInput.value.trim());
});

// Close search on Escape key
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        searchWrapper.classList.remove('active');
        searchInput.value = '';
        clearSearchResults();
    }
});

function filterMovies(query) {
    let allBoxes   = document.querySelectorAll('.movies .box');
    let noResults  = document.getElementById('no-results');
    let q          = query.toLowerCase();

    if (!q) {
        clearSearchResults();
        return;
    }

    let matchCount = 0;
    let firstMatch = null;

    allBoxes.forEach(box => {
        let title = (box.querySelector('h3')?.textContent || '').toLowerCase();
        let genre = (box.dataset.genre || '').toLowerCase();
        let year  = (box.dataset.year || '');

        let isMatch = title.includes(q) || genre.includes(q) || year.includes(q);

        box.classList.remove('search-match', 'search-dim');

        if (isMatch) {
            box.classList.add('search-match');
            matchCount++;
            if (!firstMatch) firstMatch = box;
        } else {
            box.classList.add('search-dim');
        }
    });

    // Auto-scroll to the first matching movie
    if (firstMatch) {
        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Show/hide no results message
    if (noResults) {
        noResults.style.display = matchCount === 0 ? 'block' : 'none';
    }
}

function clearSearchResults() {
    let allBoxes  = document.querySelectorAll('.movies .box');
    let noResults = document.getElementById('no-results');

    allBoxes.forEach(box => {
        box.classList.remove('search-match', 'search-dim');
    });

    if (noResults) noResults.style.display = 'none';
}


// ============================================================
// SECTION 7: MOVIE DETAIL MODAL
// ============================================================

const movieDB = window.STREAMX_MOVIE_DB || {};

// Get modal elements
let movieModal    = document.getElementById('movie-modal');
let modalClose    = document.getElementById('movie-modal-close');
let modalPoster   = document.getElementById('modal-poster');
let modalTitle    = document.getElementById('modal-title');
let modalYear     = document.getElementById('modal-year');
let modalRatingVal= document.getElementById('modal-rating-val');
let modalGenres   = document.getElementById('modal-genres');
let modalDesc     = document.getElementById('modal-desc');
let modalWatchBtn = document.getElementById('modal-watch-btn');

// Intercept clicks on movie cards (.box inside .movies sections)
document.addEventListener('click', (e) => {
    let box = e.target.closest('.movies .box');
    if (!box) return;

    // Anime titles always open the original YouTube URL directly.
    if ((box.dataset.category || '').toLowerCase() === 'anime') {
        return;
    }

    // Prevent the default link behavior
    e.preventDefault();
    e.stopPropagation();

    // Extract data from the card
    let title     = box.querySelector('h3')?.textContent?.trim() || 'Unknown';
    let posterImg = box.querySelector('.box-img img');
    let posterSrc = posterImg ? posterImg.src : '';
    let year      = box.dataset.year || '—';
    let genre     = box.dataset.genre || '';
    let watchUrl  = box.getAttribute('href') || '#';

    // Lookup in movie database
    let key = title.toLowerCase();
    let info = movieDB[key] || { rating: '—', desc: 'No description available for this title.' };

    // Populate modal
    modalPoster.src = posterSrc;
    modalPoster.alt = title;
    modalTitle.textContent = title;
    modalYear.textContent = year;
    modalRatingVal.textContent = info.rating;
    modalDesc.textContent = info.desc;
    modalWatchBtn.href = watchUrl;
    let hasValidWatchUrl = watchUrl !== '#';
    modalWatchBtn.classList.toggle('is-disabled', !hasValidWatchUrl);
    modalWatchBtn.setAttribute('aria-disabled', hasValidWatchUrl ? 'false' : 'true');
    modalWatchBtn.tabIndex = hasValidWatchUrl ? 0 : -1;

    // Genre tags
    modalGenres.innerHTML = '';
    if (genre) {
        genre.split(' ').forEach(g => {
            let tag = document.createElement('span');
            tag.className = 'genre-tag';
            tag.textContent = g.charAt(0).toUpperCase() + g.slice(1);
            modalGenres.appendChild(tag);
        });
    }

    // Show modal
    movieModal.classList.add('show');
});

// Close modal
if (modalClose) {
    modalClose.addEventListener('click', () => {
        movieModal.classList.remove('show');
    });
}

// Close on backdrop click
if (movieModal) {
    movieModal.addEventListener('click', (e) => {
        if (e.target === movieModal) {
            movieModal.classList.remove('show');
        }
    });
}

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && movieModal.classList.contains('show')) {
        movieModal.classList.remove('show');
    }
});

modalWatchBtn?.addEventListener('click', (e) => {
    if (modalWatchBtn.classList.contains('is-disabled')) {
        e.preventDefault();
    }
});


// ============================================================
// SECTION 8: NEWSLETTER SUBSCRIBE WELCOME TOAST
// ============================================================

let newsletterForm  = document.getElementById('newsletter-form');
let subscribeToast  = document.getElementById('subscribe-toast');
let toastCloseBtn   = document.getElementById('toast-close');
let toastEmailMsg   = document.getElementById('toast-email-msg');

if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();

        let emailInput = document.getElementById('newsletter-email');
        let email = (emailInput ? emailInput.value : '').trim();

        if (!isValidEmail(email)) {
            setFormMessage(newsletterForm, 'Enter a valid email to subscribe.', 'error');
            return;
        }

        if (toastEmailMsg) {
            toastEmailMsg.textContent = `Thank you for subscribing with: ${email}`;
        }

        if (subscribeToast) {
            subscribeToast.classList.add('show');
        }

        newsletterForm.reset();
        setFormMessage(newsletterForm, 'Subscription successful.', 'success');
        playCelebration();
        newsletterForm.classList.add('newsletter-success');
        setTimeout(() => {
            newsletterForm.classList.remove('newsletter-success');
        }, 2200);
    });
}

if (toastCloseBtn) {
    toastCloseBtn.addEventListener('click', () => {
        subscribeToast.classList.remove('show');
    });
}

if (subscribeToast) {
    subscribeToast.addEventListener('click', (e) => {
        if (e.target === subscribeToast) {
            subscribeToast.classList.remove('show');
        }
    });
}

attachImageFallbacks();
applyAppSettings();
renderProfileChip();
window.addEventListener('resize', resizeCelebrationCanvas);