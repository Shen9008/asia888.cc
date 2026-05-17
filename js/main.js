/**
 * Asia888 – scroll animations & UI
 */

document.addEventListener('DOMContentLoaded', function () {
    initScrollObserver();
    initHeaderScroll();
    initSmoothScroll();
    initScrollToTop();
    initCountUp();
    initGameCardHover();
    initFaqRailScrollSpy();
    initFaqRailAsideOverflowFade();
});

/**
 * Fixed control: scroll to top after user has scrolled down.
 */
function initScrollToTop() {
    if (document.getElementById('scroll-top')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'scroll-top';
    btn.className = 'scroll-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML =
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
        '<path d="M12 19V5M5 12l7-7 7 7" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>';
    document.body.appendChild(btn);

    var threshold = 400;
    var ticking = false;

    function syncVisibility() {
        ticking = false;
        var y = window.scrollY || document.documentElement.scrollTop;
        btn.classList.toggle('scroll-top--visible', y >= threshold);
    }

    function onScroll() {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(syncVisibility);
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    syncVisibility();

    btn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: scrollBehaviorForInPageNav() });
        btn.blur();
    });
}

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

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function scrollBehaviorForInPageNav() {
    return prefersReducedMotion() ? 'auto' : 'smooth';
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
                    behavior: scrollBehaviorForInPageNav(),
                    block: 'start'
                });

                var menu = document.getElementById('mobile-menu');
                if (menu && menu.classList.contains('active')) {
                    menu.classList.remove('active');
                    var backdrop = document.getElementById('mobile-menu-backdrop');
                    if (backdrop) {
                        backdrop.classList.remove('active');
                        backdrop.setAttribute('aria-hidden', 'true');
                    }
                    document.body.style.overflow = '';
                    var menuToggle = document.querySelector('.mobile-menu-toggle');
                    if (menuToggle) {
                        menuToggle.setAttribute('aria-expanded', 'false');
                        menuToggle.setAttribute('aria-label', 'Open menu');
                        var p = menuToggle.querySelector('svg path');
                        if (p) p.setAttribute('d', 'M3 6h18M3 12h18M3 18h18');
                    }
                }
            }
        });
    });
}

/**
 * FAQ rail: highlight Jump-to link for the section nearest the reading line.
 */
function initFaqRailScrollSpy() {
    var article = document.getElementById('faq-guide');
    if (!article || !article.classList.contains('seo-content--faq-rail')) return;

    var body = article.querySelector('.seo-content__body');
    var nav = article.querySelector('.seo-aside__stats--jump');
    if (!body || !nav) return;

    var headings = Array.prototype.slice.call(body.querySelectorAll('h2[id]'));
    var links = nav.querySelectorAll('a[href^="#"]');
    if (!headings.length || !links.length) return;

    var linkById = {};
    links.forEach(function (a) {
        var id = a.getAttribute('href').slice(1);
        if (id) linkById[id] = a;
    });

    function headerProbeY() {
        var header = document.getElementById('header');
        var h = header ? header.offsetHeight : 0;
        return Math.max(h, 72) + 36;
    }

    function setActive(id) {
        links.forEach(function (a) {
            a.classList.remove('is-active');
            a.removeAttribute('aria-current');
        });
        var active = linkById[id];
        if (active) {
            active.classList.add('is-active');
            active.setAttribute('aria-current', 'true');
        }
    }

    function onScrollOrResize() {
        var probe = headerProbeY();
        var chosen = headings[0].id;

        headings.forEach(function (h2) {
            if (h2.getBoundingClientRect().top <= probe) chosen = h2.id;
        });

        var nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;
        if (nearBottom && headings.length) {
            chosen = headings[headings.length - 1].id;
        }

        setActive(chosen);
    }

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    onScrollOrResize();
}

/**
 * FAQ sticky rail: bottom fade when content scrolls inside the rail.
 */
function initFaqRailAsideOverflowFade() {
    var aside = document.querySelector('.seo-content--faq-rail .seo-content__aside--faq');
    if (!aside) return;

    var mq = window.matchMedia('(min-width: 1024px)');
    function tick() {
        if (!mq.matches) {
            aside.classList.remove('seo-content__aside--faq-overflow', 'seo-content__aside--faq-at-bottom');
            return;
        }
        var overflows = aside.scrollHeight > aside.clientHeight + 2;
        aside.classList.toggle('seo-content__aside--faq-overflow', overflows);
        var atBottom = aside.scrollHeight - aside.scrollTop <= aside.clientHeight + 6;
        aside.classList.toggle('seo-content__aside--faq-at-bottom', overflows && atBottom);
    }

    aside.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick, { passive: true });
    if (mq.addEventListener) {
        mq.addEventListener('change', tick);
    } else if (mq.addListener) {
        mq.addListener(tick);
    }
    tick();
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
