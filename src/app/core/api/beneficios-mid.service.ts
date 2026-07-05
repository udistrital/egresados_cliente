/* ============================================================
   Cliente HTTP del MID de Beneficios Egresados.
   Cada método espeja una ruta de sga_mid_beneficios_egresados
   (routers/router.go). Devuelve el Body ya desenvuelto del
   envelope OATI { Status, Success, Body, Message }.
   ============================================================ */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ApiResponse, ArchivoDocumentoDto, BandejaItemDto, BeneficioDto, ComprobanteSolicitudDto,
  DocumentoRequeridoDto, DocumentoSolicitudDto, HistorialDto, MensajeDto, ParametroDto,
  PerfilEmpresaDto, ProvisionEgresadoDto, ProvisionEmpresaDto, ResumenDto, SolicitudDto,
} from './api.types';

@Injectable({ providedIn: 'root' })
export class BeneficiosMidService {
  private readonly base = environment.BENEFICIOS_MID;

  constructor(private http: HttpClient) {}

  /** Desenvuelve el envelope OATI; falla si Success=false. */
  private body<T>(obs: Observable<ApiResponse<T>>): Observable<T> {
    return obs.pipe(
      map(res => {
        if (!res.Success) throw new Error(res.Message ?? 'Error del servicio');
        return res.Body as T;
      }),
    );
  }

  /* ── Catálogo (egresado) ── */

  /** GET /v1/beneficios — RF-002 catálogo (PUBLICADO, vigente, con cupos) */
  getCatalogo(opts: { page?: number; limit?: number; categoriaId?: number; q?: string } = {}):
    Observable<BeneficioDto[]> {
    let params = new HttpParams();
    if (opts.page) params = params.set('page', opts.page);
    if (opts.limit) params = params.set('limit', opts.limit);
    if (opts.categoriaId) params = params.set('categoria_id', opts.categoriaId);
    if (opts.q) params = params.set('q', opts.q);
    return this.body(this.http.get<ApiResponse<BeneficioDto[]>>(`${this.base}/beneficios`, { params }));
  }

  /** GET /v1/beneficios/:id — RF-003 detalle */
  getBeneficio(id: number): Observable<BeneficioDto> {
    return this.body(this.http.get<ApiResponse<BeneficioDto>>(`${this.base}/beneficios/${id}`));
  }

  /* ── Identidad local (JIT provisioning) ── */

  /**
   * POST /v1/egresados/provision — alta idempotente de usuario/egresado locales.
   * SIN body: el MID deriva la identidad del token (OIDC userinfo → userRol).
   */
  provisionarEgresado(): Observable<ProvisionEgresadoDto> {
    return this.body(this.http.post<ApiResponse<ProvisionEgresadoDto>>(
      `${this.base}/egresados/provision`, {}));
  }

  /**
   * POST /v1/empresas/provision — JIT de empresa (C-2b/c): resuelve los proveedores
   * del correo del token en Ágora y da de alta usuario/empresa/usuario_empresa.
   * SIN body: el MID deriva la identidad del token vía OIDC userinfo.
   */
  provisionarEmpresa(): Observable<ProvisionEmpresaDto> {
    return this.body(this.http.post<ApiResponse<ProvisionEmpresaDto>>(
      `${this.base}/empresas/provision`, {}));
  }

  /* ── Solicitudes (egresado) ── */

  /** POST /v1/solicitudes — RF-003. El MID genera el radicado (BNF-YYYY-NNNNNN). */
  crearSolicitud(body: {
    egresado_id: number; beneficio_id: number;
    datos_complementarios?: string; usuario_id?: number;
  }): Observable<{ id: number }> {
    return this.body(this.http.post<ApiResponse<{ id: number }>>(`${this.base}/solicitudes`, body));
  }

  /** GET /v1/solicitudes/egresado/:id — RF-008 mis solicitudes con estado vigente (C-4b) */
  getSolicitudesEgresado(egresadoId: number): Observable<SolicitudDto[]> {
    return this.body(this.http.get<ApiResponse<SolicitudDto[]>>(
      `${this.base}/solicitudes/egresado/${egresadoId}`));
  }

