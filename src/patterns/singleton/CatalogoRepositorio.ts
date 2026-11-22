import { CATALOGO_INICIAL_DATOS } from '../../data/catalogoInicial';
import type { Alimento } from '../../models/Alimento';
import type { DatosAlimento } from '../../models/types';
import { AlimentoFactory } from '../factory/AlimentoFactory';
import { type AlmacenPersistencia, obtenerAlmacenPorDefecto } from './storage';

const CLAVE_STORAGE_CATALOGO = 'ags_dieta_catalogo_v1';

/**
 * Singleton que administra el CRUD y la persistencia del catálogo de alimentos.
 * Siempre expone copias/snapshots inmutables para evitar mutaciones externas y
 * facilitar la serialización hacia el Web Worker.
 */
export class CatalogoRepositorio {
  private static instancia: CatalogoRepositorio | null = null;

  private alimentos: Alimento[] = [];
  private readonly almacen: AlmacenPersistencia | null;

  private constructor(almacen: AlmacenPersistencia | null) {
    this.almacen = almacen;
    this.cargarInicial();
  }

  public static obtenerInstancia(almacen?: AlmacenPersistencia | null): CatalogoRepositorio {
    if (CatalogoRepositorio.instancia === null) {
      const destino = almacen === undefined ? obtenerAlmacenPorDefecto() : almacen;
      CatalogoRepositorio.instancia = new CatalogoRepositorio(destino);
    }
    return CatalogoRepositorio.instancia;
  }

  /** Reinicia la instancia singleton (destinado a aislamiento en pruebas unitarias). */
  public static reiniciarInstancia(): void {
    CatalogoRepositorio.instancia = null;
  }

  private cargarInicial(): void {
    if (this.almacen) {
      try {
        const crudo = this.almacen.getItem(CLAVE_STORAGE_CATALOGO);
        if (crudo) {
          const parsed: unknown = JSON.parse(crudo);
          this.alimentos = AlimentoFactory.crearCatalogoDesdeJSON(parsed);
          return;
        }
      } catch {
        // Si los datos persistidos están corruptos, se restaura el catálogo original.
      }
    }

    this.alimentos = AlimentoFactory.crearCatalogoDesdeJSON(CATALOGO_INICIAL_DATOS);
  }

  private persistir(): void {
    if (!this.almacen) return;
    try {
      this.almacen.setItem(CLAVE_STORAGE_CATALOGO, JSON.stringify(this.obtenerSnapshot()));
    } catch {
      // Ignora fallos de cuota de almacenamiento para no interrumpir la sesión.
    }
  }

  public get longitud(): number {
    return this.alimentos.length;
  }

  /** Devuelve una copia superficial inmutable de las entidades Alimento. */
  public obtenerAlimentos(): readonly Alimento[] {
    return [...this.alimentos];
  }

  /** Devuelve un snapshot serializable (objetos planos) apto para el Web Worker. */
  public obtenerSnapshot(): readonly DatosAlimento[] {
    return this.alimentos.map((alimento) => alimento.toJSON());
  }

  public obtenerPorId(id: string): Alimento | undefined {
    return this.alimentos.find((alimento) => alimento.id === id);
  }

  public agregar(datos: DatosAlimento): Alimento {
    const nuevo = AlimentoFactory.crear(datos);
    if (this.alimentos.some((a) => a.id === nuevo.id)) {
      throw new Error(`Ya existe un alimento con el ID "${nuevo.id}".`);
    }
    this.alimentos.push(nuevo);
    this.persistir();
    return nuevo;
  }

  public actualizar(id: string, datos: Omit<DatosAlimento, 'id'> | DatosAlimento): Alimento {
    const indice = this.alimentos.findIndex((a) => a.id === id);
    if (indice === -1) {
      throw new Error(`No se encontró ningún alimento con el ID "${id}".`);
    }

    const actualizado = AlimentoFactory.crear({ ...datos, id });
    this.alimentos[indice] = actualizado;
    this.persistir();
    return actualizado;
  }

  public eliminar(id: string): boolean {
    const indice = this.alimentos.findIndex((a) => a.id === id);
    if (indice === -1) return false;
    if (this.alimentos.length <= 1) {
      throw new Error('El catálogo debe conservar al menos un alimento.');
    }

    this.alimentos.splice(indice, 1);
    this.persistir();
    return true;
  }

  public reemplazarCatalogo(lista: readonly DatosAlimento[]): readonly DatosAlimento[] {
    this.alimentos = AlimentoFactory.crearCatalogoDesdeJSON(lista);
    this.persistir();
    return this.obtenerSnapshot();
  }

  public restaurarPorDefecto(): readonly DatosAlimento[] {
    this.alimentos = AlimentoFactory.crearCatalogoDesdeJSON(CATALOGO_INICIAL_DATOS);
    if (this.almacen) {
      try {
        this.almacen.removeItem(CLAVE_STORAGE_CATALOGO);
      } catch {
        // Sin efecto si el almacenamiento no permite borrado.
      }
    }
    return this.obtenerSnapshot();
  }
}
