import { Route } from '@angular/router';

import { authGuard, requiereSesionGuard } from './auth/auth.guard';

/**
 * Cada modulo se carga con loadComponent (import() dinamico con ruta
 * ESTATICA -- no generada por string interpolation, para que esbuild
 * pueda separar cada uno en su propio chunk en build time). El bundle de
 * un modulo no se descarga hasta que el usuario navega a esa ruta -- ver
 * README de frontend/ para como se verifico contra el output real del
 * build de produccion.
 *
 * Login/2FA/reset de password son hermanas del shell, NO hijas -- viven
 * fuera de authGuard a proposito, para que nunca se monte el sidebar
 * mientras se resuelven.
 */
export const appRoutes: Route[] = [
  {
    path: 'login',
    title: 'Núcleo · Iniciar sesión',
    loadComponent: () => import('./auth/pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'two-factor/verify',
    title: 'Núcleo · Verificación en dos pasos',
    loadComponent: () =>
      import('./auth/pages/two-factor-verify/two-factor-verify.component').then((m) => m.TwoFactorVerifyComponent),
  },
  {
    path: 'two-factor/setup',
    title: 'Núcleo · Configurar 2FA',
    // requiereSesionGuard (no authGuard): un admin sin 2FA SI tiene sesion,
    // authGuard lo mandaria de vuelta aqui mismo en un bucle infinito.
    canActivate: [requiereSesionGuard],
    loadComponent: () =>
      import('./auth/pages/two-factor-setup/two-factor-setup.component').then((m) => m.TwoFactorSetupComponent),
  },
  {
    path: 'forgot-password',
    title: 'Núcleo · Recuperar contraseña',
    loadComponent: () =>
      import('./auth/pages/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    title: 'Núcleo · Nueva contraseña',
    loadComponent: () =>
      import('./auth/pages/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/shell-layout/shell-layout.component').then((m) => m.ShellLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'nucleo' },
      {
        path: 'nucleo',
        title: 'Núcleo · Inicio',
        data: { breadcrumb: 'Inicio' },
        loadComponent: () => import('./modules/nucleo/pages/inicio/inicio.component').then((m) => m.InicioComponent),
      },
      {
        path: 'metodos-pago',
        title: 'Núcleo · Métodos de pago',
        data: { breadcrumb: 'Métodos de pago' },
        loadComponent: () =>
          import('./modules/administracion/pages/metodos-pago-list/metodos-pago-list.component').then(
            (m) => m.MetodosPagoListComponent,
          ),
      },
      {
        // Ruta estatica ANTES de metodos-pago/:id -- si no, el router la
        // interpretaria como una busqueda de metodo de pago con id="nuevo".
        path: 'metodos-pago/nuevo',
        title: 'Núcleo · Nuevo método de pago',
        data: { breadcrumb: 'Nuevo método de pago' },
        loadComponent: () =>
          import('./modules/administracion/pages/metodo-pago-crear/metodo-pago-crear.component').then(
            (m) => m.MetodoPagoCrearComponent,
          ),
      },
      {
        path: 'metodos-pago/:id',
        title: 'Núcleo · Detalle de método de pago',
        data: { breadcrumb: 'Detalle' },
        loadComponent: () =>
          import('./modules/administracion/pages/metodo-pago-detalle/metodo-pago-detalle.component').then(
            (m) => m.MetodoPagoDetalleComponent,
          ),
      },
      {
        path: 'usuarios',
        title: 'Núcleo · Usuarios',
        data: { breadcrumb: 'Usuarios' },
        loadComponent: () =>
          import('./modules/administracion/pages/usuarios-list/usuarios-list.component').then(
            (m) => m.UsuariosListComponent,
          ),
      },
      {
        // Ruta estatica ANTES de usuarios/:id -- si no, el router la
        // interpretaria como una busqueda de usuario con id="nuevo".
        path: 'usuarios/nuevo',
        title: 'Núcleo · Nuevo usuario',
        data: { breadcrumb: 'Nuevo usuario' },
        loadComponent: () =>
          import('./modules/administracion/pages/usuario-crear/usuario-crear.component').then(
            (m) => m.UsuarioCrearComponent,
          ),
      },
      {
        path: 'usuarios/:id',
        title: 'Núcleo · Detalle de usuario',
        data: { breadcrumb: 'Detalle' },
        loadComponent: () =>
          import('./modules/administracion/pages/usuario-detalle/usuario-detalle.component').then(
            (m) => m.UsuarioDetalleComponent,
          ),
      },
      {
        path: 'roles',
        title: 'Núcleo · Roles',
        data: { breadcrumb: 'Roles' },
        loadComponent: () =>
          import('./modules/administracion/pages/roles-list/roles-list.component').then((m) => m.RolesListComponent),
      },
      {
        // Ruta estatica ANTES de roles/:id -- mismo motivo que usuarios/nuevo.
        path: 'roles/nuevo',
        title: 'Núcleo · Nuevo rol',
        data: { breadcrumb: 'Nuevo rol' },
        loadComponent: () =>
          import('./modules/administracion/pages/rol-crear/rol-crear.component').then((m) => m.RolCrearComponent),
      },
      {
        path: 'roles/:id',
        title: 'Núcleo · Detalle de rol',
        data: { breadcrumb: 'Detalle' },
        loadComponent: () =>
          import('./modules/administracion/pages/rol-detalle/rol-detalle.component').then((m) => m.RolDetalleComponent),
      },
      {
        path: 'auditoria',
        title: 'Núcleo · Auditoría',
        data: { breadcrumb: 'Auditoría' },
        loadComponent: () =>
          import('./modules/auditoria/pages/auditoria-global/auditoria-global.component').then(
            (m) => m.AuditoriaGlobalComponent,
          ),
      },
      {
        path: 'inventario',
        data: { breadcrumb: 'Inventario' },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'productos' },
          {
            path: 'productos',
            title: 'Núcleo · Productos',
            data: { breadcrumb: 'Productos' },
            loadComponent: () =>
              import('./modules/inventario/pages/productos-list/productos-list.component').then(
                (m) => m.ProductosListComponent,
              ),
          },
          {
            // Ruta estatica ANTES de productos/:id -- si no, el router la
            // interpretaria como una busqueda de producto con id="nuevo".
            path: 'productos/nuevo',
            title: 'Núcleo · Nuevo producto',
            data: { breadcrumb: 'Nuevo producto' },
            loadComponent: () =>
              import('./modules/inventario/pages/producto-crear/producto-crear.component').then(
                (m) => m.ProductoCrearComponent,
              ),
          },
          {
            path: 'productos/:id',
            title: 'Núcleo · Detalle de producto',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/inventario/pages/producto-detalle/producto-detalle.component').then(
                (m) => m.ProductoDetalleComponent,
              ),
          },
          {
            path: 'categorias',
            title: 'Núcleo · Categorías',
            data: { breadcrumb: 'Categorías' },
            loadComponent: () =>
              import('./modules/inventario/pages/categorias-list/categorias-list.component').then(
                (m) => m.CategoriasListComponent,
              ),
          },
          {
            // Ruta estatica ANTES de categorias/:id -- mismo motivo que productos/nuevo.
            path: 'categorias/nuevo',
            title: 'Núcleo · Nueva categoría',
            data: { breadcrumb: 'Nueva categoría' },
            loadComponent: () =>
              import('./modules/inventario/pages/categoria-crear/categoria-crear.component').then(
                (m) => m.CategoriaCrearComponent,
              ),
          },
          {
            path: 'categorias/:id',
            title: 'Núcleo · Detalle de categoría',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/inventario/pages/categoria-detalle/categoria-detalle.component').then(
                (m) => m.CategoriaDetalleComponent,
              ),
          },
          {
            path: 'departamentos',
            title: 'Núcleo · Departamentos',
            data: { breadcrumb: 'Departamentos' },
            loadComponent: () =>
              import('./modules/inventario/pages/departamentos-list/departamentos-list.component').then(
                (m) => m.DepartamentosListComponent,
              ),
          },
          {
            // Ruta estatica ANTES de departamentos/:id -- mismo motivo que productos/nuevo.
            path: 'departamentos/nuevo',
            title: 'Núcleo · Nuevo departamento',
            data: { breadcrumb: 'Nuevo departamento' },
            loadComponent: () =>
              import('./modules/inventario/pages/departamento-crear/departamento-crear.component').then(
                (m) => m.DepartamentoCrearComponent,
              ),
          },
          {
            path: 'departamentos/:id',
            title: 'Núcleo · Detalle de departamento',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/inventario/pages/departamento-detalle/departamento-detalle.component').then(
                (m) => m.DepartamentoDetalleComponent,
              ),
          },
        ],
      },
      {
        path: 'precios',
        data: { breadcrumb: 'Precios y Promociones' },
        children: [
          {
            path: '',
            title: 'Núcleo · Precios y Promociones',
            loadComponent: () =>
              import('./modules/precios/pages/precios/precios.component').then((m) => m.PreciosComponent),
          },
          {
            // Ruta estatica ANTES de reglas/:id -- si no, el router la
            // interpretaria como una busqueda de regla con id="nuevo".
            path: 'reglas/nuevo',
            title: 'Núcleo · Nueva regla de precio',
            data: { breadcrumb: 'Nueva regla de precio' },
            loadComponent: () =>
              import('./modules/precios/pages/regla-precio-crear/regla-precio-crear.component').then(
                (m) => m.ReglaPrecioCrearComponent,
              ),
          },
          {
            path: 'reglas/:id',
            title: 'Núcleo · Detalle de regla de precio',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/precios/pages/regla-precio-detalle/regla-precio-detalle.component').then(
                (m) => m.ReglaPrecioDetalleComponent,
              ),
          },
          {
            // Ruta estatica ANTES de cupones/:id -- mismo motivo que reglas/nuevo.
            path: 'cupones/nuevo',
            title: 'Núcleo · Nuevo cupón',
            data: { breadcrumb: 'Nuevo cupón' },
            loadComponent: () =>
              import('./modules/precios/pages/cupon-crear/cupon-crear.component').then((m) => m.CuponCrearComponent),
          },
          {
            path: 'cupones/:id',
            title: 'Núcleo · Detalle de cupón',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/precios/pages/cupon-detalle/cupon-detalle.component').then((m) => m.CuponDetalleComponent),
          },
        ],
      },
      {
        path: 'crm',
        data: { breadcrumb: 'CRM' },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'clientes' },
          {
            path: 'clientes',
            title: 'Núcleo · Clientes',
            data: { breadcrumb: 'Clientes' },
            loadComponent: () =>
              import('./modules/crm/pages/clientes-list/clientes-list.component').then((m) => m.ClientesListComponent),
          },
          {
            // Ruta estatica ANTES de clientes/:id -- si no, el router la
            // interpretaria como una busqueda de cliente con id="nuevo".
            path: 'clientes/nuevo',
            title: 'Núcleo · Nuevo cliente',
            data: { breadcrumb: 'Nuevo cliente' },
            loadComponent: () =>
              import('./modules/crm/pages/cliente-crear/cliente-crear.component').then((m) => m.ClienteCrearComponent),
          },
          {
            path: 'clientes/:id',
            title: 'Núcleo · Detalle de cliente',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/crm/pages/cliente-detalle/cliente-detalle.component').then(
                (m) => m.ClienteDetalleComponent,
              ),
          },
        ],
      },
      {
        path: 'tpv',
        data: { breadcrumb: 'TPV / Ventas' },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'venta' },
          {
            path: 'venta',
            title: 'Núcleo · Venta',
            data: { breadcrumb: 'Venta' },
            loadComponent: () => import('./modules/tpv/pages/venta/venta.component').then((m) => m.VentaComponent),
          },
          {
            path: 'caja',
            title: 'Núcleo · Caja',
            data: { breadcrumb: 'Caja' },
            loadComponent: () => import('./modules/tpv/pages/caja/caja.component').then((m) => m.CajaComponent),
          },
          {
            path: 'ventas',
            title: 'Núcleo · Ventas',
            data: { breadcrumb: 'Ventas' },
            loadComponent: () =>
              import('./modules/tpv/pages/ventas-list/ventas-list.component').then((m) => m.VentasListComponent),
          },
          {
            path: 'ventas/:id',
            title: 'Núcleo · Detalle de venta',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/tpv/pages/venta-detalle/venta-detalle.component').then((m) => m.VentaDetalleComponent),
          },
        ],
      },
      {
        path: 'apartados',
        data: { breadcrumb: 'Apartados' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Núcleo · Apartados',
            loadComponent: () =>
              import('./modules/apartados/pages/apartados-list/apartados-list.component').then(
                (m) => m.ApartadosListComponent,
              ),
          },
          {
            path: 'nuevo',
            title: 'Núcleo · Nuevo apartado',
            data: { breadcrumb: 'Nuevo apartado' },
            loadComponent: () =>
              import('./modules/apartados/pages/apartado-form/apartado-form.component').then(
                (m) => m.ApartadoFormComponent,
              ),
          },
          {
            path: ':id',
            title: 'Núcleo · Detalle de apartado',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/apartados/pages/apartado-detalle/apartado-detalle.component').then(
                (m) => m.ApartadoDetalleComponent,
              ),
          },
        ],
      },
      {
        path: 'devoluciones',
        data: { breadcrumb: 'Devoluciones' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Núcleo · Devoluciones',
            loadComponent: () =>
              import('./modules/devoluciones/pages/devoluciones-list/devoluciones-list.component').then(
                (m) => m.DevolucionesListComponent,
              ),
          },
          {
            path: 'nueva',
            title: 'Núcleo · Nueva devolución',
            data: { breadcrumb: 'Nueva devolución' },
            loadComponent: () =>
              import('./modules/devoluciones/pages/devolucion-form/devolucion-form.component').then(
                (m) => m.DevolucionFormComponent,
              ),
          },
          {
            path: ':id',
            title: 'Núcleo · Detalle de devolución',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/devoluciones/pages/devolucion-detalle/devolucion-detalle.component').then(
                (m) => m.DevolucionDetalleComponent,
              ),
          },
        ],
      },
      {
        // Sin pantalla propia (ver el reporte del modulo Gastos): vive
        // dentro de la vista de caja de TPV. El link del sidebar sigue
        // apuntando a /gastos (ver NUCLEO_NAV_GROUPS) para no tocar esa
        // lista compartida -- aqui simplemente se redirige a donde el
        // usuario realmente puede registrar/ver gastos.
        path: 'gastos',
        pathMatch: 'full',
        redirectTo: 'tpv/caja',
      },
      {
        path: 'configuracion',
        title: 'Núcleo · Configuración',
        data: { breadcrumb: 'Configuración' },
        loadComponent: () =>
          import('./modules/configuracion/pages/configuracion/configuracion.component').then(
            (m) => m.ConfiguracionComponent,
          ),
      },
      {
        path: 'perfil/preferencias',
        title: 'Núcleo · Preferencias',
        data: { breadcrumb: 'Preferencias' },
        loadComponent: () =>
          import('./perfil/pages/preferencias/preferencias.component').then((m) => m.PreferenciasComponent),
      },
      {
        path: 'demo/vista-registro',
        title: 'Núcleo · Demo: vista de registro',
        data: { breadcrumb: 'Demo: vista de registro' },
        loadComponent: () => import('./demo/registro-ejemplo.component').then((m) => m.RegistroEjemploComponent),
      },
    ],
  },
];
