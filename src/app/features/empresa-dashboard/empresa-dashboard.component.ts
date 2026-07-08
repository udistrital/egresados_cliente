/* ============================================================
   Dashboard de Empresa · OATI Beneficios UD
   RF-006: bandeja de solicitudes recibidas
   RF-007: respuesta a solicitud (Aprobar / Rechazar / Info)
   ============================================================ */
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  DocumentoSolicitudItem, Empresa, SolicitudRecibida, EstadoSolicitud, HistorialEntrada,
  MensajeHilo, ESTADOS, EMPRESA_VACIA,
} from '../../shared/oati.types';
import { ImplicitAutenticationService } from '../../core/services/implicit-autentication.service';
import { AccionRespuesta, EmpresaService } from '../../core/services/empresa.service';
import { EmpresaVinculada } from '../../core/services/usuario-sesion.service';

type FiltroEmpresa = 'todas' | 'pendientes' | 'en_revision' | 'aprobadas' | 'rechazadas';

interface RespuestaPanel {
  radicado: string;
  accion: AccionRespuesta;
  nota: string;
  /** Comprobante OPCIONAL (solo tiene efecto si accion === 'aprobar') */
  archivo?: { nombreArchivo: string; base64: string };
}

@Component({
  selector: 'app-empresa-dashboard',
  templateUrl: './empresa-dashboard.component.html',
  styleUrls: ['./empresa-dashboard.component.scss'],
})
export class EmpresaDashboardComponent implements OnInit, OnDestroy {

  empresa: Empresa = EMPRESA_VACIA;
  /** Empresas del usuario (selector multiempresa; el bloque solo aparece si hay >1) */
  empresas: EmpresaVinculada[] = [];
  solicitudes: SolicitudRecibida[] = [];
  /** true hasta la primera bandeja real (JIT + fetch); evita mostrar "sin
   *  solicitudes" mientras el backend aún no ha respondido. */
  cargandoBandeja = true;

  menuOpen = false;
  filtro: FiltroEmpresa = 'todas';
  query = '';
  /** Pre-filtro por beneficio (deep-link ?beneficio= desde "Mis beneficios") */
  beneficioFiltro: string | null = null;

  /** Radicado de la fila con el panel de respuesta abierto */
  respuestaPanel: RespuestaPanel | null = null;

  /* ── Drawer de detalle ─────────────────────────────────── */
  /** Solicitud abierta en el drawer (null = cerrado) */
  drawer: SolicitudRecibida | null = null;
  drawerAccion: AccionRespuesta | null = null;
  drawerNota = '';
  drawerError: string | null = null;
  /** Comprobante OPCIONAL (solo tiene efecto si drawerAccion === 'aprobar') */
  drawerArchivoComprobante: { nombreArchivo: string; base64: string } | null = null;
  /** Error de validación del archivo (PDF), compartido entre panel inline y drawer */
  errorComprobante: string | null = null;
  nuevoMensaje = '';
  /** Bitácora y mensajes del drawer (se cargan al abrirlo) */
  private historialCache: HistorialEntrada[] = [];
  private mensajesCache: MensajeHilo[] = [];
  /** Documentos del egresado (se cargan al abrirlo) + borrador de comentario por documento */
  documentosCache: DocumentoSolicitudItem[] = [];
  comentarioBorrador: Record<number, string> = {};
  guardandoComentarioId: number | null = null;


  readonly FILTROS: { value: FiltroEmpresa; label: string; icon: string }[] = [
    { value: 'todas',       label: 'Todas',        icon: 'list' },
    { value: 'pendientes',  label: 'Pendientes',   icon: 'hourglass_top' },
    { value: 'en_revision', label: 'En revisión',  icon: 'manage_search' },
    { value: 'aprobadas',   label: 'Aprobadas',    icon: 'check_circle' },
    { value: 'rechazadas',  label: 'Rechazadas',   icon: 'cancel' },
  ];

  readonly ESTADOS = ESTADOS;

  private destroy$ = new Subject<void>();

