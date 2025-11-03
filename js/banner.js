// === Banner 自动轮播 + 按钮 + 滑动 ===
document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.querySelector(".banner-wrapper");
    const slides = document.querySelectorAll(".banner-slide");
    const dots = document.querySelectorAll(".banner-dots span");
    const prevBtn = document.querySelector(".banner-btn.prev");
    const nextBtn = document.querySelector(".banner-btn.next");

    const cards = document.querySelectorAll(".card")
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
                observer.unobserve(e.target);
            }
        });
    });
    cards.forEach(c => observer.observe(c));

    let current = 0;
    let timer;
    const total = slides.length;

    function updateBanner() {
        wrapper.style.transform = `translateX(-${current * 100}%)`;
        dots.forEach((d, i) => d.classList.toggle("active", i === current));
    }

    function nextSlide() {
        current = (current + 1) % total;
        updateBanner();
    }

    function prevSlide() {
        current = (current - 1 + total) % total;
        updateBanner();
    }

    function startAutoPlay() {
        timer = setInterval(nextSlide, 5000);
    }

    function stopAutoPlay() {
        clearInterval(timer);
    }

    // 绑定事件
    nextBtn.addEventListener("click", () => {
        stopAutoPlay();
        nextSlide();
        startAutoPlay();
    });

    prevBtn.addEventListener("click", () => {
        stopAutoPlay();
        prevSlide();
        startAutoPlay();
    });

    dots.forEach((dot, i) => {
        dot.addEventListener("click", () => {
            stopAutoPlay();
            current = i;
            updateBanner();
            startAutoPlay();
        });
    });

    // === 移动端滑动支持 ===
    let startX = 0;
    let endX = 0;

    wrapper.addEventListener("touchstart", e => {
        startX = e.touches[0].clientX;
        stopAutoPlay();
    });

    wrapper.addEventListener("touchmove", e => {
        endX = e.touches[0].clientX;
    });

    wrapper.addEventListener("touchend", () => {
        const delta = endX - startX;
        if (Math.abs(delta) > 50) {
            if (delta > 0) prevSlide();
            else nextSlide();
        }
        startAutoPlay();
    });

    // 初始化
    updateBanner();
    startAutoPlay();
});
