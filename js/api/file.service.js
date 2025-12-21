import { request } from './apiClient.js';

export const fileService = {

    // ============================
    // ARCHIVOS ORIGINALES
    // GET /innovacion/?show_modificados=false
    // ============================
    getOriginalFiles: async ({
        fechaDesde = null,
        fechaHasta = null,
        fecha_desde = null,
        fecha_hasta = null,
        limit = 20,
        query = null,
        id_proyecto = null,
        codigo_sgps = null,
        nombre_centro = null,
        regional = null
    } = {}) => {
        const from = fecha_desde || fechaDesde || null;
        const to = fecha_hasta || fechaHasta || null;

        const qs = new URLSearchParams();
        qs.set('show_modificados', 'false');
        if (from) qs.set('fechaDesde', from);
        if (to) qs.set('fechaHasta', to);
        if (limit != null) qs.set('limit', String(limit));
        if (query) qs.set('query', String(query));
        if (id_proyecto) qs.set('id_proyecto', String(id_proyecto));
        if (codigo_sgps) qs.set('codigo_sgps', String(codigo_sgps));
        if (nombre_centro) qs.set('nombre_centro', String(nombre_centro));
        if (regional) qs.set('regional', String(regional));

        const endpoint = `innovacion_donald/?${qs.toString()}`;
        const response = await request(endpoint);
        return response?.archivos || [];
    },

    // ============================
    // ARCHIVOS MODIFICADOS
    // GET /innovacion/?show_modificados=true
    // ============================
    getModifiedFiles: async ({
        fechaDesde = null,
        fechaHasta = null,
        fecha_desde = null,
        fecha_hasta = null,
        limit = 20,
        query = null,
        id_proyecto = null,
        codigo_sgps = null,
        nombre_centro = null,
        regional = null
    } = {}) => {
        const from = fecha_desde || fechaDesde || null;
        const to = fecha_hasta || fechaHasta || null;

        const qs = new URLSearchParams();
        qs.set('show_modificados', 'true');
        if (from) qs.set('fechaDesde', from);
        if (to) qs.set('fechaHasta', to);
        if (limit != null) qs.set('limit', String(limit));
        if (query) qs.set('query', String(query));
        if (id_proyecto) qs.set('id_proyecto', String(id_proyecto));
        if (codigo_sgps) qs.set('codigo_sgps', String(codigo_sgps));
        if (nombre_centro) qs.set('nombre_centro', String(nombre_centro));
        if (regional) qs.set('regional', String(regional));

        const endpoint = `innovacion_donald/?${qs.toString()}`;
        const response = await request(endpoint);
        return response?.archivos || [];
    },

    // ============================
    // ARCHIVOS ACTUALES
    // GET /innovacion/current
    // ============================
    getCurrentFiles: async ({ limit = 20, fechaDesde = null, fechaHasta = null } = {}) => {
        let endpoint = `innovacion_donald/current?limit=${limit}`;

        if (fechaDesde) endpoint += `&fechaDesde=${fechaDesde}`;
        if (fechaHasta) endpoint += `&fechaHasta=${fechaHasta}`;

        const response = await request(endpoint);
        return response?.archivos || [];
    },






























    // ============================
    // PROYECTOS
    // GET /innovacion_donald/projects?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD&limit=N
    // Acepta tanto camelCase (fechaDesde/fechaHasta) como snake_case (fecha_desde/fecha_hasta)
    // ============================
    getProjects: async ({ fechaDesde = null, fechaHasta = null, fecha_desde = null, fecha_hasta = null, limit = null } = {}) => {
        const endpoint = 'innovacion_donald/projects';

        // Normaliza nombres de parámetros hacia snake_case esperado por backend
        const from = fecha_desde || fechaDesde || null;
        const to = fecha_hasta || fechaHasta || null;

        const qs = new URLSearchParams();
        if (from) qs.append('fecha_desde', from);
        if (to) qs.append('fecha_hasta', to);
        if (limit != null) qs.append('limit', String(limit));

        const url = qs.toString() ? `${endpoint}?${qs.toString()}` : endpoint;
        return await request(url);
    },

    // ============================
    // ELIMINAR ARCHIVO
    // DELETE /innovacion/{id}
    // ============================
    deleteFile: async (id, isModified = false) => {
        const flag = isModified ? 1 : 0;
        return await request(`innovacion_donald/${id}?is_modificado=${flag}`, { method: 'DELETE' });
    },

    // ============================
    // DESCARGAR ARCHIVO
    // GET /innovacion/{id}/download
    // ============================
    downloadFileUrl: (id, isModified = false) => {
        const flag = isModified ? 'true' : 'false';
        return `innovacion_donald/${id}/download?is_modificado=${flag}`;
    },
    // ============================
    // HISTORICO DE ARCHIVOS
    // GET /innovacion_donald/versions/{id}
    // ============================
    
    getFileVersions: async (id) => {
        const endpoint = `innovacion_donald/versions/${id}`;
        const response = await request(endpoint);
        return response;
    },

    // ============================
    // OBTENER METADATA DE ARCHIVO
    // GET /innovacion_donald/meta/{id}
    // ============================
    getFileMetadata: async (id, isModified = false) => {
        const endpoint = `innovacion_donald/meta/${id}?show_modificados=${isModified}`;
        const response = await request(endpoint);
        return response;
    },

    // ============================
    // SUBIR ARCHIVO NUEVO (original)
    // POST /innovacion_donald/upload
    // ============================
    uploadFile: async (formData) => {
        const endpoint = `innovacion_donald/upload`;
        const API_BASE_URL = "https://fastapi-final-4i0w.onrender.com/";
        const token = localStorage.getItem('access_token');
        
        // Extraer parámetros para query string
        const queryParams = new URLSearchParams();
        const queryFields = [
            'nombre_proyecto','id_proyecto', 'fecha_informe', 'codigo_sgps', 'nombre_centro',
            'regional', 'responsables_proyecto', 'responsable', 'progreso', 'observaciones'
        ];
        
        // FormData solo con el archivo
        const fileOnlyFormData = new FormData();
        
        // Separar: archivo al body, metadata a query
        for (let [key, value] of formData.entries()) {
            if (key === 'file') {
                fileOnlyFormData.append('file', value);
            } else if (queryFields.includes(key)) {
                queryParams.append(key, value);
            }
        }
        
        const fullUrl = `${API_BASE_URL}${endpoint}?${queryParams.toString()}`;
        
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: fileOnlyFormData
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Error al subir archivo' }));
            throw new Error(errorData.detail || 'Error al subir archivo');
        }
        
        return await response.json();
    },

    // ============================
    // ACTUALIZAR ARCHIVO (crear versión modificada)
    // POST /innovacion_donald/upload?id_proyecto=...&is_modificacion=true&id_archivo_original=...
    // ============================
    updateFile: async (id, formData) => {
        const endpoint = `innovacion_donald/upload`;
        const API_BASE_URL = "https://fastapi-final-4i0w.onrender.com/";
        const token = localStorage.getItem('access_token');
        
        console.log("=== updateFile DEBUG ===");
        console.log("ID del archivo original (id):", id);
        console.log("Tipo de ID:", typeof id);
        
        // Extraer los parámetros de query del FormData
        const queryParams = new URLSearchParams();
        
        // Extraer parámetros que deben ir en la URL (query string)
        const queryFields = [
            'id_proyecto', 'nombre_proyecto', 'fecha_informe', 'codigo_sgps', 'nombre_centro',
            'regional', 'responsables_proyecto', 'responsable', 'progreso',
            'observacion', 'razon_modificado'
        ];
        
        // Crear un nuevo FormData solo con el archivo
        const fileOnlyFormData = new FormData();
        
        // Procesar el FormData: archivo va al body, parámetros van a query
        for (let [key, value] of formData.entries()) {
            if (key === 'file') {
                fileOnlyFormData.append('file', value);
            } else if (queryFields.includes(key)) {
                queryParams.append(key, value);
            }
        }
        
        // Agregar parámetros importantes para versioning
        queryParams.append('id_archivo_original', id);
        // IMPORTANTE: el backend espera `is_modificacion` (no `is_modificado`) para guardar en archivos_modificados
        queryParams.append('is_modificacion', 'true');
        
        const fullUrl = `${API_BASE_URL}${endpoint}?${queryParams.toString()}`;
        
        console.log("=== Query Parameters ===");
        console.log(queryParams.toString());
        console.log("=== URL Completa ===");
        console.log(fullUrl);
        
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: fileOnlyFormData
        });
        
        if (!response.ok) {
            let errorDetail = 'Error al actualizar archivo';
            let fullDetails = '';
            
            try {
                const errorData = await response.json();
                console.error('Respuesta del error del servidor:', errorData);
                
                // Si hay un array de errores (validación), mostrar todos
                if (errorData.detail && Array.isArray(errorData.detail)) {
                    const messages = errorData.detail.map(err => {
                        if (typeof err === 'object' && err.msg) {
                            return `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg}`;
                        }
                        return JSON.stringify(err);
                    });
                    errorDetail = messages.join('\n');
                    fullDetails = messages.join('\n');
                } else if (typeof errorData.detail === 'string') {
                    errorDetail = errorData.detail;
                    fullDetails = errorData.detail;
                } else if (errorData.error) {
                    errorDetail = errorData.error;
                    fullDetails = errorData.error;
                }
            } catch (e) {
                console.error('Error parseando respuesta JSON:', e);
                fullDetails = `Error del servidor (${response.status}): ${response.statusText}`;
            }
            
            const error = new Error(errorDetail);
            error.details = fullDetails;
            throw error;
        }
        
        return await response.json();
    },

    dataStats: async ({
        tipo_archivo = 'todos',
        q = null,
        id_proyecto = null,
        codigo_sgps = null,
        nombre_centro = null,
        regional = null,
        fechaDesde = null,
        fechaHasta = null
    } = {}) => {
        const qs = new URLSearchParams();
        if (tipo_archivo) qs.set('tipo_archivo', String(tipo_archivo));
        if (q) qs.set('q', String(q));
        if (id_proyecto) qs.set('id_proyecto', String(id_proyecto));
        if (codigo_sgps) qs.set('codigo_sgps', String(codigo_sgps));
        if (nombre_centro) qs.set('nombre_centro', String(nombre_centro));
        if (regional) qs.set('regional', String(regional));
        if (fechaDesde) qs.set('fechaDesde', String(fechaDesde));
        if (fechaHasta) qs.set('fechaHasta', String(fechaHasta));

        const endpoint = `innovacion_donald/stats?${qs.toString()}`;
        return await request(endpoint);
    }


};












