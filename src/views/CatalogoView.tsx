import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  CheckCircle2,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { obtenerColorCategoria } from '../components/ui/categoryColors';
import { useAGSController } from '../controllers/useAGSController';
import {
  CATEGORIAS_ALIMENTO,
  esFormularioValido,
  validarFormularioAlimento,
} from '../controllers/validacion';
import type { CategoriaAlimento, DatosAlimento } from '../models/types';
import { useAGSStore } from '../store/useAGSStore';

type ColumnaOrden = 'gen' | 'nombre' | 'categoria' | 'proteina' | 'calorias' | 'costo';

interface BorradorFormularioAlimento {
  nombre: string;
  categoria: CategoriaAlimento;
  porcion: string;
  proteina: string;
  calorias: string;
  costo: string;
}

const BORRADOR_VACIO: BorradorFormularioAlimento = {
  nombre: '',
  categoria: 'Proteína animal',
  porcion: '100 g',
  proteina: '15',
  calorias: '140',
  costo: '18',
};

function parsearNumeroBorrador(valor: string): number {
  const limpio = valor.trim();
  if (limpio.length === 0) return Number.NaN;
  return Number(limpio);
}

export function CatalogoView() {
  const catalogo = useAGSStore((s) => s.catalogo);
  const restricciones = useAGSStore((s) => s.configuracion.restricciones);
  const resultadoAGS = useAGSStore((s) => s.resultadoAGS);
  const estadoEjecucion = useAGSStore((s) => s.estadoEjecucion);
  const catalogoModificadoSinEjecutar = useAGSStore((s) => s.catalogoModificadoSinEjecutar);
  const controller = useAGSController();

  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('Todas');
  const [soloSeleccionados, setSoloSeleccionados] = useState(false);
  const [columnaOrden, setColumnaOrden] = useState<ColumnaOrden>('gen');
  const [ascendente, setAscendente] = useState(true);

  // Modal alta / edición
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<BorradorFormularioAlimento>(BORRADOR_VACIO);

  // Confirmaciones de eliminación / restauración y retroalimentación
  const [confirmarEliminar, setConfirmarEliminar] = useState<DatosAlimento | null>(null);
  const [confirmarRestaurar, setConfirmarRestaurar] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const formularioNumerico = useMemo<Omit<DatosAlimento, 'id'>>(
    () => ({
      nombre: borrador.nombre,
      categoria: borrador.categoria,
      porcion: borrador.porcion,
      proteina: parsearNumeroBorrador(borrador.proteina),
      calorias: parsearNumeroBorrador(borrador.calorias),
      costo: parsearNumeroBorrador(borrador.costo),
    }),
    [borrador],
  );

  const errores = useMemo(
    () => validarFormularioAlimento(formularioNumerico),
    [formularioNumerico],
  );
  const formularioValido = esFormularioValido(errores);

  const cromosomaActual = resultadoAGS?.mejorIndividuo?.cromosoma ?? null;
  const idsEnDietaOptima = useMemo(() => {
    const set = new Set<string>();
    if (cromosomaActual && cromosomaActual.length === catalogo.length) {
      catalogo.forEach((item, idx) => {
        if (cromosomaActual[idx] === 1) set.add(item.id);
      });
    }
    return set;
  }, [catalogo, cromosomaActual]);

  const totalesCatalogo = useMemo(
    () =>
      catalogo.reduce(
        (acc, item) => ({
          proteina: acc.proteina + item.proteina,
          calorias: acc.calorias + item.calorias,
          costo: acc.costo + item.costo,
        }),
        { proteina: 0, calorias: 0, costo: 0 },
      ),
    [catalogo],
  );

  const indicesGenPorId = useMemo(() => {
    const mapa = new Map<string, number>();
    catalogo.forEach((item, idx) => mapa.set(item.id, idx));
    return mapa;
  }, [catalogo]);

  const alimentosFiltrados = useMemo(() => {
    const consulta = busqueda.trim().toLowerCase();
    const filtrados = catalogo.filter((item) => {
      const coincideCategoria = categoriaFiltro === 'Todas' || item.categoria === categoriaFiltro;
      const coincideSeleccion = !soloSeleccionados || idsEnDietaOptima.has(item.id);
      const coincideTexto =
        consulta.length === 0 ||
        item.nombre.toLowerCase().includes(consulta) ||
        item.porcion.toLowerCase().includes(consulta) ||
        item.categoria.toLowerCase().includes(consulta);
      return coincideCategoria && coincideSeleccion && coincideTexto;
    });

    return [...filtrados].sort((a, b) => {
      let cmp: number;
      if (columnaOrden === 'gen') {
        cmp = (indicesGenPorId.get(a.id) ?? 0) - (indicesGenPorId.get(b.id) ?? 0);
      } else {
        const valA = a[columnaOrden];
        const valB = b[columnaOrden];
        cmp =
          typeof valA === 'number' && typeof valB === 'number'
            ? valA - valB
            : String(valA).localeCompare(String(valB), 'es');
      }
      return ascendente ? cmp : -cmp;
    });
  }, [
    catalogo,
    busqueda,
    categoriaFiltro,
    soloSeleccionados,
    idsEnDietaOptima,
    columnaOrden,
    ascendente,
    indicesGenPorId,
  ]);

  const alternarOrden = (col: ColumnaOrden) => {
    if (columnaOrden === col) {
      setAscendente((prev) => !prev);
    } else {
      setColumnaOrden(col);
      setAscendente(col === 'gen' || col === 'nombre' || col === 'categoria');
    }
  };

  const abrirNuevo = () => {
    setEditandoId(null);
    setBorrador(BORRADOR_VACIO);
    setErrorAccion(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (alimento: DatosAlimento) => {
    setEditandoId(alimento.id);
    setBorrador({
      nombre: alimento.nombre,
      categoria: alimento.categoria,
      porcion: alimento.porcion,
      proteina: String(alimento.proteina),
      calorias: String(alimento.calorias),
      costo: String(alimento.costo),
    });
    setErrorAccion(null);
    setModalAbierto(true);
  };

  const correrConCatalogoActual = () => {
    controller.cambiarVista('resumen');
    void controller.ejecutar();
  };

  const guardarFormulario = async (ejecutarDespues: boolean) => {
    if (!formularioValido) return;
    setErrorAccion(null);

    try {
      const nombreLimpio = formularioNumerico.nombre.trim();
      const datosLimpios: Omit<DatosAlimento, 'id'> = {
        ...formularioNumerico,
        nombre: nombreLimpio,
        porcion: formularioNumerico.porcion.trim(),
      };

      if (editandoId) {
        await controller.actualizarAlimento(editandoId, datosLimpios);
        setMensajeExito(`Se actualizó "${nombreLimpio}".`);
      } else {
        await controller.agregarAlimento(datosLimpios);
        setMensajeExito(`Se agregó "${nombreLimpio}" al catálogo.`);
      }
      setModalAbierto(false);

      if (ejecutarDespues) {
        correrConCatalogoActual();
      }
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : 'No se pudo guardar el alimento.');
    }
  };

  const ejecutarEliminacion = async () => {
    if (!confirmarEliminar) return;
    setErrorAccion(null);
    const nombreEliminado = confirmarEliminar.nombre;
    try {
      await controller.eliminarAlimento(confirmarEliminar.id);
      setConfirmarEliminar(null);
      setMensajeExito(`Se eliminó "${nombreEliminado}" del catálogo.`);
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : 'No se pudo eliminar el alimento.');
      setConfirmarEliminar(null);
    }
  };

  const ejecutarRestauracion = async () => {
    setErrorAccion(null);
    await controller.restaurarCatalogoOriginal();
    setConfirmarRestaurar(false);
    setSoloSeleccionados(false);
    setMensajeExito('Se restauraron los 30 alimentos originales (SMAE/USDA).');
  };

  const estaCorriendo = estadoEjecucion === 'ejecutando' || estadoEjecucion === 'cargando';

  const proteinaPor10Mxn =
    Number.isFinite(formularioNumerico.proteina) &&
    Number.isFinite(formularioNumerico.costo) &&
    formularioNumerico.costo > 0
      ? (formularioNumerico.proteina / formularioNumerico.costo) * 10
      : null;

  const proteinaPor100Kcal =
    Number.isFinite(formularioNumerico.proteina) &&
    Number.isFinite(formularioNumerico.calorias) &&
    formularioNumerico.calorias > 0
      ? (formularioNumerico.proteina / formularioNumerico.calorias) * 100
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Gestión de Alimentos</h2>
          <p className="text-xs text-white/55">
            Agrega, modifica o elimina alimentos. Cada alimento es un gen del cromosoma (N ={' '}
            {catalogo.length}) y cualquier cambio actualiza los resultados al correr el AGS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirmarRestaurar(true)}
            className="glass-chip flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white/80 hover:bg-white/15 hover:text-white"
          >
            <RotateCcw size={14} />
            Restaurar originales
          </button>
          <button
            type="button"
            onClick={abrirNuevo}
            className="flex items-center gap-1.5 rounded-full border border-emerald-400/45 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/30"
          >
            <Plus size={14} />
            Agregar alimento
          </button>
          <button
            type="button"
            disabled={estaCorriendo}
            onClick={correrConCatalogoActual}
            className="flex items-center gap-1.5 rounded-full bg-[#4F8CFF] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_16px_rgba(79,140,255,0.45)] transition-colors hover:bg-[#3d7cf5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={14} />
            Ejecutar AGS
          </button>
        </div>
      </div>

      {/* Aviso de cambios pendientes por ejecutar */}
      {catalogoModificadoSinEjecutar ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#4F8CFF]/45 bg-[#4F8CFF]/15 px-4 py-3 text-xs text-white">
          <div className="flex items-center gap-2.5">
            <Sparkles size={15} className="shrink-0 text-[#9BC0FF]" />
            <span>
              {mensajeExito ? <strong className="mr-1.5">{mensajeExito}</strong> : null}
              El catálogo cambió (N = <strong>{catalogo.length}</strong> bits). Corre el AGS para
              recalcular el menú óptimo y las gráficas con estos alimentos.
            </span>
          </div>
          <button
            type="button"
            disabled={estaCorriendo}
            onClick={correrConCatalogoActual}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#4F8CFF] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_0_12px_rgba(79,140,255,0.45)] hover:bg-[#3d7cf5] disabled:opacity-50"
          >
            <Play size={12} />
            Correr AGS ahora
          </button>
        </div>
      ) : null}

      {errorAccion ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/35 bg-rose-500/15 px-4 py-2.5 text-xs text-rose-200"
        >
          {errorAccion}
        </p>
      ) : null}

      {/* Resumen rápido del catálogo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="glass-card px-4 py-3">
          <p className="text-[11px] text-white/50">Alimentos activos (N)</p>
          <p className="mt-1 text-lg font-bold text-white tabular-nums">
            {catalogo.length}{' '}
            <span className="text-xs font-normal text-white/45">genes / bits</span>
          </p>
        </div>
        <div className="glass-card px-4 py-3">
          <p className="text-[11px] text-white/50">Proteína total disponible</p>
          <p className="mt-1 text-lg font-bold text-[#9BC0FF] tabular-nums">
            {totalesCatalogo.proteina.toFixed(1)} g
          </p>
        </div>
        <div className="glass-card px-4 py-3">
          <p className="text-[11px] text-white/50">Calorías acumuladas</p>
          <p className="mt-1 text-lg font-bold text-white tabular-nums">
            {Math.round(totalesCatalogo.calorias).toLocaleString('es-MX')} kcal
          </p>
        </div>
        <div className="glass-card px-4 py-3">
          <p className="text-[11px] text-white/50">Costo total del catálogo</p>
          <p className="mt-1 text-lg font-bold text-white tabular-nums">
            ${totalesCatalogo.costo.toFixed(2)}{' '}
            <span className="text-xs font-normal text-white/45">MXN</span>
          </p>
        </div>
      </div>

      <GlassCard hoverable={false} className="space-y-4">
        {/* Filtros y búsqueda */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
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

            {idsEnDietaOptima.size > 0 ? (
              <button
                type="button"
                onClick={() => setSoloSeleccionados((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  soloSeleccionados
                    ? 'border border-emerald-400/55 bg-emerald-500/20 text-emerald-200'
                    : 'border border-white/10 bg-white/[0.06] text-white/65 hover:bg-white/12 hover:text-white'
                }`}
              >
                <CheckCircle2 size={13} />
                En menú óptimo ({idsEnDietaOptima.size})
              </button>
            ) : null}
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
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-semibold tracking-wider text-white/45 uppercase">
                <th className="py-3 pr-3">
                  <button
                    type="button"
                    onClick={() => alternarOrden('gen')}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    Gen <ArrowUpDown size={12} />
                  </button>
                </th>
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
                const indiceGen = indicesGenPorId.get(alimento.id) ?? 0;
                const enDieta = idsEnDietaOptima.has(alimento.id);
                const colorCat = obtenerColorCategoria(alimento.categoria);

                return (
                  <tr
                    key={alimento.id}
                    className={`transition-colors hover:bg-white/[0.05] ${
                      enDieta ? 'bg-[#4F8CFF]/[0.06]' : ''
                    }`}
                  >
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-white/55">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            enDieta
                              ? 'bg-[#4F8CFF] shadow-[0_0_6px_#4F8CFF]'
                              : 'bg-white/20'
                          }`}
                        />
                        x<sub>{indiceGen + 1}</sub>
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-white">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{alimento.nombre}</span>
                        {enDieta ? (
                          <span className="rounded-full border border-[#4F8CFF]/45 bg-[#4F8CFF]/20 px-2 py-0.5 text-[10px] font-semibold text-[#9BC0FF]">
                            gen = 1
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="glass-chip inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] text-white/75">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: colorCat }}
                        />
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
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => abrirEdicion(alimento)}
                          aria-label={`Editar ${alimento.nombre}`}
                          className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.07] px-2.5 py-1 text-[11px] font-medium text-white/80 transition-colors hover:border-[#4F8CFF]/50 hover:bg-[#4F8CFF]/20 hover:text-white"
                        >
                          <Pencil size={12} />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          disabled={catalogo.length <= 1}
                          onClick={() => setConfirmarEliminar(alimento)}
                          aria-label={`Eliminar ${alimento.nombre}`}
                          title={
                            catalogo.length <= 1
                              ? 'Debe quedar al menos un alimento en el catálogo'
                              : `Eliminar ${alimento.nombre}`
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.07] px-2.5 py-1 text-[11px] font-medium text-white/75 transition-colors hover:border-rose-400/45 hover:bg-rose-500/20 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <Trash2 size={12} />
                          <span>Quitar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {alimentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-white/50">
                    No se encontraron alimentos con los filtros actuales.
                  </td>
                </tr>
              ) : null}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setModalAbierto(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void guardarFormulario(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card w-full max-w-md space-y-4 p-6"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 id="titulo-modal-alimento" className="text-base font-semibold text-white">
                {editandoId ? 'Modificar alimento' : 'Agregar nuevo alimento'}
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
                  Nombre del alimento
                </label>
                <input
                  id="ali-nombre"
                  type="text"
                  autoFocus
                  value={borrador.nombre}
                  onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
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
                    value={borrador.categoria}
                    onChange={(e) =>
                      setBorrador({
                        ...borrador,
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
                    value={borrador.porcion}
                    onChange={(e) => setBorrador({ ...borrador, porcion: e.target.value })}
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
                    step="any"
                    value={borrador.proteina}
                    onChange={(e) => setBorrador({ ...borrador, proteina: e.target.value })}
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
                    step="any"
                    value={borrador.calorias}
                    onChange={(e) => setBorrador({ ...borrador, calorias: e.target.value })}
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
                    step="any"
                    value={borrador.costo}
                    onChange={(e) => setBorrador({ ...borrador, costo: e.target.value })}
                    className="glass-input w-full px-3 py-2 tabular-nums"
                  />
                  {errores.costo ? (
                    <p className="mt-1 text-[11px] text-rose-400">{errores.costo}</p>
                  ) : null}
                </div>
              </div>

              {/* Vista previa de eficiencia nutricional */}
              {proteinaPor10Mxn !== null || proteinaPor100Kcal !== null ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[11px] text-white/65 tabular-nums">
                  <span>Eficiencia nutricional:</span>
                  <div className="flex items-center gap-3 font-medium text-white/85">
                    {proteinaPor10Mxn !== null ? (
                      <span>{proteinaPor10Mxn.toFixed(1)} g / $10</span>
                    ) : null}
                    {proteinaPor100Kcal !== null ? (
                      <span>{proteinaPor100Kcal.toFixed(1)} g / 100 kcal</span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="glass-chip px-3.5 py-2 text-xs text-white/75 hover:bg-white/15"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!formularioValido}
                className="rounded-full border border-white/20 bg-white/12 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-45"
              >
                {editandoId ? 'Guardar cambios' : 'Agregar'}
              </button>
              <button
                type="button"
                disabled={!formularioValido}
                onClick={() => void guardarFormulario(true)}
                className="flex items-center gap-1.5 rounded-full bg-[#4F8CFF] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_12px_rgba(79,140,255,0.4)] hover:bg-[#3d7cf5] disabled:opacity-45"
              >
                <Play size={12} />
                Guardar y correr
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setConfirmarEliminar(null)}
        >
          <div
            className="glass-card w-full max-w-sm space-y-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-white">¿Quitar alimento?</h3>
            <p className="text-xs leading-relaxed text-white/65">
              Se eliminará <strong className="text-white">{confirmarEliminar.nombre}</strong> del
              catálogo. La longitud del cromosoma cambiará a{' '}
              <strong>N = {catalogo.length - 1}</strong> bits y al ejecutar el AGS los resultados se
              recalcularán sin este alimento.
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
                Quitar alimento
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setConfirmarRestaurar(false)}
        >
          <div
            className="glass-card w-full max-w-sm space-y-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-white">Restaurar catálogo original</h3>
            <p className="text-xs leading-relaxed text-white/65">
              Se recuperarán los 30 alimentos iniciales basados en SMAE/USDA y se reinicializarán los
              resultados actuales.
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
