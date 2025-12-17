// import { fileService } from './api/file.service.js';

// async function cargarArchivos() {
//     try {
//         const data = await fileService.getFiles();

//         console.log("Respuesta del backend:", data);
//         console.log("ESTA ES LA MALPARIDA DATA")
//         console.log(data)


//         //const tbody = document.getElementById("filesTableBody");

//         if (!data || data.length === 0) {
//             tbody.innerHTML = `<tr><td colspan="5">No hay archivos</td></tr>`;
//             return;
//         }


//         data.forEach(file => {
//             const tr = document.createElement("tr");

//             tr.innerHTML = `
//                 <td>${file.proyecto || "-"}</td>
//                 <td>${file.codigo_sgps || "-"}</td>
//                 <td>${file.centro_estudio || "-"}</td>
//                 <td>${file.regional || "-"}</td>
//                 <td>${file.fecha_reporte || "-"}</td>
//             `;

//             tbody.appendChild(tr);
//         });

//     } catch (error) {
//         console.error("Error probando el GET:", error);
//     }
// }

// cargarArchivos();

import { fileService } from './api/file.service.js';

async function cargarArchivos() {
    try {
        const response = await fileService.getFiles();

        console.log("Respuesta cruda del backend:", response);

        // Extraer el array real
        const files = Array.isArray(response)
            ? response
            : response.data || response.archivos || [];

        console.log("Archivos procesados:", files);

        const tbody = document.getElementById("filesTableBody");
        tbody.innerHTML = "";

        if (files.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5">No hay archivos</td></tr>`;
            return;
        }

        files.forEach(file => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${file.nombre_proyecto || "-"}</td>
                <td>${file.codigo_sgps || "-"}</td>
                <td>${file.nombre_centro || "-"}</td>
                <td>${file.regional || "-"}</td>
                <td>${file.fecha_informe || "-"}</td>
                <td>${file.fecha_carga || "-"}</td>
                <td>${file.responsable || "-"}</td>
                <td>${file.progreso || "-"}</td>
                <td>${file.nombre_archivo || "-"}</td>
                <td>${file.tamano_archivo || "-"}</td>
                <td>${file.version || "-"}</td>
                <td>${file.tamano_archivo || "-"}</td>
                <td>${file.ruta_almacenamiento || "-"}</td>






                
            `;

            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Error probando el GET:", error);
    }
}

cargarArchivos();







