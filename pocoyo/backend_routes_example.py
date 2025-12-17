import os
import re
import shutil
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from app.crud.Archivos_innovacion_donald import obtener_estadisticas_archivos

from app.router.dependencies import get_current_user
# Importamos la conexión a la base de datos y los esquemas (el menú)
from app.schemas.usuarios import RetornoUsuario
from core.database import get_db
from app.crud.Archivos_innovacion_donald import obtener_ultima_version_archivo

from app.schemas.Archivos_innovacion import (
    ArchivoResponse, ListaArchivosResponse, ArchivoMetaResponse
)
# Importamos las funciones de la cocina (CRUD) DONALD
from app.crud.Archivos_innovacion_donald import (
    eliminar_todos_los_archivos_permanente, listar_archivos, obtener_meta_archivo,
    insertar_archivo, insertar_archivo_modificado, eliminar_archivo,
    obtener_ultima_version_para_proyecto, listar_proyectos, versiones_por_original
)

router = APIRouter()


# Configuración de la carpeta donde se guardarán los archivos físicos
DIRECTORIO_SUBIDAS = os.path.join(os.getcwd(), "uploads")
os.makedirs(DIRECTORIO_SUBIDAS, exist_ok=True)


# --- FUNCIÓN AUXILIAR 1: CALCULAR VERSIÓN ---
# def calcular_siguiente_version(version_actual_texto: Optional[str]) -> str:
#     if not version_actual_texto:
#         return "v1.0"
#     # Usamos Regex para buscar el patrón "vNumero.Numero" (Ej: v1.5)
#     coincidencia_regex = re.match(r"v(\d+)\.(\d+)", version_actual_texto)
    
#     if not coincidencia_regex:
#         return "v1.0"
    
#     # Extraemos los números encontrados
#     mayor = int(coincidencia_regex.group(1)) # El 1 de v1.5
#     menor = int(coincidencia_regex.group(2)) # El 5 de v1.5
    
#     # Aumentamos el menor en 1
#     return f"v{mayor}.{menor + 1}"


def calcular_siguiente_version(version_actual_texto: Optional[str]) -> str:
    if not version_actual_texto:
        return "v1.0"

    m = re.match(r"v(\d+)\.(\d+)", version_actual_texto)
    if not m:
        return "v1.0"

    mayor = int(m.group(1))
    menor = int(m.group(2)) + 1

    if menor >= 10:
        mayor += 1
        menor = 0

    return f"v{mayor}.{menor}"



# --- FUNCIÓN AUXILIAR 2: MAPEO DE DATOS ---
# Convierte la fila cruda de la DB en el formato bonito que espera el Frontend
def formatear_fila_para_respuesta(fila_base_datos, mapa_nombres_proyectos, es_modificado=False):
    if not fila_base_datos:
        return None
        
    id_del_proyecto = fila_base_datos.get("id_proyecto")
    nombre_del_proyecto = mapa_nombres_proyectos.get(id_del_proyecto) #AQUI SUELTA EL TIPO DE PROYECTO QUE ES OSEA LA CATEGORIA ES RARO
    
    # Función interna para convertir fechas a texto (evita el error 500)
    def convertir_fecha_a_texto(objeto_fecha):
        if objeto_fecha is not None and hasattr(objeto_fecha, 'isoformat'):
            return objeto_fecha.isoformat() # Retorna "YYYY-MM-DD"
        return objeto_fecha
        
    tipo_de_archivo = "modificado" if es_modificado else "original"

    # Construimos el diccionario final
    return {
        "id": fila_base_datos.get("id"),
        "nombre_proyecto": fila_base_datos.get("nombre_proyecto"), #MODIFIQUE AQUI
        "nombre_archivo": fila_base_datos.get("nombre_archivo"),
        # Aplicamos la conversión de fechas aquí
        "fecha_carga": convertir_fecha_a_texto(fila_base_datos.get("fecha_carga")), 
        "fecha_subido": convertir_fecha_a_texto(fila_base_datos.get("fecha_subido")), 
        "fecha_informe": convertir_fecha_a_texto(fila_base_datos.get("fecha_informe")),
        "responsable": fila_base_datos.get("responsable"),
        "progreso": fila_base_datos.get("progreso"),
        "observacion": fila_base_datos.get("observacion"),
        "tamano_archivo": fila_base_datos.get("tamano_archivo"),
        "version": fila_base_datos.get("version"),
        "id_proyecto": id_del_proyecto,
        "categoria": nombre_del_proyecto,  #AQUI SUELTA EL TIPO DE PROYECTO QUE ES OSEA LA CATEGORIA ES RARO VA DESDE ARRIBA QUE TIENE ESTE MISMO MENSAJE
        "codigo_sgps": fila_base_datos.get("codigo_sgps"),
        "nombre_centro": fila_base_datos.get("nombre_centro"),
        "regional": fila_base_datos.get("regional"),
        "responsables_proyecto": fila_base_datos.get("responsables_proyecto"),
        "ruta_almacenamiento": fila_base_datos.get("ruta_almacenamiento"),
        "archivo_tipo": tipo_de_archivo,
        "id_archivo_original": fila_base_datos.get("id_archivo_original"),
        "razon_modificado": fila_base_datos.get("razon_modificado"),
    }


