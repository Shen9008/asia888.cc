/**
 * Asia888 – scroll animations & UI
 */

document.addEventListener('DOMContentLoaded', function () {
    initScrollObserver();
    initHeaderScroll();
    initSmoothScroll();
    initCountUp();
    initGameCardHover();
});

function initScrollObserver() {
    var options = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, options);

    document.querySelectorAll('[data-animate]').forEach(function (el) {
        observer.observe(el);
    });
}

function initHeaderScroll() {
    var header = document.getElementById('header');
    if (!header) return;

    window.addEventListener('scroll', function () {
        if (window.pageYOffset > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            var href = anchor.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            var target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                var menu = document.getElementById('mobile-menu');
                if (menu && menu.classList.contains('active')) {
                    menu.classList.remove('active');
                }
            }
        });
    });
}

function initCountUp() {
    var stats = document.querySelectorAll('[data-count]');
    if (!stats.length) return;

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                var el = entry.target;
                var target = parseInt(el.getAttribute('data-count'), 10);
                animateValue(el, 0, target, 1500);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    stats.forEach(function (el) { observer.observe(el); });
}

function animateValue(el, start, end, duration) {
    var startTime = performance.now();

    function update(currentTime) {
        var elapsed = currentTime - startTime;
        var progress = Math.min(elapsed / duration, 1);
        var easeOut = 1 - Math.pow(1 - progress, 3);
        var value = Math.floor(start + (end - start) * easeOut);
        el.textContent = value;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = end;
        }
    }

    requestAnimationFrame(update);
}

function initGameCardHover() {
    document.querySelectorAll('.game-card').forEach(function (card) {
        card.addEventListener('mouseenter', function () {
            card.style.zIndex = '2';
        });
        card.addEventListener('mouseleave', function () {
            card.style.zIndex = '1';
        });
    });
}
