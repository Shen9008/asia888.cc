/**
 * Asia888 – load header/footer partials
 */

(function () {
    var partials = {
        'partial-header': 'partials/header.html',
        'partial-footer': 'partials/footer.html'
    };

    function loadPartial(id, url) {
        var el = document.getElementById(id);
        if (!el) return;

        var path = url.charAt(0) === '/' ? url : '/' + url;
        var fullUrl = new URL(path, window.location.href).href;

        fetch(fullUrl)
            .then(function (res) { return res.text(); })
            .then(function (html) {
                el.innerHTML = html;
                if (id === 'partial-header') initMobileMenu();
            })
            .catch(function () {
                var isHeader = id === 'partial-header';
                el.innerHTML = isHeader
                    ? '<header class="header" id="header"><div class="container"><div class="header__inner"><a href="/" class="header__logo">Asia<span>888</span></a><nav class="header__nav"><a href="/#games">Games</a><a href="/slots.html">Slots</a><a href="/live-casino.html">Live Casino</a><a href="/sports.html">Sports</a><a href="/promotions.html">Promotions</a><a href="/faq.html">FAQ</a></nav><div class="header__actions"><button class="mobile-menu-toggle" aria-label="Toggle menu"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18" stroke-linecap="round"/></svg></button></div></div></div></header>'
                    : '<footer class="footer"><div class="container"><p>&copy; Asia888</p></div></footer>';
                if (isHeader) initMobileMenu();
            });
    }

    function initMobileMenu() {
        var toggle = document.querySelector('.mobile-menu-toggle');
        var menu = document.getElementById('mobile-menu');
        if (!toggle || !menu) return;
        if (toggle.dataset.initialized) return;
        toggle.dataset.initialized = 'true';

        function closeMenu() {
            menu.classList.remove('active');
            var backdrop = document.getElementById('mobile-menu-backdrop');
            if (backdrop) backdrop.classList.remove('active');
            document.body.style.overflow = '';
            var icon = toggle.querySelector('svg path');
            if (icon) icon.setAttribute('d', 'M3 6h18M3 12h18M3 18h18');
        }

        toggle.addEventListener('click', function () {
            var isActive = menu.classList.toggle('active');
            var backdrop = document.getElementById('mobile-menu-backdrop');
            if (backdrop) backdrop.classList.toggle('active', isActive);
            document.body.style.overflow = isActive ? 'hidden' : '';
            var icon = toggle.querySelector('svg path');
            if (icon) icon.setAttribute('d', isActive ? 'M18 6L6 18M6 6l12 12' : 'M3 6h18M3 12h18M3 18h18');
        });

        var backdrop = document.getElementById('mobile-menu-backdrop');
        if (backdrop) backdrop.addEventListener('click', closeMenu);

        menu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', closeMenu);
        });
    }

    Object.keys(partials).forEach(function (id) {
        loadPartial(id, partials[id]);
    });
})();
