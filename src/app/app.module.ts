import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

/* Core */
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

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
import { BeneficioDetalleComponent } from './features/beneficio-detalle/beneficio-detalle.component';
import { SolicitudesComponent } from './features/solicitudes/solicitudes.component';

/* Shared */
import { SolicitudModalComponent } from './shared/solicitud-modal/solicitud-modal.component';

/* Feature components — empresa */
import { EmpresaRegistroComponent } from './features/empresa-registro/empresa-registro.component';
import { EmpresaDashboardComponent } from './features/empresa-dashboard/empresa-dashboard.component';
import { EmpresaBeneficiosComponent } from './features/empresa-beneficios/empresa-beneficios.component';

@NgModule({ declarations: [
        AppComponent,
        LoginComponent,
        DashboardComponent,
        CatalogoComponent,
        BeneficioDetalleComponent,
        SolicitudesComponent,
        SolicitudModalComponent,
        EmpresaRegistroComponent,
        EmpresaDashboardComponent,
        EmpresaBeneficiosComponent,
    ],
    bootstrap: [AppComponent], imports: [BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        MatIconModule,
        MatButtonModule,
        AppRoutingModule], providers: [
        { provide: LocationStrategy, useClass: HashLocationStrategy },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        provideHttpClient(withInterceptorsFromDi()),
    ] })
export class AppModule {}
