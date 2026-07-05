/* ============================================================
   Certificado de beneficio otorgado (solicitudes APROBADAS).
   Genera una plantilla HTML imprimible (Ctrl+P → PDF) en una
   ventana nueva; no toca el backend: usa los datos que ya
   tienen la solicitud y la sesión. El radicado actúa como
   referencia de verificación ante la empresa otorgante.
   ============================================================ */
import { Injectable } from '@angular/core';
import { Solicitud } from '../../shared/oati.types';
import { UsuarioSesion } from './usuario-sesion.service';

@Injectable({ providedIn: 'root' })
export class CertificadoService {

  /** Abre el certificado en una pestaña nueva, listo para imprimir/guardar.
   *  Devuelve false si el navegador bloqueó el popup (mostrar aviso). */
  abrir(solicitud: Solicitud, egresado: UsuarioSesion): boolean {
    const ventana = window.open('', '_blank');
    if (!ventana) return false;
    ventana.document.write(this.plantilla(solicitud, egresado));
    ventana.document.close();
    return true;
  }

  private plantilla(s: Solicitud, u: UsuarioSesion): string {
    const esc = (v?: string) =>
      (v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const hoy = new Date().toLocaleDateString('es-CO', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const logoUd = `${location.origin}/assets/images/logo-ud.png`;
    const logoAcreditacion = `${location.origin}/assets/images/logo-ud-acreditacion.png`;

    // Línea de identidad del egresado: solo los datos que la sesión tenga.
    const identidad = [
      u.documento ? `identificado(a) con documento No. ${esc(u.documento)}` : '',
      u.codigo ? `código institucional ${esc(u.codigo)}` : '',
      u.programa ? `egresado(a) de ${esc(u.programa)}` : '',
    ].filter(Boolean).join(', ');

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Certificado ${esc(s.radicado)}</title>
<style>
  :root {
    --azul: #143873; --rojo-ud: #731514; --dorado: #B08D2E; --tinta: #26303d;
  }
  * { box-sizing: border-box; margin: 0; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: var(--tinta);
    background: #f0f2f5;
    display: flex; flex-direction: column; align-items: center;
    padding: 24px;
  }
  .hoja {
    background: #fff;
    width: 210mm; min-height: 270mm;
    padding: 18mm 20mm;
    border: 1px solid #d8dce2;
    position: relative;
  }
  .marco {
    border: 2px solid var(--azul);
    outline: 1px solid var(--dorado);
    outline-offset: 3px;
    height: 100%; min-height: 234mm;
    padding: 14mm 16mm;
    display: flex; flex-direction: column;
  }
  header { text-align: center; }
  header img { height: 84px; }
  .institucion {
    font-size: 15px; letter-spacing: 1px; margin-top: 10px;
    color: var(--azul); text-transform: uppercase; font-weight: bold;
  }
  .sistema { font-size: 12px; color: #5a6577; margin-top: 2px; }
  .separador {
    width: 60%; margin: 22px auto; border: 0;
    border-top: 1px solid var(--dorado);
  }
  h1 {
    text-align: center; font-size: 26px; letter-spacing: 3px;
    color: var(--rojo-ud); font-weight: normal; text-transform: uppercase;
  }
  .radicado {
    text-align: center; margin-top: 8px; font-size: 13px;
    font-family: 'Courier New', monospace; color: #5a6577;
  }
  .cuerpo {
    margin-top: 34px; font-size: 16px; line-height: 1.9; text-align: justify;
  }
  .cuerpo strong { color: var(--azul); }
  .detalle {
    margin: 34px auto 0; width: 100%; border-collapse: collapse; font-size: 13px;
  }
  .detalle td { padding: 7px 12px; border-bottom: 1px solid #e6e9ee; }
  .detalle td:first-child {
    color: #5a6577; text-transform: uppercase; font-size: 11px;
    letter-spacing: 1px; width: 38%;
  }
  .firmas { margin-top: auto; padding-top: 44px; text-align: center; }
  .firmas .linea {
    width: 62mm; margin: 0 auto 6px; border-top: 1px solid var(--tinta);
  }
  .firmas .quien { font-size: 13px; font-weight: bold; }
  .firmas .rol { font-size: 11px; color: #5a6577; }
  footer {
    margin-top: 26px; display: flex; align-items: center; gap: 14px;
    border-top: 1px solid #e6e9ee; padding-top: 12px;
  }
  footer img { height: 40px; }
  footer p { font-size: 9.5px; color: #7a8494; line-height: 1.5; }
  .acciones { margin: 18px 0 0; }
  .acciones button {
    font-family: inherit; font-size: 14px; padding: 10px 26px;
    background: var(--azul); color: #fff; border: 0; border-radius: 6px;
    cursor: pointer;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .hoja { border: 0; width: auto; min-height: auto; }
    .acciones { display: none; }
    @page { size: A4 portrait; margin: 0; }
  }
</style>
</head>
<body>
  <div class="hoja">
    <div class="marco">
      <header>
        <img src="${logoUd}" alt="Universidad Distrital Francisco José de Caldas">
        <div class="institucion">Universidad Distrital Francisco José de Caldas</div>
        <div class="sistema">Sistema de Gestión Académica · Beneficios para Egresados</div>
      </header>

      <hr class="separador">

      <h1>Certificado de Beneficio Otorgado</h1>
      <div class="radicado">Radicado No. ${esc(s.radicado)}</div>

      <p class="cuerpo">
        Se hace constar que la empresa <strong>${esc(s.empresa)}</strong> otorgó el
        beneficio <strong>«${esc(s.beneficio)}»</strong>${s.categoria ? `, de la categoría
        <strong>${esc(s.categoria)}</strong>,` : ''} a
        <strong>${esc(u.nombre)}</strong>${identidad ? `, ${identidad},` : ''}
        cuya solicitud fue <strong>aprobada</strong> a través del módulo de Beneficios
        para Egresados del Sistema de Gestión Académica de la Universidad Distrital
        Francisco José de Caldas.
      </p>

      <table class="detalle">
        <tr><td>Radicado</td><td>${esc(s.radicado)}</td></tr>
        <tr><td>Beneficio</td><td>${esc(s.beneficio)}</td></tr>
        <tr><td>Empresa otorgante</td><td>${esc(s.empresa)}</td></tr>
        <tr><td>Beneficiario(a)</td><td>${esc(u.nombre)}</td></tr>
        ${u.programa ? `<tr><td>Programa académico</td><td>${esc(u.programa)}</td></tr>` : ''}
        <tr><td>Fecha de solicitud</td><td>${esc(s.fechaSolicitud)}</td></tr>
        <tr><td>Fecha de expedición</td><td>${esc(hoy)}</td></tr>
      </table>

      <div class="firmas">
        <div class="linea"></div>
        <div class="quien">${esc(s.empresa)}</div>
        <div class="rol">Empresa otorgante del beneficio</div>
      </div>

      <footer>
        <img src="${logoAcreditacion}" alt="Acreditación institucional UD">
        <p>
          Documento informativo generado electrónicamente por el módulo de Beneficios
          para Egresados del SGA. No requiere firma autógrafa. Su autenticidad puede
          verificarse ante la empresa otorgante o la Universidad citando el número de
          radicado ${esc(s.radicado)}.
        </p>
      </footer>
    </div>
  </div>

  <div class="acciones">
    <button onclick="window.print()">Imprimir / Guardar como PDF</button>
  </div>
</body>
</html>`;
  }
}
