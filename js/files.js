import { fileService } from './api/file.service.js';

const DEFAULT_PAGE_SIZE = 10;

const paginationState = {
    original: { page: 1 },
    modified: { page: 1 },
    current: { page: 1 }
};

const chartsState = {
    originalVsModified: null,
    totals: null,
    encontrados: null
};

let sidebarFiltersState = {
    searchTerm: "",
    project: "",
    sgpsCode: "",
    studyCenter: "",
    regional: "",
    fileType: "",
    dateFrom: "",
    dateTo: ""
};

function resetPagination(tabKey) {
    if (paginationState[tabKey]) paginationState[tabKey].page = 1;
}

async function populateSearchProjects() {
    const searchProject = document.getElementById("searchProject");
    if (!searchProject) return;

    // Si ya tiene más de la opción "Todos", no recargar
    if (searchProject.options.length > 1) return;

    try {
        const projects = await fileService.getProjects();
        (projects || []).forEach((proj) => {
            const option = document.createElement("option");
            option.value = proj.id;
            option.textContent = proj.nombre ?? proj.name ?? proj.descripcion ?? String(proj.id);
            searchProject.appendChild(option);
        });
    } catch (err) {
        console.error("Error cargando proyectos para búsqueda:", err);
    }
}

//CARGA INICIAL DE ARCHIVOS
document.addEventListener("DOMContentLoaded", () => {

    populateSearchProjects();

    loadOriginalFiles();
    loadModifiedFiles();
    loadCurrentFiles();

    refreshStatsCards();
    
    // Botón para aplicar filtros en Current Files
    document.getElementById("applyCurrentFilters")?.addEventListener("click", () => {
        resetPagination("current");
        loadCurrentFiles();
        refreshStatsCards();
    });
    // Botones para aplicar filtros en Original y Modified
    document.getElementById("applyOriginalFilters")?.addEventListener("click", () => {
        resetPagination("original");
        loadOriginalFiles();
        refreshStatsCards();
    });
    document.getElementById("applyModifiedFilters")?.addEventListener("click", () => {
        resetPagination("modified");
        loadModifiedFiles();
        refreshStatsCards();
    });
    
    // Botones para limpiar filtros
    document.getElementById("clearOriginalFilters")?.addEventListener("click", clearOriginalFilters);
    document.getElementById("clearModifiedFilters")?.addEventListener("click", clearModifiedFilters);
    document.getElementById("clearCurrentFilters")?.addEventListener("click", clearCurrentFilters);
    
    // Sidebar: Botón de buscar y limpiar
    document.getElementById("searchBtn")?.addEventListener("click", handleSidebarSearch);
    document.getElementById("clearFiltersBtn")?.addEventListener("click", clearSidebarFilters);














    // También recargar cuando cambien las fechas (opcional pero más intuitivo)
    //document.getElementById("currentDateFrom")?.addEventListener("change", loadCurrentFiles);
    //document.getElementById("currentDateTo")?.addEventListener("change", loadCurrentFiles);
    //document.getElementById("currentLimit")?.addEventListener("change", loadCurrentFiles);
    // document.getElementById("originalDateFrom")?.addEventListener("change", loadOriginalFiles);
    // document.getElementById("originalDateTo")?.addEventListener("change", loadOriginalFiles);
    // document.getElementById("modifiedDateFrom")?.addEventListener("change", loadModifiedFiles);
    // document.getElementById("modifiedDateTo")?.addEventListener("change", loadModifiedFiles);
    
    // Delegación de eventos para todas las tablas
    document.body.addEventListener("click", async (e) => {

        // Paginación
        const paginationBtn = e.target.closest("[data-pagination-tab][data-page]");
        if (paginationBtn) {
            const tabKey = paginationBtn.dataset.paginationTab;
            const nextPage = Number(paginationBtn.dataset.page);
            if (!Number.isFinite(nextPage) || nextPage < 1) return;

            if (paginationState[tabKey]) paginationState[tabKey].page = nextPage;

            if (tabKey === "original") await loadOriginalFiles();
            else if (tabKey === "modified") await loadModifiedFiles();
            else if (tabKey === "current") await loadCurrentFiles();

            return;
        }

        // Descargar archivo
        const downloadBtn = e.target.closest(".download-btn");
        if (downloadBtn) {
            await handleDownloadFile(downloadBtn);
            return;
        }

        // Ver versiones (solo tabla original)
        const viewVersionsBtn = e.target.closest(".view-versions-btn");
        if (viewVersionsBtn) {
            const fileId = viewVersionsBtn.dataset.id;
            await loadAndShowFileVersions(fileId);
            return;
        }

        // Editar archivo
        const updateBtn = e.target.closest(".update-file-btn");
        if (updateBtn) {
            const fileId = updateBtn.dataset.id;
            const isModified = updateBtn.dataset.isModified === "true" || false;
            const originalIdOverride = updateBtn.dataset.originalId || null;
            await loadAndShowUpdateModal(fileId, isModified, originalIdOverride);
            return;
        }

        // Eliminar archivo
        const deleteBtn = e.target.closest(".delete-file-btn");
        if (deleteBtn) {
            const fileId = deleteBtn.dataset.id;
            const isModified = deleteBtn.dataset.isModified === "true";
            const fileName = deleteBtn.dataset.fileName;

            // Extraer datos de la fila para mostrar más información en el modal
            const row = deleteBtn.closest("tr");
            const cells = row ? row.querySelectorAll("td") : [];
            const fileData = {
                proyecto: cells[0]?.textContent?.trim() || "-",
                codigo_sgps: cells[1]?.textContent?.trim() || "-",
                centro: cells[2]?.textContent?.trim() || "-",
                regional: cells[3]?.textContent?.trim() || "-",
                fecha_reporte: cells[4]?.textContent?.trim() || "-",
                fecha_carga: cells[5]?.textContent?.trim() || "-",
                responsable: cells[6]?.textContent?.trim() || "-",
                avance: cells[7]?.textContent?.trim() || "-",
                nombre_archivo: cells[8]?.textContent?.trim() || fileName || "-",
                tamano: cells[9]?.textContent?.trim() || "-",
                version: cells[10]?.textContent?.trim() || "-",
                ruta: cells[11]?.textContent?.trim() || "-",
                categoria: row?.dataset?.categoria || "-",
                observacion: row?.dataset?.observacion || "-"
            };

            showDeleteConfirmModal(fileId, isModified, fileName, fileData);
            return;
        }
    });

    // Submit del formulario de actualización
    document.getElementById("updateFileForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        await handleUpdateFile();
    });

    // Confirmar eliminación
    document.getElementById("confirmDelete").addEventListener("click", async () => {
        await handleDeleteFile();
    });

    // Selector de archivo para actualización
    document.getElementById("updateSelectFileBtn")?.addEventListener("click", () => {
        document.getElementById("updateFileInput").click();
    });

    document.getElementById("updateFileInput")?.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            const fileName = e.target.files[0].name;
            document.getElementById("updateFileNameDisplay").innerHTML = 
                `<div class="alert alert-success mb-0"><i class="fas fa-check-circle me-2"></i> ${fileName}</div>`;
        }
    });

    // ===== SUBIR NUEVO ARCHIVO =====
    // Botón para abrir modal de subida
    document.getElementById("subirBtn")?.addEventListener("click", async () => {
        const modal = new bootstrap.Modal(document.getElementById("subirModal"));
        
        // Cargar proyectos si no están cargados
        const projectSelect = document.getElementById("projectSelect");
        if (projectSelect.options.length <= 1) {
            const projects = await fileService.getProjects();
            projects.forEach(proj => {
                const option = document.createElement("option");
                option.value = proj.id;
                option.textContent = proj.nombre;
                projectSelect.appendChild(option);
            });
        }
        
        // Limpiar formulario
        document.getElementById("uploadForm").reset();
        document.getElementById("fileNameDisplay").innerHTML = "";
        
        modal.show();
    });

    // Selector de archivo para subida
    document.getElementById("selectFileBtn")?.addEventListener("click", () => {
        document.getElementById("fileInput").click();
    });

    document.getElementById("fileInput")?.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            const fileName = e.target.files[0].name;
            document.getElementById("fileNameDisplay").innerHTML = 
                `<div class="alert alert-success mb-0"><i class="fas fa-check-circle me-2"></i> ${fileName}</div>`;
        }
    });

    // ===== CLICK EN FILAS PARA VER DETALLES =====
    document.body.addEventListener("click", (e) => {
        const row = e.target.closest("tbody tr");
        if (row && !e.target.closest(".btn-group")) {
            // Solo si no hizo click en los botones de acción
            const cells = row.querySelectorAll("td");
            if (cells.length >= 12) {
                showFileDetailsModal(cells, row);
            }
        }
    });

    // Submit del formulario de subida
    document.getElementById("uploadForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        await handleUploadFile();
    });
});

