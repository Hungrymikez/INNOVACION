from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# --- Funciones de Utilidad ---

# AÑADE ESTA FUNCIÓN AL FINAL DE app/crud/Archivos_innovacion.py

def eliminar_todos_los_archivos_permanente(db: Session):
    """
    ¡ADVERTENCIA EXTREMA! Elimina *TODOS* los registros de archivos y archivos_modificados.
    """
    try:
        # Se borran primero los modificados por si hay alguna restricción de clave foránea
        consulta_delete_modificados = text("DELETE FROM archivos_modificados")
        db.execute(consulta_delete_modificados)
        
        consulta_delete_originales = text("DELETE FROM archivos")
        db.execute(consulta_delete_originales)
        
        db.commit()
        return True
    except SQLAlchemyError as error_sql:
        db.rollback()
        logger.error(f"Error eliminar_todos_los_archivos_permanente: {error_sql}")
        raise


def listar_proyectos(db: Session):
    try:
        # Cambio: q -> consulta_proyectos
        consulta_proyectos = text("SELECT id, nombre FROM tipo_proyecto ORDER BY nombre") #AQUI MODIFIQUE
        return db.execute(consulta_proyectos).mappings().all()
    except SQLAlchemyError as error_sql:
        logger.error(f"Error listar_proyectos: {error_sql}")
        raise

# --- Funciones CRUD de Archivos ---

def listar_archivos(db: Session, filtros: dict):
    tabla = filtros.get("tabla", "archivos")
    fecha_columna = "fecha_carga" if tabla == "archivos" else "fecha_subido"
    # fecha_columna = "fecha_informe" # Alternativa si se quiere filtrar por fecha_informe

    try:
        base_sql = f"SELECT * FROM {tabla} WHERE 1=1"
        parametros_sql = {}

        # Filtro de texto (q) - el más amplio
        q = filtros.get("q")
        if q not in (None, "", "null", "undefined"):
            texto_busqueda = f"%{q}%"
            base_sql += (
                " AND (nombre_archivo LIKE :q OR nombre_proyecto LIKE :q OR responsable LIKE :q OR observacion LIKE :q "
                "OR categoria LIKE :q OR codigo_sgps LIKE :q OR nombre_centro LIKE :q OR regional LIKE :q)"
            )
            parametros_sql["q"] = texto_busqueda

        # ID proyecto
        if filtros.get("id_proyecto") not in (None, "", "null", "undefined"):
            base_sql += " AND id_proyecto = :id_proyecto"
            parametros_sql["id_proyecto"] = filtros["id_proyecto"]

        # Fechas
        if filtros.get("fechaDesde") not in (None, "", "null", "undefined"):
            base_sql += f" AND {fecha_columna} >= :fechaDesde"
            parametros_sql["fechaDesde"] = filtros["fechaDesde"]

        if filtros.get("fechaHasta") not in (None, "", "null", "undefined"):
            base_sql += f" AND {fecha_columna} <= :fechaHasta"
            parametros_sql["fechaHasta"] = filtros["fechaHasta"]

        # Código SGPS
        if filtros.get("codigo_sgps") not in (None, "", "null", "undefined"):
            base_sql += " AND codigo_sgps LIKE :codigo_sgps"
            parametros_sql["codigo_sgps"] = f"%{filtros['codigo_sgps']}%"

        # Nombre centro
        if filtros.get("nombre_centro") not in (None, "", "null", "undefined"):
            base_sql += " AND nombre_centro LIKE :nombre_centro"
            parametros_sql["nombre_centro"] = f"%{filtros['nombre_centro']}%"

        # Regional
        if filtros.get("regional") not in (None, "", "null", "undefined"):
            base_sql += " AND regional LIKE :regional"
            parametros_sql["regional"] = f"%{filtros['regional']}%"

        base_sql += f" ORDER BY {fecha_columna} DESC"

        consulta = text(base_sql)
        resultados = db.execute(consulta, parametros_sql).mappings().all()
        return resultados

    except SQLAlchemyError as error_sql:
        logger.error(f"Error listar_archivos: {error_sql}")
        raise

