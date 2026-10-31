export interface NucleoModuleNavItem {
  key: string;
  label: string;
  path: string;
  icon: string;
  /**
   * Separador visual (una linea, no un item de navegacion) inmediatamente
   * ANTES de este link -- ver el reporte de reorganizacion del sidebar.
   * Hoy solo lo usa "Preferencias" para distinguirse del resto del grupo
   * Configuración (temas de administracion del tenant) sin sacarlo del
   * grupo ni darle su propio encabezado.
   */
  separadorAntes?: boolean;
}

export interface NucleoNavGroup {
  key: string;
  label: string;
  items: NucleoModuleNavItem[];
}

/**
 * "Inicio" vive fuera de cualquier grupo -- primer item del sidebar, sin
 * encabezado de seccion ni logica de expandir/colapsar (ver el reporte).
 */
export const NUCLEO_ITEM_INICIO: NucleoModuleNavItem = {
  key: 'nucleo',
  label: 'Inicio',
  path: 'nucleo',
  icon: 'pi pi-home',
};

/**
 * Los 10 modulos del documento de arquitectura (backend/nucleo_arquitectura.md),
 * agrupados en secciones colapsables -- patron NavGroup[] tomado de Angara
 * Dental (ver el reporte del analisis de UX), ya compatible con este stack
 * (Angular standalone + signals) sin adaptarlo.
 *
 * TPV deja de ser un solo enlace ("TPV / Ventas" -> /tpv, que redirigia a
 * /tpv/venta): Venta/Caja/Ventas son 3 pantallas genuinamente distintas
 * (ver TpvNavComponent, retirado -- esta agrupacion ya cumple el mismo
 * proposito de navegacion secundaria, sin duplicarla dentro de cada
 * pantalla).
 *
 * Fuente unica para el sidebar Y para las rutas (app.routes.ts) -- agregar
 * un modulo nuevo es una linea aqui, no dos lugares por separado.
 */