# --- RUTA 1: LISTAR ARCHIVOS (GET /) --- 
@router.get("/", response_model=ListaArchivosResponse)
def get_archivos(
    texto_busqueda: Optional[str] = Query(None, alias="query"), # 'q' en URL, AQUI MODIFIQUÉ 'texto_busqueda' en Python
    id_proyecto: Optional[int] = Query(None),
    fechaDesde: Optional[str] = Query(None),
    fechaHasta: Optional[str] = Query(None),
    codigo_sgps: Optional[str] = Query(None),
    nombre_centro: Optional[str] = Query(None),
    regional: Optional[str] = Query(None),
    mostrar_modificados: Optional[bool] = Query(False, alias="show_modificados"),
    db: Session = Depends(get_db), user_token: RetornoUsuario = Depends(get_current_user)

):
    es_modificado = mostrar_modificados
    nombre_tabla = "archivos_modificados" if es_modificado else "archivos"
    
    filtros_usuario = {
        "q": texto_busqueda,
        "id_proyecto": id_proyecto,
        "fechaDesde": fechaDesde,
        "fechaHasta": fechaHasta,
        "codigo_sgps": codigo_sgps,
        "nombre_centro": nombre_centro,
        "regional": regional,
        "tabla": nombre_tabla
    }
    
    # 1. Obtenemos los datos crudos de la DB
    lista_filas_db = listar_archivos(db, filtros_usuario)

    # 2. Obtenemos los nombres de los proyectos para pintarlos bonito
    lista_proyectos = listar_proyectos(db)
    # Convertimos la lista de proyectos en un diccionario {id: "Nombre"} para buscar rápido
    mapa_nombres_proyectos = {proy["id"]: proy["nombre"] for proy in lista_proyectos}

    # 3. Formateamos cada fila usando la función auxiliar
    datos_respuesta = [
        formatear_fila_para_respuesta(fila, mapa_nombres_proyectos, es_modificado) 
        for fila in lista_filas_db
    ]
    # 4. Si no hay datos, lanzamos 404
    if not datos_respuesta:
        raise HTTPException(
            status_code=404,
            detail="No existe un proyecto con estos filtros"
        )

    return {"archivos": datos_respuesta}


# --- RUTA 2: LISTAR PROYECTOS (GET /projects) ---
@router.get("/projects")
def get_projects(db: Session = Depends(get_db), user_token: RetornoUsuario = Depends(get_current_user)):
    lista_todos_proyectos = listar_proyectos(db)
    return lista_todos_proyectos


# --- RUTA 3: VER HISTORIAL DE VERSIONES (GET /versions/...) ---
@router.get("/versions/{id_original}", response_model=ListaArchivosResponse)
def get_versions(
    id_original: int, 
    texto_busqueda: Optional[str] = Query(None, alias="q"), 
    id_proyecto: Optional[int] = None, 
    db: Session = Depends(get_db), user_token: RetornoUsuario = Depends(get_current_user)
):
    filtros = {"q": texto_busqueda, "id_proyecto": id_proyecto}
    
    # Buscamos en la tabla de modificados
    lista_versiones = versiones_por_original(db, id_original, filtros)
    
    # Traemos nombres de proyectos
    lista_proyectos = listar_proyectos(db)
    mapa_nombres_proyectos = {proy["id"]: proy["nombre"] for proy in lista_proyectos}
    
    # Formateamos
    datos_respuesta = [
        formatear_fila_para_respuesta(version, mapa_nombres_proyectos, es_modificado=True) 
        for version in lista_versiones
    ]
    
    return {"archivos": datos_respuesta}


