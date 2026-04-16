# Generador de Planeamientos MEDUCA — Panamá
### Formato N°4 · Educación Primaria, Premedia y Media

---

## Archivos del proyecto

```
/
├── index.html          ← La app completa (formulario + generación + Word)
├── manifest.json       ← Para instalar como app en Android (PWA)
├── vercel.json         ← Configuración de Vercel
├── api/
│   └── generar.js      ← Función de servidor (protege tu API key)
└── README.md           ← Esta guía
```

---

## Cómo desplegarlo en Vercel (paso a paso)

### Requisitos previos
- Cuenta gratuita en [github.com](https://github.com)
- Cuenta gratuita en [vercel.com](https://vercel.com) (entras con tu cuenta de GitHub)
- API key de Anthropic → créala en [console.anthropic.com](https://console.anthropic.com)

---

### Paso 1 — Crear repositorio en GitHub

1. Entra a [github.com](https://github.com) → botón verde **New**
2. Nombre del repositorio: `generador-meduca` (o el que quieras)
3. Déjalo **Public** (Vercel lo requiere en el plan gratuito)
4. Clic en **Create repository**

---

### Paso 2 — Subir los archivos

**Opción A — Desde el navegador (sin instalar nada):**
1. En tu repositorio vacío, clic en **uploading an existing file**
2. Arrastra todos los archivos de este proyecto
3. ⚠️ Para el archivo `api/generar.js` necesitas crear primero la carpeta:
   - Clic en **Create new file**
   - En el nombre escribe: `api/generar.js`
   - Pega el contenido del archivo
   - Clic en **Commit new file**
4. Repite para `index.html`, `vercel.json`, `manifest.json`

**Opción B — Con Git (si tienes Git instalado):**
```bash
git clone https://github.com/TU_USUARIO/generador-meduca
cd generador-meduca
# Copia todos los archivos aquí
git add .
git commit -m "Generador MEDUCA inicial"
git push
```

---

### Paso 3 — Conectar con Vercel

1. Entra a [vercel.com](https://vercel.com) → **Add New Project**
2. Conecta tu cuenta de GitHub si no lo has hecho
3. Busca tu repositorio `generador-meduca` → clic en **Import**
4. Deja todo por defecto → clic en **Deploy**
5. Vercel construye y despliega en ~30 segundos

---

### Paso 4 — Agregar tu API key (¡IMPORTANTE!)

Sin este paso la app no funciona.

1. En tu proyecto de Vercel → pestaña **Settings**
2. Menú izquierdo → **Environment Variables**
3. Agrega:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** tu API key (empieza con `sk-ant-...`)
   - **Environment:** selecciona los 3: Production, Preview, Development
4. Clic en **Save**
5. Ve a **Deployments** → clic en los 3 puntos → **Redeploy**

---

### Paso 5 — Usar la app

Tu URL será algo como: `https://generador-meduca.vercel.app`

Compártela con otros docentes. Cada planeamiento generado cuesta
aproximadamente **$0.003 USD** en la API de Anthropic.

---

## Instalar como app en Android (PWA)

1. Abre la URL en Chrome para Android
2. Aparecerá un banner "Instalar en pantalla de inicio"
3. Toca **Instalar**
4. La app aparece como ícono en tu pantalla, igual que una app nativa

---

## Costo estimado

| Servicio | Costo |
|----------|-------|
| Vercel Hobby | **Gratis** (hasta 100GB/mes) |
| Anthropic API | ~$0.003 por planeamiento completo |
| GitHub | **Gratis** |
| **Total mensual** (100 planeamientos) | **~$0.30 USD** |

---

## Actualizar la app

Cada vez que modificas un archivo y lo subes a GitHub, Vercel
redespliega automáticamente en segundos. Sin hacer nada extra.

---

## Soporte

Generado con asistencia de Claude (Anthropic) para el
Ministerio de Educación de Panamá — MEDUCA.
Currículo basado en los programas oficiales actualización 2014.
