import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ImplicitAutenticationService } from './core/services/implicit-autentication.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(
    private router: Router,
    private autenticacion: ImplicitAutenticationService,
  ) {
    // Cuando el servicio de auth emite un usuario válido (login exitoso o token existente),
    // navegar al catálogo. El LoginComponent también redirige si ya hay token en ngOnInit,
    // pero esta suscripción captura el retorno desde WSO2.
    this.autenticacion.user$.subscribe((data: any) => {
      const { user, userService } = data;
      if (user && userService) {
        const roles: string[] = userService?.role ?? user?.role ?? [];
        this.router.navigateByUrl(
          roles.includes('empresa') ? 'empresa/dashboard' : 'catalogo'
        );
      }
    });
  }
}