  /** PUT /v1/solicitudes/:id/cancelar — RF-008 (RN-005: solo PENDIENTE/REQUIERE_INFO) */
  cancelarSolicitud(id: number, usuarioId?: number): Observable<unknown> {
    return this.body(this.http.put<ApiResponse<unknown>>(
      `${this.base}/solicitudes/${id}/cancelar`, { usuario_id: usuarioId }));
  }

  /** GET /v1/solicitudes/egresado/:id/resumen — RF-013 */
  getResumenEgresado(egresadoId: number): Observable<ResumenDto> {
    return this.body(this.http.get<ApiResponse<ResumenDto>>(
      `${this.base}/solicitudes/egresado/${egresadoId}/resumen`));
  }

  /* ── Mensajes (hilo REQUIERE_INFO, ambos roles) ── */

  /** GET /v1/solicitudes/:id/mensajes — RF-007 */
  getMensajes(solicitudId: number): Observable<MensajeDto[]> {
    return this.body(this.http.get<ApiResponse<MensajeDto[]>>(
      `${this.base}/solicitudes/${solicitudId}/mensajes`));
  }

  /** POST /v1/solicitudes/:id/mensajes — RF-007 (solo en REQUIERE_INFO) */
  enviarMensaje(solicitudId: number, usuarioId: number, mensaje: string): Observable<unknown> {
    return this.body(this.http.post<ApiResponse<unknown>>(
      `${this.base}/solicitudes/${solicitudId}/mensajes`,
      { usuario_id: usuarioId, mensaje }));
  }

  /* ── Bandeja y acciones de empresa ── */

  /** GET /v1/empresas/:id — perfil público de la empresa (detalle de beneficio) */
  getPerfilEmpresa(id: number): Observable<PerfilEmpresaDto> {
    return this.body(this.http.get<ApiResponse<PerfilEmpresaDto>>(`${this.base}/empresas/${id}`));
  }

  /** GET /v1/empresas/:id/solicitudes — RF-006 bandeja (datos mínimos, RNF-002b) */
  getBandejaEmpresa(empresaId: number): Observable<BandejaItemDto[]> {
    return this.body(this.http.get<ApiResponse<BandejaItemDto[]>>(
      `${this.base}/empresas/${empresaId}/solicitudes`));
  }

  /** PUT /v1/solicitudes/:id/responder — RF-007 (RN-003/004/005).
   *  `comprobante` es OPCIONAL y solo válido junto a estado_nuevo=APROBADA (el MID lo rechaza si no). */
  responderSolicitud(id: number, body: {
    estado_nuevo: 'APROBADA' | 'RECHAZADA' | 'REQUIERE_INFO';
    justificacion?: string; usuario_id?: number;
    comprobante?: { nombre_archivo: string; file: string };
  }): Observable<unknown> {
    return this.body(this.http.put<ApiResponse<unknown>>(
      `${this.base}/solicitudes/${id}/responder`, body));
  }

  /** GET /v1/solicitudes/:id/comprobante — comprobante OPCIONAL adjuntado por la empresa al aprobar */
  getComprobanteSolicitud(id: number): Observable<ComprobanteSolicitudDto> {
    return this.body(this.http.get<ApiResponse<ComprobanteSolicitudDto>>(
      `${this.base}/solicitudes/${id}/comprobante`));
  }

  /** POST /v1/empresas — RF-004 registro/JIT de empresa */
  registrarEmpresa(body: Record<string, unknown>): Observable<unknown> {
    return this.body(this.http.post<ApiResponse<unknown>>(`${this.base}/empresas`, body));
  }

  /** GET /v1/empresas/:id/beneficios — gestión: TODOS los beneficios del dueño */
  getBeneficiosEmpresa(empresaId: number): Observable<BeneficioDto[]> {
    return this.body(this.http.get<ApiResponse<BeneficioDto[]>>(
      `${this.base}/empresas/${empresaId}/beneficios`));
  }

  /** POST /v1/empresas/:id/beneficios — RF-005 publicar (empresa APROBADA, RN-008b) */
  publicarBeneficio(empresaId: number, body: Record<string, unknown>): Observable<BeneficioDto> {
    return this.body(this.http.post<ApiResponse<BeneficioDto>>(
      `${this.base}/empresas/${empresaId}/beneficios`, body));
  }

