/* ============================================================
   Registro de Empresa Aliada · OATI Beneficios UD
   RF-004: registro queda en estado "En revisión"
   ============================================================ */
import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface FormRegistro {
  nombre: string;
  nit: string;
  sector: string;
  sitioWeb: string;
  representante: string;
  email: string;
  telefono: string;
  descripcion: string;
  aceptaTerminos: boolean;
}

type Pantalla = 'form' | 'enviado';

@Component({
    selector: 'app-empresa-registro',
    templateUrl: './empresa-registro.component.html',
    styleUrls: ['./empresa-registro.component.scss'],
    standalone: false
})
export class EmpresaRegistroComponent {

  pantalla: Pantalla = 'form';

  readonly SECTORES = [
    'Tecnología', 'Educación', 'Salud', 'Finanzas', 'Servicios',
    'Manufactura', 'Comercio', 'Entretenimiento y Cultura', 'Otro',
  ];

  form: FormRegistro = {
    nombre: '',
    nit: '',
    sector: '',
    sitioWeb: '',
    representante: '',
    email: '',
    telefono: '',
    descripcion: '',
    aceptaTerminos: false,
  };

  constructor(private router: Router) {}

  get formValido(): boolean {
    const f = this.form;
    return !!(
      f.nombre.trim() &&
      f.nit.trim() &&
      f.sector &&
      f.representante.trim() &&
      f.email.trim() &&
      f.descripcion.trim() &&
      f.aceptaTerminos
    );
  }

  enviar(): void {
    if (!this.formValido) return;
    /* En integración real: llamar al servicio MID de registro de empresa */
    this.pantalla = 'enviado';
  }

  irAlPortal(): void {
    this.router.navigate(['/empresa/dashboard']);
  }
}
