import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { timer } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';
import { ImplicitAutenticationService } from '../../core/services/implicit-autentication.service';
import { UsuarioSesionService } from '../../core/services/usuario-sesion.service';

type ErrorScenario = 'none' | 'invalid' | 'unverified' | 'inactiveCode' | 'servicio';

interface RegistroCta {
  text: string;
  cta: string;
  url: string;
  logo: string;
}

interface LoginConfig {
  eyebrow: string;
  displayPre: string;
  displayEm: string;
  displayPost: string;
  lede: string;
  stats: { num: string; label: string }[];
  cardEyebrow: string;
  cardTitle: string;
  cardSubtitle: string;
  register: RegistroCta;
}

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    standalone: false
})
export class LoginComponent implements OnInit {
  loading = false;
  errorScenario: ErrorScenario = 'none';
  /** Hay token vigente: en vez de la pantalla de login se muestra un splash
   *  mientras userRol resuelve el perfil y se enruta (evita el "flash" del login). */
  redirigiendo = false;

  /* Login ÚNICO para ambos perfiles (D-5, confirmado OATI 2026-07-01): egresados y
     empresas entran por el MISMO flujo WSO2; la rama se decide DESPUÉS del login
     según el Estado que devuelve userRol. Por eso no hay selector de rol. */
  readonly cfg: LoginConfig = {
    eyebrow: 'Portal de beneficios · 2026-1',
    displayPre: 'Aprovecha tu ',
    displayEm: 'vínculo de por vida',
    displayPost: ' con la UD.',
    lede: 'Egresados: explora el catálogo de beneficios y solicítalos en línea. Empresas aliadas: publica beneficios y gestiona solicitudes en tu bandeja. Todo desde un único portal, con tu cuenta institucional.',
    stats: [
      { num: '247',   label: 'Beneficios activos en catálogo' },
      { num: '47',    label: 'Empresas aliadas activas en el portal' },
      { num: '1 850', label: 'Solicitudes radicadas en 2026' },
    ],
    cardEyebrow: 'Acceso al portal',
    cardTitle: 'Iniciar sesión',
    cardSubtitle: 'Ingresa con tu cuenta institucional de la Universidad Distrital. El portal identifica automáticamente si eres egresado o empresa aliada.',
    // Registro ÚNICO: egresados y empresas se auto-registran en la misma página
    // institucional (WSO2 self-signup, confirmado OATI). La URL definitiva del
    // registro institucional está pendiente de OATI; mientras tanto es placeholder.
    register: {
      text: '¿Aún no tienes cuenta institucional?',
      cta: 'Regístrate aquí',
      url: '/registro',
      logo: 'assets/images/isotipos/sga.svg',
    },
  };

  readonly ERRORS: Record<ErrorScenario, { title: string; body: string } | null> = {
    none: null,
    invalid: {
      title: 'Credenciales inválidas',
      body: 'Verifica tu identificador y contraseña. Si el error persiste, recupera tu contraseña.',
    },
    unverified: {
      title: 'Correo no confirmado',
      body: 'Te enviamos un correo de activación al registrarte. Revisa tu bandeja (y la carpeta de spam) y haz clic en el enlace para activar tu cuenta.',
    },
    inactiveCode: {
      title: 'Egresado no registrado',
      body: 'La cédula no figura registrada en el portal de beneficios. Regístrate primero o comunícate con la Oficina de Egresados.',
    },
    servicio: {
      title: 'No pudimos completar el ingreso',
      body: 'Tu autenticación fue exitosa pero el servicio de identidad institucional no respondió. Intenta de nuevo en unos minutos.',
    },
  };

  get errorObj() { return this.ERRORS[this.errorScenario]; }
  get alertKind() { return this.errorScenario === 'unverified' ? 'warning' : 'danger'; }

  constructor(
    private router: Router,
    private autenticacion: ImplicitAutenticationService,
    private sesionSvc: UsuarioSesionService,
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    this.redirigiendo = true;
    // La rama egresado/empresa se conoce cuando userRol responde (Estado, D-5):
    // esperar la primera sesión resuelta y enrutar cada perfil a su portal.
    // Timeout de gracia: si la sesión no resuelve (userRol caído/504), volver al
    // formulario con aviso en vez de dejar al usuario pegado en el splash.
    const rendirse$ = timer(10000);
    this.sesionSvc.sesion$
      .pipe(filter(s => !!s.email), take(1), takeUntil(rendirse$))
      .subscribe({
        next: s => this.router.navigate([s.esEmpresa ? '/empresa/dashboard' : '/catalogo']),
        complete: () => {
          if (this.redirigiendo && !this.sesionSvc.sesion.email) {
            console.warn('[login] la sesión no resolvió en 10s — se vuelve al formulario');
            this.redirigiendo = false;
            this.errorScenario = 'servicio';
          }
        },
      });
  }

  login(): void {
    this.loading = true;
    // Forzar un flujo limpio: cualquier residuo de sesiones anteriores en
    // localhost:4200 (sga_cliente, pruebas, tokens truncados) hace que
    // login(false) retorne sin redirigir. Si WSO2 aún tiene sesión SSO
    // activa, no volverá a pedir credenciales.
    this.autenticacion.clearStorage();
    this.autenticacion.login(false);
  }
}
