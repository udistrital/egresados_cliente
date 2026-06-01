import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ImplicitAutenticationService } from '../../core/services/implicit-autentication.service';

type Rol = 'egresado' | 'empresa';
type ErrorScenario = 'none' | 'invalid' | 'unverified' | 'inactiveCode';

interface RolConfig {
  icon: string;
  label: string;
  eyebrow: string;
  displayPre: string;
  displayEm: string;
  displayPost: string;
  lede: string;
  stats: { num: string; label: string }[];
  cardEyebrow: string;
  cardTitle: string;
  cardSubtitle: string;
  idField: { label: string; hint: string | null; placeholder: string };
  register: { text: string; cta: string; url: string; logo: string };
  forgot: { text: string; url: string };
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  rol: Rol = 'egresado';
  identifier = '';
  password = '';
  showPassword = false;
  remember = true;
  loading = false;
  errorScenario: ErrorScenario = 'none';
  swapping = false;

  readonly ROLES: Record<Rol, RolConfig> = {
    egresado: {
      icon: 'school',
      label: 'Egresado',
      eyebrow: 'Catálogo de beneficios · 2026-1',
      displayPre: 'Aprovecha tu ',
      displayEm: 'vínculo de por vida',
      displayPost: ' con la UD.',
      lede: 'Accede al catálogo de beneficios que las empresas aliadas ofrecen a la red de egresados de la Universidad Distrital. Solicítalos en línea y haz seguimiento desde tu portal personal.',
      stats: [
        { num: '247',   label: 'Beneficios activos en catálogo' },
        { num: '12',    label: 'Categorías de beneficios' },
        { num: '1 850', label: 'Solicitudes radicadas en 2026' },
      ],
      cardEyebrow: 'Acceso egresado',
      cardTitle: 'Iniciar sesión',
      cardSubtitle: 'Usa tu cuenta institucional de la Universidad Distrital para acceder al portal de beneficios.',
      idField: { label: 'Número de cédula', hint: null, placeholder: '1 026 287 543' },
      register: {
        text: '¿Eres egresado UD y aún no tienes cuenta?',
        cta: 'Regístrate aquí',
        url: '/registro/egresado',
        logo: 'assets/images/isotipos/sga.svg',
      },
      forgot: { text: 'Olvidé mi contraseña', url: '#recuperar' },
    },
    empresa: {
      icon: 'domain',
      label: 'Empresa aliada',
      eyebrow: 'Empresas aliadas · 2026-1',
      displayPre: 'Conecta con la ',
      displayEm: 'comunidad de egresados',
      displayPost: ' UD.',
      lede: 'Publica beneficios dirigidos a egresados, recibe y gestiona solicitudes en tu bandeja, y registra redenciones — todo desde un único portal.',
      stats: [
        { num: '47',    label: 'Empresas aliadas activas en el portal' },
        { num: '247',   label: 'Beneficios publicados este periodo' },
        { num: '1 850', label: 'Solicitudes gestionadas en 2026' },
      ],
      cardEyebrow: 'Acceso empresa',
      cardTitle: 'Iniciar sesión',
      cardSubtitle: 'Usa la cuenta institucional registrada para acceder al portal de gestión de beneficios.',
      idField: { label: 'NIT o correo corporativo', hint: null, placeholder: '900.123.456-7 · talento@empresa.com' },
      register: {
        text: '¿Tu empresa aún no es aliada UD?',
        cta: 'Registra tu empresa',
        url: '/registro/empresa',
        logo: 'assets/images/isotipos/agora.svg',
      },
      forgot: { text: 'Olvidé mi contraseña', url: '#recuperar-empresa' },
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
  };

  get cfg(): RolConfig { return this.ROLES[this.rol]; }
  get errorObj() { return this.ERRORS[this.errorScenario]; }
  get alertKind() { return this.errorScenario === 'unverified' ? 'warning' : 'danger'; }
  get passwordType() { return this.showPassword ? 'text' : 'password'; }

  constructor(
    private router: Router,
    private autenticacion: ImplicitAutenticationService,
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('access_token');
    if (token) { this.router.navigate(['/catalogo']); }
  }

  login(): void {
    this.loading = true;
    this.autenticacion.login(false);
  }

  setRol(nuevoRol: Rol): void {
    if (this.rol === nuevoRol) return;
    this.swapping = true;
    setTimeout(() => {
      this.rol = nuevoRol;
      this.identifier = '';
      this.password = '';
      this.errorScenario = 'none';
      setTimeout(() => { this.swapping = false; }, 20);
    }, 160);
  }

  togglePassword(): void { this.showPassword = !this.showPassword; }

  onSubmit(): void {
    if (this.loading) return;
    this.loading = true;
    // En integración real: llamar a ImplicitAutenticationService.login()
    setTimeout(() => { this.loading = false; }, 1600);
  }
}