function getBootstrapColor(variableName) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variableName);
    return value ? value.trim() : null;
}

function formatNow() {
    return new Date().toLocaleString('es-CO');
}

async function refreshStatsCards() {
    const section = document.getElementById('statsSection');
    if (!section) return;

    // Chart.js no cargado
    if (typeof window.Chart === 'undefined') {
        console.warn('Chart.js no está disponible; omitiendo gráficas.');
        return;
    }

    const lastUpdatedEl = document.getElementById('statsLastUpdated');

    try {
        const params = {
            tipo_archivo: 'todos',
            q: sidebarFiltersState.searchTerm || null,
            id_proyecto: sidebarFiltersState.project || null,
            codigo_sgps: sidebarFiltersState.sgpsCode || null,
            nombre_centro: sidebarFiltersState.studyCenter || null,
            regional: sidebarFiltersState.regional || null,
            fechaDesde: sidebarFiltersState.dateFrom || null,
            fechaHasta: sidebarFiltersState.dateTo || null
        };

        const resp = await fileService.dataStats(params);
        const stats = resp?.estadisticas || resp?.data?.estadisticas || null;
        if (!stats) return;

        const total = Number(stats.total_archivos ?? 0);
        const originales = Number(stats.archivos_originales ?? 0);
        const modificados = Number(stats.archivos_modificados ?? 0);
        const actuales = Number(stats.archivos_actuales ?? 0);
        const encontrados = Number(stats.archivos_encontrados ?? 0);

        const totalEl = document.getElementById('statTotalArchivos');
        const actualesEl = document.getElementById('statArchivosActuales');
        const encontradosEl = document.getElementById('statEncontrados');
        if (totalEl) totalEl.textContent = `Total: ${total}`;
        if (actualesEl) actualesEl.textContent = `${actuales}`;
        if (encontradosEl) encontradosEl.textContent = `${encontrados}`;
        if (lastUpdatedEl) lastUpdatedEl.textContent = `Actualizado: ${formatNow()}`;

        const bsPrimary = getBootstrapColor('--bs-primary') || '#0d6efd';
        const bsSuccess = getBootstrapColor('--bs-success') || '#198754';
        const bsWarning = getBootstrapColor('--bs-warning') || '#ffc107';
        const bsInfo = getBootstrapColor('--bs-info') || '#0dcaf0';
        const bsSecondary = getBootstrapColor('--bs-secondary') || '#6c757d';

        // 1) Doughnut: Originales vs Modificados
        const ctx1 = document.getElementById('chartOriginalVsModified');
        if (ctx1) {
            if (chartsState.originalVsModified) chartsState.originalVsModified.destroy();
            chartsState.originalVsModified = new Chart(ctx1, {
                type: 'doughnut',
                data: {
                    labels: ['Originales', 'Modificados'],
                    datasets: [{
                        data: [originales, modificados],
                        backgroundColor: [bsSuccess, bsWarning],
                        borderColor: [bsSuccess, bsWarning]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }

        // 2) Bar: Totales
        const ctx2 = document.getElementById('chartTotales');
        if (ctx2) {
            if (chartsState.totals) chartsState.totals.destroy();
            chartsState.totals = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: ['Total', 'Actuales'],
                    datasets: [{
                        label: 'Cantidad',
                        data: [total, actuales],
                        backgroundColor: [bsPrimary, bsInfo],
                        borderColor: [bsPrimary, bsInfo]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { precision: 0 } }
                    }
                }
            });
        }

        // 3) Horizontal bar: encontrados vs no encontrados (según filtros)
        const ctx3 = document.getElementById('chartEncontrados');
        if (ctx3) {
            if (chartsState.encontrados) chartsState.encontrados.destroy();
            const notFound = Math.max(0, total - encontrados);
            chartsState.encontrados = new Chart(ctx3, {
                type: 'bar',
                data: {
                    labels: ['Con filtros'],
                    datasets: [
                        {
                            label: 'Encontrados',
                            data: [encontrados],
                            backgroundColor: bsSuccess,
                            borderColor: bsSuccess
                        },
                        {
                            label: 'No encontrados',
                            data: [notFound],
                            backgroundColor: bsSecondary,
                            borderColor: bsSecondary
                        }
                    ]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    },
                    scales: {
                        x: { beginAtZero: true, stacked: true, ticks: { precision: 0 } },
                        y: { stacked: true }
                    }
                }
            });
        }
    } catch (err) {
        console.error('Error cargando estadísticas:', err);
        if (lastUpdatedEl) lastUpdatedEl.textContent = 'Error cargando estadísticas';
    }
}

// ===== FUNCIÓN PARA MOSTRAR DETALLES DEL ARCHIVO EN MODAL =====
function showFileDetailsModal(cells, rowEl = null) {
    // Extrae datos de las celdas de la fila
    // Orden: Proyecto | SGPS | Centro | Regional | FechaReporte | FechaCarga | Responsable | Avance | Archivo | Tamaño | Version | Ruta | Acciones
    
    const proyecto = cells[0]?.textContent?.trim() || "-";
    const sgps = cells[1]?.textContent?.trim() || "-";
    const centro = cells[2]?.textContent?.trim() || "-";
    const regional = cells[3]?.textContent?.trim() || "-";
    const fechaReporte = cells[4]?.textContent?.trim() || "-";
    const fechaCarga = cells[5]?.textContent?.trim() || "-";
    const responsable = cells[6]?.textContent?.trim() || "-";
    const avanceHTML = cells[7]?.innerHTML || "-"; // La barra de progreso está en HTML
    const archivo = cells[8]?.textContent?.trim() || "-";
    const tamano = cells[9]?.textContent?.trim() || "-";
    const version = cells[10]?.textContent?.trim() || "-";
    const ruta = cells[11]?.textContent?.trim() || "-";

    const categoria = rowEl?.dataset?.categoria || "-";
    const observaciones = rowEl?.dataset?.observacion || "-";
    
    // Llenar el modal con los datos
    document.getElementById("detailProyecto").textContent = proyecto;
    document.getElementById("detailSgps").textContent = sgps;
    document.getElementById("detailCentro").textContent = centro;
    document.getElementById("detailRegional").textContent = regional;
    document.getElementById("detailResponsable").textContent = responsable;
    document.getElementById("detailFechaReporte").textContent = fechaReporte;
    document.getElementById("detailFechaCarga").textContent = fechaCarga;
    document.getElementById("detailTamano").textContent = tamano;
    document.getElementById("detailNombreArchivo").textContent = archivo;
    document.getElementById("detailVersion").textContent = version;
    document.getElementById("detailAvance").innerHTML = avanceHTML;
    document.getElementById("detailRuta").textContent = ruta;

    const categoriaEl = document.getElementById("detailCategoria");
    if (categoriaEl) categoriaEl.textContent = categoria;

    const obsEl = document.getElementById("detailObservaciones");
    if (obsEl) obsEl.textContent = observaciones;
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById("fileDetailsModal"));
    modal.show();
}

