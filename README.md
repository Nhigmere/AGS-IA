# AGS para el Problema de la Dieta — Instituto Tecnológico de Oaxaca

Aplicación web interactiva que implementa un **Algoritmo Genético Simple (AGS)** para resolver el **Problema de la Dieta** modelado como **mochila 0-1 multidimensional**: maximizar la proteína diaria (g) sujeto a límites estrictos de calorías (≤ 2,000 kcal) y presupuesto (≤ $150 MXN).

## Características principales

- **Motor evolutivo puro y reproducible:** codificación binaria de longitud `N`, inicialización sesgada (`p_inicial = 0.20`), penalización estática (`α = 0.001`), selección por torneo (`k = 3`), cruce de un punto (`Pc = 0.80`), mutación bit-flip (`Pm = 1/N`), elitismo configurable (`e = 0` canónico por defecto), paro por estancamiento y generador determinista `mulberry32`.
- **Arquitectura MVC + 4 Patrones de Diseño:** `Strategy`, `Factory`, `Observer` y `Singleton`, con reglas ESLint que impiden imports de React/DOM en `src/models` y `src/patterns`.
- **Ejecución no bloqueante:** Web Worker con `Comlink` y `Zustand` (soporta pausa, reanudación, detención, comparativa multi-corrida y barrido `Pc × Pm` sin congelar la interfaz).
- **5 vistas interactivas (Glassy Dashboard):** Resumen, Configuración AGS, Catálogo CRUD (30 alimentos SMAE/USDA), Comparativa (AGS vs. Aleatorio vs. Selección Humana) y Experimentos (`Pc × Pm`), más panel matemático en **KaTeX**, skeleton loaders y exportación a **PNG / CSV / JSON**.
- **Guía técnica completa en HTML:** abre [`docs/guia-proyecto-ags-dieta.html`](docs/guia-proyecto-ags-dieta.html) en tu navegador (funciona 100 % offline).

## Comandos

```bash
npm install           # Instalar dependencias
npm run dev           # Servidor de desarrollo (http://localhost:5173)
npm run test:coverage # Pruebas unitarias (Vitest) y cobertura v8
npm run build         # Verificación TypeScript (strict) y compilación Vite
npm run lint          # Verificación ESLint y reglas MVC
```
