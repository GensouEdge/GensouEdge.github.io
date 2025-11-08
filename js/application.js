document.addEventListener('DOMContentLoaded', () => {

    const homeContent = document.getElementById('content-container').innerHTML;
    const pageCache = {
        home: homeContent,
    };

    const navLinks = document.querySelectorAll('#nav a');

    let activePage = 'home';

    function updateActivePage(page) {
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-page') === page);
        });
        activePage = page;
    }

    async function loadPage(page) {
        if (pageCache[page]) {
            document.getElementById('content-container').innerHTML = pageCache[page];
            updateActivePage(page);
            return;
        }

        try {
            const response = await fetch(`pages/${page}.html`);
            if (!response.ok) throw new Error('Page not found');
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const content = doc.querySelector('.row')?.innerHTML;
            if (!content) throw new Error('Invalid page structure');
            pageCache[page] = content;
            document.getElementById('content-container').innerHTML = content;
            updateActivePage(page);
        } catch (error) {
            console.error('Page load error:', error);
            document.getElementById('content-container').innerHTML =
            `<div class="error-card"><h2>页面加载失败</h2><p>请稍后重试</p></div>`;
        }
    }
    function initRouter() {
        const hash = window.location.hash.substring(1) || 'home';
        loadPage(hash);
    }
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            window.location.hash = page;
        });
    });
    window.addEventListener('hashchange', () => {
        const page = window.location.hash.substring(1) || 'home';
        loadPage(page);
    });
        initRouter();
});