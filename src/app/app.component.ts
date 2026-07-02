import { Component } from '@angular/core';
import { ImplicitAutenticationService } from './core/services/implicit-autentication.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  // CRÍTICO: inyectar el servicio de autenticación AQUÍ, aunque no se use.
  // Los servicios de Angular son perezosos: si nadie lo pide hasta que carga el
  // LoginComponent, el router ya procesó la navegación inicial y REESCRIBIÓ el
  // hash del callback OAuth (#access_token=...&id_token=... → #/login), y los
  // tokens se pierden en silencio ("me autentico y vuelvo al login"). El
  // constructor del root component corre ANTES de la navegación inicial, así
  // que instanciarlo aquí garantiza que init() parsee el hash a tiempo.
  //
  // OJO: NO suscribirse aquí a user$ para navegar — una suscripción así pisaba
  // la ruta actual en cada refresh (el usuario cacheado se re-emite al arrancar)
  // y mandaba a todo el mundo al catálogo. El enrutamiento post-login vive en
  // LoginComponent y la protección por perfil en los guards.
  constructor(private autenticacion: ImplicitAutenticationService) {}
}