# --- RUTA 4: METADATA INDIVIDUAL (GET /meta/...) ---
@router.get("/meta/{id}", response_model=ArchivoMetaResponse)
def meta_archivo(
    id: int, 
    mostrar_modificados: Optional[bool] = Query(False, alias="show_modificados"), 
    db: Session = Depends(get_db), user_token: RetornoUsuario = Depends(get_current_user)
):
    es_modificado = mostrar_modificados
    nombre_tabla = "archivos_modificados" if es_modificado else "archivos"
    
    fila_archivo = obtener_meta_archivo(db, nombre_tabla, id)
    if not fila_archivo:
        raise HTTPException(status_code=404, detail="No encontrado")
        
    lista_proyectos = listar_proyectos(db)
    mapa_nombres_proyectos = {proy["id"]: proy["nombre"] for proy in lista_proyectos}
    
    respuesta_formateada = formatear_fila_para_respuesta(fila_archivo, mapa_nombres_proyectos, es_modificado)
    
    return respuesta_formateada


# --- RUTA 5: SUBIR ARCHIVO (POST /upload) ---
@router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    nombre_proyecto: Optional[str] = Query(None), #AQUI MODIFIQUE
    id_proyecto: int = Query(...),
    fecha_informe: Optional[str] = Query(None),
    responsable: Optional[str] = Query(None),
    progreso: Optional[int] = Query(0),
    observacion: Optional[str] = Query(None),
    codigo_sgps: Optional[str] = Query(None),
    nombre_centro: Optional[str] = Query(None),
    regional: Optional[str] = Query(None),
    responsables_proyecto: Optional[str] = Query(None),
    is_modificacion: Optional[bool] = Query(False),
    id_archivo_original: Optional[int] = Query(None),
    razon_modificado: Optional[str] = Query(None),
    db: Session = Depends(get_db), user_token: RetornoUsuario = Depends(get_current_user)
):
    # PASO 1: VALIDACIÓN DEL PROYECTO
    lista_proyectos = listar_proyectos(db)
    mapa_nombres_proyectos = {proy["id"]: proy["nombre"] for proy in lista_proyectos}
    nombre_del_proyecto = mapa_nombres_proyectos.get(id_proyecto)
    
    if not nombre_del_proyecto:
        raise HTTPException(status_code=400, detail="Proyecto inválido: El ID no existe")

    # Extraer categoría del nombre (Ej: "Proyecto - General")
    categoria = nombre_del_proyecto.split(" - ")[1] if " - " in nombre_del_proyecto else "General"
    
    # PASO 2: GUARDADO FÍSICO EN DISCO
    if not file.filename: 
        raise HTTPException(status_code=400, detail="Archivo requerido o vacío")

    fecha_actual = datetime.utcnow()
    # Generamos un nombre único para que no se sobrescriban archivos con el mismo nombre
    prefijo_fecha = fecha_actual.strftime("%Y%m%d_%H%M%S")
    nombre_archivo_original = file.filename
    nombre_unico_disco = f"{prefijo_fecha}_{nombre_archivo_original}"
    ruta_completa_guardado = os.path.join(DIRECTORIO_SUBIDAS, nombre_unico_disco)

    try:
        # Copiamos los bytes del archivo cargado al disco duro
        with open(ruta_completa_guardado, "wb") as buffer_archivo:
            shutil.copyfileobj(file.file, buffer_archivo)
        
        # Calculamos tamaño en MB
        tamano_mb = os.path.getsize(ruta_completa_guardado) / (1024 * 1024)
        tamano_str = f"{tamano_mb:.1f} MB"

    except Exception as error_disco:
        raise HTTPException(status_code=500, detail=f"Error al guardar el archivo en disco: {error_disco}")


    

    # PASO 3: GUARDADO EN BASE DE DATOS
    try:
        datos_para_insertar = {
            "id_proyecto": id_proyecto,
            "nombre_proyecto": nombre_proyecto,
            "nombre_archivo": nombre_archivo_original,
            "ruta_almacenamiento": nombre_unico_disco,
            "fecha_informe": fecha_informe,
            "responsable": responsable,
            "progreso": progreso,
            "observacion": observacion or "",
            "tamano_archivo": tamano_str,
            "categoria": categoria,
            "codigo_sgps": codigo_sgps or "",
            "nombre_centro": nombre_centro or "",
            "regional": regional or "",
            "responsables_proyecto": responsables_proyecto or ""
        }

        fecha_registro_hoy = fecha_actual.strftime("%Y-%m-%d")

        if is_modificacion and id_archivo_original:
            #MODIFICACIÓN → versión por ARCHIVO
            ultima_version = obtener_ultima_version_archivo(db, id_archivo_original)
            nueva_version = "v1.1" if ultima_version is None else calcular_siguiente_version(ultima_version)


            datos_para_insertar.update({
                "id_archivo_original": id_archivo_original,
                "fecha_subido": fecha_registro_hoy,
                "razon_modificado": razon_modificado or "",
                "version": nueva_version
            })

            nuevo_id = insertar_archivo_modificado(db, datos_para_insertar)
            return {"id": nuevo_id, "is_modificado": True, "version": nueva_version}

        else:
            # ARCHIVO ORIGINAL → siempre v1.0
            datos_para_insertar.update({
                "fecha_carga": fecha_registro_hoy,
                "version": "v1.0"
            })

            nuevo_id = insertar_archivo(db, datos_para_insertar)
            return {"id": nuevo_id, "is_modificado": False, "version": "v1.0"}

    except Exception as error_db:
        try:
            os.remove(ruta_completa_guardado)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(error_db))
    


    # PASO 3: GUARDADO EN BASE DE DATOS  ES LA FUNNCION DE ARRIBA
    # try:
    #     # Calcular cuál es la versión siguiente (v1.0 -> v1.1)
    #     ultima_version_existente = obtener_ultima_version_para_proyecto(db, id_proyecto)
    #     nueva_version = calcular_siguiente_version(ultima_version_existente)
        
    #     datos_para_insertar = {
    #         "id_proyecto": id_proyecto,
    #         "nombre_archivo": nombre_archivo_original, # Nombre bonito para el usuario
    #         "ruta_almacenamiento": nombre_unico_disco, # Nombre técnico para el servidor
    #         "fecha_informe": fecha_informe,
    #         "responsable": responsable,
    #         "progreso": progreso,
    #         "observacion": observacion or "",
    #         "tamano_archivo": tamano_str,
    #         "version": nueva_version,
    #         "categoria": categoria,
    #         "codigo_sgps": codigo_sgps or "",
    #         "nombre_centro": nombre_centro or "",
    #         "regional": regional or "",
    #         "responsables_proyecto": responsables_proyecto or ""
    #     }
        
    #     fecha_registro_hoy = fecha_actual.strftime("%Y-%m-%d")

    #     if is_modificacion and id_archivo_original:
    #         # Es una modificación
    #         datos_para_insertar.update({
    #             "id_archivo_original": id_archivo_original,
    #             "fecha_subido": fecha_registro_hoy,
    #             "razon_modificado": razon_modificado or ""
    #         })
    #         nuevo_id = insertar_archivo_modificado(db, datos_para_insertar)
    #         return {"id": nuevo_id, "is_modificado": True, "version": nueva_version}
    #     else:
    #         # Es un archivo original nuevo
    #         datos_para_insertar.update({"fecha_carga": fecha_registro_hoy})
    #         nuevo_id = insertar_archivo(db, datos_para_insertar)
    #         return {"id": nuevo_id, "is_modificado": False, "version": nueva_version}
            
    # except Exception as error_db:
    #     # Si falla la DB, borramos el archivo del disco para no dejar basura
    #     try:
    #         os.remove(ruta_completa_guardado)
    #     except Exception:
    #         pass
    #     raise HTTPException(status_code=500, detail=str(error_db))



