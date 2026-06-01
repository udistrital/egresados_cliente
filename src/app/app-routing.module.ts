import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './features/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CatalogoComponent } from './features/catalogo/catalogo.component';
import { SolicitudesComponent } from './features/solicitudes/solicitudes.component';
import { EmpresaRegistroComponent } from './features/empresa-registro/empresa-registro.component';
import { EmpresaDashboardComponent } from './features/empresa-dashboard/empresa-dashboard.component';
import { EmpresaBeneficiosComponent } from './features/empresa-beneficios/empresa-beneficios.component';

const routes: Routes = [
  /* Egresado */
  { path: 'login',       component: LoginComponent },
  { path: 'dashboard',   component: DashboardComponent },
  { path: 'catalogo',    component: CatalogoComponent },
  { path: 'solicitudes', component: SolicitudesComponent },

  /* Empresa */
  { path: 'empresa/registro',   component: EmpresaRegistroComponent },
  { path: 'empresa/dashboard',  component: EmpresaDashboardComponent },
  { path: 'empresa/beneficios', component: EmpresaBeneficiosComponent },

  { path: '',   redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
