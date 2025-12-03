document.addEventListener('DOMContentLoaded', () => {

    const homeContent = document.getElementById('content-container').innerHTML;

    function stripText(html) {
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
    }

    const pageCache = {
        home: { html: homeContent, text: stripText(homeContent) },
    };

    // 列出所有通过导航可访问的页面（用于批量抓取 / 索引）
    const pagesList = Array.from(document.querySelectorAll('#nav a'))
        .map(a => a.getAttribute('data-page'))
        .filter(p => p && p !== 'home');

    const navLinks = document.querySelectorAll('#nav a');

    // 从导航链接中自动读取页面 key -> 显示名（中文）映射
    const pageNames = Array.from(document.querySelectorAll('#nav a'))
        .map(a => ({ key: a.getAttribute('data-page'), name: a.textContent && a.textContent.trim() }))
        .filter(x => x.key)
        .reduce((m, x) => { m[x.key] = x.name; return m; }, {});

    // 页面关键词映射：当搜索框输入这些关键词时直接跳转到对应页面或文件/链接
    // - 如果 value 是页面 key（例如 'project'），将导航到 `pages/<key>.html`（使用应用内 hash 导航）
    // - 如果 value 是外部 URL（以 'http://' 或 'https://' 或 '//' 开头），将打开该外部链接（默认在新标签）
    // - 如果 value 是站内文件路径（如 '/some.html' 或 'img/pic.png' 或 'pages/other.html'），将导航到该文件路径（在当前页打开）
    // 请把关键词以小写形式添加为 key，值为页面 key、外部 URL，或站内文件路径
    const hiddenPageKeywords = {
        'secret': 'join',
        '秘密': 'join',
        '冴月麟': '03'
    };

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
        // 支持关键词跳转到隐藏页面：优先精确匹配，若无则尝试匹配第一个 token
        const firstToken = q.split(/\s+/)[0];
        const targetPage = hiddenPageKeywords[q] || hiddenPageKeywords[firstToken];
        if (targetPage) {
            // 显示提示后短暂延迟再跳转，以便用户看到反馈
            showNotice('已识别隐藏关键词，正在跳转…');
            const delay = 100; // ms
            // 如果 mapping 值看起来像外部 URL，则在新标签打开；若看起来像文件路径则在当前页导航到该路径；否则按内部页面 key 处理
            const isExternal = /^(https?:)?\/\//i.test(targetPage);
            const looksLikeFile = /(^\/)|\/|\.[a-z0-9]{2,6}$/i.test(targetPage);
            setTimeout(() => {
                if (isExternal) {
                    try {
                        const newWin = window.open(targetPage, '_blank');
                        if (newWin) newWin.opener = null;
                        else window.location.href = targetPage; // popup 被阻止时在当前页打开作为回退
                    } catch (e) {
                        window.location.href = targetPage;
                    }
                } else if (looksLikeFile) {
                    // 将相对或绝对文件路径解析为完整 URL，并在当前页导航
                    try {
                        const url = new URL(targetPage, window.location.href).href;
                        window.location.href = url;
                    } catch (e) {
                        // 解析失败则尝试直接赋值
                        window.location.href = targetPage;
                    }
                } else if (targetPage === 'home') {
                    history.pushState(null, '', window.location.pathname + window.location.search);
                    loadPage('home');
                } else {
                    // 使用 hash 导航以保持应用路由的一致性
                    window.location.hash = targetPage;
                }
            }, delay);
            return;
        }
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
            title.textContent = pageNames[r.page] || r.page;
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

    // 在文档中显示一个短暂的提示（toast），用于提示用户识别到隐藏关键词
    function showNotice(message, duration = 1000) {
        try {
            const existing = document.getElementById('hidden-keyword-notice');
            if (existing) existing.remove();
            const notice = document.createElement('div');
            notice.id = 'hidden-keyword-notice';
            notice.textContent = message;
            // 在移动端（小屏幕）显示为底部居中、加大字号，桌面端保持右上小提示
            const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width:600px)').matches;
            if (isMobile) {
                Object.assign(notice.style, {
                    position: 'fixed',
                    left: '50%',
                    bottom: '20px',
                    transform: 'translateX(-50%)',
                    background: 'rgba(34,34,34,0.97)',
                    color: '#fff',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    zIndex: 2147483647,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                    opacity: '0',
                    transition: 'opacity 180ms ease-in-out, transform 180ms ease-in-out',
                    fontSize: '16px',
                    maxWidth: 'calc(100% - 32px)',
                    textAlign: 'center',
                    touchAction: 'manipulation'
                });
                // 移动端适当延长默认可见时长
                duration = Math.max(duration, 1200);
            } else {
                Object.assign(notice.style, {
                    position: 'fixed',
                    right: '16px',
                    top: '16px',
                    background: 'rgba(34,34,34,0.95)',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    zIndex: 9999,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    opacity: '0',
                    transition: 'opacity 150ms ease-in-out',
                    fontSize: '14px'
                });
            }
            document.body.appendChild(notice);
            // 触发过渡
            requestAnimationFrame(() => { notice.style.opacity = '1'; if (isMobile) notice.style.transform = 'translateX(-50%) translateY(0)'; });
            setTimeout(() => {
                notice.style.opacity = '0';
                if (isMobile) notice.style.transform = 'translateX(-50%) translateY(6px)';
                setTimeout(() => { if (notice.parentNode) notice.parentNode.removeChild(notice); }, 220);
            }, duration);
        } catch (e) {
            // 容错：若 DOM 操作失败则忽略
        }
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