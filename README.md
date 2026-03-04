# Pokefusion

Aplicación web para fusionar pokemones con apoyo de IA generativa para obtener los datos del nuevo pokemon y sprite. 

## Reto elegido y alcance

**Reto:** Generador de fusiones de Pokémon.

El usuario puede:

1. Obtener tres Pokémon aleatorios de la PokéAPI (del 1 al 1025).
2. Fusionarlos mediante un LLM que genera un JSON con el Pokémon resultante.
3. Visualizar el sprite pixel-art generado por un modelo de imagen.
4. Guardar y gestionar fusiones favoritas por dispositivo.

**Supuestos asumidos:**

- No se requiere autenticación formal; la identidad se gestiona con un UUID anónimo por dispositivo almacenado en `localStorage`.
- El número máximo de favoritos por usuario no está limitado.
- Los movimientos del Pokémon fusionado no se guardan en Firestore.
- La app está en español (idioma del UI y mensajes de error).

---

## Arquitectura y dependencias

### Diagrama de capas

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Angular SSR)                 │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ FavoritesList│  │   HomePage   │  │  FusionResult │ │
│  │  Component   │  │  Component   │  │   Component   │ │
│  └──────────────┘  └──────┬───────┘  └───────────────┘ │
│                           │ signals                     │
│         ┌─────────────────┼──────────────────┐          │
│         ▼                 ▼                  ▼          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Favorites  │  │ Polimeriza-  │  │   Pokemon    │  │
│  │   Service   │  │ tion Service │  │   Service    │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼────────────────┼─────────────────┼───────────┘
          │                │                 │
          ▼                ▼                 ▼
   ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
   │  Firebase   │  │ Express SSR  │  │  PokéAPI     │
   │  Firestore  │  │ /api/fuse    │  │ (external)   │
   │  Storage    │  │ /api/gen-img │  └──────────────┘
   └─────────────┘  └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │ Cloudflare AI│
                    │ granite-4.0  │
                    │ phoenix-1.0  │
                    └──────────────┘