// ===== FUNCIÓN PARA SUBIR ARCHIVO =====
async function handleUploadFile() {
    const fileInput = document.getElementById("fileInput");
    const submitBtn = document.getElementById("submitUpload");
    const uploadText = document.getElementById("uploadText");
    const uploadSpinner = document.getElementById("uploadSpinner");
    
    // Validar que haya un archivo
    if (!fileInput.files || fileInput.files.length === 0) {
        alert("Por favor, selecciona un archivo para subir");
        return;
    }
    
    // Mostrar spinner
    uploadText.classList.add("d-none");
    uploadSpinner.classList.remove("d-none");
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData();
        
        // Agregar archivo
        formData.append("file", fileInput.files[0]);
        
        // Agregar datos del formulario

        formData.append("nombre_proyecto", document.getElementById("nameProject").value);
        formData.append("id_proyecto", document.getElementById("projectSelect").value);
        formData.append("fecha_informe", document.getElementById("reportDate").value);
        formData.append("codigo_sgps", document.getElementById("sgpsCode").value || "");
        formData.append("nombre_centro", document.getElementById("studyCenterName").value || "");
        formData.append("regional", document.getElementById("regional").value || "");
        formData.append("responsables_proyecto", document.getElementById("projectResponsibles").value || "");
        formData.append("responsable", document.getElementById("responsible").value);
        formData.append("progreso", document.getElementById("progress").value);
        formData.append("observaciones", document.getElementById("observations").value || "");
        
        await fileService.uploadFile(formData);
        
        alert("Archivo subido correctamente");
        
        // Cerrar modal
        bootstrap.Modal.getInstance(document.getElementById("subirModal")).hide();
        
        // Recargar tablas
        await loadOriginalFiles();
        await loadModifiedFiles();
        await loadCurrentFiles();
        
    } catch (err) {
        console.error("Error subiendo archivo:", err);
        alert("Error al subir el archivo: " + err.message);
    } finally {
        uploadText.classList.remove("d-none");
        uploadSpinner.classList.add("d-none");
        submitBtn.disabled = false;
    }
}






// =======================================================
// FUNCIÓN PARA BARRA DE PROGRESO
// =======================================================
/**
 * Genera una barra de progreso HTML con colores dinámicos
 * @param {number} progress - Porcentaje (0-100)
 * @returns {string} HTML de la barra de progreso
 */
function getProgressBar(progress) {
    const value = Math.min(100, Math.max(0, Number(progress) || 0));
    let bgColor = 'bg-danger';    // Rojo: 0-49%
    
    if (value >= 75) {
        bgColor = 'bg-success';     // Verde: 75-100%
    } else if (value >= 50) {
        bgColor = 'bg-warning';     // Amarillo/Naranja: 50-74%
    }
    
    return `
        <div class="progress" style="height: 24px; border-radius: 4px;">
            <div class="progress-bar ${bgColor}" role="progressbar" 
                 style="width: ${value}%; font-weight: 600; font-size: 0.85rem; color: black;" 
                 aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100">
                 </div>
            </div>
            <div>
                 ${value}%
            </div>
    `;
}


    


// =======================================================
// A P A R T A D O DE A R C H I V O S
// =======================================================



// =======================================================
// A R C H I V O S   O R I G I N A L E S
// =======================================================

async function loadOriginalFiles() {
    const fechaDesde = document.getElementById("originalDateFrom")?.value || null;
    const fechaHasta = document.getElementById("originalDateTo")?.value || null;
    const limit = Number(document.getElementById("originalLimit")?.value || 20);

    const effectiveFrom = sidebarFiltersState.dateFrom || fechaDesde;
    const effectiveTo = sidebarFiltersState.dateTo || fechaHasta;

    await loadFilesBase({
        spinner: "loadingSpinnerOriginal",
        tableWrapper: "resultsTableOriginal",
        noResults: "noResultsOriginal",
        tableBody: "originalFilesTableBody",
        counter: "originalCount",
        endpointFunction: async () => {
            const files = await fileService.getOriginalFiles({
                fechaDesde: effectiveFrom,
                fechaHasta: effectiveTo,
                limit,
                query: sidebarFiltersState.searchTerm || null,
                id_proyecto: sidebarFiltersState.project || null,
                codigo_sgps: sidebarFiltersState.sgpsCode || null,
                nombre_centro: sidebarFiltersState.studyCenter || null,
                regional: sidebarFiltersState.regional || null
            });
            return applyClientSideFilters(files, sidebarFiltersState);
        },
        rowBuilder: buildOriginalRow,
        pagination: {
            tabKey: "original",
            containerId: "originalPagination",
            pageSize: DEFAULT_PAGE_SIZE
        }
    });
}