def obtener_meta_archivo(db: Session, tabla: str, id_archivo: int):
    try:
        # Cambio: q -> consulta_archivo
        consulta_archivo = text(f"SELECT * FROM {tabla} WHERE id = :id")
        fila_archivo = db.execute(consulta_archivo, {"id": id_archivo}).mappings().first()
        return fila_archivo
    except SQLAlchemyError as error_sql:
        logger.error(f"Error obtener_meta_archivo: {error_sql}")
        raise


def obtener_ultima_version_para_proyecto(db: Session, id_proyecto: int) -> Optional[str]:
    """
    Busca la última version (version y fecha) en archivos y archivos_modificados.
    """
    try:
        # Cambio: q1 -> consulta_archivos_originales
        consulta_archivos_originales = text("""
            SELECT version, fecha_carga
            FROM archivos
            WHERE id_proyecto = :id_proyecto AND version IS NOT NULL
            ORDER BY fecha_carga DESC LIMIT 1
        """)
        
        # Cambio: q2 -> consulta_archivos_modificados
        consulta_archivos_modificados = text("""
            SELECT version, fecha_subido
            FROM archivos_modificados
            WHERE id_proyecto = :id_proyecto AND version IS NOT NULL
            ORDER BY fecha_subido DESC LIMIT 1
        """)

        # Cambio: v1, v2 -> version_original, version_modificada
        version_original = db.execute(consulta_archivos_originales, {"id_proyecto": id_proyecto}).mappings().first()
        version_modificada = db.execute(consulta_archivos_modificados, {"id_proyecto": id_proyecto}).mappings().first()

        lista_candidatos = []
        if version_original:
            lista_candidatos.append({
                "version": version_original["version"], 
                "fecha": version_original.get("fecha_carga", "1970-01-01")
            })
        if version_modificada:
            lista_candidatos.append({
                "version": version_modificada["version"], 
                "fecha": version_modificada.get("fecha_subido", "1970-01-01")
            })
            
        if not lista_candidatos:
            return None
            
        # Ordenar por fecha (lambda x -> lambda candidato)
        candidatos_ordenados = sorted(lista_candidatos, key=lambda candidato: candidato["fecha"], reverse=True)
        return candidatos_ordenados[0]["version"]
        
    except SQLAlchemyError as error_sql:
        logger.error(f"Error obtener_ultima_version_para_proyecto: {error_sql}")
        raise

# --- Funciones CRUD de Archivos Modificados ---

def obtener_ultima_version_archivo(db: Session, id_archivo_original: int) -> Optional[str]:
    """
    Devuelve la última versión registrada para un archivo original específico.
    """
    try:
        consulta = text("""
            SELECT version
            FROM archivos_modificados
            WHERE id_archivo_original = :id_original
            AND version IS NOT NULL
            ORDER BY id DESC
            LIMIT 1
        """)
        fila = db.execute(
            consulta,
            {"id_original": id_archivo_original}
        ).mappings().first()

        return fila["version"] if fila else None

    except SQLAlchemyError as error_sql:
        logger.error(f"Error obtener_ultima_version_archivo: {error_sql}")
        raise



def insertar_archivo(db: Session, datos: dict):
    try:
        # Cambio: query -> consulta_insertar
        consulta_insertar = text("""
            INSERT INTO archivos (
                id_proyecto, nombre_proyecto, nombre_archivo, ruta_almacenamiento, fecha_carga,
                fecha_informe, responsable, progreso, observacion, tamano_archivo,
                version, categoria, codigo_sgps, nombre_centro, regional, responsables_proyecto
            ) VALUES (
                :id_proyecto, :nombre_proyecto,:nombre_archivo, :ruta_almacenamiento, :fecha_carga,
                :fecha_informe, :responsable, :progreso, :observacion, :tamano_archivo,
                :version, :categoria, :codigo_sgps, :nombre_centro, :regional, :responsables_proyecto
            )
        """)
        db.execute(consulta_insertar, datos)
        db.commit()
        ultimo_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar_one() 
        return ultimo_id
    except SQLAlchemyError as error_sql:
        db.rollback()
        logger.error(f"Error insertar_archivo: {error_sql}")
        raise


