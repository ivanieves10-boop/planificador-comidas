export const CATEGORIAS_OFICIALES = [
  "Frutas y Verduras",
  "Carnicería",
  "Pescadería",
  "Lácteos",
  "Panadería",
  "Despensa",
  "Bebidas",
  "Congelados",
  "Otros"
];

export function normalizarCategoria(catOriginal?: string | null): string {
  if (!catOriginal || catOriginal.trim() === '') return "Otros";
  const norm = catOriginal.trim().toLowerCase();

  if (norm.includes('fruta') || norm.includes('verdura')) return "Frutas y Verduras";
  if (norm.includes('carne') || norm.includes('carnicer')) return "Carnicería";
  if (norm.includes('pescado') || norm.includes('pescader') || norm.includes('marisco')) return "Pescadería";
  if (norm.includes('lácteo') || norm.includes('lacteo') || norm.includes('queso') || norm.includes('leche') || norm.includes('huevo')) return "Lácteos";
  if (norm.includes('pan') || norm.includes('panader') || norm.includes('boller')) return "Panadería";
  if (norm.includes('pasta') || norm.includes('arroz') || norm.includes('legumbre') || norm.includes('conserva') || norm.includes('condimento') || norm.includes('especia') || norm.includes('despensa') || norm.includes('aceite') || norm.includes('harina')) return "Despensa";
  if (norm.includes('bebida') || norm.includes('refresco') || norm.includes('agua') || norm.includes('vino') || norm.includes('cerveza')) return "Bebidas";
  if (norm.includes('congelado')) return "Congelados";

  const match = CATEGORIAS_OFICIALES.find(c => c.toLowerCase() === catOriginal.trim().toLowerCase());
  return match || "Otros";
}