# --- RUTA 6: ELIMINAR ARCHIVO (DELETE /{id}) ---
@router.delete("/{id}")
def delete_file(
    id: int, 
    es_modificado: Optional[bool] = Query(False, alias="is_modificado"), 
    db: Session = Depends(get_db), user_token: RetornoUsuario = Depends(get_current_user)

):
    nombre_tabla = "archivos_modificados" if es_modificado else "archivos"
    
    # 1. Obtenemos la ruta del archivo antes de borrar el registro de la DB
    fila_archivo = obtener_meta_archivo(db, nombre_tabla, id)
    if not fila_archivo:
        raise HTTPException(status_code=404, detail="No encontrado")
    
    ruta_almacenamiento = fila_archivo.get("ruta_almacenamiento")
    
    try:
        # 2. Borramos de la Base de Datos
        exito_eliminacion = eliminar_archivo(db, nombre_tabla, id)
        if not exito_eliminacion:
            raise HTTPException(status_code=404, detail="Error al eliminar registro de BD")
        
        # 3. Borramos el archivo físico del disco
        if ruta_almacenamiento:
            ruta_completa = os.path.join(DIRECTORIO_SUBIDAS, ruta_almacenamiento)
            if os.path.exists(ruta_completa):
                os.remove(ruta_completa)
                
        return {"success": True, "mensaje": "Archivo eliminado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- RUTA 7: DESCARGAR ARCHIVO (GET /{id}/download) ---
@router.get("/{id}/download")
def download_file(
    id: int, 
    es_modificado: Optional[bool] = Query(False, alias="is_modificado"), 
    db: Session = Depends(get_db), user_token: RetornoUsuario = Depends(get_current_user)
):
    from fastapi.responses import FileResponse
    
    nombre_tabla = "archivos_modificados" if es_modificado else "archivos"
    
    try:
        fila_archivo = obtener_meta_archivo(db, nombre_tabla, id)
        if not fila_archivo:
            raise HTTPException(status_code=404, detail="No encontrado")
            
        ruta_almacenamiento = fila_archivo.get("ruta_almacenamiento")
        nombre_original = fila_archivo.get("nombre_archivo") or ruta_almacenamiento
        
        ruta_completa = os.path.join(DIRECTORIO_SUBIDAS, ruta_almacenamiento)
        
        if not os.path.exists(ruta_completa):
            raise HTTPException(status_code=404, detail="Archivo no existe en el servidor")
            
        # FileResponse envía el archivo al navegador para que lo descargue
        return FileResponse(ruta_completa, filename=nombre_original)
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))


