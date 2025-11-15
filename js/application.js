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
            // 收集页面中所有的 .row 元素并保留它们的 outerHTML，
            // 这样可以在页面中显示多个 row（例如第二个及后续的 row）
            const rowElems = doc.querySelectorAll('.row');
            let content = '';
            if (rowElems.length > 0) {
                content = Array.from(rowElems).map(el => el.outerHTML).join('');
            } else {
                // 回退：如果没有找到 .row，则使用 body 的 innerHTML（可兼容不同页面结构）
                content = doc.body.innerHTML || '';
            }
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
            if (page === 'home') {
                // 保持根路径（不使用 #home），直接使用 index 中已有的内容
                // 保留当前的 path 和 query，移除任何 hash
                history.pushState(null, '', window.location.pathname + window.location.search);
                loadPage('home');
            } else {
                window.location.hash = page;
            }
        });
    });
    window.addEventListener('hashchange', () => {
        const page = window.location.hash.substring(1) || 'home';
        loadPage(page);
    });
        initRouter();
});