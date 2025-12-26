document.addEventListener('DOMContentLoaded', () => {

    // 主题切换功能
    const themeToggleBtn = document.getElementById('theme-toggle');
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'pop') {
            document.documentElement.removeAttribute('data-theme');
            themeToggleBtn.textContent = '波普风格';
        } else {
            document.documentElement.setAttribute('data-theme', 'pop');
            themeToggleBtn.textContent = '默认风格';
        }
    });

    const homeContent = document.getElementById('content-container').innerHTML;

    window.stripText = function(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        // 从索引中排除显式标记为不被索引的节点：
        // - 带有 `data-noindex` 属性或类名 `noindex`
        try {
            tmp.querySelectorAll('[data-noindex], .noindex').forEach(n => n.remove());
        } catch (e) {
            // 容错：若发生异常则继续使用未修改的 tmp
        }
        return (tmp.textContent || '').replace(/\s+/g, ' ').trim();
    };

    window.pageCache = {
        home: { html: homeContent, text: window.stripText(homeContent) },
    };

    // 列出所有通过导航可访问的页面（用于批量抓取 / 索引）
    window.pagesList = Array.from(document.querySelectorAll('#nav a'))
        .map(a => a.getAttribute('data-page'))
        .filter(p => p && p !== 'home');

    const navLinks = document.querySelectorAll('#nav a');

    // 从导航链接中自动读取页面 key -> 显示名（中文）映射
    window.pageNames = Array.from(document.querySelectorAll('#nav a'))
        .map(a => ({ key: a.getAttribute('data-page'), name: a.textContent && a.textContent.trim() }))
        .filter(x => x.key)
        .reduce((m, x) => { m[x.key] = x.name; return m; }, {});

    window.activePage = 'home';

    window.updateActivePage = function(page) {
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-page') === page);
        });
        window.activePage = page;
    };

    window.loadPage = async function(page) {
        if (window.pageCache[page]) {
            document.getElementById('content-container').innerHTML = window.pageCache[page].html;
            window.updateActivePage(page);
            return;
        }

        try {
            const response = await fetch(`pages/${page}.html`);
            if (!response.ok) throw new Error('Page not found');
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            // 将页面中的所有顶级 body 子元素按顺序收集并插入（包括 .row，以及单独的 h1、p 等）
            // 这样可以保证 pages 文件夹里的页面既能显示 .row，也能显示其它独立标签
            const bodyChildren = Array.from(doc.body.children || []);
            let content = '';
            if (bodyChildren.length > 0) {
                content = bodyChildren.map(el => el.outerHTML).join('');
            } else {
                // 兼容回退：如果 body 没有直接子节点，则再尝试查找 .row，最后回退到整个 body.innerHTML
                const rowElems = doc.querySelectorAll('.row');
                if (rowElems.length > 0) {
                    content = Array.from(rowElems).map(el => el.outerHTML).join('');
                } else {
                    content = doc.body.innerHTML || '';
                }
            }
            if (!content) throw new Error('Invalid page structure');
            window.pageCache[page] = { html: content, text: window.stripText(content) };
            document.getElementById('content-container').innerHTML = content;
            window.updateActivePage(page);
        } catch (error) {
            console.error('Page load error:', error);
            document.getElementById('content-container').innerHTML =
            `<div class="error-card"><h2>页面加载失败</h2><p>请稍后重试</p></div>`;
        }
    };

    function initRouter() {
        const hash = window.location.hash.substring(1) || 'home';
        window.loadPage(hash);
    }
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            if (page === 'home') {
                // 保持根路径（不使用 #home），直接使用 index 中已有的内容
                // 保留当前的 path 和 query，移除任何 hash
                history.pushState(null, '', window.location.pathname + window.location.search);
                window.loadPage('home');
            } else {
                window.location.hash = page;
            }
        });
    });
    window.addEventListener('hashchange', () => {
        const page = window.location.hash.substring(1) || 'home';
        window.loadPage(page);
    });
        initRouter();
});