const API_KEY = '086cfe05dd16828e37291d2f37293a38';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_W500 = (path) => `https://image.tmdb.org/t/p/w500${path}`;
const IMAGE_ORIG = (path) => `https://image.tmdb.org/t/p/original${path}`;

const appEl = document.getElementById('app');
const loadingEl = document.getElementById('loading');
const searchInput = document.getElementById('searchInput');

function setLoading(v) { loadingEl.style.display = v ? 'block' : 'none'; }

async function apiGet(path, params = {}) {
  const url = new URL(`${BASE_URL}/${path}`);
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('language', params.language || 'en-US');
  if (params.query) url.searchParams.set('query', params.query);
  if (params.page) url.searchParams.set('page', params.page);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function escapeHtml(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function setActiveNav() {
  const links = document.querySelectorAll('.nav-link');
  links.forEach(a => a.classList.remove('active'));
  const hash = location.hash.replace(/^#/, '') || '/';
  if (hash.startsWith('/movies')) document.querySelector('.nav-link[href="#/movies"]').classList.add('active');
  else if (hash.startsWith('/tv')) document.querySelector('.nav-link[href="#/tv"]').classList.add('active');
  else document.querySelector('.nav-link[href="#/"]').classList.add('active');
}

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  return { path, params };
}

async function router() {
  setActiveNav();
  const { path, params } = parseHash();
  if (path === '/' || path === '') return renderHome();
  if (path === '/movies') return renderMoviesCatalog(params);
  if (path === '/tv') return renderTvCatalog(params);
  if (path.startsWith('/movie/')) return renderDetail('movie', path.split('/')[2]);
  if (path.startsWith('/tv/')) return renderDetail('tv', path.split('/')[2]);
  if (path === '/search') return renderSearch(params);
  return renderHome();
}

async function renderHome() {
  setLoading(true);
  try {
    const movies = await apiGet('movie/popular', { page: 1 });
    const trending = await apiGet('trending/all/day');
    const tv = await apiGet('tv/popular', { page: 1 });
    const hero = trending.results[0] || movies.results[0] || {};

    appEl.innerHTML = `
      <section class="hero">
        <img class="backdrop" src="${hero.backdrop_path ? IMAGE_ORIG(hero.backdrop_path) : ''}" alt="">
        <div class="hero-info">
          <h2>${escapeHtml(hero.title || hero.name || 'Featured')}</h2>
          <p>${escapeHtml((hero.overview || '').slice(0, 200))}...</p>
          <a class="chip" href="#/${hero.media_type === 'tv' || !hero.title ? 'tv' : 'movie'}/${hero.id}">
            <i class='bx bx-play-circle' style='margin-right:8px;font-size:20px'></i> View Details
          </a>
        </div>
      </section>
      <section class="section"><h3><i class='bx bxs-hot'></i> Trending Now</h3><div class="movies-grid" id="trending-grid"></div></section>
      <section class="section"><h3><i class='bx bxs-movie-play'></i> Popular Movies</h3><div class="movies-grid" id="popular-movies"></div></section>
      <section class="section"><h3><i class='bx bxs-tv'></i> Popular TV Series</h3><div class="movies-grid" id="popular-tv"></div></section>
    `;

    renderGrid('#trending-grid', trending.results.slice(0, 12), '');
    renderGrid('#popular-movies', movies.results.slice(0, 12), 'movie');
    renderGrid('#popular-tv', tv.results.slice(0, 12), 'tv');
  } catch (e) { appEl.innerHTML = `<p class="loading">Failed to load home: ${e.message}</p>`; }
  finally { setLoading(false); }
}

function renderGrid(selector, list, type = 'movie') {
  const el = document.querySelector(selector);
  if (!el) return;
  if (!list || list.length === 0) { el.innerHTML = '<p class="loading">No items</p>'; return; }
  el.innerHTML = list.map(m => {
    const img = m.poster_path ? IMAGE_W500(m.poster_path) : 'https://via.placeholder.com/500x750?text=No+Image';
    const title = m.title || m.name || '';
    const date = m.release_date || m.first_air_date || '';
    const year = date ? new Date(date).getFullYear() : 'N/A';
    const mediaType = type || m.media_type || (m.title ? 'movie' : 'tv');

    return `
      <article class="card" onclick="location.hash='#/${mediaType}/${m.id}'">
        <img src="${img}" alt="${escapeHtml(title)}" loading="lazy">
        <div class="meta">
          <h3 class="title">${escapeHtml(title)}</h3>
          <div class="subtitle">
            <span style="color: #ffc107"><i class='bx bxs-star'></i> ${(m.vote_average || 0).toFixed(1)}</span>
            <span style="margin-left:auto">${year}</span>
          </div>
        </div>
      </article>`;
  }).join('');
}

async function renderDetail(type, id) {
  setLoading(true);
  try {
    const detail = await apiGet(`${type}/${id}`);
    const credits = await apiGet(`${type}/${id}/credits`);
    const videos = await apiGet(`${type}/${id}/videos`);
    const trailer = (videos.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube');

    appEl.innerHTML = `
      <div class="detail">
        <div class="poster"><img src="${detail.poster_path ? IMAGE_W500(detail.poster_path) : 'https://via.placeholder.com/500x750?text=No+Image'}" alt=""></div>
        <div class="info">
          <h2>${escapeHtml(detail.title || detail.name)}</h2>
          <div class="chips">${(detail.genres || []).map(g => `<span class="chip-ghost">${escapeHtml(g.name)}</span>`).join('')}</div>
          <p>${escapeHtml(detail.overview)}</p>
          <p>Release: ${detail.release_date || detail.first_air_date || 'N/A'} · Runtime: ${detail.runtime || detail.episode_run_time?.[0] || 'N/A'} min</p>
          <h4>Cast</h4>
          <div class="cast-grid">${(credits.cast || []).slice(0, 8).map(c => `<div class="cast"><img src="${c.profile_path ? IMAGE_W500(c.profile_path) : 'https://via.placeholder.com/200x300?text=No+Image'}"><div>${escapeHtml(c.name)}</div><div style="font-size:12px;color:var(--muted)">as ${escapeHtml(c.character || '')}</div></div>`).join('')}</div>
          ${trailer ? `<h4>Trailer</h4><iframe width="100%" height="420" src="https://www.youtube.com/embed/${trailer.key}" frameborder="0" allowfullscreen></iframe>` : ''}
        </div>
      </div>
      <footer class="site-footer">Built with TMDB API</footer>
    `;
  } catch (e) { appEl.innerHTML = `<p class="loading">Failed to load detail: ${e.message}</p>`; }
  finally { setLoading(false); }
}

async function renderMoviesCatalog(params) {
  setLoading(true);
  try {
    const popular = await apiGet('movie/popular');
    const topRated = await apiGet('movie/top_rated');
    const upcoming = await apiGet('movie/upcoming');

    appEl.innerHTML = `
      <section class="section"><h3><i class='bx bxs-star'></i> Top Rated Movies</h3><div class="movies-grid" id="movies-top"></div></section>
      <section class="section"><h3><i class='bx bxs-hot'></i> Popular Now</h3><div class="movies-grid" id="movies-popular"></div></section>
      <section class="section"><h3><i class='bx bxs-calendar-plus'></i> Upcoming</h3><div class="movies-grid" id="movies-upcoming"></div></section>
    `;

    renderGrid('#movies-top', topRated.results.slice(0, 12), 'movie');
    renderGrid('#movies-popular', popular.results.slice(0, 12), 'movie');
    renderGrid('#movies-upcoming', upcoming.results.slice(0, 12), 'movie');
  } catch (e) { appEl.innerHTML = `<p class="loading">Movies catalog failed: ${e.message}</p>`; }
  finally { setLoading(false); }
}

async function renderTvCatalog(params) {
  setLoading(true);
  try {
    const popular = await apiGet('tv/popular');
    const topRated = await apiGet('tv/top_rated');
    const airingToday = await apiGet('tv/airing_today');

    appEl.innerHTML = `
      <section class="section"><h3><i class='bx bxs-star'></i> Top Rated Series</h3><div class="movies-grid" id="tv-top"></div></section>
      <section class="section"><h3><i class='bx bxs-hot'></i> Popular Now</h3><div class="movies-grid" id="tv-popular"></div></section>
      <section class="section"><h3><i class='bx bxs-calendar-star'></i> Airing Today</h3><div class="movies-grid" id="tv-airing"></div></section>
    `;

    renderGrid('#tv-top', topRated.results.slice(0, 12), 'tv');
    renderGrid('#tv-popular', popular.results.slice(0, 12), 'tv');
    renderGrid('#tv-airing', airingToday.results.slice(0, 12), 'tv');
  } catch (e) { appEl.innerHTML = `<p class="loading">TV catalog failed: ${e.message}</p>`; }
  finally { setLoading(false); }
}

async function renderSearch(params) {
  setLoading(true);
  try {
    if (!params.query) { location.hash = '#/'; return; }
    const data = await apiGet('search/multi', { query: params.query, page: params.page || 1 });
    appEl.innerHTML = `<section class="section"><h3>Search results for "${escapeHtml(params.query)}"</h3><div class="movies-grid" id="search-grid"></div></section>`;
    const results = (data.results || [])
      .filter(r => r.media_type !== 'person')
      .map(r => ({ ...r, media_type: r.media_type || (r.title ? 'movie' : 'tv') }));
    renderGrid('#search-grid', results, '');
  } catch (e) { appEl.innerHTML = `<p class="loading">Search failed: ${e.message}</p>`; }
  finally { setLoading(false); }
}

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const q = searchInput.value.trim();
    if (!q) location.hash = '#/'; else location.hash = `#/search?query=${encodeURIComponent(q)}&page=1`;
  }
});

window.addEventListener('hashchange', router);
router();