# --- RUTA 8: ARCHIVOS RECIENTES (GET /current) ---
@router.get("/current", response_model=ListaArchivosResponse)
def current_files(
    limit: int = 20, 
    fechaDesde: Optional[str] = None, 
    fechaHasta: Optional[str] = None, 
    db: Session = Depends(get_db), user_token: RetornoUsuario = Depends(get_current_user)
):
    filtros_originales = {"tabla": "archivos", "fechaDesde": fechaDesde, "fechaHasta": fechaHasta}
    filtros_modificados = {"tabla": "archivos_modificados", "fechaDesde": fechaDesde, "fechaHasta": fechaHasta}
    
    lista_originales = listar_archivos(db, filtros_originales)
    lista_modificados = listar_archivos(db, filtros_modificados)
    
    lista_proyectos = listar_proyectos(db)
    mapa_nombres_proyectos = {proy["id"]: proy["nombre"] for proy in lista_proyectos}

    todos_los_archivos = []
    
    # Procesamos originales
    for fila_orig in lista_originales:
        todos_los_archivos.append(formatear_fila_para_respuesta(fila_orig, mapa_nombres_proyectos, es_modificado=False))
        
    # Procesamos modificados
    for fila_mod in lista_modificados:
        todos_los_archivos.append(formatear_fila_para_respuesta(fila_mod, mapa_nombres_proyectos, es_modificado=True))

    # Función Lambda (Ahora con nombre claro) para ordenar
    def obtener_fecha_para_ordenar(archivo_dict):
        # Intenta usar fecha_subido, si no fecha_carga, si no una fecha muy vieja
        return archivo_dict.get("fecha_subido") or archivo_dict.get("fecha_carga") or "1970-01-01"

    # Ordenamos y cortamos la lista
    archivos_ordenados = sorted(todos_los_archivos, key=obtener_fecha_para_ordenar, reverse=True)[:limit]
    
    return {"archivos": archivos_ordenados}

