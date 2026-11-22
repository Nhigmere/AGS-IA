/**
 * Abstracción mínima de persistencia compatible con localStorage en navegador
 * y segura en entornos sin DOM (Node / Web Worker).
 */
export interface AlmacenPersistencia {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

export function obtenerAlmacenPorDefecto(): AlmacenPersistencia | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      const storage = (globalThis as { localStorage?: AlmacenPersistencia }).localStorage;
      if (
        storage &&
        typeof storage.getItem === 'function' &&
        typeof storage.setItem === 'function' &&
        typeof storage.removeItem === 'function'
      ) {
        return storage;
      }
    }
  } catch {
    return null;
  }
  return null;
}
