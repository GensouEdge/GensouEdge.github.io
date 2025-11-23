document.addEventListener('DOMContentLoaded', () => {

    const homeContent = document.getElementById('content-container').innerHTML;

    function stripText(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return (tmp.textContent || '').replace(/\s+/g, ' ').trim();
    }

    const pageCache = {
        home: { html: homeContent, text: stripText(homeContent) },
    };

    // 列出所有通过导航可访问的页面（用于批量抓取 / 索引）
    const pagesList = Array.from(document.querySelectorAll('#nav a'))
        .map(a => a.getAttribute('data-page'))
        .filter(p => p && p !== 'home');

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
            document.getElementById('content-container').innerHTML = pageCache[page].html;
            updateActivePage(page);
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
            pageCache[page] = { html: content, text: stripText(content) };
            document.getElementById('content-container').innerHTML = content;
            updateActivePage(page);
        } catch (error) {
            console.error('Page load error:', error);
            document.getElementById('content-container').innerHTML =
            `<div class="error-card"><h2>页面加载失败</h2><p>请稍后重试</p></div>`;
        }
    }
    
    // 确保所有导航页面都已缓存（并预先抓取用于搜索）
    async function ensureAllPagesCached() {
        const uncached = pagesList.filter(p => !pageCache[p]);
        await Promise.all(uncached.map(async (p) => {
            try {
                const response = await fetch(`pages/${p}.html`);
                if (!response.ok) return;
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const bodyChildren = Array.from(doc.body.children || []);
                let content = '';
                if (bodyChildren.length > 0) {
                    content = bodyChildren.map(el => el.outerHTML).join('');
                } else {
                    const rowElems = doc.querySelectorAll('.row');
                    if (rowElems.length > 0) content = Array.from(rowElems).map(el => el.outerHTML).join('');
                    else content = doc.body.innerHTML || '';
                }
                pageCache[p] = { html: content, text: stripText(content) };
            } catch (e) {
                // 忽略单页抓取错误，继续其它页面
            }
        }));
    }

    // 执行搜索并渲染结果
    async function performSearch(query) {
        const q = (query || '').trim().toLowerCase();
        if (!q) return;
        await ensureAllPagesCached();
        const results = [];
        for (const [page, data] of Object.entries(pageCache)) {
            const text = (data && data.text) ? data.text.toLowerCase() : '';
            const idx = text.indexOf(q);
            if (idx !== -1) {
                const start = Math.max(0, idx - 60);
                const snippet = data.text.substring(start, Math.min(data.text.length, idx + 120));
                // 高亮（简单替换，已小写匹配，因此用正则忽略大小写替换原 snippet）
                const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
                const highlighted = snippet.replace(re, m => `<mark>${m}</mark>`);
                results.push({ page, snippet: highlighted });
            }
        }
        renderSearchResults(results);
    }

    function renderSearchResults(results) {
        const container = document.getElementById('content-container');
        container.innerHTML = '';
        if (!results || results.length === 0) {
            container.innerHTML = `<div class="search-no-results">未找到匹配结果</div>`;
            return;
        }
        const wrapper = document.createElement('div');
        wrapper.className = 'search-results';
        results.forEach(r => {
            const card = document.createElement('div');
            card.className = 'card';
            const title = document.createElement('h2');
            title.textContent = r.page === 'home' ? '首页' : r.page;
            const p = document.createElement('p');
            p.innerHTML = r.snippet;
            const btn = document.createElement('a');
            btn.href = '#'+r.page;
            btn.textContent = '查看';
            btn.className = 'btn-primary';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (r.page === 'home') {
                    history.pushState(null, '', window.location.pathname + window.location.search);
                    loadPage('home');
                } else {
                    window.location.hash = r.page;
                }
            });
            card.appendChild(title);
            card.appendChild(p);
            card.appendChild(btn);
            wrapper.appendChild(card);
        });
        container.appendChild(wrapper);
    }

    // 搜索表单事件绑定
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            performSearch(searchInput.value);
        });
        // 支持回车触发
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch(searchInput.value);
            }
        });
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