@router.get("/stats")
def estadisticas_archivos(
    texto_busqueda: Optional[str] = Query(None, alias="q"),
    id_proyecto: Optional[int] = Query(None),
    codigo_sgps: Optional[str] = Query(None),
    nombre_centro: Optional[str] = Query(None),
    regional: Optional[str] = Query(None),
    fechaDesde: Optional[str] = Query(None),
    fechaHasta: Optional[str] = Query(None),
    tipo_archivo: Optional[str] = Query("todos"),  # originales | modificados | todos / ESTO SE ESCRIBE DIRECTO EN LA API, EN FRONT SE PONE UN SELECT
    db: Session = Depends(get_db),
    user_token: RetornoUsuario = Depends(get_current_user)
):
    # 1. Construir filtros EXACTOS a la búsqueda
    filtros = {
        "q": texto_busqueda,
        "id_proyecto": id_proyecto,
        "codigo_sgps": codigo_sgps,
        "nombre_centro": nombre_centro,
        "regional": regional,
        "fechaDesde": fechaDesde,
        "fechaHasta": fechaHasta,
    }
    # 2. Definir tablas a consultar según tipo_archivo
    tablas = []
    if tipo_archivo == "originales":
        tablas = ["archivos"]
    elif tipo_archivo == "modificados":
        tablas = ["archivos_modificados"]
    else:
        tablas = ["archivos", "archivos_modificados"]

    total_encontrados = 0

    # 3. Contar archivos según filtros y tablas
    for tabla in tablas:
        filtros["tabla"] = tabla
        resultados = listar_archivos(db, filtros)
        total_encontrados += len(resultados)

    # 4. Estadísticas globales (sin filtros) 
    estadisticas_globales = obtener_estadisticas_archivos(db)

    return {
        "estadisticas": {
            **estadisticas_globales,
            "archivos_encontrados": total_encontrados
        }
    }


@router.delete("/admin/limpieza-total")
def nuke_all_data(
    # admin_key: str = Query(..., description="CLAVE DE SEGURIDAD REQUERIDA para esta operación de borrado total"),
    db: Session = Depends(get_db), user_token: RetornoUsuario = Depends(get_current_user)
):
    # ¡DEFINE UNA CLAVE SECRETA AQUÍ!
    # En un entorno real, esta clave NO debería estar en el código fuente.
    # CLAVE_SECRETA_DE_BORRADO = "DEV_MASTER_WIPE" 
    
    if user_token is None:
        raise HTTPException(status_code=403, detail="Clave de seguridad inválida. Operación denegada.")
    
    try:
        # 1. OBTENER RUTAS DE ARCHIVOS FÍSICOS ANTES DE BORRAR LA DB
        
        # Listamos todos los archivos originales y modificados
        archivos_originales_db = listar_archivos(db, {"tabla": "archivos"})
        archivos_modificados_db = listar_archivos(db, {"tabla": "archivos_modificados"})
        
        # Recopilamos todas las rutas de almacenamiento únicas
        rutas_a_borrar = [
            a["ruta_almacenamiento"] 
            for a in archivos_originales_db + archivos_modificados_db 
            if a.get("ruta_almacenamiento")
        ]
        
        # 2. BORRAR REGISTROS DE LA BASE DE DATOS
        eliminar_todos_los_archivos_permanente(db) 
        
        # 3. BORRAR ARCHIVOS FÍSICOS
        archivos_borrados_disco = 0
        for ruta_archivo in rutas_a_borrar:
            ruta_completa = os.path.join(DIRECTORIO_SUBIDAS, ruta_archivo)
            if os.path.exists(ruta_completa):
                os.remove(ruta_completa)
                archivos_borrados_disco += 1
                
        return {
            "success": True, 
            "message": "¡ADVERTENCIA! Limpieza Total Exitosa. Todos los datos de archivos y archivos_modificados han sido ELIMINADOS PERMANENTEMENTE.",
            "registros_afectados_db": len(archivos_originales_db) + len(archivos_modificados_db),
            "archivos_fisicos_eliminados": archivos_borrados_disco
        }
        
    except Exception as e:
        # En caso de cualquier error, lanza 500
        raise HTTPException(status_code=500, detail=f"Fallo durante la limpieza total. ¡Revisa la base de datos! Error: {e}")