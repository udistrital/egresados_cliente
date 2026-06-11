import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { rolEgresadoGuard, rolEmpresaGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CatalogoComponent } from './features/catalogo/catalogo.component';
import { BeneficioDetalleComponent } from './features/beneficio-detalle/beneficio-detalle.component';
import { SolicitudesComponent } from './features/solicitudes/solicitudes.component';
import { EmpresaRegistroComponent } from './features/empresa-registro/empresa-registro.component';
import { EmpresaDashboardComponent } from './features/empresa-dashboard/empresa-dashboard.component';
import { EmpresaBeneficiosComponent } from './features/empresa-beneficios/empresa-beneficios.component';

const routes: Routes = [
  /* Egresado */
  { path: 'login',           component: LoginComponent },
  { path: 'dashboard',       component: DashboardComponent,       canActivate: [rolEgresadoGuard] },
  { path: 'catalogo',        component: CatalogoComponent,        canActivate: [rolEgresadoGuard] },
  { path: 'beneficios/:id',  component: BeneficioDetalleComponent, canActivate: [rolEgresadoGuard] },
  { path: 'solicitudes',     component: SolicitudesComponent,     canActivate: [rolEgresadoGuard] },

  /* Empresa (el registro queda libre: es el punto de entrada de una empresa nueva) */
  { path: 'empresa/registro',   component: EmpresaRegistroComponent },
  { path: 'empresa/dashboard',  component: EmpresaDashboardComponent,  canActivate: [rolEmpresaGuard] },
  { path: 'empresa/beneficios', component: EmpresaBeneficiosComponent, canActivate: [rolEmpresaGuard] },

  { path: '',   redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
