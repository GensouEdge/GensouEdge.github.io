let currentUrl = window.location.href;

if (currentUrl.endsWith('.html')) {
    let newUrl = currentUrl.slice(0, -5);
    window.history.replaceState(null, '', newUrl);
    // 这实现太他妈蠢了，我也不想用
}