```

### Módulos y componentes

| Elemento                 | Ruta                                 | Responsabilidad                                                 |
| ------------------------ | ------------------------------------ | --------------------------------------------------------------- |
| `AppComponent`           | `src/app/app.ts`                     | Shell — solo `<router-outlet />`                                |
| `HomeComponent`          | `src/app/pages/home/`                | Página principal — orquesta todo el estado                      |
| `PokemonCardComponent`   | `src/app/components/pokemon-card/`   | Muestra un slot de Pokémon (vacío / cargando / cargado / error) |
| `FusionResultComponent`  | `src/app/components/fusion-result/`  | Muestra la fusión generada, imagen y estrella de favorito       |
| `FavoritesListComponent` | `src/app/components/favorites-list/` | Sidebar con lista de fusiones guardadas                         |

### Servicios

| Servicio                | Responsabilidad                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `PokemonService`        | `getPokemon()` — ID aleatorio criptográfico (1–1025) → GET PokéAPI                                    |
| `PolimerizationService` | `fuse()` → POST `/api/fuse`; `generateImage()` → POST `/api/generate-image`; constructores de prompts |
| `FavoritesService`      | CRUD Firestore + subida/eliminación de sprites en Storage                                             |
| `UserIdentityService`   | UUID anónimo por dispositivo via `localStorage`; SSR-safe                                             |

### Rutas

```
/          → HomeComponent (lazy-loaded)
/**        → redirect to /
```

### Endpoints del servidor SSR (Express)

| Método | Ruta                  | Descripción                                                |
| ------ | --------------------- | ---------------------------------------------------------- |
| `POST` | `/api/fuse`           | Proxy a Cloudflare AI — modelo `granite-4.0-h-micro` (LLM) |
| `POST` | `/api/generate-image` | Proxy a Cloudflare AI — modelo `phoenix-1.0` (imagen)      |

### Dependencias principales

| Paquete         | Versión  | Uso                                |
| --------------- | -------- | ---------------------------------- |
| `@angular/core` | ^21.2.0  | Framework principal                |
| `@angular/ssr`  | ^21.2.0  | Server-Side Rendering con Express  |
| `firebase`      | ^12.10.0 | Firestore (BD) + Storage (sprites) |
| `express`       | ^5.1.0   | Servidor SSR + proxy de API        |
| `rxjs`          | ~7.8.0   | Observables para llamadas async    |
| `tailwindcss`   | ^4.1.12  | Estilos utilitarios (v4, PostCSS)  |
| `dotenv`        | ^17.3.1  | Variables de entorno en servidor   |

---

## Modelo de datos

### Colección Firestore

```
favorites/
  {userId}/           ← UUID anónimo del dispositivo
    items/
      {docId}/        ← documento SavedFusion
```

### Documento `SavedFusion`

```typescript
{
  id:        string     // ID del documento Firestore
  userId:    string     // UUID anónimo del dispositivo
  fusion: {             // SavedFusionData (PokemonFusion sin moves)
    name:    string     // nombre inventado de la fusión
    height:  number     // promedio de alturas (decímetros)
    weight:  number     // promedio de pesos (hectogramos)
    types:   [{ name: string, slot: number }]   // 1 o 2 tipos
    stats:   [{ name: string, base_stat: number }]  // 6 estadísticas
    ability: { name: string, is_hidden: boolean }
    sources: [string, string, string]  // nombres de los 3 Pokémon origen
  }
  imageUrl:  string     // URL pública de Firebase Storage
  imagePath: string     // Ruta en Storage para poder eliminarla
  createdAt: number     // timestamp Date.now()
}
```

> Los movimientos (`moves`) se excluyen del documento al guardar — pueden superar 100 entradas y no son necesarios para mostrar el favorito.

### Índices

La consulta activa en `listFavorites()` usa `orderBy('createdAt', 'desc')`. Firestore requiere un índice compuesto si se combina con un filtro de `userId`, aunque en esta implementación el `userId` ya está implícito en la ruta de la colección (`favorites/{userId}/items`), por lo que no se necesita índice adicional.

### Reglas de Firestore (recomendadas)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /favorites/{userId}/items/{docId} {
      allow read, write: if request.auth == null
        && userId == resource.data.userId;
    }
  }
}
```

> Actualmente no hay un archivo `firestore.rules` en el repositorio. Ver sección de **Seguridad**.

### Firebase Storage

Los sprites se guardan en `sprites/{userId}/{uuid}.png` con metadatos `contentType: image/png` y `fusionName`.

---

## Estado y navegación

### Estrategia de estado

Se usa **Angular Signals** de forma exclusiva — sin NgRx ni ninguna librería externa de estado. Todo el estado de la aplicación vive en `HomeComponent` como señales reactivas.

```
slots:              signal<PokemonSlot[]>       — 3 slots con estado y datos
fusion:             signal<PokemonFusion | null>
fusionState:        signal<'idle'|'loading'|'done'|'error'>
fusionError:        signal<string | null>
imageState:         signal<'idle'|'loading'|'done'|'error'>
imageUrl:           signal<string | null>        — Object URL (revocado al resetear)
imageBlob:          signal<Blob | null>          — usado para guardar en Storage
isFavorite:         signal<boolean>
isSavingFavorite:   signal<boolean>
isDeletingFavorite: signal<boolean>
currentFavoriteId:  signal<string | null>
viewMode:           signal<'fusion' | 'favorite'>
selectedFavorite:   signal<SavedFusion | null>
favoritesList:      signal<SavedFusion[]>        — actualizado en tiempo real por onSnapshot
```

**Estado derivado con `computed()`:**

- `allLoaded` — los 3 slots están en estado `loaded`
- `anyLoading` — algún slot está cargando
- `loadedPokemons` — tupla tipada `[Pokemon, Pokemon, Pokemon] | null`
- `statusAnnouncement` — texto para el live region de accesibilidad

### Lazy loading

`HomeComponent` se carga de forma diferida vía `loadComponent`:

```typescript
{
  path: '',
  loadComponent: () =>
    import('./pages/home/home.component').then(m => m.HomeComponent)
}
```

### Prerendering (SSR)

Todas las rutas usan `RenderMode.Prerender` — el HTML inicial se genera en build time. La hidratación usa `withEventReplay()` para reproducir eventos del usuario ocurridos antes de que Angular tome el control.

---

## Decisiones técnicas

- **Angular Signals en lugar de NgRx:** La aplicación tiene una sola página con estado local acotado. Habia visto un comentario comun, y es el uso de Signals para el ui y estados internos, para cosas externar usar Rxjs

- **Proxy SSR para Cloudflare AI:** Las credenciales de Cloudflare (`ACCOUNT_ID`, `AUTH_TOKEN`) nunca llegan al cliente. El servidor Express actúa como proxy, leyendo los secretos desde variables de entorno inyectadas por Firebase App Hosting. Esto impide la exposición de tokens en el bundle del navegador.

- **Identidad anónima por UUID:** Se descartó Firebase Anonymous Auth para evitar dependencia del SDK de autenticación y simplificar el flujo. El UUID se genera con `crypto.randomUUID()` (CSPRNG) y se persiste en `localStorage`. Es suficiente para aislar favoritos por dispositivo sin requerir registro.

- **Firestore con ruta particionada por userId:** La estructura `favorites/{userId}/items/{docId}` aísla los datos por usuario a nivel de colección, lo que facilita aplicar reglas de seguridad y escalar con sharding natural sin índices adicionales.

- **`set-env.js` + `apphosting.yaml` para secrets:** Los valores de Firebase se inyectan en `firebase.config.ts` durante el build desde variables de entorno, en lugar de commitearlos. En producción, Firebase Secret Manager provee los valores al runtime del servidor. El archivo generado contiene strings vacíos en el repositorio.

---

## Escalabilidad y mantenimiento

- **Separación de capas:** Presentación (components), orquestación (HomeComponent), lógica de negocio (services) y tipos (types/) están claramente separados. Agregar una nueva fuente de datos (p. ej. una segunda API de Pokémon) solo requiere cambiar `PokemonService`.

- **Crecimiento de features:** Nuevas páginas (detalle de Pokémon, galería pública) se agregan como rutas lazy-loaded sin tocar el código existente. El router ya tiene el patrón establecido.

- **Escalabilidad de Firestore:** La estructura de subcolecciones por usuario soporta millones de documentos sin degradación. Si se añade autenticación real, basta con cambiar el `userId` de UUID a `uid` de Firebase Auth y actualizar las reglas.

- **Migrabilidad del LLM:** El prompt se construye en `PolimerizationService.buildFusionPrompt()`. Cambiar de Cloudflare AI a OpenAI u otro proveedor solo requiere modificar el endpoint en `server.ts` y ajustar el formato de respuesta del proxy.

- **Componentes OnPush:** La detección de cambios está optimizada en todos los componentes. Agregar más componentes siguiendo el mismo patrón no degrada el rendimiento global.

---

## Seguridad y validaciones

### Manejo de secretos

| Secreto                    | Mecanismo                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID`    | Variable de entorno del servidor — nunca en el bundle                                 |
| `CLOUDFLARE_AUTH_TOKEN`    | Variable de entorno del servidor — nunca en el bundle                                 |
| `FIREBASE_API_KEY` y demás | Inyectados en build-time por `set-env.js`; en producción, por Firebase Secret Manager |

El archivo `.env` está en `.gitignore`. En producción los secretos se gestionan exclusivamente a través de Firebase Secret Manager y se mapean en `apphosting.yaml`.

### Validaciones en el servidor

El proxy en `server.ts` valida que las credenciales estén presentes antes de hacer la llamada a Cloudflare:

```typescript
if (!accountId || !authToken) {
  res.status(500).json({ error: 'Server credentials not configured.' });
  return;
}
```

Los errores de Cloudflare se reenvían con su status code original. Los errores de red se capturan y devuelven como `502`.

### Inputs del usuario

No hay formularios de texto libre expuestos al usuario. Las únicas entradas son:

- Botones (seleccionar, fusionar, guardar favorito, eliminar).
- Clic en un favorito de la lista.

No se construyen queries de Firestore con datos del usuario (se usa el UUID del dispositivo que nunca se escribe en el DOM).

### Limitación conocida de seguridad

Las reglas de Firestore no están implementadas en el repositorio. Actualmente cualquier cliente con acceso a la configuración de Firebase puede leer/escribir cualquier colección. Ver sección de **Limitaciones**.

---

## Rendimiento

- **`ChangeDetectionStrategy.OnPush`** en los 5 componentes — la detección de cambios solo se ejecuta cuando cambian las señales o inputs.

- **`forkJoin`** para carga paralela — los 3 Pokémon se piden en paralelo, no secuencialmente.

- **`computed()` para estado derivado** — las barras de estadísticas, labels de ARIA y estados calculados solo se recomputan cuando sus dependencias cambian.

- **Lazy loading del HomeComponent** — el chunk de la página principal no bloquea el bootstrap inicial.

- **SSR + Prerender** — el HTML llega renderizado al navegador. `withEventReplay()` garantiza que los clicks durante la hidratación no se pierdan.

- **Assets con `maxAge: '1y'`** y output hashing en el build — los estáticos se cachean agresivamente en el CDN/browser; el hash en el nombre del archivo garantiza cache-busting automático.

- **`URL.revokeObjectURL()`** al resetear — se liberan los Object URLs de los blobs de imagen anteriores para evitar fugas de memoria.

- **Moves excluidos de Firestore** — reducen el tamaño de cada documento de potencialmente 100+ entradas a ~10 campos.

- **Sin paginación en favoritos** — la lista se renderiza completa. Aceptable para colecciones personales pequeñas. Si el volumen creciera, la solución es añadir cursor-based pagination con `startAfter()` de Firestore.

---

## Accesibilidad

La aplicación está diseñada para cumplir con **WCAG 2.1 AA**.

- **`lang="es"`** en `<html>` — declaración correcta del idioma para lectores de pantalla.

- **Landmarks semánticos:** `<header role="banner">`, `<main id="main-content">`, `<footer role="contentinfo">`, `<aside aria-label="Favoritos guardados">`.

- **Live regions para anuncios dinámicos:**
  - `role="status" aria-live="polite" aria-atomic="true"` — anuncia transiciones de estado (cargando, fusión completada, imagen generada).
  - `role="alert" aria-live="assertive"` — anuncia errores inmediatamente.

- **`aria-busy`** en botones y contenedores durante estados de carga — informa al usuario que la acción está en proceso.

- **`aria-pressed`** en el botón de favorito (estrella) — semántica correcta de botón de alternancia.

- **`aria-current`** en el favorito activo de la lista sidebar.

- **`aria-label`** descriptivo en todos los elementos interactivos (no solo el texto visible del icono).

- **`aria-hidden="true"`** en elementos decorativos (estrellas, spinners, destellos).

- **`alt` text** en todas las imágenes con texto significativo.

- **Jerarquía de headings:** `<h1>` para el título de la app, `<h2>` para secciones con `aria-labelledby`.

- **Foco visible:** `focus-visible:ring-2` en todos los elementos interactivos; nunca se elimina el outline sin reemplazarlo.

- **Semántica de botón** para todas las acciones — sin handlers de clic en `div` o `span`.

- **Contraste de color:** la paleta pixel-art usa fondos oscuros con texto claro o badges de tipo con contraste suficiente para AA.

---

## Uso de IA

### Como herramienta

Antes de empezar el proyecto yo enliste que queria para el proyecto, luego esto lo redacte mejor con Gemini para escribir una planeación, estimar tiempos, rutas, definir tecnologias, etc

El tema de UI/UX es un area de mejora mia, tenia en mente el estilo que queria utilizar porque el pokemon esmeralda y variantes me gustan, con Sonnet 4.6 definí criterios de estilos etc

Para optimizacion de html para mejorar accesibilidad

### Como servicio

#### Dónde se usa IA

| Paso                           | Modelo                                | Proveedor     |
| ------------------------------ | ------------------------------------- | ------------- |
| Generación de la fusión (JSON) | `@cf/ibm-granite/granite-4.0-h-micro` | Cloudflare AI |
| Generación del sprite (imagen) | `@cf/leonardo/phoenix-1.0`            | Cloudflare AI |

#### Por qué estos modelos

- **Granite 4.0 (LLM):** Modelo ligero y rápido para respuesta en JSON estructurado. El prompt indica explícitamente que responda solo con JSON válido, sin markdown ni explicaciones. Cloudflare AI ofrece latencia baja al ser edge-native.
- **Leonardo Phoenix 1.0 (imagen):** Modelo de generación de imágenes disponible en Cloudflare Workers AI que produce resultados de buena calidad en estilo pixel-art con el prompt adecuado. Otros estaban mas optimizados para fotorealismo, lo cual no me interesa ahorita

#### Riesgos y mitigación

| Riesgo                                   | Mitigación                                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| LLM devuelve JSON malformado             | `JSON.parse()` lanza excepción capturada; `fusionState` pasa a `'error'` y se muestra mensaje al usuario                        |
| Nombre de fusión genérico o inapropiado  | El prompt prohíbe explícitamente usar nombres de tipos, movimientos o habilidades; solo blends de sílabas de los nombres origen |
| Imagen no generada o de baja calidad     | `imageState` pasa a `'error'`; el usuario puede reintentar con `refuse()` sin recargar los Pokémon                              |
| Latencia alta del modelo de imagen       | El estado de carga se refleja en UI y en el live region de accesibilidad; no bloquea la visualización del JSON de fusión        |
| Exposición de credenciales de Cloudflare | Todas las llamadas a Cloudflare AI pasan por el proxy SSR; las credenciales solo existen en `process.env` del servidor          |

---

## Limitaciones y siguientes pasos

El principal a mi parecer es el tema de sesión, actualmente uso un uuid que guardo en el localstorage, y con eso mantengo una especie de aislamiento entre usuarios pero no es todopoderoso, funciona para prototipo

El otro es el cuestion de rendimiento a la hora de generar las respuestas con workers Ai, siento que pueden tomar mucho tiempo

Como demo, el consumo de tokens para la generacion de imagenes se dispara mucho, naturalmente es costoso y es una caracteristica que probablemente quite hasta no encontrar una alternativa mas economica

---

## Configuración del proyecto

### Prerrequisitos

- Node.js 20+
- npm 11+
- Firebase CLI: `npm install -g firebase-tools`
- Angular CLI: `npm install -g @angular/cli`

### 1. Crear proyecto Firebase

```bash
# Iniciar sesión
firebase login

# Crear proyecto
firebase projects:create {project-id} --display-name "{Nombre del Proyecto}"

# Seleccionar proyecto activo
firebase use {project-id}
```

### 2. Configurar Firestore

En la consola de Firebase (<https://console.firebase.google.com>):

1. Ir a **Firestore Database** → **Crear base de datos**.
2. Seleccionar modo **Producción**.
3. Elegir región (ej. `us-central1`).

O con CLI:

```bash
firebase firestore:databases:create --location us-central1 --project {project-id}
```

### 3. Configurar Firebase Storage

En la consola:

1. Ir a **Storage** → **Comenzar**.
2. Aceptar las reglas predeterminadas y elegir región.

O con CLI:

```bash
firebase storage:buckets:create gs://{project-id}.appspot.com --project {project-id}
```

### 4. Configurar Firebase App Hosting

```bash
firebase apphosting:backends:create \
  --project {project-id} \
  --location us-central1 \
  --display-name {backend-name}
```

Conectar el repositorio de GitHub cuando se solicite.

### 5. Registrar Web App y obtener configuración

En la consola de Firebase:

1. Ir a **Configuración del proyecto** → **Tus apps** → **Agregar app** → Web (`</>`).
2. Registrar la app con un apodo.
3. Copiar los valores de configuración.

### 6. Guardar secretos de Firebase en Secret Manager

```bash
# Crear cada secreto (introducir el valor cuando se solicite)
firebase apphosting:secrets:set FIREBASE_API_KEY --project {project-id}
firebase apphosting:secrets:set FIREBASE_AUTH_DOMAIN --project {project-id}
firebase apphosting:secrets:set FIREBASE_PROJECT_ID --project {project-id}
firebase apphosting:secrets:set FIREBASE_STORAGE_BUCKET --project {project-id}
firebase apphosting:secrets:set FIREBASE_MESSAGING_SENDER_ID --project {project-id}
firebase apphosting:secrets:set FIREBASE_APP_ID --project {project-id}
firebase apphosting:secrets:set FIREBASE_MEASUREMENT_ID --project {project-id}
```

### 7. Guardar secretos de Cloudflare en Secret Manager

```bash
firebase apphosting:secrets:set CLOUDFLARE_ACCOUNT_ID --project {project-id}
firebase apphosting:secrets:set CLOUDFLARE_AUTH_TOKEN --project {project-id}
```

### 8. Dar acceso al backend a los secretos

```bash
firebase apphosting:secrets:grantaccess FIREBASE_API_KEY --backend {backend-name} --project {project-id}
firebase apphosting:secrets:grantaccess FIREBASE_AUTH_DOMAIN --backend {backend-name} --project {project-id}
firebase apphosting:secrets:grantaccess FIREBASE_PROJECT_ID --backend {backend-name} --project {project-id}
firebase apphosting:secrets:grantaccess FIREBASE_STORAGE_BUCKET --backend {backend-name} --project {project-id}
firebase apphosting:secrets:grantaccess FIREBASE_MESSAGING_SENDER_ID --backend {backend-name} --project {project-id}
firebase apphosting:secrets:grantaccess FIREBASE_APP_ID --backend {backend-name} --project {project-id}
firebase apphosting:secrets:grantaccess FIREBASE_MEASUREMENT_ID --backend {backend-name} --project {project-id}
firebase apphosting:secrets:grantaccess CLOUDFLARE_ACCOUNT_ID --backend {backend-name} --project {project-id}
firebase apphosting:secrets:grantaccess CLOUDFLARE_AUTH_TOKEN --backend {backend-name} --project {project-id}
```

### 9. Variables de entorno locales

Crear `.env` en la raíz del proyecto:

```env
CLOUDFLARE_ACCOUNT_ID={tu-cloudflare-account-id}
CLOUDFLARE_AUTH_TOKEN={tu-cloudflare-auth-token}
FIREBASE_API_KEY={tu-firebase-api-key}
FIREBASE_AUTH_DOMAIN={tu-proyecto}.firebaseapp.com
FIREBASE_PROJECT_ID={tu-proyecto}
FIREBASE_STORAGE_BUCKET={tu-proyecto}.appspot.com
FIREBASE_MESSAGING_SENDER_ID={tu-sender-id}
FIREBASE_APP_ID={tu-app-id}
FIREBASE_MEASUREMENT_ID={tu-measurement-id}
```

> El archivo `.env` está en `.gitignore` y no debe commitearse.

### 10. Instalar dependencias y levantar en desarrollo

```bash
npm install
npm start
```

La app estará disponible en `http://localhost:4200`.

### 11. Build y deploy

```bash
# Build (inyecta firebase.config.ts desde .env)
npm run build

# Deploy a Firebase App Hosting (automático via GitHub push al branch configurado)
# O manualmente:
firebase apphosting:backends:deploy {backend-name} --project {project-id}
```

---

## Comandos de desarrollo

```bash
npm start                          # Dev server en localhost:4200
npm run build                      # Build de producción
npm test                           # Tests unitarios con Vitest
npm run serve:ssr:pokefusion       # Servidor SSR local (tras build)
```
