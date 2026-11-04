import { EntradaNavegacion } from '@nianva/ui-layout';

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
  /**
   * Permiso del endpoint con el que carga la pantalla (el `permiso:` de su GET). Sin el,
   * el menu oculta la entrada (API-09); la pantalla respondería 403 de todos modos.
   */
  permiso?: string;
  /** Slug de `modulo:` (ModuloActivo) si la pantalla es de un modulo que se puede apagar. */
  modulo?: string;
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
      { key: 'inventario', label: 'Productos', path: 'inventario/productos', icon: 'pi pi-box', permiso: 'inventario.ver' },
      { key: 'categorias', label: 'Categorías', path: 'inventario/categorias', icon: 'pi pi-sitemap', permiso: 'inventario.ver' },
      { key: 'departamentos', label: 'Departamentos', path: 'inventario/departamentos', icon: 'pi pi-building', permiso: 'inventario.ver' },
      { key: 'unidades-medida', label: 'Unidades de medida', path: 'unidades-medida', icon: 'pi pi-arrows-h', permiso: 'inventario.ver' },
      { key: 'precios', label: 'Precios y promociones', path: 'precios', icon: 'pi pi-tags', permiso: 'reglas_precio.ver' },
      { key: 'crm', label: 'Clientes', path: 'crm/clientes', icon: 'pi pi-users', permiso: 'clientes.ver' },
      {
        // Sin lista propia (ver el docblock de CampanaService) -- el link va directo al alta.
        key: 'crm-campanas',
        label: 'Campañas',
        path: 'crm/campanas/nueva',
        icon: 'pi pi-megaphone',
        permiso: 'crm_campanas.enviar',
        modulo: 'crm_avanzado',
      },
    ],
  },
  {
    key: 'transacciones',
    label: 'Transacciones',
    items: [
      { key: 'tpv-venta', label: 'Venta', path: 'tpv/venta', icon: 'pi pi-shopping-cart', permiso: 'ventas.crear' },
      { key: 'tpv-caja', label: 'Caja', path: 'tpv/caja', icon: 'pi pi-wallet', permiso: 'caja.ver' },
      { key: 'tpv-ventas', label: 'Ventas', path: 'tpv/ventas', icon: 'pi pi-receipt', permiso: 'ventas.ver' },
      { key: 'cotizaciones', label: 'Cotizaciones', path: 'cotizaciones', icon: 'pi pi-file-edit', permiso: 'cotizaciones.ver', modulo: 'cotizaciones' },
      { key: 'cuentas-cobrar', label: 'Cuentas por cobrar', path: 'cuentas-cobrar', icon: 'pi pi-wallet', permiso: 'cuentas_cobrar.ver', modulo: 'cxc' },
      { key: 'cuentas-pagar', label: 'Cuentas por pagar', path: 'cuentas-pagar', icon: 'pi pi-arrow-up-right', permiso: 'cuentas_pagar.ver', modulo: 'cxp' },
      { key: 'prestamos', label: 'Préstamos', path: 'prestamos', icon: 'pi pi-percentage', permiso: 'prestamos.ver', modulo: 'prestamos' },
      { key: 'ventas-plazos', label: 'Ventas a plazos', path: 'ventas-plazos', icon: 'pi pi-calendar', permiso: 'ventas_plazos.ver', modulo: 'ventas_plazos' },
      { key: 'pedidos', label: 'Pedidos', path: 'pedidos', icon: 'pi pi-truck', permiso: 'pedidos.ver', modulo: 'delivery' },
      { key: 'apartados', label: 'Apartados', path: 'apartados', icon: 'pi pi-calendar-clock', permiso: 'apartados.ver' },
      { key: 'devoluciones', label: 'Devoluciones', path: 'devoluciones', icon: 'pi pi-replay', permiso: 'devoluciones.ver' },
      { key: 'notas-credito', label: 'Notas de crédito', path: 'notas-credito', icon: 'pi pi-ticket', permiso: 'notas_credito.ver', modulo: 'notas_credito' },
      { key: 'gift-cards', label: 'Gift cards', path: 'gift-cards', icon: 'pi pi-credit-card', permiso: 'gift_cards.ver', modulo: 'gift_cards' },
      // Sin "Gastos": se registran dentro de Caja, y dos entradas no llevan a la
      // misma pantalla (UI-08). /gastos sigue redirigiendo a Caja.
    ],
  },
  {
    key: 'nomina',
    label: 'Nómina',
    items: [
      { key: 'empleados', label: 'Empleados', path: 'payroll/empleados', icon: 'pi pi-id-card', permiso: 'payroll.ver', modulo: 'payroll' },
      { key: 'nominas', label: 'Nóminas', path: 'payroll/nominas', icon: 'pi pi-wallet', permiso: 'payroll.ver', modulo: 'payroll' },
    ],
  },
  {
    key: 'produccion',
    label: 'Producción',
    items: [
      { key: 'insumos', label: 'Insumos', path: 'produccion/insumos', icon: 'pi pi-box', permiso: 'produccion.ver', modulo: 'produccion' },
      { key: 'recetas', label: 'Recetas', path: 'produccion/recetas', icon: 'pi pi-book', permiso: 'produccion.ver', modulo: 'produccion' },
      { key: 'ordenes-produccion', label: 'Órdenes de producción', path: 'produccion/ordenes', icon: 'pi pi-cog', permiso: 'produccion.ver', modulo: 'produccion' },
      { key: 'transformaciones', label: 'Transformaciones', path: 'produccion/transformaciones', icon: 'pi pi-sync', permiso: 'produccion.ver', modulo: 'produccion' },
    ],
  },
  {
    // Primeros dos reportes (reportes_cuentas_cobrar/reportes_cuentas_pagar) --
    // el general (reportes.ver) y el de CRM (reportes_crm) van despues.
    key: 'reportes',
    label: 'Reportes',
    items: [
      { key: 'reporte-cuentas-cobrar', label: 'Antigüedad de CxC', path: 'reportes/cuentas-cobrar', icon: 'pi pi-chart-line', permiso: 'reportes_cuentas_cobrar.ver', modulo: 'cxc' },
      { key: 'reporte-cuentas-pagar', label: 'Antigüedad de CxP', path: 'reportes/cuentas-pagar', icon: 'pi pi-chart-line', permiso: 'reportes_cuentas_pagar.ver', modulo: 'cxp' },
      { key: 'reporte-crm', label: 'CRM', path: 'reportes/crm', icon: 'pi pi-chart-line', permiso: 'reportes_crm.ver', modulo: 'crm_avanzado' },
      { key: 'reporte-ventas', label: 'Ventas por periodo', path: 'reportes/ventas', icon: 'pi pi-chart-bar', permiso: 'reportes.ver' },
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
      { key: 'usuarios', label: 'Usuarios', path: 'usuarios', icon: 'pi pi-user', permiso: 'usuarios.ver' },
      { key: 'roles', label: 'Roles', path: 'roles', icon: 'pi pi-key', permiso: 'roles.ver' },
      // Ruta 'configuracion': la pantalla en si ahora tiene tabs Empresa/
      // Licencia (RecordTabsComponent) -- ver ConfiguracionComponent.
      { key: 'empresa', label: 'Empresa', path: 'configuracion', icon: 'pi pi-briefcase', permiso: 'configuracion.editar' },
      { key: 'metodos-pago', label: 'Métodos de pago', path: 'metodos-pago', icon: 'pi pi-wallet', permiso: 'metodos_pago.ver' },
      { key: 'auditoria', label: 'Auditoría', path: 'auditoria', icon: 'pi pi-history', permiso: 'auditoria.ver' },
      // Personal (cualquier usuario autenticado, sin permiso especial) --
      // el separador la distingue visualmente del resto del grupo, que es
      // administracion del tenant.
      { key: 'preferencias', label: 'Preferencias', path: 'perfil/preferencias', icon: 'pi pi-lock', separadorAntes: true },
    ],
  },
];

/**
 * El mismo menu como registro de navegacion de ui/layout (UI-08): una
 * entrada por pantalla, de la que toman el nombre el sidebar y
 * ui-page-header. Se provee como REGISTRO_NAVEGACION en app.config.ts.
 */
export const REGISTRO_NAVEGACION_POS: readonly EntradaNavegacion[] = [
  NUCLEO_ITEM_INICIO,
  ...NUCLEO_NAV_GROUPS.flatMap((grupo) => grupo.items),
].map((item) => ({
  clave: item.key,
  ruta: item.path,
  nombre: item.label,
  icono: item.icon,
  permiso: item.permiso,
  feature: item.modulo,
}));
