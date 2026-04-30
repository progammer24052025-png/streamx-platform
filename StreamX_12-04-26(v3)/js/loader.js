document.addEventListener('DOMContentLoaded', () => {
    const REDIRECT_DELAY_MS = 3600;
    const EXIT_ANIMATION_MS = 550;
    let isRedirecting = false;

    const goHome = () => {
        if (isRedirecting) return;
        isRedirecting = true;
        document.body.classList.add('loader-fade-out');
        window.setTimeout(() => {
            window.location.href = 'home.html';
        }, EXIT_ANIMATION_MS);
    };

    window.setTimeout(goHome, REDIRECT_DELAY_MS);

    const skipLink = document.querySelector('.skip-link');
    if (skipLink) {
        skipLink.addEventListener('click', (event) => {
            event.preventDefault();
            goHome();
        });
    }
});