  constructor(
    private autenticacion: ImplicitAutenticationService,
    private empresaSvc: EmpresaService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.beneficioFiltro = this.route.snapshot.queryParamMap.get('beneficio');

    this.empresaSvc.getEmpresa()
      .pipe(takeUntil(this.destroy$))
      .subscribe(empresa => (this.empresa = empresa));

    this.empresaSvc.getEmpresasVinculadas()
      .pipe(takeUntil(this.destroy$))
      .subscribe(empresas => (this.empresas = empresas));

    this.empresaSvc.getBandeja()
      .pipe(takeUntil(this.destroy$))
      .subscribe(solicitudes => {
        this.solicitudes = solicitudes;
        this.cargandoBandeja = false;
      });

    // Tope de gracia: si el JIT de empresa falla (correo sin proveedor en Ágora,
    // servicio caído…), getBandeja nunca emite — soltar el loader y dejar que el
    // estado vacío cuente la verdad.
    timer(15000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => (this.cargandoBandeja = false));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ── Stats ─────────────────────────────────────────────── */
  get stats() {
    const s = this.solicitudes;
    return {
      pendientes: s.filter(x => x.estado === 'pendiente').length,
      revision:   s.filter(x => x.estado === 'revision').length,
      info:       s.filter(x => x.estado === 'info').length,
      aprobadas:  s.filter(x => x.estado === 'aprobada').length,
      rechazadas: s.filter(x => x.estado === 'rechazada').length,
      total:      s.length,
      activas:    s.filter(x => ESTADOS[x.estado]?.isActive).length,
    };
  }

  /* ── Lista filtrada ─────────────────────────────────────── */
  get solicitudesFiltradas(): SolicitudRecibida[] {
    let arr = this.solicitudes;
    if (this.beneficioFiltro) arr = arr.filter(x => x.beneficioId === this.beneficioFiltro);
    if (this.filtro === 'pendientes')  arr = arr.filter(x => x.estado === 'pendiente');
    if (this.filtro === 'en_revision') arr = arr.filter(x => x.estado === 'revision' || x.estado === 'info');
    if (this.filtro === 'aprobadas')   arr = arr.filter(x => x.estado === 'aprobada');
    if (this.filtro === 'rechazadas')  arr = arr.filter(x => x.estado === 'rechazada');
    if (this.query.trim()) {
      const q = this.query.toLowerCase();
      arr = arr.filter(x =>
        x.egresado.toLowerCase().includes(q) ||
        x.beneficio.toLowerCase().includes(q) ||
        x.radicado.toLowerCase().includes(q) ||
        x.programa.toLowerCase().includes(q),
      );
    }
    return arr;
  }

  /** Título del beneficio pre-filtrado (se toma de cualquier solicitud suya). */
  get beneficioFiltroTitulo(): string {
    const s = this.solicitudes.find(x => x.beneficioId === this.beneficioFiltro);
    return s?.beneficio ?? `beneficio #${this.beneficioFiltro}`;
  }

  quitarFiltroBeneficio(): void {
    this.beneficioFiltro = null;
    // Limpiar el query param para que un refresh no lo reaplique
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  count(f: FiltroEmpresa): number {
    if (f === 'todas')       return this.solicitudes.length;
    if (f === 'pendientes')  return this.stats.pendientes;
    if (f === 'en_revision') return this.stats.revision + this.stats.info;
    if (f === 'aprobadas')   return this.stats.aprobadas;
    if (f === 'rechazadas')  return this.stats.rechazadas;
    return 0;
  }

  /* ── Acciones por solicitud ────────────────────────────── */
  puedeResponder(s: SolicitudRecibida): boolean {
    return s.estado === 'pendiente' || s.estado === 'revision' || s.estado === 'info';
  }

  abrirRespuesta(radicado: string, accion: AccionRespuesta): void {
    if (this.respuestaPanel?.radicado === radicado && this.respuestaPanel.accion === accion) {
      this.respuestaPanel = null;
      return;
    }
    this.respuestaPanel = { radicado, accion, nota: '' };
    this.errorComprobante = null;
  }

  confirmarRespuesta(): void {
    if (!this.respuestaPanel) return;
    const { radicado, accion, nota, archivo } = this.respuestaPanel;
    this.aplicarRespuesta(radicado, accion, nota, archivo);
    this.respuestaPanel = null;
  }

  cancelarRespuesta(): void { this.respuestaPanel = null; }

  /**
   * Aplica la respuesta vía fachada: PUT mid /v1/solicitudes/:id/responder
   * (RN-003/004/005 las valida el MID; en demo se replican en EmpresaService).
   * `comprobante` es OPCIONAL y el MID solo lo acepta junto a accion==='aprobar'.
   */
  private aplicarRespuesta(radicado: string, accion: AccionRespuesta, nota: string,
    comprobante?: { nombreArchivo: string; base64: string }): void {
    const solicitud = this.solicitudes.find(s => s.radicado === radicado);
    if (!solicitud) return;

    this.empresaSvc.responder(solicitud, accion, nota,
      comprobante ? { nombreArchivo: comprobante.nombreArchivo, fileBase64: comprobante.base64 } : undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: solicitudes => {
          this.solicitudes = solicitudes;
          // Si el drawer muestra esta solicitud, refrescar la referencia y su detalle
          if (this.drawer?.radicado === radicado) {
            this.drawer = this.solicitudes.find(s => s.radicado === radicado) ?? null;
            if (this.drawer) this.cargarDetalleDrawer(this.drawer);
          }
        },
        error: err => {
          this.drawerError = err?.error?.Message ?? err?.message ??
            'No se pudo aplicar la respuesta. Intenta de nuevo.';
        },
      });
  }

  /* ── Comprobante opcional al aprobar (panel inline + drawer) ───── */

  private leerComprobante(event: Event, onOk: (archivo: { nombreArchivo: string; base64: string }) => void): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const esPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!esPdf) {
      this.errorComprobante = 'Solo se permiten archivos PDF.';
      return;
    }
    this.errorComprobante = null;