/**
 * Carga las versiones de un archivo original y las muestra en el modal
 */
async function loadAndShowFileVersions(id_archivo_original) {
    const modal = new bootstrap.Modal(document.getElementById("versionsModal"));
    const versionsLoading = document.getElementById("versionsLoading");
    const versionsContent = document.getElementById("versionsContent");
    const versionsTableBody = document.getElementById("versionsTableBody");
    
    // Mostrar spinner
    versionsLoading.classList.remove("d-none");
    versionsContent.classList.add("d-none");
    versionsTableBody.innerHTML = "";
    
    try {
        // Llamar al servicio para obtener las versiones
        const response = await fileService.getFileVersions(id_archivo_original);
        const versions = response.archivos || [];
        
        if (versions.length === 0) {
            versionsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">No hay versiones disponibles para este archivo</td>
                </tr>
            `;
        } else {
            versions.forEach((version, index) => {
                versionsTableBody.innerHTML += `
                    <tr>
                        <td><span class="badge bg-primary">${version.version || index + 1}</span></td>
                        <td>${version.fecha_subido || version.fecha_carga || "-"}</td>
                        <td>${version.fecha_informe || "-"}</td>
                        <td>${version.responsable || "-"}</td>
                        <td>${getProgressBar(version.progreso)}</td>
                        <td>${version.tamano_archivo || "-"}</td>
                        <td>
                            <button class="btn btn-sm btn-success" data-version-id="${version.id}">
                                <i class="fas fa-download"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
        
        // Ocultar spinner y mostrar contenido
        versionsLoading.classList.add("d-none");
        versionsContent.classList.remove("d-none");
        
        // Mostrar el modal
        modal.show();
    } catch (err) {
        console.error("Error cargando versiones:", err);
        versionsLoading.classList.add("d-none");
        versionsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">Error al cargar las versiones</td>
            </tr>
        `;
        versionsContent.classList.remove("d-none");
        modal.show();
    }
}

/**
 * Carga los datos de un archivo y muestra el modal de edición
 */
async function loadAndShowUpdateModal(id_archivo_original, isModified = false, originalIdOverride = null) {
    const modal = new bootstrap.Modal(document.getElementById("updateFileModal"));
    
    try {
        // Obtener metadata del archivo (si es modificado, backend devuelve id_archivo_original)
        const fileData = await fileService.getFileMetadata(id_archivo_original, isModified);
        
        // El archivo es requerido para crear una nueva versión
        const fileInput = document.getElementById("updateFileInput");
        fileInput.setAttribute("required", "required");
        
        // Rellenar el formulario con los datos actuales
        // Importante: si estamos editando un archivo modificado, el backend
        // requiere "id_archivo_original" para crear una nueva versión.
        // Usamos el campo oculto updateFileId para almacenar el id del archivo ORIGINAL.
        // Si venimos desde un archivo modificado, la cadena de versiones debe colgar SIEMPRE del id original.
        const resolvedOriginalId =
            originalIdOverride ||
            (isModified ? (fileData.id_archivo_original || id_archivo_original) : id_archivo_original);

        const originalIdForUpdate = String(resolvedOriginalId);
        document.getElementById("updateNameProject").value = fileData.nombre_proyecto || "";
        document.getElementById("updateFileId").value = originalIdForUpdate;
        document.getElementById("updateProjectSelect").value = fileData.id_proyecto || "";
        document.getElementById("updateReportDate").value = fileData.fecha_informe || "";
        document.getElementById("updateSgpsCode").value = fileData.codigo_sgps || "";
        document.getElementById("updateStudyCenterName").value = fileData.nombre_centro || "";
        document.getElementById("updateRegional").value = fileData.regional || "";
        document.getElementById("updateProjectResponsibles").value = fileData.responsables_proyecto || "";
        document.getElementById("updateResponsible").value = fileData.responsable || "";
        document.getElementById("updateProgress").value = fileData.progreso || "";
        document.getElementById("updateObservations").value = fileData.observaciones || "";
        document.getElementById("updateModificationReason").value = "";
        
        // Limpiar el input de archivo
        fileInput.value = "";
        document.getElementById("updateFileNameDisplay").innerHTML = "";
        
        // Cargar proyectos en el select si está vacío
        const projectSelect = document.getElementById("updateProjectSelect");
        if (projectSelect.options.length <= 1) {
            const projects = await fileService.getProjects();
            projects.forEach(proj => {
                const option = document.createElement("option");
                option.value = proj.id;
                option.textContent = proj.nombre;
                projectSelect.appendChild(option);
            });
            projectSelect.value = fileData.id_proyecto || "";
        }
        
        modal.show();
    } catch (err) {
        console.error("Error cargando datos del archivo:", err);
        alert("Error al cargar los datos del archivo: " + err.message);
    }
}

/**
 * Maneja la actualización de un archivo
 */
async function handleUpdateFile() {
    const fileId = document.getElementById("updateFileId").value;
    const fileInput = document.getElementById("updateFileInput");
    const submitBtn = document.getElementById("submitUpdate");
    const updateText = document.getElementById("updateText");
    const updateSpinner = document.getElementById("updateSpinner");
    
    // Debug: mostrar qué ID se está usando
    console.log("=== DEBUG ACTUALIZACIÓN ===");
    console.log("fileId obtenido:", fileId);
    console.log("fileId tipo:", typeof fileId);
    console.log("fileId vacío?:", fileId === "" || fileId === null);
    
    // Validar que haya un archivo
    if (!fileInput.files || fileInput.files.length === 0) {
        alert("Por favor, selecciona un archivo para actualizar");
        return;
    }
    
    // Mostrar spinner
    updateText.classList.add("d-none");
    updateSpinner.classList.remove("d-none");
    submitBtn.disabled = true;
    
    try {
        // Validar que el archivo ORIGINAL exista en backend para evitar error de FK
        try {
            await fileService.getFileMetadata(fileId, false);
        } catch (checkErr) {
            console.error("Validación de original falló:", checkErr);
            alert("No se puede crear la versión modificada porque el archivo original (" + fileId + ") no existe en el servidor. Verifique que no haya sido eliminado.");
            return;
        }

        const formData = new FormData();
        
        // Agregar archivo (es requerido)
        formData.append("file", fileInput.files[0]);
        
        // Agregar datos del formulario
        const projectSelectEl = document.getElementById("updateProjectSelect");
        formData.append("id_proyecto", projectSelectEl.value);
        formData.append("nombre_proyecto", document.getElementById("updateNameProject").value);
        formData.append("fecha_informe", document.getElementById("updateReportDate").value);
        formData.append("codigo_sgps", document.getElementById("updateSgpsCode").value);
        formData.append("nombre_centro", document.getElementById("updateStudyCenterName").value);
        formData.append("regional", document.getElementById("updateRegional").value);
        formData.append("responsables_proyecto", document.getElementById("updateProjectResponsibles").value);
        formData.append("responsable", document.getElementById("updateResponsible").value);
        formData.append("progreso", document.getElementById("updateProgress").value);
        // Backend espera 'observacion' (singular)
        formData.append("observacion", document.getElementById("updateObservations").value);
        formData.append("razon_modificado", document.getElementById("updateModificationReason").value);
        
        // Log para debugging
        console.log("FormData enviando:");
        for (let [key, value] of formData.entries()) {
            if (value instanceof File) {
                console.log(`  ${key}: [File] ${value.name}`);
            } else {
                console.log(`  ${key}: ${value}`);
            }
        }
        console.log("Pasando fileId a updateFile:", fileId);
        
        await fileService.updateFile(fileId, formData);
        
        alert("Archivo actualizado correctamente");
        
        // Cerrar modal
        bootstrap.Modal.getInstance(document.getElementById("updateFileModal")).hide();
        
        // Recargar tablas
        await loadOriginalFiles();
        await loadModifiedFiles();
        await loadCurrentFiles();
        
        // Cambiar a la pestaña de Archivos Modificados para ver el archivo actualizado
        const modifiedTab = new bootstrap.Tab(document.getElementById('modified-tab'));
        modifiedTab.show();
        
    } catch (err) {
        console.error("Error actualizando archivo:", err);
        console.error("Detalles completos del error:", err);
        
        // Construir mensaje de error detallado
        let errorMsg = err.message;
        if (err.details) {
            errorMsg += "\n\n" + err.details;
        }
        
        alert("Error al actualizar el archivo: " + errorMsg);
    } finally {
        updateText.classList.remove("d-none");
        updateSpinner.classList.add("d-none");
        submitBtn.disabled = false;
    }
}

/**
 * Muestra el modal de confirmación de eliminación
 */
let pendingDeleteData = null;

function showDeleteConfirmModal(fileId, isModified, fileName, fileData = {}) {
    pendingDeleteData = { fileId, isModified };

    // Llenar los detalles del archivo en el modal mejorado
    const nameEl = document.getElementById("deleteFileName");
    const projEl = document.getElementById("deleteFileProject");
    const sgpsEl = document.getElementById("deleteFileSgps");
    const centerEl = document.getElementById("deleteFileCenter");
    const sizeEl = document.getElementById("deleteFileSize");
    const dateEl = document.getElementById("deleteFileDate");
    const categoryEl = document.getElementById("deleteFileCategory");

    if (nameEl) nameEl.textContent = fileName || fileData.nombre_archivo || "-";
    if (projEl) projEl.textContent = fileData.proyecto || "-";
    if (sgpsEl) sgpsEl.textContent = fileData.codigo_sgps || "-";
    if (centerEl) centerEl.textContent = fileData.centro || "-";
    if (sizeEl) sizeEl.textContent = fileData.tamano || "-";
    if (dateEl) dateEl.textContent = fileData.fecha_carga || fileData.fecha || "-";
    if (categoryEl) categoryEl.textContent = fileData.categoria || "-";

    const modal = new bootstrap.Modal(document.getElementById("deleteConfirmModal"));
    modal.show();
}

/**
 * Maneja la eliminación de un archivo
 */
async function handleDeleteFile() {
    if (!pendingDeleteData) return;
    
    const { fileId, isModified } = pendingDeleteData;
    const confirmBtn = document.getElementById("confirmDelete");
    const originalHtml = confirmBtn.innerHTML;
    
    try {
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Eliminando...';
        confirmBtn.disabled = true;
        
        await fileService.deleteFile(fileId, isModified);
        
        alert("Archivo eliminado correctamente");
        
        // Cerrar modal
        bootstrap.Modal.getInstance(document.getElementById("deleteConfirmModal")).hide();
        
        // Limpiar datos pendientes
        pendingDeleteData = null;
        
        // Recargar tablas
        await loadOriginalFiles();
        await loadModifiedFiles();
        await loadCurrentFiles();
        
    } catch (err) {
        console.error("Error eliminando archivo:", err);
        alert("Error al eliminar el archivo: " + err.message);
    } finally {
        confirmBtn.innerHTML = originalHtml;
        confirmBtn.disabled = false;
    }
}

/**
 * Descarga un archivo
 */
async function handleDownloadFile(downloadBtnEl) {
    const token = localStorage.getItem('access_token');
    if (!token) {
        if (window.showSessionExpiredModal) window.showSessionExpiredModal();
        return;
    }

    const originalHtml = downloadBtnEl.innerHTML;
    downloadBtnEl.disabled = true;
    downloadBtnEl.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Descargando';

    try {
        const id = downloadBtnEl.dataset.id;
        const isModificado = downloadBtnEl.dataset.isModificado === 'true';

        // Obtener el nombre del archivo desde la fila de la tabla (fallback)
        let fileNameFromTable = null;
        const row = downloadBtnEl.closest('tr');
        if (row) {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 9) fileNameFromTable = cells[8].textContent.trim();
        }
        const endpoint = `innovacion_donald/${id}/download?is_modificado=${isModificado}`;
        const fullUrl = `https://fastapi-final-4i0w.onrender.com/${endpoint}`;

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            if (!window.sessionExpiredShown) {
                window.sessionExpiredShown = true;
                setTimeout(() => (window.sessionExpiredShown = false), 2000);
                if (window.showSessionExpiredModal) window.showSessionExpiredModal();
            }
            throw new Error('Sesión expirada');
        }

        if (!response.ok) {
            let detail = null;
            try {
                const data = await response.clone().json();
                detail = data?.detail ?? null;
            } catch {
                // ignore
            }
            const msg = detail ? `Error: ${response.status} (${detail})` : `Error: ${response.status}`;
            throw new Error(msg);
        }

        const contentDisposition = response.headers.get('content-disposition');
        const blob = await response.blob();

        const blobUrl = window.URL.createObjectURL(blob);

        let fileName = 'archivo.xlsx';
        if (contentDisposition) {
            let match = contentDisposition.match(/filename\*=(?:UTF-8'')?([^;]+)/);
            if (!match) match = contentDisposition.match(/filename=([^;]+)/);
            if (match) fileName = match[1].replace(/"/g, '').trim();
        } else if (fileNameFromTable && fileNameFromTable !== '-') {
            fileName = fileNameFromTable;
        }

        if (!fileName.includes('.')) fileName += '.xlsx';

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
        console.error('Error en descarga:', err);
        alert('Error al descargar el archivo: ' + (err?.message || String(err)));
    } finally {
        downloadBtnEl.innerHTML = originalHtml;
        downloadBtnEl.disabled = false;
    }
}

function buildOriginalRow(file) {
    return `
        <tr class="file-row" data-categoria="${(file.categoria || '-').toString().replaceAll('"','\'')}" data-observacion="${(file.observacion || file.observaciones || '-').toString().replaceAll('"','\'')}" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="${(file.nombre_proyecto || '-').toString().replaceAll('"','\'')} | SGPS: ${(file.codigo_sgps || '-').toString().replaceAll('"','\'')} | Resp: ${(file.responsable || '-').toString().replaceAll('"','\'')} | Ver: ${(file.version || '-').toString().replaceAll('"','\'')} | ${(file.tamano_archivo || '-').toString().replaceAll('"','\'')}">
            <td>${file.nombre_proyecto || "-"}</td>
            <td>${file.codigo_sgps || "-"}</td>
            <td>${file.nombre_centro || "-"}</td>
            <td>${file.regional || "-"}</td>
            <td>${file.fecha_informe || "-"}</td>
            <td>${file.fecha_carga || "-"}</td>
            <td>${file.responsable || "-"}</td>
            <td>${getProgressBar(file.progreso)}</td>
            <td>${file.nombre_archivo || "-"}</td>
            <td><span class="badge bg-light text-dark border">${file.tamano_archivo}</span></td>
            <td><span class="badge bg-secondary badge-version">${file.version}</span></td>
            <td>${file.ruta_almacenamiento || "-"}</td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-success btn-sm download-btn" data-id="${file.id}" data-is-modificado="false">
                        <i class="fas fa-download me-1"></i> Descargar
                    </button>
                    <button class="btn btn-info btn-sm view-versions-btn" data-id="${file.id}" data-project-id="${file.projectId}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-warning btn-sm update-file-btn" data-id="${file.id}" data-is-modified="false">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete btn-sm delete-file-btn" data-id="${file.id}" data-is-modified="false" data-file-name="${file.nombre_archivo || file.fileName || '-'}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}



// =======================================================
// A R C H I V O S   M O D I F I C A D O S
// =======================================================

async function loadModifiedFiles() {
    const fechaDesde = document.getElementById("modifiedDateFrom")?.value || null;
    const fechaHasta = document.getElementById("modifiedDateTo")?.value || null;
    const limit = Number(document.getElementById("modifiedLimit")?.value || 20);

    const effectiveFrom = sidebarFiltersState.dateFrom || fechaDesde;
    const effectiveTo = sidebarFiltersState.dateTo || fechaHasta;

    await loadFilesBase({
        spinner: "loadingSpinnerModified",
        tableWrapper: "resultsTableModified",
        noResults: "noResultsModified",
        tableBody: "modifiedFilesTableBody",
        counter: "modifiedCount",
        endpointFunction: async () => {
            const files = await fileService.getModifiedFiles({
                fechaDesde: effectiveFrom,
                fechaHasta: effectiveTo,
                limit,
                query: sidebarFiltersState.searchTerm || null,
                id_proyecto: sidebarFiltersState.project || null,
                codigo_sgps: sidebarFiltersState.sgpsCode || null,
                nombre_centro: sidebarFiltersState.studyCenter || null,
                regional: sidebarFiltersState.regional || null
            });
            return applyClientSideFilters(files, sidebarFiltersState);
        },
        rowBuilder: buildModifiedRow,
        pagination: {
            tabKey: "modified",
            containerId: "modifiedPagination",
            pageSize: DEFAULT_PAGE_SIZE
        }
    });
}

function buildModifiedRow(file) {
    return `
        <tr class="file-row" data-categoria="${(file.categoria || '-').toString().replaceAll('"','\'')}" data-observacion="${(file.observacion || file.observaciones || '-').toString().replaceAll('"','\'')}" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="${(file.nombre_proyecto || '-').toString().replaceAll('"','\'')} | SGPS: ${(file.codigo_sgps || '-').toString().replaceAll('"','\'')} | Resp: ${(file.responsable || '-').toString().replaceAll('"','\'')} | Ver: ${(file.version || '-').toString().replaceAll('"','\'')} | ${(file.tamano_archivo || '-').toString().replaceAll('"','\'')}">
            <td>${file.nombre_proyecto || "-"}</td>
            <td>${file.codigo_sgps || "-"}</td>
            <td>${file.nombre_centro || "-"}</td>
            <td>${file.regional || "-"}</td>
            <td>${file.fecha_informe || "-"}</td>
            <td>${file.fecha_carga || "-"}</td>
            <td>${file.responsable || "-"}</td>
            <td>${getProgressBar(file.progreso)}</td>
            <td>${file.nombre_archivo || "-"}</td>
            <td>${file.tamano_archivo || "-"}</td>
            <td><span class="badge bg-secondary badge-version">${file.version}</span></td>
            <td>${file.ruta_almacenamiento || "-"}</td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-success btn-sm download-btn" data-id="${file.id}" data-is-modificado="true">
                        <i class="fas fa-download me-1"></i> Descargar
                    </button>
                    <button class="btn btn-warning btn-sm update-file-btn" data-id="${file.id}" data-original-id="${file.id_archivo_original ?? ''}" data-is-modified="true" ${(!file.id_archivo_original && file.id_archivo_original !== 0) ? 'disabled title="No se puede editar: falta vínculo al archivo original"' : ''}>
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete btn-sm delete-file-btn" data-id="${file.id}" data-is-modified="true" data-file-name="${file.nombre_archivo || file.fileName || '-'}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}