def insertar_archivo_modificado(db: Session, datos: dict):
    try:
        # Cambio: query -> consulta_insertar_modificado
        consulta_insertar_modificado = text("""
            INSERT INTO archivos_modificados (
                id_archivo_original, id_proyecto, nombre_proyecto, nombre_archivo, ruta_almacenamiento,
                fecha_subido, fecha_informe, responsable, progreso, observacion, tamano_archivo,
                version, categoria, codigo_sgps, nombre_centro, regional, responsables_proyecto,
                razon_modificado
            ) VALUES (
                :id_archivo_original, :id_proyecto, :nombre_proyecto, :nombre_archivo, :ruta_almacenamiento,
                :fecha_subido, :fecha_informe, :responsable, :progreso, :observacion, :tamano_archivo,
                :version, :categoria, :codigo_sgps, :nombre_centro, :regional, :responsables_proyecto,
                :razon_modificado
            )
        """)
        db.execute(consulta_insertar_modificado, datos)
        db.commit()
        ultimo_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar_one()
        return ultimo_id
    except SQLAlchemyError as error_sql:
        db.rollback()
        logger.error(f"Error insertar_archivo_modificado: {error_sql}")
        raise

def eliminar_archivo(db: Session, tabla: str, id_archivo: int):
    try:
        # Cambio: q -> consulta_eliminar
        consulta_eliminar = text(f"DELETE FROM {tabla} WHERE id = :id")
        resultado = db.execute(consulta_eliminar, {"id": id_archivo})
        db.commit()
        return resultado.rowcount > 0 
    except SQLAlchemyError as error_sql:
        db.rollback()
        logger.error(f"Error eliminar_archivo: {error_sql}")
        raise

def versiones_por_original(db: Session, id_original: int, filtros: dict):
    try:
        base_sql = "SELECT * FROM archivos_modificados WHERE id_archivo_original = :id_original"
        parametros_sql = {"id_original": id_original}

        if filtros.get("q"):
            base_sql += " AND (nombre_archivo LIKE :q OR responsable LIKE :q OR observacion LIKE :q)"
            # Cambio: q -> texto_busqueda
            texto_busqueda = f"%{filtros['q']}%"
            parametros_sql["q"] = texto_busqueda

        if filtros.get("id_proyecto"):
            base_sql += " AND id_proyecto = :id_proyecto"
            parametros_sql["id_proyecto"] = filtros["id_proyecto"]

        base_sql += " ORDER BY fecha_subido DESC"
        
        # Log para debug
        logger.info(f"Consulta versiones_por_original: SQL -> {base_sql}, Params -> {parametros_sql}")
        
        # Cambio: query implicito -> consulta_versiones
        consulta_versiones = text(base_sql)
        resultados = db.execute(consulta_versiones, parametros_sql).mappings().all()
        return resultados
    except SQLAlchemyError as error_sql:
        logger.error(f"Error versiones_por_original: {error_sql}")
        raise



def obtener_estadisticas_archivos(db):
    # Total archivos
    total_archivos = db.execute(text("""
        SELECT
        (SELECT COUNT(*) FROM archivos)
        + (SELECT COUNT(*) FROM archivos_modificados) AS total_archivos
    """)).mappings().first()["total_archivos"]

    # Originales
    archivos_originales = db.execute(
        text("SELECT COUNT(*) AS archivos_originales FROM archivos")
    ).mappings().first()["archivos_originales"]

    # Modificados
    archivos_modificados = db.execute(
        text("SELECT COUNT(*) AS archivos_modificados FROM archivos_modificados")
    ).mappings().first()["archivos_modificados"]

    # Originales sin modificar (actuales)
    originales_sin_modificar = db.execute(text("""
        SELECT COUNT(*) AS originales_sin_modificar
        FROM archivos a
        WHERE NOT EXISTS (
            SELECT 1
            FROM archivos_modificados m
            WHERE m.id_archivo_original = a.id
        )
    """)).mappings().first()["originales_sin_modificar"]

    # Últimas versiones modificadas (actuales)
    ultimas_modificaciones = db.execute(text("""
        SELECT COUNT(*) AS ultimas_modificaciones
        FROM archivos_modificados
        WHERE id IN (
            SELECT MAX(id)
            FROM archivos_modificados
            GROUP BY id_archivo_original
        )
    """)).mappings().first()["ultimas_modificaciones"]

    archivos_actuales = originales_sin_modificar + ultimas_modificaciones

    return {
        "total_archivos": total_archivos,
        "archivos_originales": archivos_originales,
        "archivos_modificados": archivos_modificados,
        "archivos_actuales": archivos_actuales
    }