  /** PUT /v1/beneficios/:id — RF-005 editar */
  editarBeneficio(id: number, body: Record<string, unknown>): Observable<unknown> {
    return this.body(this.http.put<ApiResponse<unknown>>(`${this.base}/beneficios/${id}`, body));
  }

  /* ── Documentos requeridos / subidos (gestor documental, vía MID) ── */

  /** GET /v1/beneficios/:id/documentos-requeridos — documentos que exige la empresa */
  getDocumentosRequeridos(beneficioId: number): Observable<DocumentoRequeridoDto[]> {
    return this.body(this.http.get<ApiResponse<DocumentoRequeridoDto[]>>(
      `${this.base}/beneficios/${beneficioId}/documentos-requeridos`));
  }

  /** GET /v1/solicitudes/:id/documentos — requeridos vs. subidos (egresado y empresa) */
  getDocumentosSolicitud(solicitudId: number): Observable<DocumentoSolicitudDto[]> {
    return this.body(this.http.get<ApiResponse<DocumentoSolicitudDto[]>>(
      `${this.base}/solicitudes/${solicitudId}/documentos`));
  }

  /** POST /v1/solicitudes/:id/documentos — el egresado sube/reemplaza un PDF (solo solicitud en curso) */
  subirDocumentoSolicitud(solicitudId: number, body: {
    documento_requerido_id: number; nombre_archivo: string; file: string;
  }): Observable<unknown> {
    return this.body(this.http.post<ApiResponse<unknown>>(
      `${this.base}/solicitudes/${solicitudId}/documentos`, body));
  }

  /** DELETE /v1/solicitudes/:id/documentos/:doc_id — el egresado quita un documento */
  eliminarDocumentoSolicitud(solicitudId: number, docId: number): Observable<unknown> {
    return this.body(this.http.delete<ApiResponse<unknown>>(
      `${this.base}/solicitudes/${solicitudId}/documentos/${docId}`));
  }

  /** PUT /v1/documentos/:doc_id/comentario — la empresa comenta un documento (campo único) */
  comentarDocumento(docId: number, comentario: string): Observable<unknown> {
    return this.body(this.http.put<ApiResponse<unknown>>(
      `${this.base}/documentos/${docId}/comentario`, { comentario }));
  }

  /** GET /v1/documentos/:doc_id/archivo — ver/descargar (proxy de solo lectura al gestor documental) */
  getArchivoDocumento(docId: number): Observable<ArchivoDocumentoDto> {
    return this.body(this.http.get<ApiResponse<ArchivoDocumentoDto>>(
      `${this.base}/documentos/${docId}/archivo`));
  }

  /* ── Catálogos de parámetros (read-only) ── */

  /** GET /v1/categorias-beneficio (parámetros tipo CATEGORIA_BENEFICIO, C-1) */
  getCategorias(): Observable<ParametroDto[]> {
    return this.body(this.http.get<ApiResponse<ParametroDto[]>>(`${this.base}/categorias-beneficio`));
  }

  /** GET /v1/sectores-economicos (parámetros tipo SECTOR_ECONOMICO, C-1) */
  getSectores(): Observable<ParametroDto[]> {
    return this.body(this.http.get<ApiResponse<ParametroDto[]>>(`${this.base}/sectores-economicos`));
  }

  /* ── Pendiente backend ── */

  /**
   * Bitácora de estados de una solicitud (RN-004). El MID aún NO expone
   * GET /v1/solicitudes/:id/historial — agregarla cuando se retome el backend
   * (el CRUD ya tiene GET /v1/historial_solicitud/solicitud/:id).
   */
  getHistorial(solicitudId: number): Observable<HistorialDto[]> {
    return this.body(this.http.get<ApiResponse<HistorialDto[]>>(
      `${this.base}/solicitudes/${solicitudId}/historial`));
  }
}

export function noConfigurado(): Observable<never> {
  return throwError(() => new Error(
    'BENEFICIOS_MID no está configurado en environment — entrega pendiente de OATI'));
}