// =======================================================
// A R C H I V O S   A C T U A L E S
// =======================================================

async function loadCurrentFiles() {

    const fechaDesde = document.getElementById("currentDateFrom").value || null;
    const fechaHasta = document.getElementById("currentDateTo").value || null;
    const limit = document.getElementById("currentLimit").value || 20;

    const effectiveFrom = sidebarFiltersState.dateFrom || fechaDesde;
    const effectiveTo = sidebarFiltersState.dateTo || fechaHasta;

    await loadFilesBase({
        spinner: "loadingSpinnerCurrent",
        tableWrapper: "resultsTableCurrent",
        noResults: "noResultsCurrent",
        tableBody: "currentFilesTableBody",
        counter: "currentCount",
        endpointFunction: async () => {
            const files = await fileService.getCurrentFiles({
                limit, fechaDesde: effectiveFrom, fechaHasta: effectiveTo
            });
            return applyClientSideFilters(files, sidebarFiltersState);
        },
        rowBuilder: buildCurrentRow,
        pagination: {
            tabKey: "current",
            containerId: "currentPagination",
            pageSize: DEFAULT_PAGE_SIZE
        }
    });
}

function buildCurrentRow(file) {
    return `

        <tr class="file-row" data-categoria="${(file.categoria || '-').toString().replaceAll('"','\'')}" data-observacion="${(file.observacion || file.observaciones || '-').toString().replaceAll('"','\'')}" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="${(file.nombre_proyecto || '-').toString().replaceAll('"','\'')} | SGPS: ${(file.codigo_sgps || '-').toString().replaceAll('"','\'')} | Resp: ${(file.responsable || '-').toString().replaceAll('"','\'')} | Ver: ${(file.version || '-').toString().replaceAll('"','\'')} | ${(file.tamano_archivo || '-').toString().replaceAll('"','\'')}">
            <td>${file.nombre_proyecto || "-"}</td>
            <td>${file.codigo_sgps || "-"}</td>
            <td>${file.nombre_centro || "-"}</td>
            <td>${file.regional || "-"}</td>
            <td>${file.fecha_informe || "-"}</td>
            <td>${file.fecha_carga || "-"}</td>
            <td>${file.responsable || "-"}</td>
            <td>${getProgressBar(file.progreso)}</td>
            <td>${file.nombre_archivo || "-"}</td>
            <td>${file.tamano_archivo || "-"}</td>
            <td><span class="badge bg-secondary badge-version">${file.version}</span></td>
            <td>${file.ruta_almacenamiento || "-"}</td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-success btn-sm download-btn" data-id="${file.id}" data-is-modificado="${(file.is_modificado === true || file.es_modificado === true || file.isModified === true) ? 'true' : 'false'}">
                        <i class="fas fa-download me-1"></i> Descargar
                    </button>
                    <button class="btn btn-warning btn-sm update-file-btn" data-id="${file.id}" data-original-id="${file.id_archivo_original ?? ''}" data-is-modified="${(file.is_modificado === true || file.es_modificado === true || file.isModified === true) ? 'true' : 'false'}" ${((file.is_modificado === true || file.es_modificado === true || file.isModified === true) && !file.id_archivo_original && file.id_archivo_original !== 0) ? 'disabled title="No se puede editar: falta vínculo al archivo original"' : ''}>
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete btn-sm delete-file-btn" data-id="${file.id}" data-is-modified="${(file.is_modificado === true || file.es_modificado === true || file.isModified === true) ? 'true' : 'false'}" data-file-name="${file.nombre_archivo || file.fileName || '-'}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}










// =======================================================
// F U N C I Ó N   B A S E   P A R A   T O D O S
// =======================================================

async function loadFilesBase(config) {
    const spinner = document.getElementById(config.spinner);
    const tableWrapper = document.getElementById(config.tableWrapper);
    const noResults = document.getElementById(config.noResults);
    const tbody = document.getElementById(config.tableBody);
    const counter = document.getElementById(config.counter);

    const paginationCfg = config.pagination || null;
    const paginationEl = paginationCfg?.containerId ? document.getElementById(paginationCfg.containerId) : null;

    // Reset visual
    spinner.classList.remove("d-none");
    tableWrapper.classList.add("d-none");
    noResults.classList.add("d-none");
    tbody.innerHTML = "";
    counter.textContent = "0";
    if (paginationEl) paginationEl.innerHTML = "";

    try {
        const response = await config.endpointFunction();

        let data;
        if (Array.isArray(response)) data = response;
        else if (response?.archivos && Array.isArray(response.archivos)) data = response.archivos;
        else data = Object.values(response || {});

        if (!data || data.length === 0) {
            spinner.classList.add("d-none");
            noResults.classList.remove("d-none");
            return;
        }

        counter.textContent = String(data.length);

        // Paginación (cliente)
        const pageSize = paginationCfg?.pageSize || DEFAULT_PAGE_SIZE;
        const tabKey = paginationCfg?.tabKey;
        let page = tabKey && paginationState[tabKey] ? paginationState[tabKey].page : 1;
        const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
        if (page > totalPages) page = totalPages;
        if (page < 1) page = 1;
        if (tabKey && paginationState[tabKey]) paginationState[tabKey].page = page;

        const start = (page - 1) * pageSize;
        const pageItems = data.slice(start, start + pageSize);

        tbody.innerHTML = pageItems.map(config.rowBuilder).join("");

        if (paginationEl && tabKey) {
            renderPagination(paginationEl, tabKey, page, totalPages);
        }


        spinner.classList.add("d-none");
        tableWrapper.classList.remove("d-none");

    } catch (err) {
        console.error("Error cargando archivos", err);
        spinner.classList.add("d-none");
        noResults.classList.remove("d-none");
    }
}

function renderPagination(containerEl, tabKey, page, totalPages) {
    if (!containerEl) return;

    if (totalPages <= 1) {
        containerEl.innerHTML = "";
        return;
    }

    const mkBtn = (label, targetPage, disabled = false, active = false, ariaLabel = null) => {
        const liClass = ["page-item", disabled ? "disabled" : "", active ? "active" : ""].filter(Boolean).join(" ");
        const safeAria = ariaLabel ? `aria-label=\"${ariaLabel}\"` : "";
        const dataAttrs = disabled ? "" : `data-pagination-tab=\"${tabKey}\" data-page=\"${targetPage}\"`;
        return `
            <li class=\"${liClass}\">
                <button class=\"page-link\" type=\"button\" ${safeAria} ${dataAttrs}>${label}</button>
            </li>
        `;
    };

    const items = [];
    items.push(mkBtn("Anterior", page - 1, page <= 1, false, "Anterior"));

    const maxWindow = 5;
    let start = Math.max(1, page - Math.floor(maxWindow / 2));
    let end = Math.min(totalPages, start + maxWindow - 1);
    start = Math.max(1, end - maxWindow + 1);

    if (start > 1) {
        items.push(mkBtn("1", 1, false, page === 1));
        if (start > 2) {
            items.push(`<li class=\"page-item disabled\"><span class=\"page-link\">…</span></li>`);
        }
    }

    for (let p = start; p <= end; p++) {
        items.push(mkBtn(String(p), p, false, p === page));
    }

    if (end < totalPages) {
        if (end < totalPages - 1) {
            items.push(`<li class=\"page-item disabled\"><span class=\"page-link\">…</span></li>`);
        }
        items.push(mkBtn(String(totalPages), totalPages, false, page === totalPages));
    }

    items.push(mkBtn("Siguiente", page + 1, page >= totalPages, false, "Siguiente"));
    containerEl.innerHTML = items.join("");
}



