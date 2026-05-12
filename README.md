# ◈ AccessCheck — Auditor WCAG 2.1 / 2.2

Herramienta web de auditoría de accesibilidad que analiza cualquier URL y genera un informe detallado siguiendo los estándares WCAG 2.1 y 2.2.

## 🚀 Demo en GitHub Pages

Visita: `https://TU-USUARIO.github.io/TU-REPOSITORIO/`

## ✨ Funcionalidades

- **Análisis automático** de cualquier URL pública
- **Estándares WCAG 2.1 y 2.2** — seleccionables individualmente
- **Niveles de conformidad A, AA y AAA** — configurables
- **Informe detallado** con problemas clasificados por gravedad (crítico, serio, moderado, menor)
- **Puntuación 0–100** con indicador visual
- **Estado de conformidad** por estándar y nivel
- **Descarga en PDF** con informe completo y correcciones sugeridas
- **Filtros interactivos** para navegar los problemas
- **Motor axe-core** — el estándar de la industria para análisis WCAG

## 📋 Tecnologías

- **axe-core 4.9.1** — Motor de análisis de accesibilidad
- **jsPDF + autotable** — Generación de PDF
- HTML5 / CSS3 / JavaScript vanilla
- Proxies CORS públicos para cargar URLs externas

## 🛠️ Despliegue en GitHub Pages

1. Crea un repositorio en GitHub (puede ser público)
2. Sube todos los archivos de esta carpeta:
   ```
   index.html
   style.css
   engine.js
   report.js
   pdf.js
   app.js
   ```
3. Ve a **Settings → Pages**
4. En "Source", selecciona **Deploy from a branch**
5. Selecciona la rama `main` (o `master`) y carpeta `/ (root)`
6. Guarda y espera unos minutos
7. Tu app estará en `https://TU-USUARIO.github.io/TU-REPOSITORIO/`

## ⚠️ Limitaciones conocidas

- Algunos sitios bloquean el acceso desde proxies CORS (ej: sitios con Cloudflare estricto)
- El análisis es del HTML inicial; no ejecuta JavaScript dinámico complejo
- Para mejores resultados, usa URLs de páginas públicas sin autenticación
- Las URLs de `localhost` o redes privadas no son accesibles

## 🔍 Criterios WCAG evaluados

### Nivel A (básico)
- Texto alternativo en imágenes (1.1.1)
- Subtítulos en videos (1.2.2)
- Estructura semántica (1.3.1)
- Uso del color (1.4.1)
- Control de audio (1.4.2)
- Teclado accesible (2.1.1)
- Temporizadores ajustables (2.2.1)
- Título de página (2.4.2)
- Propósito de enlace (2.4.4)
- Idioma de la página (3.1.1)
- Etiquetas de formulario (4.1.2)

### Nivel AA
- Contraste de color 4.5:1 (1.4.3)
- Redimensionado de texto (1.4.4)
- Espaciado de texto (1.4.12)
- Autocompletado (1.3.5)
- Encabezados (2.4.6)
- Idioma de partes (3.1.2)
- **WCAG 2.2:** Foco visible mejorado (2.4.11), Tamaño del objetivo (2.5.8)

### Nivel AAA
- Contraste mejorado 7:1 (1.4.6)
- Landmarks de página (1.3.6)

## 📄 Licencia

MIT — Libre para uso personal y comercial.
