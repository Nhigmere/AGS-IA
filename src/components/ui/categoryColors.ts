import type { CategoriaAlimento } from '../../models/types';

export const COLORES_CATEGORIA: Record<CategoriaAlimento, string> = {
  'Proteína animal': '#4F8CFF',
  Leguminosas: '#34D399',
  Lácteos: '#60A5FA',
  Cereales: '#F5B85A',
  Frutas: '#FB7185',
  Verduras: '#4ADE80',
  Grasas: '#C084FC',
  Otros: '#A3A3A3',
};

export function obtenerColorCategoria(categoria: CategoriaAlimento): string {
  return COLORES_CATEGORIA[categoria] ?? '#94A3B8';
}
