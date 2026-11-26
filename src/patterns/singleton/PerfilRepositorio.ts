import { PERFIL_POR_DEFECTO, validarPerfilUsuario } from '../../models/CalculadoraCorporal';
import type { PerfilUsuario } from '../../models/types';
import { type AlmacenPersistencia, obtenerAlmacenPorDefecto } from './storage';

const CLAVE_STORAGE_PERFIL = 'ags_dieta_perfil_v1';

/**
 * Singleton que persiste el perfil corporal y objetivo del usuario.
 */
export class PerfilRepositorio {
  private static instancia: PerfilRepositorio | null = null;

  private perfil: PerfilUsuario = { ...PERFIL_POR_DEFECTO };
  private readonly almacen: AlmacenPersistencia | null;

  private constructor(almacen: AlmacenPersistencia | null) {
    this.almacen = almacen;
    this.cargarPersistido();
  }

  public static obtenerInstancia(almacen?: AlmacenPersistencia | null): PerfilRepositorio {
    if (PerfilRepositorio.instancia === null) {
      const destino = almacen === undefined ? obtenerAlmacenPorDefecto() : almacen;
      PerfilRepositorio.instancia = new PerfilRepositorio(destino);
    }
    return PerfilRepositorio.instancia;
  }

  public static reiniciarInstancia(): void {
    PerfilRepositorio.instancia = null;
  }

  private cargarPersistido(): void {
    if (!this.almacen) return;
    try {
      const crudo = this.almacen.getItem(CLAVE_STORAGE_PERFIL);
      if (!crudo) return;
      const parsed = JSON.parse(crudo) as Partial<PerfilUsuario>;
      const candidato: PerfilUsuario = { ...PERFIL_POR_DEFECTO, ...parsed };
      validarPerfilUsuario(candidato);
      this.perfil = candidato;
    } catch {
      this.perfil = { ...PERFIL_POR_DEFECTO };
    }
  }

  private persistir(): void {
    if (!this.almacen) return;
    try {
      this.almacen.setItem(CLAVE_STORAGE_PERFIL, JSON.stringify(this.perfil));
    } catch {
      // Ignora errores de cuota en storage.
    }
  }

  public obtenerSnapshot(): PerfilUsuario {
    return { ...this.perfil };
  }

  public actualizar(parcial: Partial<PerfilUsuario>): PerfilUsuario {
    const siguiente: PerfilUsuario = { ...this.perfil, ...parcial };
    validarPerfilUsuario(siguiente);
    this.perfil = siguiente;
    this.persistir();
    return this.obtenerSnapshot();
  }

  public restaurarPorDefecto(): PerfilUsuario {
    this.perfil = { ...PERFIL_POR_DEFECTO };
    if (this.almacen) {
      try {
        this.almacen.removeItem(CLAVE_STORAGE_PERFIL);
      } catch {
        // Sin efecto si el almacenamiento no permite borrado.
      }
    }
    return this.obtenerSnapshot();
  }
}