// =======================================================
// U T I L I D A D E S
// =======================================================

function formatDate(value) {
    if (!value) return "-";

    // fuerza a string
    const date = new Date(String(value));

    if (isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("es-CO");
}

// =======================================================
// FUNCIONES PARA LIMPIAR FILTROS
// =======================================================

function clearOriginalFilters() {
    document.getElementById("originalDateFrom").value = "";
    document.getElementById("originalDateTo").value = "";
    document.getElementById("originalLimit").value = "20";
    resetPagination("original");
    loadOriginalFiles();
    refreshStatsCards();
}

function clearModifiedFilters() {
    document.getElementById("modifiedDateFrom").value = "";
    document.getElementById("modifiedDateTo").value = "";
    document.getElementById("modifiedLimit").value = "20";
    resetPagination("modified");
    loadModifiedFiles();
    refreshStatsCards();
}

function clearCurrentFilters() {
    document.getElementById("currentDateFrom").value = "";
    document.getElementById("currentDateTo").value = "";
    document.getElementById("currentLimit").value = "20";
    resetPagination("current");
    loadCurrentFiles();
    refreshStatsCards();
}

function clearSidebarFilters() {
    document.getElementById("searchTerm").value = "";
    document.getElementById("searchProject").value = "";
    document.getElementById("searchSgpsCode").value = "";
    document.getElementById("searchStudyCenter").value = "";
    document.getElementById("searchRegional").value = "";
    document.getElementById("searchFileType").value = "";
    const searchDateFrom = document.getElementById("searchDateFrom");
    const searchDateTo = document.getElementById("searchDateTo");
    if (searchDateFrom) searchDateFrom.value = "";
    if (searchDateTo) searchDateTo.value = "";

    sidebarFiltersState = {
        searchTerm: "",
        project: "",
        sgpsCode: "",
        studyCenter: "",
        regional: "",
        fileType: "",
        dateFrom: "",
        dateTo: ""
    };

    resetPagination("original");
    resetPagination("modified");
    resetPagination("current");
    
    // Recargar todas las tablas sin filtros
    loadOriginalFiles();
    loadModifiedFiles();
    loadCurrentFiles();

    refreshStatsCards();
}

// =======================================================
// FUNCIONES PARA FILTRAR DESDE EL SIDEBAR
// =======================================================

async function handleSidebarSearch() {
    const searchBtn = document.getElementById("searchBtn");
    const searchSpinner = document.getElementById("searchSpinner");
    const searchBtnText = document.getElementById("searchBtnText");
    
    // Mostrar spinner
    searchSpinner.classList.remove("d-none");
    searchBtnText.textContent = "Buscando...";
    searchBtn.disabled = true;
    
    try {
        // Obtener valores del sidebar
        const filters = {
            searchTerm: document.getElementById("searchTerm")?.value || "",
            project: document.getElementById("searchProject")?.value || "",
            sgpsCode: document.getElementById("searchSgpsCode")?.value || "",
            studyCenter: document.getElementById("searchStudyCenter")?.value || "",
            regional: document.getElementById("searchRegional")?.value || "",
            fileType: document.getElementById("searchFileType")?.value || "",
            dateFrom: document.getElementById("searchDateFrom")?.value || "",
            dateTo: document.getElementById("searchDateTo")?.value || ""
        };

        sidebarFiltersState = { ...filters };
        
        // Aplicar filtros según el tipo de archivo seleccionado
        if (filters.fileType === "original") {
            resetPagination("original");
            await loadOriginalFiles();
        } else if (filters.fileType === "modified") {
            resetPagination("modified");
            await loadModifiedFiles();
        } else if (filters.fileType === "") {
            // Si no hay tipo específico, filtrar en todas las tablas
            resetPagination("original");
            resetPagination("modified");
            resetPagination("current");
            await Promise.all([
                loadOriginalFiles(),
                loadModifiedFiles(),
                loadCurrentFiles()
            ]);
        }

        await refreshStatsCards();
    } catch (error) {
        console.error("Error al filtrar:", error);
    } finally {
        searchSpinner.classList.add("d-none");
        searchBtnText.textContent = "Buscar";
        searchBtn.disabled = false;
    }
}

// Aplicar filtros del sidebar en el cliente
function applyClientSideFilters(files, filters) {
    const hasAny = Boolean(
        filters?.searchTerm ||
        filters?.project ||
        filters?.sgpsCode ||
        filters?.studyCenter ||
        filters?.regional ||
        filters?.dateFrom ||
        filters?.dateTo
    );
    if (!hasAny) return files;

    const fromTs = normalizeDateToTs(filters?.dateFrom);
    const toTs = normalizeDateToTs(filters?.dateTo);

    return files.filter(file => {
        // Filtro por término de búsqueda (busca en todos los campos)
        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            const searchableText = [
                file.nombre_archivo,
                file.nombre_proyecto,
                file.codigo_sgps,
                file.nombre_centro,
                file.regional,
                file.responsable
            ].join(" ").toLowerCase();
            
            if (!searchableText.includes(term)) return false;
        }
        
        // Filtro por proyecto
        if (filters.project) {
            const fileProjectId = file.id_proyecto ?? file.projectId ?? file.project_id ?? null;
            if (fileProjectId == null) return false;
            if (Number(fileProjectId) !== Number.parseInt(filters.project, 10)) return false;
        }
        
        // Filtro por rango de fechas (sobre fecha_informe)
        if (fromTs || toTs) {
            const fileDateTs = normalizeDateToTs(file.fecha_informe ?? file.fechaReporte ?? file.fecha_reporte ?? file.fecha);
            if (!fileDateTs) return false;
            if (fromTs && fileDateTs < fromTs) return false;
            if (toTs && fileDateTs > toTs) return false;
        }
        
        // Filtro por código SGPS
        if (filters.sgpsCode && !String(file.codigo_sgps || "").toLowerCase().includes(filters.sgpsCode.toLowerCase())) {
            return false;
        }
        
        // Filtro por centro de estudio
        if (filters.studyCenter && !String(file.nombre_centro || "").toLowerCase().includes(filters.studyCenter.toLowerCase())) {
            return false;
        }
        
        // Filtro por regional
        if (filters.regional && !String(file.regional || "").toLowerCase().includes(filters.regional.toLowerCase())) {
            return false;
        }
        
        return true;
    });
}

function normalizeDateToTs(value) {
    if (!value) return null;
    const s = String(value).trim();
    if (!s) return null;

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const [y, m, d] = s.slice(0, 10).split("-").map(Number);
        const dt = new Date(y, m - 1, d);
        return Number.isFinite(dt.getTime()) ? dt.getTime() : null;
    }

    // DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
        const [d, m, y] = s.split("/").map(Number);
        const dt = new Date(y, m - 1, d);
        return Number.isFinite(dt.getTime()) ? dt.getTime() : null;
    }

    const dt = new Date(s);
    return Number.isFinite(dt.getTime()) ? new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime() : null;
}


