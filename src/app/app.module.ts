import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

/* Angular Material */
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

/* Routing */
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

/* Feature components — egresado */
import { LoginComponent } from './features/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CatalogoComponent } from './features/catalogo/catalogo.component';
import { SolicitudesComponent } from './features/solicitudes/solicitudes.component';

/* Feature components — empresa */
import { EmpresaRegistroComponent } from './features/empresa-registro/empresa-registro.component';
import { EmpresaDashboardComponent } from './features/empresa-dashboard/empresa-dashboard.component';
import { EmpresaBeneficiosComponent } from './features/empresa-beneficios/empresa-beneficios.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    CatalogoComponent,
    SolicitudesComponent,
    EmpresaRegistroComponent,
    EmpresaDashboardComponent,
    EmpresaBeneficiosComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    MatIconModule,
    MatButtonModule,
    AppRoutingModule,
  ],
  providers: [
    { provide: LocationStrategy, useClass: HashLocationStrategy },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
