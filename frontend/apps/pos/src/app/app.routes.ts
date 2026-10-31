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
        // Solo lectura -- NotaCreditoController no tiene store()/update()/
        // destroy() (ver el docblock de NotaCreditoService): las notas se
        // generan unicamente desde una Devolucion. Sin rutas 'crear'/'editar'.
        path: 'notas-credito',
        data: { breadcrumb: 'Notas de Crédito' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Núcleo · Notas de Crédito',
            loadComponent: () =>
              import('./modules/notas-credito/pages/notas-credito-list/notas-credito-list.component').then(
                (m) => m.NotasCreditoListComponent,
              ),
          },
          {
            path: ':id',
            title: 'Núcleo · Detalle de nota de crédito',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/notas-credito/pages/nota-credito-detalle/nota-credito-detalle.component').then(
                (m) => m.NotaCreditoDetalleComponent,
              ),
          },
        ],
      },
      {
        path: 'gift-cards',
        data: { breadcrumb: 'Gift Cards' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Núcleo · Gift Cards',
            loadComponent: () =>
              import('./modules/gift-cards/pages/gift-cards-list/gift-cards-list.component').then(
                (m) => m.GiftCardsListComponent,
              ),
          },
          {
            // Ruta estatica ANTES de :id -- mismo motivo que productos/nuevo.
            path: 'emitir',
            title: 'Núcleo · Emitir gift card',
            data: { breadcrumb: 'Emitir gift card' },
            loadComponent: () =>
              import('./modules/gift-cards/pages/gift-card-form/gift-card-form.component').then(
                (m) => m.GiftCardFormComponent,
              ),
          },
          {
            path: ':id',
            title: 'Núcleo · Detalle de gift card',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/gift-cards/pages/gift-card-detalle/gift-card-detalle.component').then(
                (m) => m.GiftCardDetalleComponent,
              ),
          },
        ],
      },
      {
        // Solo lectura + acciones -- CuentaCobrarController no tiene
        // store() (ver el docblock de CuentaCobrarService). Sin ruta 'crear'.
        path: 'cuentas-cobrar',
        data: { breadcrumb: 'Cuentas por Cobrar' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Núcleo · Cuentas por Cobrar',
            loadComponent: () =>
              import('./modules/cuentas-cobrar/pages/cuentas-cobrar-list/cuentas-cobrar-list.component').then(
                (m) => m.CuentasCobrarListComponent,
              ),
          },
          {
            path: ':id',
            title: 'Núcleo · Detalle de cuenta por cobrar',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/cuentas-cobrar/pages/cuenta-cobrar-detalle/cuenta-cobrar-detalle.component').then(
                (m) => m.CuentaCobrarDetalleComponent,
              ),
          },
        ],
      },
      {
        // Solo lectura + acciones -- CuentaPagarController no tiene
        // store() (ver el docblock de CuentaPagarService). Sin ruta 'crear'.
        path: 'cuentas-pagar',
        data: { breadcrumb: 'Cuentas por Pagar' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Núcleo · Cuentas por Pagar',
            loadComponent: () =>
              import('./modules/cuentas-pagar/pages/cuentas-pagar-list/cuentas-pagar-list.component').then(
                (m) => m.CuentasPagarListComponent,
              ),
          },
          {
            path: ':id',
            title: 'Núcleo · Detalle de cuenta por pagar',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/cuentas-pagar/pages/cuenta-pagar-detalle/cuenta-pagar-detalle.component').then(
                (m) => m.CuentaPagarDetalleComponent,
              ),
          },
        ],
      },
      {
        path: 'prestamos',
        data: { breadcrumb: 'Préstamos' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Núcleo · Préstamos',
            loadComponent: () =>
              import('./modules/prestamos/pages/prestamos-list/prestamos-list.component').then(
                (m) => m.PrestamosListComponent,
              ),
          },
          {
            path: 'nuevo',
            title: 'Núcleo · Nuevo préstamo',
            data: { breadcrumb: 'Nuevo préstamo' },
            loadComponent: () =>
              import('./modules/prestamos/pages/prestamo-form/prestamo-form.component').then(
                (m) => m.PrestamoFormComponent,
              ),
          },
          {
            path: ':id',
            title: 'Núcleo · Detalle de préstamo',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/prestamos/pages/prestamo-detalle/prestamo-detalle.component').then(
                (m) => m.PrestamoDetalleComponent,
              ),
          },
        ],
      },
      {
        path: 'payroll',
        data: { breadcrumb: 'Nómina' },
        children: [
          {
            path: 'empleados',
            pathMatch: 'full',
            title: 'Núcleo · Empleados',
            data: { breadcrumb: 'Empleados' },
            loadComponent: () =>
              import('./modules/payroll/pages/empleados-list/empleados-list.component').then(
                (m) => m.EmpleadosListComponent,
              ),
          },
          {
            path: 'empleados/:id',
            title: 'Núcleo · Detalle de empleado',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/payroll/pages/empleado-detalle/empleado-detalle.component').then(
                (m) => m.EmpleadoDetalleComponent,
              ),
          },
          {
            path: 'nominas',
            pathMatch: 'full',
            title: 'Núcleo · Nóminas',
            data: { breadcrumb: 'Nóminas' },
            loadComponent: () =>
              import('./modules/payroll/pages/nominas-list/nominas-list.component').then(
                (m) => m.NominasListComponent,
              ),
          },
          {
            path: 'nominas/:id',
            title: 'Núcleo · Detalle de nómina',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/payroll/pages/nomina-detalle/nomina-detalle.component').then(
                (m) => m.NominaDetalleComponent,
              ),
          },
        ],
      },
      {
        path: 'pedidos',
        data: { breadcrumb: 'Pedidos' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Núcleo · Pedidos',
            loadComponent: () =>
              import('./modules/delivery/pages/pedidos-list/pedidos-list.component').then(
                (m) => m.PedidosListComponent,
              ),
          },
          {
            path: 'nuevo',
            title: 'Núcleo · Nuevo pedido',
            data: { breadcrumb: 'Nuevo pedido' },
            loadComponent: () =>
              import('./modules/delivery/pages/pedido-form/pedido-form.component').then(
                (m) => m.PedidoFormComponent,
              ),
          },
          {
            path: ':id',
            title: 'Núcleo · Detalle de pedido',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/delivery/pages/pedido-detalle/pedido-detalle.component').then(
                (m) => m.PedidoDetalleComponent,
              ),
          },
        ],
      },
      {
        path: 'produccion',
        data: { breadcrumb: 'Producción' },
        children: [
          {
            path: 'insumos',
            pathMatch: 'full',
            title: 'Núcleo · Insumos',
            data: { breadcrumb: 'Insumos' },
            loadComponent: () =>
              import('./modules/produccion/pages/insumos-list/insumos-list.component').then(
                (m) => m.InsumosListComponent,
              ),
          },
          {
            path: 'recetas',
            pathMatch: 'full',
            title: 'Núcleo · Recetas',
            data: { breadcrumb: 'Recetas' },
            loadComponent: () =>
              import('./modules/produccion/pages/recetas-list/recetas-list.component').then(
                (m) => m.RecetasListComponent,
              ),
          },
          {
            path: 'recetas/nueva',
            title: 'Núcleo · Nueva receta',
            data: { breadcrumb: 'Nueva receta' },
            loadComponent: () =>
              import('./modules/produccion/pages/receta-form/receta-form.component').then(
                (m) => m.RecetaFormComponent,
              ),
          },
          {
            path: 'ordenes',
            pathMatch: 'full',
            title: 'Núcleo · Órdenes de Producción',
            data: { breadcrumb: 'Órdenes de Producción' },
            loadComponent: () =>
              import('./modules/produccion/pages/ordenes-list/ordenes-list.component').then(
                (m) => m.OrdenesListComponent,
              ),
          },
          {
            path: 'transformaciones',
            pathMatch: 'full',
            title: 'Núcleo · Transformaciones',
            data: { breadcrumb: 'Transformaciones' },
            loadComponent: () =>
              import('./modules/produccion/pages/transformaciones-list/transformaciones-list.component').then(
                (m) => m.TransformacionesListComponent,
              ),
          },
          {
            path: 'transformaciones/nueva',
            title: 'Núcleo · Nueva transformación',
            data: { breadcrumb: 'Nueva transformación' },
            loadComponent: () =>
              import('./modules/produccion/pages/transformacion-form/transformacion-form.component').then(
                (m) => m.TransformacionFormComponent,
              ),
          },
        ],
      },
      {
        path: 'ventas-plazos',
        data: { breadcrumb: 'Ventas a Plazos' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Núcleo · Ventas a Plazos',
            loadComponent: () =>
              import('./modules/ventas-plazos/pages/planes-pago-list/planes-pago-list.component').then(
                (m) => m.PlanesPagoListComponent,
              ),
          },
          {
            // Ruta estatica ANTES de :id -- mismo motivo que productos/nuevo.
            path: 'nuevo',
            title: 'Núcleo · Nuevo plan de pago',
            data: { breadcrumb: 'Nuevo plan de pago' },
            loadComponent: () =>
              import('./modules/ventas-plazos/pages/plan-pago-form/plan-pago-form.component').then(
                (m) => m.PlanPagoFormComponent,
              ),
          },
          {
            path: ':id',
            title: 'Núcleo · Detalle de plan de pago',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/ventas-plazos/pages/plan-pago-detalle/plan-pago-detalle.component').then(
                (m) => m.PlanPagoDetalleComponent,
              ),
          },
        ],
      },
      {
        // Sin lista (ver el docblock de CampanaService) -- solo alta.
        path: 'crm/campanas/nueva',
        title: 'Núcleo · Nueva campaña',
        data: { breadcrumb: 'Nueva campaña' },
        loadComponent: () =>
          import('./modules/crm/pages/campana-form/campana-form.component').then((m) => m.CampanaFormComponent),
      },
      {
        path: 'cotizaciones',
        data: { breadcrumb: 'Cotizaciones' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Núcleo · Cotizaciones',
            loadComponent: () =>
              import('./modules/cotizaciones/pages/cotizaciones-list/cotizaciones-list.component').then(
                (m) => m.CotizacionesListComponent,
              ),
          },
          {
            // Ruta estatica ANTES de :id -- mismo motivo que productos/nuevo.
            path: 'crear',
            title: 'Núcleo · Nueva cotización',
            data: { breadcrumb: 'Nueva cotización' },
            loadComponent: () =>
              import('./modules/cotizaciones/pages/cotizacion-form/cotizacion-form.component').then(
                (m) => m.CotizacionFormComponent,
              ),
          },
          {
            path: ':id',
            title: 'Núcleo · Detalle de cotización',
            data: { breadcrumb: 'Detalle' },
            loadComponent: () =>
              import('./modules/cotizaciones/pages/cotizacion-detalle/cotizacion-detalle.component').then(
                (m) => m.CotizacionDetalleComponent,
              ),
          },
          {
            path: ':id/editar',
            title: 'Núcleo · Editar cotización',
            data: { breadcrumb: 'Editar' },
            loadComponent: () =>
              import('./modules/cotizaciones/pages/cotizacion-form/cotizacion-form.component').then(
                (m) => m.CotizacionFormComponent,
              ),
          },
        ],
      },
      {
        path: 'reportes',
        data: { breadcrumb: 'Reportes' },
        children: [
          {
            path: 'cuentas-cobrar',
            title: 'Núcleo · Reporte de Cuentas por Cobrar',
            data: { breadcrumb: 'Cuentas por Cobrar' },
            loadComponent: () =>
              import('./modules/reportes/pages/reporte-cuentas-cobrar/reporte-cuentas-cobrar.component').then(
                (m) => m.ReporteCuentasCobrarComponent,
              ),
          },
          {
            path: 'cuentas-pagar',
            title: 'Núcleo · Reporte de Cuentas por Pagar',
            data: { breadcrumb: 'Cuentas por Pagar' },
            loadComponent: () =>
              import('./modules/reportes/pages/reporte-cuentas-pagar/reporte-cuentas-pagar.component').then(
                (m) => m.ReporteCuentasPagarComponent,
              ),
          },
          {
            path: 'crm',
            title: 'Núcleo · Reporte de CRM',
            data: { breadcrumb: 'CRM' },
            loadComponent: () =>
              import('./modules/reportes/pages/reporte-crm/reporte-crm.component').then(
                (m) => m.ReporteCrmComponent,
              ),
          },
          {
            path: 'ventas',
            title: 'Núcleo · Reporte de Ventas',
            data: { breadcrumb: 'Ventas' },
            loadComponent: () =>
              import('./modules/reportes/pages/reporte-ventas/reporte-ventas.component').then(
                (m) => m.ReporteVentasComponent,
              ),
          },
        ],
      },
      {
        path: 'unidades-medida',
        title: 'Núcleo · Unidades de Medida',
        data: { breadcrumb: 'Unidades de Medida' },
        loadComponent: () =>
          import('./modules/unidades-medida/pages/unidades-medida-list/unidades-medida-list.component').then(
            (m) => m.UnidadesMedidaListComponent,
          ),
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
