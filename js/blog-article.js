/**
 * Asia888 – blog post: sidebar + related posts from assets/data/blogs.json
 */
(function () {
    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getSlug() {
        var body = document.body;
        return body ? body.getAttribute('data-blog-slug') : null;
    }

    function getRelatedSlugs() {
        var raw = (document.body && document.body.getAttribute('data-related-slugs')) || '';
        return raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }

    function sortPosts(posts) {
        return posts.slice().sort(function (a, b) {
            var tb = new Date(b.published_date || b.synced_at || 0).getTime();
            var ta = new Date(a.published_date || a.synced_at || 0).getTime();
            if (tb !== ta) return tb - ta;
            return String(b.slug || '').localeCompare(String(a.slug || ''));
        });
    }

    function load() {
        var slug = getSlug();
        if (!slug) return;

        fetch('/assets/data/blogs.json')
            .then(function (res) { return res.json(); })
            .then(function (posts) {
                if (!Array.isArray(posts)) return;

                var bySlug = {};
                posts.forEach(function (p) {
                    if (p && p.slug) bySlug[p.slug] = p;
                });

                var sorted = sortPosts(posts);
                var sidebar = document.getElementById('sidebar-posts');
                if (sidebar) {
                    var items = sorted.filter(function (p) { return p.slug !== slug; }).slice(0, 3);
                    if (items.length === 0) {
                        sidebar.innerHTML = '<li class="blog-sidebar-placeholder">More posts soon.</li>';
                    } else {
                        sidebar.innerHTML = items.map(function (p) {
                            var url = '/blog/' + encodeURIComponent(p.slug) + '/';
                            var iso = (p.published_date && String(p.published_date).trim()) || '';
                            var dateLabel = '';
                            if (iso) {
                                var d = new Date(iso);
                                if (!isNaN(d.getTime())) {
                                    dateLabel = d.toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    });
                                }
                            }
                            var timeHtml = dateLabel
                                ? '<time class="blog-sidebar-link__date" datetime="' + escapeHtml(iso) + '">' +
                                    escapeHtml(dateLabel) + '</time>'
                                : '';
                            return (
                                '<li class="blog-sidebar-item">' +
                                '<a class="blog-sidebar-link" href="' + url + '">' +
                                '<span class="blog-sidebar-link__title">' + escapeHtml(p.title || p.slug) + '</span>' +
                                timeHtml +
                                '</a></li>'
                            );
                        }).join('');
                    }
                }

                var relList = document.querySelector('.blog-related-list');
                var relPh = document.querySelector('.blog-related-placeholder');
                var related = getRelatedSlugs().map(function (s) { return bySlug[s]; }).filter(Boolean);

                if (relList && related.length) {
                    relList.hidden = false;
                    relList.innerHTML = related.map(function (p) {
                        var url = '/blog/' + encodeURIComponent(p.slug) + '/';
                        var ex = escapeHtml((p.excerpt || '').slice(0, 140) + ((p.excerpt || '').length > 140 ? '…' : ''));
                        return '<li><a class="blog-related-link" href="' + url + '"><strong>' +
                            escapeHtml(p.title || '') + '</strong><span class="blog-related-link__ex">' +
                            ex + '</span></a></li>';
                    }).join('');
                    if (relPh) relPh.style.display = 'none';
                } else if (relPh) {
                    relPh.textContent = 'See more on the blog index.';
                }
            })
            .catch(function () {
                var sidebar = document.getElementById('sidebar-posts');
                if (sidebar) sidebar.innerHTML = '<li class="blog-sidebar-placeholder">Could not load posts.</li>';
            });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
    else load();
})();
