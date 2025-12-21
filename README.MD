# 📁 Gestor de Archivos por Proyecto – SENA

> **Sistema web para la gestión centralizada de archivos Excel asociados a proyectos institucionales del SENA**, con soporte para metadatos, versionado, búsqueda avanzada y visualización analítica.

Este sistema permite a los usuarios del **Servicio Nacional de Aprendizaje (SENA)** subir, organizar, consultar y gestionar documentos técnicos (en formato Excel) relacionados con proyectos de innovación, metas, egresados, convenios y más, garantizando trazabilidad, control de versiones y acceso estructurado.

---
## Links para consumir el proyecto

### Primero Abrir el link del backend para que funcione, luego el frontend para consumirlo
**Link de las rutas del backend**
https://fastapi-final-4i0w.onrender.com/docs

**Link del front end**
https://hungrymikez.github.io/INNOVACION/

**Usuario**
legarda@example.com

**Contraseña**
legarda123

---

## 🌟 Características principales

- ✅ **Clasificación por tipo de archivo**: originales, modificados y actuales.
- 🔍 **Búsqueda avanzada** con filtros por:
  - Nombre del proyecto
  - Código SGPS
  - Centro de estudio
  - Regional
  - Rango de fechas
  - Tipo de archivo
- 📤 **Subida de archivos Excel** con metadatos asociados:
  - Fecha de reporte
  - Responsable
  - Avance (%)
  - Observaciones
  - Categoría del proyecto
- 🔄 **Gestión de versiones**: cada archivo puede tener múltiples versiones con historial completo.
- 📊 **Indicadores visuales** mediante gráficas (con Chart.js):
  - Comparación entre archivos originales y modificados
  - Total de archivos actuales
  - Resultados filtrados
- 🗑️ **Eliminación segura** con confirmación visual detallada.
- 👁️ **Vista detallada** de metadatos de cada archivo.
- 📱 **Diseño responsive y adaptable** con barra lateral colapsable.
- 🔒 **Manejo de sesión**: redirección automática si el token de acceso expira.
- 🎨 **Interfaz moderna y amigable**, siguiendo la identidad visual del SENA.

---

## 🛠️ Tecnologías utilizadas

- **HTML5 / CSS3**
- **Python / FastApi**
- **JavaScript (ES6+)** con módulos
- **Bootstrap 5.3** (para componentes UI y responsive)
- **Font Awesome & Bootstrap Icons** (iconografía)
- **Chart.js** (gráficas interactivas)
- **Fetch API** (consumo de backend — implementado en `js/files.js`)

> Nota: Aunque el backend no está incluido en este archivo, la arquitectura del frontend está preparada para conectarse a una API RESTful (los endpoints se manejan desde `js/files.js`).

---

## 📂 Estructura del proyecto (frontend)

```
/
├── index.html                 # Página principal (este archivo)
├── img/
│   └── sena-logo.svg          # Logo del SENA
├── css/
│   └── styles.css             # Estilos personalizados adicionales (opcional)
├── js/
│   ├── files.js               # Lógica principal: carga, subida, búsqueda, versiones
│   └── dashboard.js           # Gestión de gráficas y estadísticas
```


## 👨‍💻 Autor

Desarrollado por **Michael Zuluaga Hungrymikezz** — Estudiante o colaborador del SENA.

> *"Herramienta construida para optimizar la gestión documental en proyectos institucionales."*

---

## 📜 Licencia

© 2025 Servicio Nacional de Aprendizaje – SENA.  
Todos los derechos reservados.
