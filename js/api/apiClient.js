// Este archivo tendrá una única función request que se encargará de todo el trabajo estandar: 
// añadir la URL base, poner el token, y manejar los errores 401. Esto evita repetir código en cada servicio.

// La única función que necesitamos importar es la de logout.
// La importamos para usarla en caso de un error 401.
// import { authService } from './auth.service.js'; YA SE HIZO EN OTRO ARCHIVO

    // const  = 'https://fastapifinal-production.up.railway.app/'
    const API_BASE_URL = "https://fastapi-final-4i0w.onrender.com/";



/**
 * Cliente central para realizar todas las peticiones a la API.
 * @param {string} endpoint - El endpoint al que se llamará (ej. '/users/get-by-centro').
 * @param {object} [options={}] - Opciones para la petición fetch (method, headers, body).
 * @returns {Promise<any>} - La respuesta de la API en formato JSON.
 */                          
export async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('access_token');

    // Configuramos las cabeceras por defecto
    const headers = {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        ...options.headers, // Permite sobrescribir o añadir cabeceras
    };

    // Si hay un token, lo añadimos a la cabecera de Authorization
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, { ...options, headers });

        // Manejo centralizado del error 401 (Token inválido/expirado)
        if (response.status === 401) {
            // Mostrar modal una sola vez usando flag global
            if (!window.sessionExpiredShown) {
                window.sessionExpiredShown = true;
                // Limpiar el flag después de 2 segundos
                setTimeout(() => {
                    window.sessionExpiredShown = false;
                }, 2000);
                
                if (window.showSessionExpiredModal) {
                    window.showSessionExpiredModal();
                }
            }
            throw new Error('Sesión expirada');
        }

        if(response.status === 403){
            if (!window.sessionExpiredShown) {
                window.sessionExpiredShown = true;
                setTimeout(() => {
                    window.sessionExpiredShown = false;
                }, 2000);
                
                if (window.showSessionExpiredModal) {
                    window.showSessionExpiredModal();
                }
            }
            throw new Error('Token inválido');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Ocurrió un error en la petición.' }));
            throw new Error(errorData.detail);
        }
        
        // Si la respuesta no tiene contenido (ej. status 204), devolvemos un objeto vacío.
        return response.status === 204 ? {} : await response.json();

    } catch (error) {
        console.error(`Error en la petición a ${endpoint}:`, error);
        throw error;
    }
}