export const NUCLEO_NAV_GROUPS: NucleoNavGroup[] = [
  {
    key: 'catalogo',
    label: 'Catálogo',
    items: [
      { key: 'inventario', label: 'Productos', path: 'inventario', icon: 'pi pi-box' },
      { key: 'categorias', label: 'Categorías', path: 'inventario/categorias', icon: 'pi pi-sitemap' },
      { key: 'departamentos', label: 'Departamentos', path: 'inventario/departamentos', icon: 'pi pi-building' },
      { key: 'unidades-medida', label: 'Unidades de Medida', path: 'unidades-medida', icon: 'pi pi-arrows-h' },
      { key: 'precios', label: 'Precios y Promociones', path: 'precios', icon: 'pi pi-tags' },
      { key: 'crm', label: 'Clientes', path: 'crm', icon: 'pi pi-users' },
      {
        // Sin lista propia (ver el docblock de CampanaService) -- el link va directo al alta.
        key: 'crm-campanas',
        label: 'Campañas',
        path: 'crm/campanas/nueva',
        icon: 'pi pi-megaphone',
      },
    ],
  },
  {
    key: 'transacciones',
    label: 'Transacciones',
    items: [
      { key: 'tpv-venta', label: 'Venta', path: 'tpv/venta', icon: 'pi pi-shopping-cart' },
      { key: 'tpv-caja', label: 'Caja', path: 'tpv/caja', icon: 'pi pi-wallet' },
      { key: 'tpv-ventas', label: 'Ventas', path: 'tpv/ventas', icon: 'pi pi-receipt' },
      { key: 'cotizaciones', label: 'Cotizaciones', path: 'cotizaciones', icon: 'pi pi-file-edit' },
      { key: 'cuentas-cobrar', label: 'Cuentas por Cobrar', path: 'cuentas-cobrar', icon: 'pi pi-wallet' },
      { key: 'cuentas-pagar', label: 'Cuentas por Pagar', path: 'cuentas-pagar', icon: 'pi pi-arrow-up-right' },
      { key: 'prestamos', label: 'Préstamos', path: 'prestamos', icon: 'pi pi-percentage' },
      { key: 'ventas-plazos', label: 'Ventas a Plazos', path: 'ventas-plazos', icon: 'pi pi-calendar' },
      { key: 'pedidos', label: 'Pedidos', path: 'pedidos', icon: 'pi pi-truck' },
      { key: 'apartados', label: 'Apartados', path: 'apartados', icon: 'pi pi-calendar-clock' },
      { key: 'devoluciones', label: 'Devoluciones', path: 'devoluciones', icon: 'pi pi-replay' },
      { key: 'notas-credito', label: 'Notas de Crédito', path: 'notas-credito', icon: 'pi pi-ticket' },
      { key: 'gift-cards', label: 'Gift Cards', path: 'gift-cards', icon: 'pi pi-credit-card' },
      { key: 'gastos', label: 'Gastos', path: 'gastos', icon: 'pi pi-money-bill' },
    ],
  },
  {
    key: 'nomina',
    label: 'Nómina',
    items: [
      { key: 'empleados', label: 'Empleados', path: 'payroll/empleados', icon: 'pi pi-id-card' },
      { key: 'nominas', label: 'Nóminas', path: 'payroll/nominas', icon: 'pi pi-wallet' },
    ],
  },
  {
    key: 'produccion',
    label: 'Producción',
    items: [
      { key: 'insumos', label: 'Insumos', path: 'produccion/insumos', icon: 'pi pi-box' },
      { key: 'recetas', label: 'Recetas', path: 'produccion/recetas', icon: 'pi pi-book' },
      { key: 'ordenes-produccion', label: 'Órdenes de Producción', path: 'produccion/ordenes', icon: 'pi pi-cog' },
      { key: 'transformaciones', label: 'Transformaciones', path: 'produccion/transformaciones', icon: 'pi pi-sync' },
    ],
  },
  {
    // Primeros dos reportes (reportes_cuentas_cobrar/reportes_cuentas_pagar) --
    // el general (reportes.ver) y el de CRM (reportes_crm) van despues.
    key: 'reportes',
    label: 'Reportes',
    items: [
      { key: 'reporte-cuentas-cobrar', label: 'Antigüedad de CxC', path: 'reportes/cuentas-cobrar', icon: 'pi pi-chart-line' },
      { key: 'reporte-cuentas-pagar', label: 'Antigüedad de CxP', path: 'reportes/cuentas-pagar', icon: 'pi pi-chart-line' },
      { key: 'reporte-crm', label: 'CRM', path: 'reportes/crm', icon: 'pi pi-chart-line' },
      { key: 'reporte-ventas', label: 'Ventas por periodo', path: 'reportes/ventas', icon: 'pi pi-chart-bar' },
    ],
  },
  {
    // Antes "Administración": renombrado (ver el reporte) -- ahora incluye
    // tambien "Empresa" (el antiguo tab general de Configuración) y
    // "Preferencias" (antes fuera de cualquier grupo, ver el bloque
    // sidebar__nav--cuenta retirado).
    key: 'configuracion',
    label: 'Configuración',
    items: [
      { key: 'usuarios', label: 'Usuarios', path: 'usuarios', icon: 'pi pi-user' },
      { key: 'roles', label: 'Roles', path: 'roles', icon: 'pi pi-key' },
      // Ruta 'configuracion': la pantalla en si ahora tiene tabs Empresa/
      // Licencia (RecordTabsComponent) -- ver ConfiguracionComponent.
      { key: 'empresa', label: 'Empresa', path: 'configuracion', icon: 'pi pi-briefcase' },
      { key: 'metodos-pago', label: 'Métodos de pago', path: 'metodos-pago', icon: 'pi pi-wallet' },
      { key: 'auditoria', label: 'Auditoría', path: 'auditoria', icon: 'pi pi-history' },
      // Personal (cualquier usuario autenticado, sin permiso especial) --
      // el separador la distingue visualmente del resto del grupo, que es
      // administracion del tenant.
      { key: 'preferencias', label: 'Preferencias', path: 'perfil/preferencias', icon: 'pi pi-lock', separadorAntes: true },
    ],
  },
];
