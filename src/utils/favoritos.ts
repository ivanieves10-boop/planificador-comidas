export function cargarFavoritos(): Set<string> {
  try {
    const raw = localStorage.getItem('platos_favoritos');
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map((s: string) => s.trim().toLowerCase()) : []);
  } catch (e) {
    return new Set();
  }
}

export function esFavorito(plato: string): boolean {
  const favs = cargarFavoritos();
  return favs.has(plato.trim().toLowerCase());
}

export function toggleFavorito(plato: string): boolean {
  const favs = cargarFavoritos();
  const norm = plato.trim().toLowerCase();
  let nuevo: boolean;
  if (favs.has(norm)) {
    favs.delete(norm);
    nuevo = false;
  } else {
    favs.add(norm);
    nuevo = true;
  }
  localStorage.setItem('platos_favoritos', JSON.stringify(Array.from(favs)));
  return nuevo;
}
