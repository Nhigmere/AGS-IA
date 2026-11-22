import { toPng } from 'html-to-image';
import type {
  ConfiguracionEjecucion,
  DatosAlimento,
  PuntoAleatorio,
  ReporteGeneracion,
  ResultadoAleatorio,
  ResultadoEjecucionAGS,
} from '../models/types';
import type { EstadoDietaHumana } from '../store/useAGSStore';
import type {
  ResultadoBarridoExperimentos,
  ResultadoComparativaMultiCorrida,
} from '../workers/types';

function descargarBlob(contenido: BlobPart, tipoMime: string, nombreArchivo: string): void {
  const blob = new Blob([contenido], { type: tipoMime });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function escaparCeldaCSV(valor: string | number | boolean | null | undefined): string {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  if (texto.includes(',') || texto.includes('"') || texto.includes('\n')) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export function exportarCSV(
  encabezados: readonly string[],
  filas: readonly (readonly (string | number | boolean | null | undefined)[])[],
  nombreArchivo: string,
): void {
  const lineas = [
    encabezados.map(escaparCeldaCSV).join(','),
    ...filas.map((fila) => fila.map(escaparCeldaCSV).join(',')),
  ];
  // BOM UTF-8 para acentos correctos al abrir en Excel
  descargarBlob(`\uFEFF${lineas.join('\r\n')}`, 'text/csv;charset=utf-8;', nombreArchivo);
}

export function exportarJSON(datos: unknown, nombreArchivo: string): void {
  descargarBlob(JSON.stringify(datos, null, 2), 'application/json;charset=utf-8;', nombreArchivo);
}

/**
 * Exporta una gráfica o mapa de calor a PNG con fondo oscuro sólido
 * de alto contraste, ideal para documentos impresos o reportes académicos.
 */
export async function exportarElementoAPNG(
  elemento: HTMLElement,
  nombreArchivo: string,
): Promise<void> {
  const dataUrl = await toPng(elemento, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#232221',
  });

  const enlace = document.createElement('a');
  enlace.download = nombreArchivo;
  enlace.href = dataUrl;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
}

export function exportarHistorialCSV(
  historialAGS: readonly ReporteGeneracion[],
  historialAleatorio: readonly PuntoAleatorio[] = [],
  semilla = 42,
): void {
  const mapaAleat = new Map(historialAleatorio.map((p) => [p.bloque, p.mejorFactibleAcumulado]));
  const encabezados = [
    'generacion',
    'mejor_aptitud_gen',
    'aptitud_promedio',
    'mejor_factible_global_g',
    'porcentaje_factibles',
    'diversidad_hamming',
    'mejor_aleatorio_acumulado_g',
  ];
  const filas = historialAGS.map((r) => [
    r.generacion,
    r.mejorAptitud.toFixed(4),
    r.aptitudPromedio.toFixed(4),
    r.mejorFactibleGlobal.toFixed(4),
    r.porcentajeFactibles.toFixed(2),
    r.diversidad.toFixed(4),
    mapaAleat.has(r.generacion) ? (mapaAleat.get(r.generacion) ?? 0).toFixed(4) : '',
  ]);
  exportarCSV(encabezados, filas, `ags-historial-semilla-${semilla}.csv`);
}

export function exportarCorridaCompletaJSON(
  catalogo: readonly DatosAlimento[],
  configuracion: ConfiguracionEjecucion,
  resultadoAGS: ResultadoEjecucionAGS | null,
  resultadoAleatorio: ResultadoAleatorio | null,
): void {
  const payload = {
    proyecto: 'AGS para el Problema de la Dieta — Instituto Tecnológico de Oaxaca',
    exportadoEn: new Date().toISOString(),
    configuracion,
    catalogo,
    resultadoAGS,
    resultadoAleatorio,
  };
  exportarJSON(payload, `ags-corrida-semilla-${configuracion.parametros.semilla}.json`);
}

export function exportarComparativaCSV(
  resultado: ResultadoComparativaMultiCorrida,
  dietaHumana: EstadoDietaHumana,
): void {
  const encabezados = [
    'corrida',
    'semilla',
    'evaluaciones',
    'proteina_ags_g',
    'calorias_ags_kcal',
    'costo_ags_mxn',
    'factible_ags',
    'generacion_ags',
    'tiempo_ags_ms',
    'proteina_aleatorio_g',
    'calorias_aleatorio_kcal',
    'costo_aleatorio_mxn',
    'factible_aleatorio',
    'bloque_aleatorio',
    'tiempo_aleatorio_ms',
    'proteina_humano_g',
    'tiempo_humano_s',
  ];

  const filas = resultado.corridasDetalle.map((c) => [
    c.corrida,
    c.semilla,
    c.evaluaciones,
    c.proteinaAGS.toFixed(2),
    c.caloriasAGS.toFixed(1),
    c.costoAGS.toFixed(2),
    c.factibleAGS ? 'Si' : 'No',
    c.generacionAGS,
    c.tiempoAGSMs.toFixed(2),
    c.proteinaAleatorio.toFixed(2),
    c.caloriasAleatorio.toFixed(1),
    c.costoAleatorio.toFixed(2),
    c.factibleAleatorio ? 'Si' : 'No',
    c.bloqueAleatorio,
    c.tiempoAleatorioMs.toFixed(2),
    dietaHumana.finalizada ? dietaHumana.evaluacion.proteinaTotal.toFixed(2) : '',
    dietaHumana.finalizada ? dietaHumana.tiempoSegundos.toFixed(1) : '',
  ]);

  exportarCSV(encabezados, filas, `ags-comparativa-${resultado.cantidadCorridas}-corridas.csv`);
}

export function exportarExperimentosCSV(resultado: ResultadoBarridoExperimentos): void {
  const encabezados = [
    'Pc',
    'Pm',
    'corridas',
    'proteina_media_g',
    'proteina_desviacion_g',
    'mejor_proteina_g',
    'porcentaje_factibles',
    'generacion_convergencia_media',
    'tiempo_medio_ms',
  ];
  const filas = resultado.celdas.map((c) => [
    c.pc,
    c.pm,
    resultado.configuracion.corridasPorCombinacion,
    c.proteinaMedia.toFixed(2),
    c.proteinaDesviacion.toFixed(2),
    c.mejorProteina.toFixed(2),
    c.porcentajeFactibles.toFixed(1),
    c.generacionConvergenciaMedia.toFixed(1),
    c.tiempoMedioMs.toFixed(2),
  ]);
  exportarCSV(encabezados, filas, `ags-experimentos-pc-pm-semilla-${resultado.semillaBase}.csv`);
}
