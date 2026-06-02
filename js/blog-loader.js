/**
 * Asia888 – blog index: load cards from assets/data/blogs.json
 */
(function () {
    var PER_PAGE = 6;
    var gridId = 'articles-grid';
    var navId = 'articles-pagination';

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /** Newest synced first — matches scripts/content-sync.js sortBlogsByLatestSyncFirst. */
    function sortPosts(posts) {
        return posts.slice().sort(function (a, b) {
            var aHasSync = Boolean(a.synced_at);
            var bHasSync = Boolean(b.synced_at);
            if (aHasSync !== bHasSync) return aHasSync ? -1 : 1;

            if (aHasSync && bHasSync) {
                var tb = new Date(b.synced_at).getTime();
                var ta = new Date(a.synced_at).getTime();
                if (tb !== ta) return tb - ta;
            }

            var pb = new Date(b.published_date || 0).getTime();
            var pa = new Date(a.published_date || 0).getTime();
            if (pb !== pa) return pb - pa;

            var cb = new Date(b.cms_updated_at || 0).getTime();
            var ca = new Date(a.cms_updated_at || 0).getTime();
            if (cb !== ca) return cb - ca;

            return String(b.slug || '').localeCompare(String(a.slug || ''));
        });
    }

    function renderCard(p) {
        var url = '/blog/' + encodeURIComponent(p.slug) + '/';
        var badge = escapeHtml(p.category || 'Article');
        var title = escapeHtml(p.title || p.slug);
        var ex = String(p.excerpt || '');
        var excerpt = escapeHtml(ex.length > 180 ? ex.slice(0, 180) + '…' : ex);
        var date = escapeHtml(p.published_date || '');
        return (
            '<a class="article-card" href="' + url + '">' +
            '<span class="article-card__badge">' + badge + '</span>' +
            '<h2 class="article-card__title">' + title + '</h2>' +
            '<p class="article-card__excerpt">' + excerpt + '</p>' +
            (date ? '<p class="article-card__meta">' + date + '</p>' : '') +
            '</a>'
        );
    }

    function renderPagination(current, total) {
        var nav = document.getElementById(navId);
        if (!nav || total <= 1) {
            if (nav) nav.innerHTML = '';
            return;
        }

        var base = window.location.pathname || '/blog/';
        var items = [];
        var prevClass = 'articles-pagination__control articles-pagination__control--prev' +
            (current <= 1 ? ' is-disabled' : '');
        var nextClass = 'articles-pagination__control articles-pagination__control--next' +
            (current >= total ? ' is-disabled' : '');
        var pageHref = function (n) {
            if (n <= 1) return base.split('?')[0];
            return base.split('?')[0] + '?page=' + n;
        };

        var prevHref = current > 1 ? pageHref(current - 1) : pageHref(1);
        var nextHref = current < total ? pageHref(current + 1) : pageHref(total);

        items.push('<a class="' + prevClass + '" href="' + prevHref + '"' + (current <= 1 ? '' : ' rel="prev"') + '>Previous</a>');
        items.push('<ul class="articles-pagination__list" role="list">');

        var maxShown = 5;
        var start = Math.max(1, Math.min(current - 2, total - maxShown + 1));
        var end = Math.min(total, start + maxShown - 1);
        if (start > 1) {
            items.push('<li class="articles-pagination__item"><a class="articles-pagination__num" href="' + pageHref(1) + '">1</a></li>');
            if (start > 2) items.push('<li class="articles-pagination__item"><span class="articles-pagination__ellipsis">&hellip;</span></li>');
        }
        for (var i = start; i <= end; i++) {
            var cur = i === current ? ' articles-pagination__num--current' : '';
            var href = pageHref(i);
            items.push('<li class="articles-pagination__item"><a class="articles-pagination__num' + cur + '" href="' + href + '"' + (i === current ? ' aria-current="page"' : '') + '>' + i + '</a></li>');
        }
        if (end < total) {
            if (end < total - 1) items.push('<li class="articles-pagination__item"><span class="articles-pagination__ellipsis">&hellip;</span></li>');
            items.push('<li class="articles-pagination__item"><a class="articles-pagination__num" href="' + pageHref(total) + '">' + total + '</a></li>');
        }
        items.push('</ul>');
        items.push('<a class="' + nextClass + '" href="' + nextHref + '"' + (current >= total ? '' : ' rel="next"') + '>Next</a>');

        nav.innerHTML = items.join('');
    }

    function load() {
        var grid = document.getElementById(gridId);
        if (!grid) return;

        fetch('/assets/data/blogs.json')
            .then(function (res) { return res.json(); })
            .then(function (posts) {
                if (!Array.isArray(posts)) posts = [];
                if (posts.length === 0) {
                    grid.innerHTML = '<p class="articles-grid__status">No articles yet. After you configure Strapi in <code>.env.local</code>, run <code>npm run sync:all</code>.</p>';
                    renderPagination(1, 0);
                    return;
                }

                var sorted = sortPosts(posts);
                var params = new URLSearchParams(window.location.search);
                var page = parseInt(params.get('page') || params.get('p') || '1', 10) || 1;
                var totalPages = Math.ceil(sorted.length / PER_PAGE) || 1;
                if (page < 1) page = 1;
                if (page > totalPages) page = totalPages;

                var slice = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
                grid.innerHTML = slice.map(renderCard).join('');
                renderPagination(page, totalPages);
            })
            .catch(function () {
                grid.innerHTML = '<p class="articles-grid__status">Could not load the article list.</p>';
            });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
    else load();
})();