    const reader = new FileReader();
    reader.onload = () => {
      onOk({ nombreArchivo: file.name, base64: String(reader.result).split(',')[1] });
    };
    reader.readAsDataURL(file);
  }

  onArchivoComprobantePanel(event: Event): void {
    if (!this.respuestaPanel) return;
    this.leerComprobante(event, archivo => { this.respuestaPanel!.archivo = archivo; });
  }

  quitarArchivoComprobantePanel(): void {
    if (this.respuestaPanel) this.respuestaPanel.archivo = undefined;
  }

  onArchivoComprobanteDrawer(event: Event): void {
    this.leerComprobante(event, archivo => { this.drawerArchivoComprobante = archivo; });
  }

  quitarArchivoComprobanteDrawer(): void {
    this.drawerArchivoComprobante = null;
  }

  /* ── Drawer de detalle ─────────────────────────────────── */

  abrirDetalle(s: SolicitudRecibida): void {
    this.drawer = s;
    this.drawerAccion = null;
    this.drawerNota = '';
    this.drawerError = null;
    this.drawerArchivoComprobante = null;
    this.errorComprobante = null;
    this.nuevoMensaje = '';
    this.respuestaPanel = null;
    this.cargarDetalleDrawer(s);
  }

  private cargarDetalleDrawer(s: SolicitudRecibida): void {
    this.historialCache = [];
    this.mensajesCache = [];
    this.documentosCache = [];
    this.comentarioBorrador = {};
    this.empresaSvc.getHistorial(s)
      .pipe(takeUntil(this.destroy$))
      .subscribe(historial => (this.historialCache = historial));
    this.empresaSvc.getMensajes(s)
      .pipe(takeUntil(this.destroy$))
      .subscribe(mensajes => (this.mensajesCache = mensajes));
    this.empresaSvc.getDocumentos(s)
      .pipe(takeUntil(this.destroy$))
      .subscribe(documentos => {
        this.documentosCache = documentos;
        for (const d of documentos) {
          if (d.documentoSolicitudId != null) {
            this.comentarioBorrador[d.documentoSolicitudId] = d.comentarioEmpresa ?? '';
          }
        }
      });
  }

  cerrarDetalle(): void {
    this.drawer = null;
    this.drawerAccion = null;
    this.drawerError = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.drawer) this.cerrarDetalle();
  }

  get historialDrawer(): HistorialEntrada[] {
    return this.drawer ? this.historialCache : [];
  }

  get mensajesDrawer(): MensajeHilo[] {
    return this.drawer ? this.mensajesCache : [];
  }

  get documentosDrawer(): DocumentoSolicitudItem[] {
    return this.drawer ? this.documentosCache : [];
  }

  /* ── Documentos del egresado (ver + comentar) ──────────────── */

  verDocumento(item: DocumentoSolicitudItem): void {
    if (item.documentoSolicitudId == null) return;
    this.empresaSvc.getArchivoDocumento(item.documentoSolicitudId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ file }) => {
        const bytes = atob(file);
        const array = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
        const blob = new Blob([array], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      });
  }

  guardarComentario(item: DocumentoSolicitudItem): void {
    if (!this.drawer || item.documentoSolicitudId == null) return;
    const texto = (this.comentarioBorrador[item.documentoSolicitudId] ?? '').trim();
    if (!texto) return;
    this.guardandoComentarioId = item.documentoSolicitudId;
    this.empresaSvc.comentarDocumento(this.drawer, item.documentoSolicitudId, texto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: documentos => {
          this.documentosCache = documentos;
          this.guardandoComentarioId = null;
        },
        error: () => { this.guardandoComentarioId = null; },
      });
  }

  seleccionarAccion(accion: AccionRespuesta): void {
    this.drawerAccion = this.drawerAccion === accion ? null : accion;
    this.drawerError = null;
    this.drawerArchivoComprobante = null;
    this.errorComprobante = null;
  }

  confirmarDesdeDrawer(): void {
    if (!this.drawer || !this.drawerAccion) return;
    const nota = this.drawerNota.trim();

    // RN-003 (ajustada): la justificación del rechazo es opcional; si va vacía,
    // el MID registra el texto institucional "rechazada sin perjuicio".
    if (this.drawerAccion === 'info' && !nota) {
      this.drawerError = 'Describe qué información necesitas del egresado.';
      return;
    }

    this.aplicarRespuesta(this.drawer.radicado, this.drawerAccion, nota, this.drawerArchivoComprobante ?? undefined);
    this.drawerAccion = null;
    this.drawerNota = '';
    this.drawerError = null;
    this.drawerArchivoComprobante = null;
  }

  /** El hilo vive mientras la conversación está abierta: REQUIERE_INFO (el
   *  egresado debe responder) o EN_REVISION (nos respondió) — regla del MID. */
  get puedeMensajear(): boolean {
    return this.drawer?.estado === 'info' || this.drawer?.estado === 'revision';
  }

  enviarMensaje(): void {
    if (!this.drawer || !this.puedeMensajear) return;
    const texto = this.nuevoMensaje.trim();
    if (!texto) return;

    this.empresaSvc.enviarMensaje(this.drawer, this.empresa.nombre, texto)
      .pipe(takeUntil(this.destroy$))
      .subscribe(mensajes => {
        this.mensajesCache = mensajes;
        this.nuevoMensaje = '';
      });
  }

  /* ── Badge helpers ─────────────────────────────────────── */
  badgeCls(estado: EstadoSolicitud): string {
    return `estado-badge estado-badge--${ESTADOS[estado]?.cls ?? 'pendiente'}`;
  }
  badgeIcon(estado: EstadoSolicitud): string {
    return ESTADOS[estado]?.icon ?? 'hourglass_empty';
  }
  badgeLabel(estado: EstadoSolicitud): string {
    return ESTADOS[estado]?.label ?? 'Pendiente';
  }

  /* ── Menu / sesión ─────────────────────────────────────── */
  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu(): void  { setTimeout(() => { this.menuOpen = false; }, 150); }
  logout(): void     { this.autenticacion.logout('logout-manual'); }

  /** Selector multiempresa: la bandeja recarga sola (fachada reactiva a sesion$). */
  esEmpresaActiva(e: EmpresaVinculada): boolean {
    return this.empresaSvc.empresaActivaId === e.empresaId;
  }
  cambiarEmpresa(e: EmpresaVinculada): void {
    this.empresaSvc.cambiarEmpresa(e.empresaId);
    this.menuOpen = false;
    // Estado de trabajo de la empresa anterior: no debe sobrevivir al cambio.
    this.drawer = null;
    this.respuestaPanel = null;
    this.cargandoBandeja = true;
  }

  setFiltro(f: FiltroEmpresa): void {
    this.filtro = f;
    this.respuestaPanel = null;
  }
}
