const API = 'https://ghibliapi.vercel.app/films';
const moviesEl = document.getElementById('movies');
const loadingEl = document.getElementById('loading');
const searchEl = document.getElementById('search');
const clearBtn = document.getElementById('clear');
const newMovieEl = document.getElementById('new-movie');
const addMovieBtn = document.getElementById('add-movie');

let movies = [];
let favorites = new Set(JSON.parse(localStorage.getItem('favorites') || '[]'));
let custom = JSON.parse(localStorage.getItem('customMovies') || '[]');
let imdbTop = [];

function saveCustom(){
  localStorage.setItem('customMovies', JSON.stringify(custom));
}

function saveFavorites(){
  localStorage.setItem('favorites', JSON.stringify(Array.from(favorites)));
}

function createCard(movie){
  const div = document.createElement('div');
  div.className = 'movie-card';

  const img = document.createElement('img');
  img.src = movie.image || `https://via.placeholder.com/220x300?text=${encodeURIComponent(movie.title)}`;
  img.alt = movie.title;

  const meta = document.createElement('div');
  meta.className = 'movie-meta';

  const h3 = document.createElement('h3');
  h3.textContent = movie.title;

  const p = document.createElement('p');
  p.textContent = movie.description?.slice(0,160) + '...';

  const actions = document.createElement('div');
  actions.className = 'movie-actions';

  const favBtn = document.createElement('button');
  favBtn.className = 'btn secondary';
  favBtn.textContent = favorites.has(movie.id) ? 'Unfavorite' : 'Favorite';
  favBtn.onclick = () => {
    if(favorites.has(movie.id)) favorites.delete(movie.id);
    else favorites.add(movie.id);
    saveFavorites();
    favBtn.textContent = favorites.has(movie.id) ? 'Unfavorite' : 'Favorite';
  };

  const details = document.createElement('button');
  details.className = 'btn primary';
  details.textContent = 'Details';
  details.onclick = () => {
    alert(`${movie.title} (Released: ${movie.release_date})\n\n${movie.description}`);
  };

  const imdb = document.createElement('a');
  imdb.className = 'btn secondary';
  imdb.textContent = 'IMDb';
  // prefer direct imdbId when available, otherwise fall back to search
  if(movie.imdbId){
    imdb.href = `https://www.imdb.com/title/${movie.imdbId}/`;
  }else{
    imdb.href = `https://www.imdb.com/find?q=${encodeURIComponent(movie.title)}`;
  }
  imdb.target = '_blank';
  imdb.rel = 'noopener noreferrer';

  actions.appendChild(favBtn);
  actions.appendChild(details);
  actions.appendChild(imdb);

  meta.appendChild(h3);
  meta.appendChild(p);
  meta.appendChild(actions);

  div.appendChild(img);
  div.appendChild(meta);

  return div;
}

function render(list){
  moviesEl.innerHTML='';
  if(list.length===0){
    moviesEl.innerHTML = '<p class="loading">No movies found</p>';
    return;
  }
  list.forEach(m => moviesEl.appendChild(createCard(m)));
}

async function load(){
  loadingEl.style.display = 'block';
  try{
    const res = await fetch(API);
    movies = await res.json();
    // try load local IMDb top list (cached JSON)
    try{
      const r2 = await fetch('data/imdb-top.json');
      imdbTop = await r2.json();
    }catch(e){
      console.warn('Could not load imdb-top.json', e);
      imdbTop = [];
    }

    // convert imdbTop entries into movie-like objects (keep rank for ordering)
    const imdbItems = imdbTop.map(item => ({
      id: item.imdbId || `imdb-${item.rank}`,
      title: item.title,
      description: `IMDb Top ${item.rank}`,
      image: `https://m.media-amazon.com/images/M/MV5B${item.imdbId || ''}.jpg`,
      imdbId: item.imdbId,
      source: 'imdb'
    }));

    // merge: custom (front) -> imdbTop -> API movies
    const merged = [
      ...custom.map((t,i)=>({id:`custom-${i}`, title:t, description:'User added movie', image:''})),
      ...imdbItems,
      ...movies
    ];
    render(merged);
  }catch(e){
    moviesEl.innerHTML = '<p class="loading">Failed to load movies.</p>';
  }finally{
    loadingEl.style.display = 'none';
  }
}

searchEl.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  const imdbItems = imdbTop.map(item => ({id: item.imdbId || `imdb-${item.rank}`, title: item.title, description:`IMDb Top ${item.rank}`, image:'', imdbId: item.imdbId}));
  const source = [...custom.map((t,i)=>({id:`custom-${i}`, title:t, description:'User added movie', image:''})), ...imdbItems, ...movies];
  const filtered = source.filter(m => (m.title||'').toLowerCase().includes(q) || (m.description||'').toLowerCase().includes(q));
  render(filtered);
});

clearBtn.addEventListener('click', () => {searchEl.value='';render(movies);});

// add new manual movie
function addCustomMovie(title){
  const trimmed = title.trim();
  if(!trimmed) return;
  custom.unshift(trimmed);
  saveCustom();
  // re-render with custom at front
  const imdbItems = imdbTop.map(item => ({id: item.imdbId || `imdb-${item.rank}`, title: item.title, description:`IMDb Top ${item.rank}`, image:'', imdbId: item.imdbId}));
  const merged = [...custom.map((t,i)=>({id:`custom-${i}`, title:t, description:'User added movie', image:''})), ...imdbItems, ...movies];
  render(merged);
}

addMovieBtn.addEventListener('click', () => { addCustomMovie(newMovieEl.value); newMovieEl.value=''; });
newMovieEl.addEventListener('keydown', (e) => { if(e.key==='Enter'){ addCustomMovie(newMovieEl.value); newMovieEl.value=''; } });

load();
