import { useMemo, useState } from 'react';
import { ArrowUpDown, Pencil, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { useAGSController } from '../controllers/useAGSController';
import {
  CATEGORIAS_ALIMENTO,
  esFormularioValido,
  validarFormularioAlimento,
} from '../controllers/validacion';
import type { CategoriaAlimento, DatosAlimento } from '../models/types';
import { useAGSStore } from '../store/useAGSStore';

type ColumnaOrden = 'nombre' | 'categoria' | 'proteina' | 'calorias' | 'costo';

type FormularioAlimento = Omit<DatosAlimento, 'id'>;

const FORMULARIO_VACIO: FormularioAlimento = {
  nombre: '',
  categoria: 'Proteína animal',
  porcion: '100 g',
  proteina: 10,
  calorias: 120,
  costo: 15,
};

export function CatalogoView() {
  const catalogo = useAGSStore((s) => s.catalogo);
  const restricciones = useAGSStore((s) => s.configuracion.restricciones);
  const controller = useAGSController();

  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('Todas');
  const [columnaOrden, setColumnaOrden] = useState<ColumnaOrden>('proteina');
  const [ascendente, setAscendente] = useState(false);

  // Modal alta / edición
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<FormularioAlimento>(FORMULARIO_VACIO);

  // Confirmaciones de eliminación / restauración
  const [confirmarEliminar, setConfirmarEliminar] = useState<DatosAlimento | null>(null);
  const [confirmarRestaurar, setConfirmarRestaurar] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const errores = useMemo(() => validarFormularioAlimento(formulario), [formulario]);
  const formularioValido = esFormularioValido(errores);

  const alimentosFiltrados = useMemo(() => {
    const consulta = busqueda.trim().toLowerCase();
    const filtrados = catalogo.filter((item) => {
      const coincideCategoria = categoriaFiltro === 'Todas' || item.categoria === categoriaFiltro;
      const coincideTexto =
        consulta.length === 0 ||
        item.nombre.toLowerCase().includes(consulta) ||
        item.porcion.toLowerCase().includes(consulta) ||
        item.categoria.toLowerCase().includes(consulta);
      return coincideCategoria && coincideTexto;
    });

    return [...filtrados].sort((a, b) => {
      const valA = a[columnaOrden];
      const valB = b[columnaOrden];
      const cmp =
        typeof valA === 'number' && typeof valB === 'number'
          ? valA - valB
          : String(valA).localeCompare(String(valB), 'es');
      return ascendente ? cmp : -cmp;
    });
  }, [catalogo, busqueda, categoriaFiltro, columnaOrden, ascendente]);

  const alternarOrden = (col: ColumnaOrden) => {
    if (columnaOrden === col) {
      setAscendente((prev) => !prev);
    } else {
      setColumnaOrden(col);
      setAscendente(col === 'nombre' || col === 'categoria');
    }
  };

  const abrirNuevo = () => {
    setEditandoId(null);
    setFormulario(FORMULARIO_VACIO);
    setErrorAccion(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (alimento: DatosAlimento) => {
    setEditandoId(alimento.id);
    setFormulario({
      nombre: alimento.nombre,
      categoria: alimento.categoria,
      porcion: alimento.porcion,
      proteina: alimento.proteina,
      calorias: alimento.calorias,
      costo: alimento.costo,
    });
    setErrorAccion(null);
    setModalAbierto(true);
  };

  const guardarFormulario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formularioValido) return;
    setErrorAccion(null);

    try {
      if (editandoId) {
        await controller.actualizarAlimento(editandoId, formulario);
      } else {
        await controller.agregarAlimento(formulario);
      }
      setModalAbierto(false);
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : 'No se pudo guardar el alimento.');
    }
  };

  const ejecutarEliminacion = async () => {
    if (!confirmarEliminar) return;
    setErrorAccion(null);
    try {
      await controller.eliminarAlimento(confirmarEliminar.id);
      setConfirmarEliminar(null);
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : 'No se pudo eliminar el alimento.');
      setConfirmarEliminar(null);
    }
  };

  const ejecutarRestauracion = async () => {
    setErrorAccion(null);
    await controller.restaurarCatalogoOriginal();
    setConfirmarRestaurar(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Catálogo de Alimentos</h2>
          <p className="text-xs text-white/55">
            Longitud del cromosoma N = {catalogo.length} genes · Cualquier cambio CRUD reinicializa
            el motor para mantener consistencia en N.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirmarRestaurar(true)}
            className="glass-chip flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white/80 hover:bg-white/15 hover:text-white"
          >
            <RotateCcw size={14} />
            Restaurar catálogo original
          </button>
          <button
            type="button"
            onClick={abrirNuevo}
            className="flex items-center gap-1.5 rounded-full bg-[#4F8CFF] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_16px_rgba(79,140,255,0.45)] hover:bg-[#3d7cf5]"
          >
            <Plus size={14} />
            Nuevo alimento
          </button>
        </div>
      </div>

      {errorAccion ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/35 bg-rose-500/15 px-4 py-2.5 text-xs text-rose-200"
        >
          {errorAccion}
        </p>
      ) : null}

      <GlassCard hoverable={false} className="space-y-4">
        {/* Filtros y búsqueda */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search
              size={15}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-white/45"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar alimento o porción..."
              aria-label="Buscar en catálogo"
              className="glass-input w-full py-2 pr-4 pl-9 text-xs"
            />
          </div>

          <div className="text-xs text-white/50 tabular-nums">
            Mostrando <strong className="text-white">{alimentosFiltrados.length}</strong> de{' '}
            {catalogo.length} · Límites: {restricciones.maxCalorias.toLocaleString('es-MX')} kcal /
            ${restricciones.presupuesto} MXN
          </div>
        </div>

        {/* Chips de categoría */}
        <div className="flex flex-wrap gap-1.5">
          {['Todas', ...CATEGORIAS_ALIMENTO].map((cat) => {
            const activa = categoriaFiltro === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaFiltro(cat)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                  activa
                    ? 'border border-[#4F8CFF]/60 bg-[#4F8CFF]/25 text-white'
                    : 'border border-white/10 bg-white/[0.06] text-white/60 hover:bg-white/12 hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Tabla Glassy */}
        <div className="glass-scroll overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-semibold tracking-wider text-white/45 uppercase">
                <th className="py-3 pr-3">Gen</th>
                <th className="py-3 pr-3">
                  <button
                    type="button"
                    onClick={() => alternarOrden('nombre')}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    Alimento <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="py-3 pr-3">
                  <button
                    type="button"
                    onClick={() => alternarOrden('categoria')}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    Categoría <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="py-3 pr-3">Porción</th>
                <th className="py-3 pr-3 text-right">
                  <button
                    type="button"
                    onClick={() => alternarOrden('proteina')}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    Proteína <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="py-3 pr-3 text-right">
                  <button
                    type="button"
                    onClick={() => alternarOrden('calorias')}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    Calorías <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="py-3 pr-3 text-right">
                  <button
                    type="button"
                    onClick={() => alternarOrden('costo')}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    Costo <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {alimentosFiltrados.map((alimento) => {
                const indiceGen = catalogo.findIndex((a) => a.id === alimento.id);
                return (
                  <tr key={alimento.id} className="transition-colors hover:bg-white/[0.05]">
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-white/40">
                      x<sub>{indiceGen + 1}</sub>
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-white">{alimento.nombre}</td>
                    <td className="py-2.5 pr-3">
                      <span className="glass-chip px-2.5 py-0.5 text-[11px] text-white/70">
                        {alimento.categoria}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-white/60">{alimento.porcion}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-[#9BC0FF] tabular-nums">
                      {alimento.proteina.toFixed(1)} g
                    </td>
                    <td className="py-2.5 pr-3 text-right text-white/75 tabular-nums">
                      {alimento.calorias} kcal
                    </td>
                    <td className="py-2.5 pr-3 text-right text-white/75 tabular-nums">
                      ${alimento.costo.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => abrirEdicion(alimento)}
                          aria-label={`Editar ${alimento.nombre}`}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 hover:bg-white/15 hover:text-white"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmarEliminar(alimento)}
                          aria-label={`Eliminar ${alimento.nombre}`}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 hover:border-rose-400/40 hover:bg-rose-500/20 hover:text-rose-300"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Modal Alta / Edición */}
      {modalAbierto ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-alimento"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={() => setModalAbierto(false)}
        >
          <form
            onSubmit={(e) => void guardarFormulario(e)}
            onClick={(e) => e.stopPropagation()}
            className="glass-card w-full max-w-md space-y-4 p-6"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 id="titulo-modal-alimento" className="text-base font-semibold text-white">
                {editandoId ? 'Editar alimento' : 'Nuevo alimento'}
              </h3>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                aria-label="Cerrar modal"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/75 hover:bg-white/20"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block text-white/65" htmlFor="ali-nombre">
                  Nombre
                </label>
                <input
                  id="ali-nombre"
                  type="text"
                  value={formulario.nombre}
                  onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
                  placeholder="Ej. Pechuga de pollo asada"
                  className="glass-input w-full px-3.5 py-2"
                />
                {errores.nombre ? (
                  <p className="mt-1 text-[11px] text-rose-400">{errores.nombre}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-white/65" htmlFor="ali-categoria">
                    Categoría
                  </label>
                  <select
                    id="ali-categoria"
                    value={formulario.categoria}
                    onChange={(e) =>
                      setFormulario({
                        ...formulario,
                        categoria: e.target.value as CategoriaAlimento,
                      })
                    }
                    className="glass-input w-full px-3 py-2 text-white [&>option]:bg-neutral-800"
                  >
                    {CATEGORIAS_ALIMENTO.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-white/65" htmlFor="ali-porcion">
                    Porción estándar
                  </label>
                  <input
                    id="ali-porcion"
                    type="text"
                    value={formulario.porcion}
                    onChange={(e) => setFormulario({ ...formulario, porcion: e.target.value })}
                    placeholder="Ej. 100 g"
                    className="glass-input w-full px-3.5 py-2"
                  />
                  {errores.porcion ? (
                    <p className="mt-1 text-[11px] text-rose-400">{errores.porcion}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-white/65" htmlFor="ali-proteina">
                    Proteína (g)
                  </label>
                  <input
                    id="ali-proteina"
                    type="number"
                    min={0}
                    step={0.1}
                    value={formulario.proteina}
                    onChange={(e) =>
                      setFormulario({ ...formulario, proteina: Number(e.target.value) })
                    }
                    className="glass-input w-full px-3 py-2 tabular-nums"
                  />
                  {errores.proteina ? (
                    <p className="mt-1 text-[11px] text-rose-400">{errores.proteina}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block text-white/65" htmlFor="ali-calorias">
                    Calorías (kcal)
                  </label>
                  <input
                    id="ali-calorias"
                    type="number"
                    min={0}
                    step={1}
                    value={formulario.calorias}
                    onChange={(e) =>
                      setFormulario({ ...formulario, calorias: Number(e.target.value) })
                    }
                    className="glass-input w-full px-3 py-2 tabular-nums"
                  />
                  {errores.calorias ? (
                    <p className="mt-1 text-[11px] text-rose-400">{errores.calorias}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block text-white/65" htmlFor="ali-costo">
                    Costo (MXN)
                  </label>
                  <input
                    id="ali-costo"
                    type="number"
                    min={0}
                    step={0.5}
                    value={formulario.costo}
                    onChange={(e) =>
                      setFormulario({ ...formulario, costo: Number(e.target.value) })
                    }
                    className="glass-input w-full px-3 py-2 tabular-nums"
                  />
                  {errores.costo ? (
                    <p className="mt-1 text-[11px] text-rose-400">{errores.costo}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="glass-chip px-4 py-2 text-xs text-white/75 hover:bg-white/15"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!formularioValido}
                className="rounded-full bg-[#4F8CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3d7cf5] disabled:opacity-45"
              >
                {editandoId ? 'Guardar cambios' : 'Agregar alimento'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Modal Confirmación Eliminar */}
      {confirmarEliminar ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={() => setConfirmarEliminar(null)}
        >
          <div
            className="glass-card w-full max-w-sm space-y-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-white">¿Eliminar alimento?</h3>
            <p className="text-xs leading-relaxed text-white/65">
              Se eliminará <strong className="text-white">{confirmarEliminar.nombre}</strong> del
              catálogo. La longitud del cromosoma cambiará a{' '}
              <strong>N = {catalogo.length - 1}</strong> y se reinicializará el motor.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmarEliminar(null)}
                className="glass-chip px-4 py-2 text-xs text-white/75 hover:bg-white/15"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void ejecutarEliminacion()}
                className="rounded-full border border-rose-400/50 bg-rose-500/30 px-4 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-500/45"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal Confirmación Restaurar */}
      {confirmarRestaurar ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={() => setConfirmarRestaurar(false)}
        >
          <div
            className="glass-card w-full max-w-sm space-y-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-white">Restaurar catálogo original</h3>
            <p className="text-xs leading-relaxed text-white/65">
              Se recuperarán los 30 alimentos iniciales basados en SMAE/USDA y se reinicializarán
              los resultados actuales.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmarRestaurar(false)}
                className="glass-chip px-4 py-2 text-xs text-white/75 hover:bg-white/15"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void ejecutarRestauracion()}
                className="rounded-full bg-[#4F8CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3d7cf5]"
              >
                Restaurar 30 alimentos
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
