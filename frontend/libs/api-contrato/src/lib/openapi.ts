// Generado desde docs/api/openapi.json (API-08). No lo edites a mano: cambia el backend,
// regenera la especificacion y corre `node libs/api-contrato/scripts/generar.mjs`.
export interface paths {
    "/user": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description `UsuarioResource` */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["UsuarioResource"];
                        };
                    };
                };
                401: components["responses"]["AuthenticationException"];
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apartados": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["apartado.index"];
        put?: never;
        post: operations["apartado.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apartados/{apartado}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["apartado.show"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apartados/{apartado}/abonos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["apartado.registrarAbono"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/apartados/{apartado}/liquidar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["apartado.liquidar"];
        trace?: never;
    };
    "/apartados/{apartado}/cancelar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["apartado.cancelar"];
        trace?: never;
    };
    "/auditoria": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["auditoria.index"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auditoria/global": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Navegador global de auditoria (Fase C, punto 5) -- a diferencia de
         *     index() (embebido por registro, sin permiso propio), esta SI exige
         *     un permiso dedicado (auditoria.ver): aqui no hay una vista de
         *     registro de la que "heredar" la autorizacion, es una pantalla de
         *     administracion que ve TODOS los cambios del tenant de una vez
         */
        get: operations["auditoria.global"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/caja/actual": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["caja.actual"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/caja/abrir": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["caja.abrir"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/caja/{cajaSesion}/cerrar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Orquestacion: App\Aplicacion\Caja\CerrarCaja */
        patch: operations["caja.cerrar"];
        trace?: never;
    };
    "/categorias": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["categoria.index"];
        put?: never;
        post: operations["categoria.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/categorias/{categoria}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["categoria.show"];
        put: operations["categoria.update"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/categorias/{categoria}/desactivar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["categoria.desactivar"];
        trace?: never;
    };
    "/clientes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["cliente.index"];
        put?: never;
        post: operations["cliente.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clientes/{cliente}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Incluye 'permisos' igual que index() -- la vista de registro se
         *     puede alcanzar tambien navegando directo a /crm/clientes/{id}, no
         *     solo desde el boton "editar" de la lista, asi que necesita su propia
         *     forma de saber si debe mostrar el formulario como editable
         */
        get: operations["cliente.show"];
        put: operations["cliente.update"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clientes/{cliente}/desactivar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Soft: nunca DELETE fisico -- solo apaga `activo`. "Publico General"
         *     (es_sistema) esta protegido tanto aqui como en el frontend (ver
         *     ClientesListComponent), pero esta es la barrera real: un cliente
         *     distinto al frontend oficial no puede desactivarlo solo porque el
         *     boton estaba oculto
         */
        patch: operations["cliente.desactivar"];
        trace?: never;
    };
    "/compras": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["compra.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/configuracion": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["configuracion.show"];
        put: operations["configuracion.update"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/configuracion/publica": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Subconjunto de la configuracion que otros modulos necesitan leer sin
         *     tener el permiso configuracion.editar (ej. Inventario, para saber si
         *     debe autogenerar el codigo de barras de una variante nueva -- ver
         *     ProductoVarianteController). A proposito sin middleware `permiso:`
         *     (mismo patron que AuditoriaController::index()): son banderas de
         *     bajo riesgo, no el registro completo de configuracion
         */
        get: operations["configuracion.publica"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/configuracion-seguridad": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["configuracionSeguridad.show"];
        put: operations["configuracionSeguridad.update"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cotizaciones": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["cotizacion.index"];
        put?: never;
        post: operations["cotizacion.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cotizaciones/{cotizacion}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["cotizacion.show"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cotizaciones/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["cotizacion.update"];
        post?: never;
        delete: operations["cotizacion.destroy"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cotizaciones/{id}/convertir": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["cotizacion.convertir"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clientes/{cliente}/interacciones": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["crmAvanzado.interacciones"];
        put?: never;
        post: operations["crmAvanzado.crearInteraccion"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clientes/{cliente}/loyalty": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["crmAvanzado.loyalty"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clientes/{cliente}/loyalty/ajustar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["crmAvanzado.ajustarPuntos"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/crm/campanas/enviar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["crmAvanzado.enviarCampana"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/crm/reporte": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["crmAvanzado.reporte"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cuentas-cobrar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["cuentaCobrar.index"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cuentas-cobrar/reporte": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["cuentaCobrar.reporte"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cuentas-cobrar/{cuentaCobrar}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["cuentaCobrar.show"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cuentas-cobrar/{id}/abonos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["cuentaCobrar.registrarAbono"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cuentas-cobrar/{id}/anular": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["cuentaCobrar.anular"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cuentas-pagar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["cuentaPagar.index"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cuentas-pagar/reporte": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["cuentaPagar.reporte"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cuentas-pagar/{cuentaPagar}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["cuentaPagar.show"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cuentas-pagar/{id}/pagos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["cuentaPagar.registrarPago"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cuentas-pagar/{id}/anular": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["cuentaPagar.anular"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cupones": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["cupon.index"];
        put?: never;
        post: operations["cupon.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cupones/{cupon}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["cupon.show"];
        put: operations["cupon.update"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cupones/{cupon}/desactivar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["cupon.desactivar"];
        trace?: never;
    };
    "/cupones/validar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Usado desde la pantalla de venta (TPV), no desde este modulo -- por
         *     eso el permiso es `ventas.crear`, no `cupones.ver`: un vendedor
         *     puede aplicar un cupon existente sin poder administrar el catalogo
         *     de cupones. Nunca calcula el descuento en el frontend -- misma
         *     autoridad de precios que VentaService (PrecioService::aplicarCupon()),
         *     que ya valida vigencia y lanza CuponInvalidoException (mapeada a
         *     422 en bootstrap/app.php) si el codigo no existe/esta inactivo/fuera
         *     de rango
         */
        post: operations["cupon.validar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/departamentos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["departamento.index"];
        put?: never;
        post: operations["departamento.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/departamentos/{departamento}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["departamento.show"];
        put: operations["departamento.update"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/departamentos/{departamento}/desactivar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["departamento.desactivar"];
        trace?: never;
    };
    "/devoluciones": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["devolucion.index"];
        put?: never;
        /** Orquestacion: App\Aplicacion\Devoluciones\RegistrarDevolucion */
        post: operations["devolucion.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/devoluciones/{devolucion}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["devolucion.show"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/dispositivos-confiables": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["dispositivosConfiables.index"];
        put?: never;
        post?: never;
        delete: operations["dispositivosConfiables.destroyTodos"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/dispositivos-confiables/{dispositivo}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["dispositivosConfiables.destroy"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/gastos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["gasto.index"];
        put?: never;
        post: operations["gasto.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/gift-cards": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["giftCard.index"];
        put?: never;
        post: operations["giftCard.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/gift-cards/{giftCard}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["giftCard.show"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/gift-cards/{id}/recargar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["giftCard.recargar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/gift-cards/{id}/cancelar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["giftCard.cancelar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/inicio/resumen": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["inicio.resumen"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/producto-variantes/{variante}/kardex": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["kardex.porVariante"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/licencia-local": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["licenciaLocal.show"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/metodos-pago": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["metodoPago.index"];
        put?: never;
        post: operations["metodoPago.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/metodos-pago/{metodoPago}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["metodoPago.show"];
        put: operations["metodoPago.update"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/metodos-pago/{metodoPago}/desactivar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["metodoPago.desactivar"];
        trace?: never;
    };
    "/notas-credito": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["notaCredito.index"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/notas-credito/{notaCredito}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["notaCredito.show"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clientes/{cliente}/notas-credito": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["notaCredito.activasPorCliente"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/password/change": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Cambiar la contrasena estando ya autenticado (a diferencia de
         *     reset(), que es el flujo de "olvide mi contrasena" via token de
         *     correo). Protegida por el middleware dos-factor.reciente en la ruta
         */
        post: operations["passwordReset.cambiar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/empleados": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["payroll.empleadosIndex"];
        put?: never;
        post: operations["payroll.empleadosStore"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/empleados/{empleado}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["payroll.empleadosShow"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/nominas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["payroll.nominasIndex"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/nominas/{nomina}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["payroll.nominasShow"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/nominas/generar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["payroll.nominasGenerar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/nominas/{id}/pagar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["payroll.nominasPagar"];
        trace?: never;
    };
    "/pedidos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["pedido.index"];
        put?: never;
        post: operations["pedido.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pedidos/{pedido}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["pedido.show"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pedidos/{id}/estado": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["pedido.cambiarEstado"];
        trace?: never;
    };
    "/pedidos/{id}/repartidor": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["pedido.asignarRepartidor"];
        trace?: never;
    };
    "/permisos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["permiso.index"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/planes-pago-cliente": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["planPago.index"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/planes-pago-cliente/{plan}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["planPago.show"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/ventas/{venta}/plan-pago": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["planPago.crearPlan"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/planes-pago-cliente/{plan}/pagar-cuota": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["planPago.pagarCuota"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/prestamos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["prestamo.index"];
        put?: never;
        post: operations["prestamo.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/prestamos/{prestamo}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["prestamo.show"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/prestamos/{id}/pagos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["prestamo.registrarPago"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/insumos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["produccion.insumosIndex"];
        put?: never;
        post: operations["produccion.insumosStore"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/insumos/{insumo}/stocks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["produccion.insumoStocks"];
        put?: never;
        post: operations["produccion.insumoStocksStore"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/recetas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["produccion.recetasIndex"];
        put?: never;
        post: operations["produccion.recetasStore"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/ordenes-produccion": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["produccion.ordenesIndex"];
        put?: never;
        post: operations["produccion.ordenesStore"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/ordenes-produccion/{id}/estado": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["produccion.ordenesCambiarEstado"];
        trace?: never;
    };
    "/transformaciones": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["produccion.transformacionesIndex"];
        put?: never;
        post: operations["produccion.transformacionStore"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/productos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["producto.index"];
        put?: never;
        post: operations["producto.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/productos/{producto}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["producto.show"];
        put: operations["producto.update"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/productos/{producto}/desactivar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Soft: nunca DELETE fisico -- solo apaga `activo` (ver Cliente::desactivar()) */
        patch: operations["producto.desactivar"];
        trace?: never;
    };
    "/productos/{producto}/variantes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["productoVariante.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/producto-variantes/{variante}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["productoVariante.update"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/producto-variantes/{variante}/desactivar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["productoVariante.desactivar"];
        trace?: never;
    };
    "/proveedores": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["proveedor.index"];
        put?: never;
        post: operations["proveedor.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reglas-precio": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["reglaPrecio.index"];
        put?: never;
        post: operations["reglaPrecio.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reglas-precio/{regla}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["reglaPrecio.show"];
        put: operations["reglaPrecio.update"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reglas-precio/{regla}/desactivar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["reglaPrecio.desactivar"];
        trace?: never;
    };
    "/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["rol.index"];
        put?: never;
        post: operations["rol.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/roles/{rol}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["rol.show"];
        put: operations["rol.update"];
        post?: never;
        delete: operations["rol.destroy"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sesion": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["sesion.show"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sucursales": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["sucursal.index"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/two-factor/qr-code": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Genera (o reutiliza, si ya se pidio antes y no se ha confirmado) el
         *     secreto pendiente y la URI otpauth:// -- el frontend renderiza el QR
         */
        get: operations["twoFactor.setup"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/two-factor/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Confirma el codigo generado a partir del secreto pendiente. Si es
         *     valido, activa el 2FA y genera los codigos de recuperacion -- se
         *     devuelven UNA sola vez aqui, nunca se pueden volver a consultar
         */
        post: operations["twoFactor.confirm"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/unidades-medida": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["unidadMedida.index"];
        put?: never;
        post: operations["unidadMedida.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/unidades-medida/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["unidadMedida.update"];
        post?: never;
        delete: operations["unidadMedida.destroy"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/usuarios": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["usuario.index"];
        put?: never;
        post: operations["usuario.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/usuarios/{usuario}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["usuario.show"];
        put: operations["usuario.update"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/usuarios/{usuario}/desactivar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Soft: nunca DELETE fisico (igual que el resto del catalogo) -- solo
         *     apaga `activo`. Un usuario no puede desactivarse a si mismo, sin
         *     importar el permiso -- se quedaria sin poder volver a entrar a
         *     revertirlo
         */
        patch: operations["usuario.desactivar"];
        trace?: never;
    };
    "/usuarios/{usuario}/desactivar-2fa": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Desactiva el 2FA de OTRO usuario -- reemplaza el autoservicio que
         *     tenia TwoFactorController::disable() (eliminado). La ruta ya exige
         *     dos-factor.reciente, que valida el TOTP de quien ejecuta la accion
         *     (el admin autenticado), no el del usuario objetivo -- ver
         *     RequiereDosFactorReciente. El guard de rol de abajo si mira al
         *     objetivo: si su rol exige 2FA (Usuario::requiereDosFactor()), sigue
         *     sin poderse apagar, ahora tampoco por un admin
         */
        post: operations["usuario.desactivarDosFactor"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clientes/{cliente}/ventas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["venta.porCliente"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/ventas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["venta.index"];
        put?: never;
        /** Orquestacion: App\Aplicacion\Ventas\RegistrarVenta */
        post: operations["venta.store"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/ventas/cotizar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["venta.cotizar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/ventas/reporte": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["venta.reporte"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/ventas/{venta}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["venta.show"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/ventas/{venta}/anular": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["venta.anular"];
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** AbonoCuenta */
        AbonoCuenta: {
            id: number;
            cuenta_cobrar_id: number;
            caja_sesion_id: number | null;
            usuario_id: number;
            monto: string;
            metodo_pago_id: number;
            referencia: string | null;
            /** Format: date-time */
            fecha: string;
        };
        /** AbonoCuentaResource */
        AbonoCuentaResource: {
            id: number;
            monto: string;
            metodo_pago?: string;
            referencia: string | null;
            /** Format: date-time */
            fecha: string;
        };
        /** AbonoPagar */
        AbonoPagar: {
            id: number;
            cuenta_pagar_id: number;
            caja_sesion_id: number | null;
            usuario_id: number;
            monto: string;
            metodo_pago_id: number;
            referencia: string | null;
            /** Format: date-time */
            fecha: string;
        };
        /** AbonoPagarResource */
        AbonoPagarResource: {
            id: number;
            monto: string;
            metodo_pago?: string;
            referencia: string | null;
            /** Format: date-time */
            fecha: string;
        };
        /** AbrirCajaRequest */
        AbrirCajaRequest: {
            monto_apertura: number;
        };
        /** ActualizarConfiguracionRequest */
        ActualizarConfiguracionRequest: {
            moneda: string;
            zona_horaria?: string;
            mensaje_ticket?: string | null;
            /** Format: uri */
            logo_url?: string | null;
            mostrar_rfc: boolean;
            mostrar_telefono: boolean;
            mostrar_correo: boolean;
            backup_auto: boolean;
            /** @enum {string} */
            backup_frecuencia: "diario" | "semanal" | "mensual";
            codigo_barras_automatico: boolean;
        };
        /** ActualizarConfiguracionSeguridadRequest */
        ActualizarConfiguracionSeguridadRequest: {
            dias_dispositivo_normal: number;
            dias_dispositivo_admin: number;
            minutos_inactividad: number;
        };
        /** ActualizarCotizacionRequest */
        ActualizarCotizacionRequest: {
            cliente_id?: number | null;
            validez_dias?: number | null;
            descuento?: number | null;
            uso_cfdi?: string | null;
            observaciones?: string | null;
            items: {
                variante_id: number;
                cantidad: number;
                precio_unitario?: number | null;
                descuento?: number | null;
            }[];
        };
        /** AjustarPuntosRequest */
        AjustarPuntosRequest: {
            puntos: number;
            motivo: string;
        };
        /** AnularVentaRequest */
        AnularVentaRequest: {
            motivo: string;
        };
        /** ApartadoResource */
        ApartadoResource: {
            id: number;
            /** Format: date-time */
            fecha_creacion: string;
            cliente?: {
                id: number;
                nombre: string;
            } | null;
            total: string;
            total_abonado: string;
            estado: string;
            /** Format: date-time */
            fecha_vencimiento: string | null;
            /** Format: date-time */
            fecha_completado: string | null;
            /** Format: date-time */
            fecha_cancelado: string | null;
            motivo_cancelacion: string | null;
            venta_id: number | null;
            notas: string | null;
            detalles?: {
                id: number;
                variante_id: number;
                variante: {
                    id: number;
                    talla: string | null;
                    color: string | null;
                    producto_nombre: string;
                } | null;
                cantidad: number;
                precio_unitario: string;
                subtotal: string;
            }[];
            abonos?: {
                id: number;
                monto: string;
                /** Format: date-time */
                fecha: string;
                notas: string | null;
                pagos: {
                    metodo_pago_id: number;
                    nombre: string;
                    monto: string;
                }[];
            }[];
        };
        /** App.Modules.CuentasCobrar.Http.Requests.RegistrarAbonoRequest */
        "App.Modules.CuentasCobrar.Http.Requests.RegistrarAbonoRequest": {
            monto: number;
            metodo_pago_id: number;
            referencia?: string | null;
        };
        /** AsignarRepartidorRequest */
        AsignarRepartidorRequest: {
            repartidor_id: number;
        };
        /** CajaSesionResource */
        CajaSesionResource: {
            id: number;
            sucursal_id: number;
            usuario_id: number;
            monto_apertura: string;
            monto_cierre: string | null;
            total_ventas_sistema: string | null;
            diferencia: string | null;
            /** Format: date-time */
            fecha_apertura: string;
            /** Format: date-time */
            fecha_cierre: string | null;
            estado: string;
        };
        /** CambiarEstadoOrdenRequest */
        CambiarEstadoOrdenRequest: {
            /** @enum {string} */
            estado: "pendiente" | "en_proceso" | "completada" | "cancelada";
            cantidad_producida?: number;
        };
        /** CambiarEstadoPedidoRequest */
        CambiarEstadoPedidoRequest: {
            /** @enum {string} */
            estado: "pendiente" | "preparando" | "en_camino" | "entregado" | "cancelado";
        };
        /** CambiarPasswordRequest */
        CambiarPasswordRequest: {
            password_actual: string;
            password: string;
            password_confirmation: string;
        };
        /** CancelarApartadoRequest */
        CancelarApartadoRequest: {
            motivo: string;
        };
        /** Categoria */
        Categoria: {
            id: number;
            tenant_id: number;
            nombre: string;
            descripcion: string | null;
            activo: boolean;
            /** Format: date-time */
            created_at: string;
        };
        /** CategoriaResource */
        CategoriaResource: {
            id: number;
            nombre: string;
            descripcion: string | null;
            activo: boolean;
        };
        /** CerrarCajaRequest */
        CerrarCajaRequest: {
            monto_fisico: number;
        };
        /** ClienteResource */
        ClienteResource: {
            id: number;
            nombre: string;
            documento_fiscal: string | null;
            telefono: string | null;
            correo: string | null;
            direccion: string | null;
            activo: boolean;
            es_sistema: boolean;
            /** Format: date-time */
            fecha_registro: string;
        };
        /** ConfiguracionSeguridadResource */
        ConfiguracionSeguridadResource: {
            dias_dispositivo_normal: number;
            dias_dispositivo_admin: number;
            minutos_inactividad: number;
        };
        /** ConfiguracionTenantResource */
        ConfiguracionTenantResource: {
            moneda: string;
            zona_horaria: string;
            mensaje_ticket: string | null;
            logo_url: string | null;
            mostrar_rfc: boolean;
            mostrar_telefono: boolean;
            mostrar_correo: boolean;
            backup_auto: boolean;
            backup_frecuencia: string;
            /** Format: date-time */
            backup_ultimo: string | null;
            codigo_barras_automatico: boolean;
        };
        /** ConfirmTwoFactorRequest */
        ConfirmTwoFactorRequest: {
            code: string;
        };
        /** ConvertirCotizacionRequest */
        ConvertirCotizacionRequest: {
            metodo_pago_id: number;
        };
        /** CotizacionDetalleResource */
        CotizacionDetalleResource: {
            id: number;
            variante_id: number;
            variante?: {
                id: number;
                nombre: string;
            };
            cantidad: number;
            precio_unitario: string;
            descuento: string;
            subtotal: string;
        };
        /** CotizacionResource */
        CotizacionResource: {
            id: number;
            numero_cotizacion: string;
            cliente?: {
                id: number;
                nombre: string;
            };
            usuario?: {
                id: number;
                nombre: string;
            };
            total: string;
            descuento: string;
            estado: string;
            validez_dias: number;
            /** Format: date-time */
            fecha_vencimiento: string | null;
            observaciones: string | null;
            uso_cfdi: string | null;
            venta_id: number | null;
            detalles?: components["schemas"]["CotizacionDetalleResource"][];
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            updated_at: string;
        };
        /** CotizarVentaRequest */
        CotizarVentaRequest: {
            items: {
                variante_id: number;
                cantidad: number;
            }[];
        };
        /** CrearApartadoRequest */
        CrearApartadoRequest: {
            cliente_id: number;
            items: {
                variante_id: number;
                cantidad: number;
            }[];
            /** Format: date-time */
            fecha_vencimiento?: string | null;
            notas?: string | null;
        };
        /** CrearCotizacionRequest */
        CrearCotizacionRequest: {
            cliente_id?: number | null;
            sucursal_id?: number | null;
            validez_dias?: number | null;
            descuento?: number | null;
            uso_cfdi?: string | null;
            observaciones?: string | null;
            items: {
                variante_id: number;
                cantidad: number;
                precio_unitario?: number | null;
                descuento?: number | null;
            }[];
        };
        /** CrearDevolucionRequest */
        CrearDevolucionRequest: {
            venta_id: number;
            /** @enum {string} */
            tipo: "devolucion" | "cambio";
            items_devueltos: {
                variante_id: number;
                cantidad: number;
                va_a_merma?: boolean | null;
            }[];
            items_nuevos?: {
                variante_id?: number;
                cantidad?: number;
            }[] | null;
            pagos?: {
                metodo_pago_id?: number;
                monto?: number;
            }[] | null;
            motivo?: string | null;
            /** @enum {string|null} */
            tipo_reembolso?: "efectivo" | "nota_credito" | null;
        };
        /** CrearEmpleadoRequest */
        CrearEmpleadoRequest: {
            usuario_id: number;
            sucursal_id: number;
            salario_base?: number | null;
            /** @enum {string|null} */
            tipo_salario?: "fijo" | "por_hora" | null;
            /** Format: date-time */
            fecha_ingreso?: string | null;
            numero_seguridad_social?: string | null;
        };
        /** CrearGastoRequest */
        CrearGastoRequest: {
            descripcion: string;
            monto: number;
        };
        /** CrearInsumoRequest */
        CrearInsumoRequest: {
            nombre: string;
            sku?: string | null;
            unidad_medida_id: number;
            costo?: number | null;
            stock_minimo?: number | null;
        };
        /** CrearInteraccionRequest */
        CrearInteraccionRequest: {
            /** @enum {string} */
            tipo: "llamada" | "email" | "whatsapp" | "nota" | "visita";
            observacion: string;
        };
        /** CrearOrdenProduccionRequest */
        CrearOrdenProduccionRequest: {
            receta_id: number;
            cantidad_programada: number;
            /** Format: date-time */
            fecha_programada?: string | null;
            notas?: string | null;
        };
        /** CrearPedidoRequest */
        CrearPedidoRequest: {
            cliente_id: number;
            sucursal_id?: number | null;
            direccion_entrega?: string | null;
            referencia?: string | null;
            costo_delivery?: number | null;
            tiempo_estimado?: number | null;
            notas?: string | null;
            items?: {
                variante_id?: number;
                cantidad?: number;
                precio_unitario?: number;
            }[] | null;
        };
        /** CrearPlanPagoRequest */
        CrearPlanPagoRequest: {
            numero_cuotas: number;
            tasa_interes?: number | null;
            /** @enum {string|null} */
            periodicidad?: "semanal" | "quincenal" | "mensual" | null;
            /** Format: date-time */
            fecha_inicio?: string | null;
        };
        /** CrearPrestamoRequest */
        CrearPrestamoRequest: {
            proveedor_id?: number | null;
            referencia?: string | null;
            monto: number;
            interes?: number | null;
            /** Format: date-time */
            fecha_prestamo: string;
            /** Format: date-time */
            fecha_vencimiento?: string | null;
            notas?: string | null;
        };
        /** CrearProveedorRequest */
        CrearProveedorRequest: {
            razon_social: string;
            rfc?: string | null;
            telefono?: string | null;
            /** Format: email */
            correo?: string | null;
            direccion?: string | null;
        };
        /** CrearRecetaRequest */
        CrearRecetaRequest: {
            variante_id: number;
            nombre: string;
            rendimiento?: number | null;
            instrucciones?: string | null;
            descripcion?: string | null;
            ingredientes: {
                insumo_id: number;
                cantidad: number;
                unidad_medida_id: number;
            }[];
        };
        /** CrearTransformacionRequest */
        CrearTransformacionRequest: {
            variante_origen_id: number;
            variante_destino_id: number;
            cantidad_origen: number;
            cantidad_destino: number;
            notas?: string | null;
        };
        /** CrearVentaRequest */
        CrearVentaRequest: {
            cliente_id: number;
            items: {
                variante_id: number;
                cantidad: number;
            }[];
            pagos: {
                metodo_pago_id: number;
                monto: number;
            }[];
            cupon_codigo?: string | null;
            descuento_manual?: number | null;
            gift_card_codigo?: string | null;
            nota_credito_id?: number | null;
        };
        /** CrmCampana */
        CrmCampana: {
            id: number;
            tenant_id: number;
            usuario_id: number;
            asunto: string;
            mensaje: string;
            segmento: string | null;
            cliente_ids: unknown[] | null;
            destinatarios: number;
            /** Format: date-time */
            enviado_en: string | null;
            /** Format: date-time */
            created_at: string;
        };
        /** CrmCampanaResource */
        CrmCampanaResource: {
            id: number;
            usuario?: {
                id: number;
                nombre: string;
            };
            asunto: string;
            segmento: string | null;
            destinatarios: number;
            /** Format: date-time */
            enviado_en: string | null;
            /** Format: date-time */
            created_at: string;
        };
        /** CrmInteraccionResource */
        CrmInteraccionResource: {
            id: number;
            cliente_id: number;
            usuario?: {
                id: number;
                nombre: string;
            };
            tipo: string;
            observacion: string;
            /** Format: date-time */
            fecha: string;
        };
        /** CuentaCobrarResource */
        CuentaCobrarResource: {
            id: number;
            venta_id: number;
            cliente?: {
                id: number;
                nombre: string;
            };
            monto_total: string;
            saldo_pendiente: string;
            /** Format: date-time */
            fecha_vencimiento: string | null;
            estado: string;
            dias_vencida: unknown;
            abonos?: components["schemas"]["AbonoCuentaResource"][];
            /** Format: date-time */
            created_at: string;
        };
        /** CuentaPagarResource */
        CuentaPagarResource: {
            id: number;
            compra_id: number;
            proveedor?: {
                id: number;
                razon_social: string;
            };
            monto_total: string;
            saldo_pendiente: string;
            /** Format: date-time */
            fecha_vencimiento: string | null;
            estado: string;
            abonos?: components["schemas"]["AbonoPagarResource"][];
            /** Format: date-time */
            created_at: string;
        };
        /** CuponResource */
        CuponResource: {
            id: number;
            codigo: string;
            nombre: string;
            tipo: string;
            valor: string;
            uso_maximo: number | null;
            uso_maximo_por_cliente: number | null;
            /** Format: date-time */
            fecha_inicio: string | null;
            /** Format: date-time */
            fecha_fin: string | null;
            activo: boolean;
        };
        /** Departamento */
        Departamento: {
            id: number;
            tenant_id: number;
            nombre: string;
            descripcion: string | null;
            activo: boolean;
            /** Format: date-time */
            created_at: string;
        };
        /** DepartamentoResource */
        DepartamentoResource: {
            id: number;
            nombre: string;
            descripcion: string | null;
            activo: boolean;
        };
        /** DevolucionResource */
        DevolucionResource: {
            id: number;
            /** Format: date-time */
            fecha: string;
            tipo: string;
            venta?: {
                id: number;
                cliente_nombre: string;
            } | null;
            venta_sombra_id: number | null;
            monto_devolucion: string;
            monto_cambio: string;
            diferencia: string;
            motivo: string | null;
            tipo_reembolso: string;
            nota_credito_id: number | null;
            items?: {
                id: number;
                tipo: string;
                variante_id: number;
                variante: {
                    id: number;
                    talla: string | null;
                    color: string | null;
                    producto_nombre: string;
                } | null;
                cantidad: number;
                precio_unitario: string;
                subtotal: string;
                va_a_merma: boolean;
            }[];
            pagos?: {
                metodo_pago_id: number;
                nombre: string;
                monto: string;
            }[];
        };
        /** EmitirGiftCardRequest */
        EmitirGiftCardRequest: {
            cliente_id?: number | null;
            monto: number;
            /** Format: date-time */
            fecha_expiracion?: string | null;
        };
        /** EmpleadoResource */
        EmpleadoResource: {
            id: number;
            usuario_id: number;
            usuario?: {
                id: number;
                nombre: string;
            };
            sucursal_id: number;
            salario_base: string;
            tipo_salario: string;
            numero_seguridad_social: string | null;
            /** Format: date-time */
            fecha_ingreso: string | null;
            activo: boolean;
        };
        /** EnviarCampanaRequest */
        EnviarCampanaRequest: {
            /** @enum {string|null} */
            segmento?: "todos" | "nuevo" | "frecuente" | "vip" | "inactivo" | null;
            cliente_ids?: number[] | null;
            asunto: string;
            mensaje: string;
        };
        /** GastoResource */
        GastoResource: {
            id: number;
            descripcion: string;
            monto: string;
            /** Format: date-time */
            fecha: string;
        };
        /** GenerarNominaRequest */
        GenerarNominaRequest: {
            sucursal_id?: number | null;
            /** Format: date-time */
            periodo_inicio: string;
            /** Format: date-time */
            periodo_fin: string;
        };
        /** GiftCardResource */
        GiftCardResource: {
            id: number;
            cliente?: {
                id: number;
                nombre: string;
            };
            codigo: string;
            saldo_inicial: string;
            saldo_actual: string;
            /** Format: date-time */
            fecha_expiracion: string | null;
            recargas?: {
                id: number;
                monto: string;
                usuario: {
                    id: number;
                    nombre: string;
                } | null;
                /** Format: date-time */
                fecha: string;
            }[];
            estado: string;
            /** Format: date-time */
            created_at: string;
        };
        /** GuardarCategoriaRequest */
        GuardarCategoriaRequest: {
            nombre: string;
            descripcion?: string | null;
        };
        /** GuardarClienteRequest */
        GuardarClienteRequest: {
            nombre: string;
            documento_fiscal?: string | null;
            telefono?: string | null;
            /** Format: email */
            correo?: string | null;
            direccion?: string | null;
        };
        /** GuardarCuponRequest */
        GuardarCuponRequest: {
            codigo: string;
            nombre: string;
            /** @enum {string} */
            tipo: "porcentaje" | "monto_fijo";
            valor: number;
            uso_maximo?: number | null;
            uso_maximo_por_cliente?: number | null;
            /** Format: date-time */
            fecha_inicio?: string | null;
            /** Format: date-time */
            fecha_fin?: string | null;
        };
        /** GuardarDepartamentoRequest */
        GuardarDepartamentoRequest: {
            nombre: string;
            descripcion?: string | null;
        };
        /** GuardarInsumoStockRequest */
        GuardarInsumoStockRequest: {
            sucursal_id?: number | null;
            cantidad: number;
            lote?: string | null;
            /** Format: date-time */
            fecha_vencimiento?: string | null;
        };
        /** GuardarMetodoPagoRequest */
        GuardarMetodoPagoRequest: {
            nombre: string;
            /** @enum {string} */
            tipo: "efectivo" | "tarjeta" | "transferencia" | "digital" | "otro";
            incluir_en_financiero: boolean;
        };
        /** GuardarProductoRequest */
        GuardarProductoRequest: {
            nombre: string;
            descripcion?: string | null;
            categoria_id?: number | null;
            departamento_id?: number | null;
            precio_compra?: number | null;
            precio_venta?: number | null;
            imagen_url?: string | null;
            no_resurtible?: boolean | null;
            sin_descuento?: boolean | null;
        };
        /** GuardarProductoVarianteRequest */
        GuardarProductoVarianteRequest: {
            talla?: string | null;
            color?: string | null;
            codigo_barras?: string | null;
        };
        /** GuardarReglaPrecioRequest */
        GuardarReglaPrecioRequest: {
            nombre: string;
            /** @enum {string} */
            tipo: "porcentaje" | "monto_fijo" | "nxm" | "bundle";
            valor?: number | null;
            cantidad_compra?: number | null;
            cantidad_paga?: number | null;
            precio_bundle?: number | null;
            /** @enum {string} */
            aplica_a: "todo" | "categoria" | "producto" | "variante";
            categoria_id?: number | null;
            producto_id?: number | null;
            variante_id?: number | null;
            /** Format: date-time */
            fecha_inicio?: string | null;
            /** Format: date-time */
            fecha_fin?: string | null;
        };
        /** GuardarRolRequest */
        GuardarRolRequest: {
            nombre: string;
            descripcion?: string | null;
            permisos?: number[] | null;
        };
        /** GuardarUnidadMedidaRequest */
        GuardarUnidadMedidaRequest: {
            nombre: string;
            abreviatura: string;
            /** @enum {string} */
            tipo: "entero" | "fraccionario";
        };
        /** GuardarUsuarioRequest */
        GuardarUsuarioRequest: {
            nombre: string;
            apellido?: string | null;
            alias?: string | null;
            /** Format: email */
            correo: string;
            password: string;
            telefono?: string | null;
            sucursal_id?: number | null;
            /**
             * @description Todo usuario de un tenant tiene al menos un rol: sin rol entra pero no ve nada.
             *     En edicion es parcial: si `roles` no llega, conserva los actuales.
             */
            roles: number[];
        };
        /** InsumoResource */
        InsumoResource: {
            id: number;
            nombre: string;
            sku: string | null;
            unidad_medida_id: number;
            costo: string;
            stock_minimo: string;
            activo: boolean;
        };
        /** InsumoStock */
        InsumoStock: {
            id: number;
            insumo_id: number;
            sucursal_id: number;
            cantidad: string;
            lote: string | null;
            /** Format: date-time */
            fecha_vencimiento: string | null;
            /** Format: date-time */
            updated_at: string;
        };
        /** LicenciaLocalResource */
        LicenciaLocalResource: {
            estado: string;
            tipo: string;
            /** Format: date-time */
            fecha_expiracion: string | null;
            /** Format: date-time */
            ultima_validacion: string | null;
            dias_desde_ultima_validacion: number | null;
            /**
             * @description Heuristica, no un campo propio: no hay un timestamp separado
             *     de "ultimo intento" vs "ultima validacion exitosa" en
             *     licencia_local, asi que esto solo puede inferirse comparando
             *     ultima_validacion contra el intervalo de revalidacion
             *     esperado (>=1 dia sin contacto exitoso, con el estado
             *     todavia "en funcionamiento").
             */
            en_periodo_gracia: boolean;
        };
        /** LoyaltyTransaccion */
        LoyaltyTransaccion: {
            id: number;
            tenant_id: number;
            cliente_id: number;
            tipo: string;
            puntos: number;
            referencia_tabla: string | null;
            referencia_id: number | null;
            /** Format: date-time */
            expira_en: string | null;
            /** Format: date-time */
            created_at: string;
        };
        /** MetodoPago */
        MetodoPago: {
            id: number;
            tenant_id: number | null;
            nombre: string;
            tipo: string;
            incluir_en_financiero: boolean;
            activo: boolean;
        };
        /** MetodoPagoResource */
        MetodoPagoResource: {
            id: number;
            nombre: string;
            tipo: string;
            incluir_en_financiero: boolean;
            activo: boolean;
            /**
             * @description El frontend usa esto para bloquear editar/desactivar en las
             *     filas del catalogo global sembrado (Efectivo/Tarjeta/
             *     Transferencia) -- ver MetodoPagoController::rechazarSiEsGlobal().
             */
            es_global: boolean;
        };
        /** NominaDetalleResource */
        NominaDetalleResource: {
            id: number;
            empleado?: {
                id: number;
                usuario: {
                    id: number;
                    nombre: string;
                } | null;
            };
            dias_trabajados: number;
            percepciones: string;
            deducciones: string;
            neto: string;
        };
        /** NominaResource */
        NominaResource: {
            id: number;
            /** Format: date-time */
            periodo_inicio: string;
            /** Format: date-time */
            periodo_fin: string;
            total_percepciones: string;
            total_deducciones: string;
            total_neto: string;
            estado: string;
            /** Format: date-time */
            fecha_pago: string | null;
            detalles?: components["schemas"]["NominaDetalleResource"][];
        };
        /** NotaCreditoResource */
        NotaCreditoResource: {
            id: number;
            cliente?: {
                id: number;
                nombre: string;
            };
            devolucion_id: number;
            monto_original: string;
            saldo_disponible: string;
            /** Format: date-time */
            fecha_expiracion: string | null;
            estado: string;
            usos?: components["schemas"]["NotaCreditoUso"][];
            /** Format: date-time */
            created_at: string;
        };
        /** NotaCreditoUso */
        NotaCreditoUso: {
            id: number;
            nota_credito_id: number;
            venta_id: number;
            monto_usado: string;
            created_at: string;
        };
        /** OrdenProduccionResource */
        OrdenProduccionResource: {
            id: number;
            receta?: {
                id: number;
                nombre: string;
            };
            cantidad_programada: number;
            cantidad_producida: number | null;
            estado: string;
            notas: string | null;
            /** Format: date-time */
            fecha_programada: string | null;
            /** Format: date-time */
            fecha_completada: string | null;
            /** Format: date-time */
            created_at: string;
        };
        /** PagarCuotaRequest */
        PagarCuotaRequest: {
            cuota_id: number;
            monto?: number | null;
        };
        /** PedidoItemResource */
        PedidoItemResource: {
            id: number;
            variante_id: number;
            cantidad: number;
            precio_unitario: string;
            subtotal: string;
        };
        /** PedidoResource */
        PedidoResource: {
            id: number;
            numero_pedido: string;
            cliente?: {
                id: number;
                nombre: string;
            };
            repartidor?: {
                id: number;
                nombre: string;
            };
            referencia: string | null;
            direccion_entrega: string | null;
            costo_delivery: string;
            estado: string;
            tiempo_estimado: number | null;
            notas: string | null;
            /** Format: date-time */
            fecha_entrega: string | null;
            items?: components["schemas"]["PedidoItemResource"][];
            /** Format: date-time */
            created_at: string;
        };
        /** Permiso */
        Permiso: {
            id: number;
            modulo: string;
            accion: string;
            nombre: string;
            descripcion: string | null;
            /** Format: date-time */
            created_at: string;
        };
        /** PlanPagoCliente */
        PlanPagoCliente: {
            id: number;
            tenant_id: number;
            cliente_id: number;
            concepto: string;
            monto_total: string;
            /** Format: date-time */
            fecha_inicio: string;
            /** Format: date-time */
            created_at: string;
            venta_id: number | null;
            interes_total: string;
            tasa_interes: string | null;
            numero_cuotas: number;
            periodicidad: string;
        };
        /** PlanPagoClienteCuota */
        PlanPagoClienteCuota: {
            id: number;
            plan_pago_cliente_id: number;
            numero_cuota: number;
            monto: string;
            /** Format: date-time */
            fecha_vencimiento: string;
            /** Format: date-time */
            fecha_pago: string | null;
            estado: string;
            monto_interes: string;
            monto_capital: string;
            /** Format: date-time */
            fecha_pago_real: string | null;
        };
        /** PlanPagoResource */
        PlanPagoResource: {
            id: number;
            cliente?: {
                id: number;
                nombre: string;
            };
            venta_id: number | null;
            concepto: string;
            monto_total: string;
            interes_total: string;
            tasa_interes: string | null;
            numero_cuotas: number;
            periodicidad: string;
            /** Format: date-time */
            fecha_inicio: string;
            cuotas?: components["schemas"]["PlanPagoClienteCuota"][];
            /** Format: date-time */
            created_at: string;
        };
        /** PrestamoPago */
        PrestamoPago: {
            id: number;
            prestamo_id: number;
            caja_sesion_id: number | null;
            monto: string;
            /** Format: date-time */
            fecha: string;
            notas: string | null;
        };
        /** PrestamoResource */
        PrestamoResource: {
            id: number;
            proveedor_id: number | null;
            referencia: string | null;
            monto: string;
            interes: string;
            monto_a_pagar: string;
            saldo_pendiente: string;
            /** Format: date-time */
            fecha_prestamo: string;
            /** Format: date-time */
            fecha_vencimiento: string | null;
            estado: string;
            notas: string | null;
            pagos?: components["schemas"]["PrestamoPago"][];
        };
        /** ProductoResource */
        ProductoResource: {
            id: number;
            nombre: string;
            descripcion: string | null;
            categoria?: {
                id: number;
                nombre: string;
            } | null;
            departamento?: {
                id: number;
                nombre: string;
            } | null;
            precio_compra: string;
            precio_venta: string;
            imagen_url: string | null;
            no_resurtible: boolean;
            sin_descuento: boolean;
            activo: boolean;
            /**
             * @description Solo presente en index() (via selectSub) -- show() no lo
             *     necesita, ahi se ven las variantes con su stock por sucursal
             *     directamente. Se consulta getAttributes() (no el atributo)
             *     para no disparar MissingAttributeException cuando la consulta
             *     no selecciono stock_total.
             */
            stock_total?: number;
            variantes?: components["schemas"]["ProductoVarianteResource"][];
        };
        /** ProductoVarianteResource */
        ProductoVarianteResource: {
            id: number;
            producto_id: number;
            talla: string | null;
            color: string | null;
            codigo_barras: string | null;
            activo: boolean;
            /**
             * @description Solo las filas que YA existen en inventario_stock -- una
             *     sucursal sin movimientos registrados todavia simplemente no
             *     aparece, no se sintetiza una fila en cero (ver
             *     InventarioService::registrarMovimiento(), la unica escritura
             *     real de esta tabla).
             */
            stock?: {
                sucursal_id: number;
                sucursal_nombre: string;
                stock_actual: number;
                stock_minimo: number;
            }[];
            /**
             * @description Resuelto server-side para la sucursal del usuario que pide el
             *     recurso -- a diferencia de `stock` (todas las sucursales, para
             *     la pantalla de Inventario), esto es lo unico que necesita el
             *     TPV/Apartados para validar la cantidad en vivo antes de
             *     someter (ver LineasProductoComponent). 0 si no hay fila
             *     todavia, nunca null, para que el frontend no tenga que
             *     distinguir "sin stock" de "sin dato".
             */
            stock_actual?: number;
        };
        /** Proveedor */
        Proveedor: {
            id: number;
            tenant_id: number;
            razon_social: string;
            rfc: string | null;
            telefono: string | null;
            correo: string | null;
            direccion: string | null;
            activo: boolean;
            /** Format: date-time */
            created_at: string;
        };
        /** RecargarGiftCardRequest */
        RecargarGiftCardRequest: {
            monto: number;
        };
        /** RecetaIngrediente */
        RecetaIngrediente: {
            id: number;
            receta_id: number;
            insumo_id: number;
            cantidad: string;
            unidad_medida_id: number;
        };
        /** RecetaResource */
        RecetaResource: {
            id: number;
            variante_id: number;
            nombre: string;
            descripcion: string | null;
            instrucciones: string | null;
            rendimiento: string;
            ingredientes?: components["schemas"]["RecetaIngrediente"][];
        };
        /** RegistrarAbonoRequest */
        RegistrarAbonoRequest: {
            monto: number;
            pagos: {
                metodo_pago_id: number;
                monto: number;
            }[];
            notas?: string | null;
        };
        /** RegistrarCompraRequest */
        RegistrarCompraRequest: {
            proveedor_id: number;
            numero_comprobante?: string | null;
            items: {
                variante_id: number;
                cantidad: number;
                precio_compra: number;
            }[];
        };
        /** RegistrarPagoPrestamoRequest */
        RegistrarPagoPrestamoRequest: {
            monto: number;
            caja_sesion_id?: number | null;
            notas?: string | null;
        };
        /** RegistrarPagoRequest */
        RegistrarPagoRequest: {
            monto: number;
            metodo_pago_id: number;
            referencia?: string | null;
        };
        /** ReglaPrecioResource */
        ReglaPrecioResource: {
            id: number;
            nombre: string;
            tipo: string;
            valor: string | null;
            cantidad_compra: number | null;
            cantidad_paga: number | null;
            precio_bundle: string | null;
            aplica_a: string;
            /**
             * @description El nombre de la entidad especifica, no solo el nivel -- ver
             *     el requisito de la columna "a que aplica" en la lista.
             */
            categoria?: {
                id: number;
                nombre: string;
            } | null;
            producto?: {
                id: number;
                nombre: string;
            } | null;
            variante?: {
                id: number;
                talla: string | null;
                color: string | null;
                producto_nombre: string;
            } | null;
            /** Format: date-time */
            fecha_inicio: string | null;
            /** Format: date-time */
            fecha_fin: string | null;
            activo: boolean;
        };
        /** RolResource */
        RolResource: {
            id: number;
            nombre: string;
            descripcion: string | null;
            es_sistema: boolean;
            usuarios_count?: number;
            permisos?: unknown[];
        };
        /** SesionResource */
        SesionResource: {
            usuario: components["schemas"]["UsuarioResource"];
            sucursal: {
                id: number;
                nombre: string;
            } | null;
            terminal: null;
            permisos: string[];
            modulos_activos: string[];
            regional: {
                locale: string;
                moneda: string;
                zona_horaria: string;
            };
            perfil_giro: null;
        };
        /** Sucursal */
        Sucursal: {
            id: number;
            tenant_id: number;
            nombre: string;
            direccion: string | null;
            telefono: string | null;
            activo: boolean;
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            updated_at: string;
        };
        /** TransformacionResource */
        TransformacionResource: {
            id: number;
            variante_origen_id: number;
            variante_destino_id: number;
            cantidad_origen: string;
            cantidad_destino: string;
            notas: string | null;
            /** Format: date-time */
            created_at: string;
        };
        /** UnidadMedidaResource */
        UnidadMedidaResource: {
            id: number;
            nombre: string;
            abreviatura: string;
            tipo: string;
            activo: boolean;
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            updated_at: string;
        };
        /** UsuarioAdminResource */
        UsuarioAdminResource: {
            id: number;
            nombre: string;
            apellido: string | null;
            alias: string | null;
            correo: string;
            telefono: string | null;
            activo: boolean;
            /** Format: date-time */
            ultimo_login: string | null;
            dos_factor_confirmado: boolean;
            sucursal?: {
                id: number;
                nombre: string;
            } | null;
            roles?: {
                id: number;
                nombre: string;
            }[];
        };
        /** UsuarioResource */
        UsuarioResource: {
            id: number;
            nombre: string;
            apellido: string | null;
            correo: string;
            tenant_id: number | null;
            sucursal_id: number | null;
            es_superadmin: boolean;
            roles: string[];
            requiere_dos_factor: boolean;
            dos_factor_confirmado: boolean;
        };
        /** ValidarCuponRequest */
        ValidarCuponRequest: {
            codigo: string;
            total: number;
        };
        /** Venta */
        Venta: {
            id: number;
            tenant_id: number;
            sucursal_id: number;
            caja_sesion_id: number;
            usuario_id: number;
            cliente_id: number;
            cupon_id: number | null;
            /** Format: date-time */
            fecha: string;
            total: string;
            descuento_cupon: string;
            descuento_manual: string;
            abono_previo: string;
            es_venta_sombra: boolean;
            estado: string;
            motivo_anulacion: string | null;
            /** Format: date-time */
            fecha_anulacion: string | null;
            usuario_anulacion_id: number | null;
            serie_cfdi: string | null;
            folio_cfdi: number | null;
            forma_pago_sat: string | null;
            metodo_pago_sat: string | null;
            uso_cfdi: string | null;
        };
        /** VentaResource */
        VentaResource: {
            id: number;
            /** Format: date-time */
            fecha: string;
            cliente?: {
                id: number;
                nombre: string;
            } | null;
            total: string;
            descuento_cupon: string;
            descuento_manual: string;
            abono_previo: string;
            estado: string;
            motivo_anulacion: string | null;
            /** Format: date-time */
            fecha_anulacion: string | null;
            es_venta_sombra: boolean;
            metodos_pago?: {
                metodo_pago_id: number;
                nombre: string;
                monto: string;
            }[];
            detalles?: {
                id: number;
                variante_id: number;
                variante: {
                    id: number;
                    talla: string | null;
                    color: string | null;
                    producto_nombre: string;
                } | null;
                cantidad: number;
                precio_unitario: string;
                descuento_aplicado: string;
                subtotal: string;
            }[];
        };
    };
    responses: {
        /** @description Unauthenticated */
        AuthenticationException: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    /** @description Error overview. */
                    message: string;
                };
            };
        };
        /** @description Validation error */
        ValidationException: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    /** @description Errors overview. */
                    message: string;
                    /** @description A detailed description of each field that failed validation. */
                    errors: {
                        [key: string]: string[];
                    };
                };
            };
        };
        /** @description Not found */
        ModelNotFoundException: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    /** @description Error overview. */
                    message: string;
                };
            };
        };
    };
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type AbonoCuenta = components['schemas']['AbonoCuenta'];
export type AbonoCuentaResource = components['schemas']['AbonoCuentaResource'];
export type AbonoPagar = components['schemas']['AbonoPagar'];
export type AbonoPagarResource = components['schemas']['AbonoPagarResource'];
export type AbrirCajaRequest = components['schemas']['AbrirCajaRequest'];
export type ActualizarConfiguracionRequest = components['schemas']['ActualizarConfiguracionRequest'];
export type ActualizarConfiguracionSeguridadRequest = components['schemas']['ActualizarConfiguracionSeguridadRequest'];
export type ActualizarCotizacionRequest = components['schemas']['ActualizarCotizacionRequest'];
export type AjustarPuntosRequest = components['schemas']['AjustarPuntosRequest'];
export type AnularVentaRequest = components['schemas']['AnularVentaRequest'];
export type ApartadoResource = components['schemas']['ApartadoResource'];
export type AppModulesCuentasCobrarHttpRequestsRegistrarAbonoRequest = components['schemas']['App.Modules.CuentasCobrar.Http.Requests.RegistrarAbonoRequest'];
export type AsignarRepartidorRequest = components['schemas']['AsignarRepartidorRequest'];
export type CajaSesionResource = components['schemas']['CajaSesionResource'];
export type CambiarEstadoOrdenRequest = components['schemas']['CambiarEstadoOrdenRequest'];
export type CambiarEstadoPedidoRequest = components['schemas']['CambiarEstadoPedidoRequest'];
export type CambiarPasswordRequest = components['schemas']['CambiarPasswordRequest'];
export type CancelarApartadoRequest = components['schemas']['CancelarApartadoRequest'];
export type Categoria = components['schemas']['Categoria'];
export type CategoriaResource = components['schemas']['CategoriaResource'];
export type CerrarCajaRequest = components['schemas']['CerrarCajaRequest'];
export type ClienteResource = components['schemas']['ClienteResource'];
export type ConfiguracionSeguridadResource = components['schemas']['ConfiguracionSeguridadResource'];
export type ConfiguracionTenantResource = components['schemas']['ConfiguracionTenantResource'];
export type ConfirmTwoFactorRequest = components['schemas']['ConfirmTwoFactorRequest'];
export type ConvertirCotizacionRequest = components['schemas']['ConvertirCotizacionRequest'];
export type CotizacionDetalleResource = components['schemas']['CotizacionDetalleResource'];
export type CotizacionResource = components['schemas']['CotizacionResource'];
export type CotizarVentaRequest = components['schemas']['CotizarVentaRequest'];
export type CrearApartadoRequest = components['schemas']['CrearApartadoRequest'];
export type CrearCotizacionRequest = components['schemas']['CrearCotizacionRequest'];
export type CrearDevolucionRequest = components['schemas']['CrearDevolucionRequest'];
export type CrearEmpleadoRequest = components['schemas']['CrearEmpleadoRequest'];
export type CrearGastoRequest = components['schemas']['CrearGastoRequest'];
export type CrearInsumoRequest = components['schemas']['CrearInsumoRequest'];
export type CrearInteraccionRequest = components['schemas']['CrearInteraccionRequest'];
export type CrearOrdenProduccionRequest = components['schemas']['CrearOrdenProduccionRequest'];
export type CrearPedidoRequest = components['schemas']['CrearPedidoRequest'];
export type CrearPlanPagoRequest = components['schemas']['CrearPlanPagoRequest'];
export type CrearPrestamoRequest = components['schemas']['CrearPrestamoRequest'];
export type CrearProveedorRequest = components['schemas']['CrearProveedorRequest'];
export type CrearRecetaRequest = components['schemas']['CrearRecetaRequest'];
export type CrearTransformacionRequest = components['schemas']['CrearTransformacionRequest'];
export type CrearVentaRequest = components['schemas']['CrearVentaRequest'];
export type CrmCampana = components['schemas']['CrmCampana'];
export type CrmCampanaResource = components['schemas']['CrmCampanaResource'];
export type CrmInteraccionResource = components['schemas']['CrmInteraccionResource'];
export type CuentaCobrarResource = components['schemas']['CuentaCobrarResource'];
export type CuentaPagarResource = components['schemas']['CuentaPagarResource'];
export type CuponResource = components['schemas']['CuponResource'];
export type Departamento = components['schemas']['Departamento'];
export type DepartamentoResource = components['schemas']['DepartamentoResource'];
export type DevolucionResource = components['schemas']['DevolucionResource'];
export type EmitirGiftCardRequest = components['schemas']['EmitirGiftCardRequest'];
export type EmpleadoResource = components['schemas']['EmpleadoResource'];
export type EnviarCampanaRequest = components['schemas']['EnviarCampanaRequest'];
export type GastoResource = components['schemas']['GastoResource'];
export type GenerarNominaRequest = components['schemas']['GenerarNominaRequest'];
export type GiftCardResource = components['schemas']['GiftCardResource'];
export type GuardarCategoriaRequest = components['schemas']['GuardarCategoriaRequest'];
export type GuardarClienteRequest = components['schemas']['GuardarClienteRequest'];
export type GuardarCuponRequest = components['schemas']['GuardarCuponRequest'];
export type GuardarDepartamentoRequest = components['schemas']['GuardarDepartamentoRequest'];
export type GuardarInsumoStockRequest = components['schemas']['GuardarInsumoStockRequest'];
export type GuardarMetodoPagoRequest = components['schemas']['GuardarMetodoPagoRequest'];
export type GuardarProductoRequest = components['schemas']['GuardarProductoRequest'];
export type GuardarProductoVarianteRequest = components['schemas']['GuardarProductoVarianteRequest'];
export type GuardarReglaPrecioRequest = components['schemas']['GuardarReglaPrecioRequest'];
export type GuardarRolRequest = components['schemas']['GuardarRolRequest'];
export type GuardarUnidadMedidaRequest = components['schemas']['GuardarUnidadMedidaRequest'];
export type GuardarUsuarioRequest = components['schemas']['GuardarUsuarioRequest'];
export type InsumoResource = components['schemas']['InsumoResource'];
export type InsumoStock = components['schemas']['InsumoStock'];
export type LicenciaLocalResource = components['schemas']['LicenciaLocalResource'];
export type LoyaltyTransaccion = components['schemas']['LoyaltyTransaccion'];
export type MetodoPago = components['schemas']['MetodoPago'];
export type MetodoPagoResource = components['schemas']['MetodoPagoResource'];
export type NominaDetalleResource = components['schemas']['NominaDetalleResource'];
export type NominaResource = components['schemas']['NominaResource'];
export type NotaCreditoResource = components['schemas']['NotaCreditoResource'];
export type NotaCreditoUso = components['schemas']['NotaCreditoUso'];
export type OrdenProduccionResource = components['schemas']['OrdenProduccionResource'];
export type PagarCuotaRequest = components['schemas']['PagarCuotaRequest'];
export type PedidoItemResource = components['schemas']['PedidoItemResource'];
export type PedidoResource = components['schemas']['PedidoResource'];
export type Permiso = components['schemas']['Permiso'];
export type PlanPagoCliente = components['schemas']['PlanPagoCliente'];
export type PlanPagoClienteCuota = components['schemas']['PlanPagoClienteCuota'];
export type PlanPagoResource = components['schemas']['PlanPagoResource'];
export type PrestamoPago = components['schemas']['PrestamoPago'];
export type PrestamoResource = components['schemas']['PrestamoResource'];
export type ProductoResource = components['schemas']['ProductoResource'];
export type ProductoVarianteResource = components['schemas']['ProductoVarianteResource'];
export type Proveedor = components['schemas']['Proveedor'];
export type RecargarGiftCardRequest = components['schemas']['RecargarGiftCardRequest'];
export type RecetaIngrediente = components['schemas']['RecetaIngrediente'];
export type RecetaResource = components['schemas']['RecetaResource'];
export type RegistrarAbonoRequest = components['schemas']['RegistrarAbonoRequest'];
export type RegistrarCompraRequest = components['schemas']['RegistrarCompraRequest'];
export type RegistrarPagoPrestamoRequest = components['schemas']['RegistrarPagoPrestamoRequest'];
export type RegistrarPagoRequest = components['schemas']['RegistrarPagoRequest'];
export type ReglaPrecioResource = components['schemas']['ReglaPrecioResource'];
export type RolResource = components['schemas']['RolResource'];
export type SesionResource = components['schemas']['SesionResource'];
export type Sucursal = components['schemas']['Sucursal'];
export type TransformacionResource = components['schemas']['TransformacionResource'];
export type UnidadMedidaResource = components['schemas']['UnidadMedidaResource'];
export type UsuarioAdminResource = components['schemas']['UsuarioAdminResource'];
export type UsuarioResource = components['schemas']['UsuarioResource'];
export type ValidarCuponRequest = components['schemas']['ValidarCuponRequest'];
export type Venta = components['schemas']['Venta'];
export type VentaResource = components['schemas']['VentaResource'];
export type ResponseAuthenticationException = components['responses']['AuthenticationException'];
export type ResponseValidationException = components['responses']['ValidationException'];
export type ResponseModelNotFoundException = components['responses']['ModelNotFoundException'];
export type $defs = Record<string, never>;
export interface operations {
    "apartado.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ApartadoResource"][];
                        meta: {
                            total: number;
                            permisos: {
                                crear: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "apartado.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CrearApartadoRequest"];
            };
        };
        responses: {
            /** @description `ApartadoResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ApartadoResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "apartado.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The apartado ID */
                apartado: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ApartadoResource"] & Record<string, never>;
                        meta: {
                            permisos: {
                                abonar: boolean;
                                cancelar: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "apartado.registrarAbono": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The apartado ID */
                apartado: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegistrarAbonoRequest"];
            };
        };
        responses: {
            /** @description `ApartadoResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ApartadoResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "apartado.liquidar": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The apartado ID */
                apartado: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `ApartadoResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ApartadoResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "apartado.cancelar": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The apartado ID */
                apartado: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CancelarApartadoRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ApartadoResource"] & Record<string, never>;
                        meta: {
                            tiene_abonos_pendientes: boolean;
                            monto_abonado_pendiente: number;
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "auditoria.index": {
        parameters: {
            query: {
                tabla: string;
                registro_id: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            id: number;
                            tabla_afectada: string;
                            registro_id: number;
                            accion: string;
                            usuario_id: number | null;
                            usuario_nombre: string | null;
                            cambios: unknown[] | null;
                            /** Format: date-time */
                            fecha: string;
                        }[];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "auditoria.global": {
        parameters: {
            query?: {
                tabla?: string | null;
                usuario_id?: number | null;
                fecha_desde?: string | null;
                fecha_hasta?: string | null;
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            id: number;
                            tabla_afectada: string;
                            registro_id: number;
                            accion: string;
                            usuario_id: number | null;
                            usuario_nombre: string | null;
                            cambios: unknown[] | null;
                            /** Format: date-time */
                            fecha: string;
                        }[];
                        meta: {
                            total: number;
                            tablas: unknown[];
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "caja.actual": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CajaSesionResource"] | null;
                        meta: {
                            resumen: {
                                ventas_count: number;
                                total_ventas: number;
                                total_gastos: number;
                            } | null;
                            permisos: {
                                abrir: boolean;
                                cerrar: boolean;
                                gastos_ver: boolean;
                                gastos_crear: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "caja.abrir": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AbrirCajaRequest"];
            };
        };
        responses: {
            /** @description `CajaSesionResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CajaSesionResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "caja.cerrar": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The caja sesion ID */
                cajaSesion: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CerrarCajaRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CajaSesionResource"];
                        desglose: {
                            total_gastos: number;
                            total_abonos_cxc: number;
                            total_recargas_gc: number;
                            total_pagos_cxp: number;
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "categoria.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CategoriaResource"][];
                        meta: {
                            total: number;
                            permisos: {
                                crear: boolean;
                                editar: boolean;
                                eliminar: boolean;
                            };
                        };
                    } | {
                        data: components["schemas"]["Categoria"][];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "categoria.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarCategoriaRequest"];
            };
        };
        responses: {
            /** @description `CategoriaResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CategoriaResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "categoria.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The categoria ID */
                categoria: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CategoriaResource"];
                        meta: {
                            permisos: {
                                crear: boolean;
                                editar: boolean;
                                eliminar: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "categoria.update": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The categoria ID */
                categoria: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarCategoriaRequest"];
            };
        };
        responses: {
            /** @description `CategoriaResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CategoriaResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "categoria.desactivar": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The categoria ID */
                categoria: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `CategoriaResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CategoriaResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "cliente.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ClienteResource"][];
                        meta: {
                            total: number;
                            /**
                             * @description El frontend oculta "Nuevo cliente" y las acciones de editar
                             *     segun esto -- reacciona a lo que dice el backend, nunca a una
                             *     lista de roles hardcodeada en el cliente. Va aqui (en vez de
                             *     exigir una llamada de sondeo aparte, como el 403 de
                             *     /api/configuracion-seguridad) porque la lista YA se pide
                             *     siempre al entrar a la pantalla.
                             */
                            permisos: {
                                crear: boolean;
                                editar: boolean;
                                eliminar: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "cliente.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarClienteRequest"];
            };
        };
        responses: {
            /** @description `ClienteResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ClienteResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "cliente.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The cliente ID */
                cliente: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ClienteResource"];
                        meta: {
                            permisos: {
                                editar: boolean;
                                eliminar: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "cliente.update": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The cliente ID */
                cliente: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarClienteRequest"];
            };
        };
        responses: {
            /** @description `ClienteResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ClienteResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "cliente.desactivar": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The cliente ID */
                cliente: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `ClienteResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ClienteResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "compra.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegistrarCompraRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            id: number;
                            total: string;
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "configuracion.show": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `ConfiguracionTenantResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ConfiguracionTenantResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "configuracion.update": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ActualizarConfiguracionRequest"];
            };
        };
        responses: {
            /** @description `ConfiguracionTenantResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ConfiguracionTenantResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "configuracion.publica": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        codigo_barras_automatico: boolean;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "configuracionSeguridad.show": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `ConfiguracionSeguridadResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConfiguracionSeguridadResource"];
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "configuracionSeguridad.update": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ActualizarConfiguracionSeguridadRequest"];
            };
        };
        responses: {
            /** @description `ConfiguracionSeguridadResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConfiguracionSeguridadResource"];
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "cotizacion.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CotizacionResource"][];
                        meta: {
                            total: number;
                            permisos: {
                                [key: string]: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "cotizacion.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CrearCotizacionRequest"];
            };
        };
        responses: {
            /** @description `CotizacionResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CotizacionResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "cotizacion.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The cotizacion ID */
                cotizacion: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CotizacionResource"] & Record<string, never>;
                        meta: {
                            permisos: {
                                [key: string]: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "cotizacion.update": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ActualizarCotizacionRequest"];
            };
        };
        responses: {
            /** @description `CotizacionResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CotizacionResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "cotizacion.destroy": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @constant */
                        message: "Cotización anulada correctamente.";
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "cotizacion.convertir": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConvertirCotizacionRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @constant */
                        message: "Cotización convertida a venta correctamente.";
                        venta_id: number;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "crmAvanzado.interacciones": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The cliente ID */
                cliente: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CrmInteraccionResource"][];
                        meta: {
                            permisos: unknown[];
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "crmAvanzado.crearInteraccion": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The cliente ID */
                cliente: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CrearInteraccionRequest"];
            };
        };
        responses: {
            /** @description `CrmInteraccionResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CrmInteraccionResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "crmAvanzado.loyalty": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The cliente ID */
                cliente: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            cliente: {
                                id: number;
                                nombre: string;
                            };
                            puntos_loyalty: number;
                            puntos_acumulados: number;
                            historial: components["schemas"]["LoyaltyTransaccion"][];
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "crmAvanzado.ajustarPuntos": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The cliente ID */
                cliente: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AjustarPuntosRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @constant */
                        message: "Puntos ajustados correctamente.";
                        data: components["schemas"]["LoyaltyTransaccion"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "crmAvanzado.enviarCampana": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EnviarCampanaRequest"];
            };
        };
        responses: {
            /** @description `CrmCampanaResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CrmCampanaResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "crmAvanzado.reporte": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            clientes_por_segmento: {
                                /** @constant */
                                nuevo: 0;
                                /** @constant */
                                frecuente: 0;
                                /** @constant */
                                vip: 0;
                                /** @constant */
                                inactivo: 0;
                            };
                            interacciones_por_tipo: unknown[];
                            loyalty: {
                                puntos_ganados_total: number;
                                puntos_canjeados_total: number;
                                puntos_vencidos_total: number;
                                saldo_actual_total: number;
                            };
                            campanas_recientes: components["schemas"]["CrmCampana"][];
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "cuentaCobrar.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CuentaCobrarResource"][];
                        meta: {
                            total: number;
                            permisos: unknown[];
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "cuentaCobrar.reporte": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            total_pendiente: number;
                            total_vencido: number;
                            por_antiguedad: {
                                al_dia: string;
                                vencido_1_30: string;
                                vencido_31_60: string;
                                vencido_61_90: string;
                                vencido_90_mas: string;
                            };
                            por_cliente: {
                                cliente_id: number;
                                cliente_nombre: string;
                                saldo_pendiente: number;
                                cuentas_pendientes: number;
                            }[];
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "cuentaCobrar.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The cuenta cobrar ID */
                cuentaCobrar: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `CuentaCobrarResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CuentaCobrarResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "cuentaCobrar.registrarAbono": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["App.Modules.CuentasCobrar.Http.Requests.RegistrarAbonoRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            abono: components["schemas"]["AbonoCuenta"];
                            cuenta: {
                                id: number;
                                saldo_pendiente: string;
                                estado: string;
                            };
                        };
                        /** @constant */
                        message: "Abono registrado correctamente";
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "cuentaCobrar.anular": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @constant */
                        message: "Cuenta por cobrar anulada correctamente.";
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "cuentaPagar.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CuentaPagarResource"][];
                        meta: {
                            total: number;
                            permisos: unknown[];
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "cuentaPagar.reporte": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            total_pendiente: number;
                            total_vencido: number;
                            por_antiguedad: {
                                al_dia: string;
                                vencido_1_30: string;
                                vencido_31_60: string;
                                vencido_61_90: string;
                                vencido_90_mas: string;
                            };
                            por_proveedor: {
                                proveedor_id: number;
                                proveedor_nombre: string;
                                saldo_pendiente: number;
                                cuentas_pendientes: number;
                            }[];
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "cuentaPagar.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The cuenta pagar ID */
                cuentaPagar: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `CuentaPagarResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CuentaPagarResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "cuentaPagar.registrarPago": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegistrarPagoRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            abono: components["schemas"]["AbonoPagar"];
                            cuenta: {
                                id: number;
                                saldo_pendiente: string;
                                estado: string;
                            };
                        };
                        /** @constant */
                        message: "Pago registrado correctamente";
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "cuentaPagar.anular": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @constant */
                        message: "Cuenta por pagar anulada correctamente.";
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "cupon.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CuponResource"][];
                        meta: {
                            total: number;
                            permisos: {
                                crear: boolean;
                                editar: boolean;
                                eliminar: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "cupon.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarCuponRequest"];
            };
        };
        responses: {
            /** @description `CuponResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CuponResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "cupon.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The cupon ID */
                cupon: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CuponResource"];
                        meta: {
                            permisos: {
                                editar: boolean;
                                eliminar: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "cupon.update": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The cupon ID */
                cupon: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarCuponRequest"];
            };
        };
        responses: {
            /** @description `CuponResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CuponResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "cupon.desactivar": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The cupon ID */
                cupon: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `CuponResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["CuponResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "cupon.validar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ValidarCuponRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            cupon: {
                                id: string;
                                codigo: string;
                                nombre: string;
                                tipo: string;
                                valor: string;
                            };
                            descuento: unknown;
                            total_con_descuento: number;
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "departamento.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["DepartamentoResource"][];
                        meta: {
                            total: number;
                            permisos: {
                                crear: boolean;
                                editar: boolean;
                                eliminar: boolean;
                            };
                        };
                    } | {
                        data: components["schemas"]["Departamento"][];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "departamento.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarDepartamentoRequest"];
            };
        };
        responses: {
            /** @description `DepartamentoResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["DepartamentoResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "departamento.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The departamento ID */
                departamento: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["DepartamentoResource"];
                        meta: {
                            permisos: {
                                crear: boolean;
                                editar: boolean;
                                eliminar: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "departamento.update": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The departamento ID */
                departamento: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarDepartamentoRequest"];
            };
        };
        responses: {
            /** @description `DepartamentoResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["DepartamentoResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "departamento.desactivar": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The departamento ID */
                departamento: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `DepartamentoResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["DepartamentoResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "devolucion.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: (components["schemas"]["DevolucionResource"] & Record<string, never>)[];
                        meta: {
                            total: number;
                            permisos: {
                                crear: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "devolucion.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CrearDevolucionRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["DevolucionResource"] & Record<string, never>;
                        nota_credito: {
                            id: number;
                            monto_original: string;
                        } | null;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "devolucion.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The devolucion ID */
                devolucion: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `DevolucionResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["DevolucionResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "dispositivosConfiables.index": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            id: number;
                            user_agent: string | null;
                            ip_registro: string | null;
                            /** Format: date-time */
                            fecha_creacion: string;
                            /** Format: date-time */
                            fecha_expiracion: string;
                            es_actual: boolean;
                        }[];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "dispositivosConfiables.destroyTodos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "dispositivosConfiables.destroy": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                dispositivo: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "gasto.index": {
        parameters: {
            query: {
                caja_sesion_id: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["GastoResource"][];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "gasto.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CrearGastoRequest"];
            };
        };
        responses: {
            /** @description `GastoResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["GastoResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "giftCard.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["GiftCardResource"][];
                        meta: {
                            total: number;
                            permisos: unknown[];
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "giftCard.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmitirGiftCardRequest"];
            };
        };
        responses: {
            /** @description `GiftCardResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["GiftCardResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "giftCard.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The gift card ID */
                giftCard: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `GiftCardResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["GiftCardResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "giftCard.recargar": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RecargarGiftCardRequest"];
            };
        };
        responses: {
            /** @description `GiftCardResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["GiftCardResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "giftCard.cancelar": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @constant */
                        message: "Gift Card cancelada correctamente.";
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "inicio.resumen": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            ventas_hoy: {
                                cantidad: number;
                                total: number;
                            };
                            apartados_por_vencer: {
                                id: number;
                                cliente_nombre: string;
                                /** Format: date-time */
                                fecha_vencimiento: string | null;
                                total: string;
                                total_abonado: string;
                            }[];
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "kardex.porVariante": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The variante ID */
                variante: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            id: number;
                            tipo: string;
                            cantidad: number;
                            motivo: string;
                            sucursal_nombre: string;
                            usuario_nombre: string;
                            stock_resultante: number;
                            /** Format: date-time */
                            fecha: string;
                        }[];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "licenciaLocal.show": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `LicenciaLocalResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["LicenciaLocalResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "metodoPago.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["MetodoPagoResource"][];
                        meta: {
                            total: number;
                            permisos: {
                                crear: boolean;
                                editar: boolean;
                                eliminar: boolean;
                            };
                        };
                    } | {
                        data: components["schemas"]["MetodoPago"][];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "metodoPago.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarMetodoPagoRequest"];
            };
        };
        responses: {
            /** @description `MetodoPagoResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["MetodoPagoResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "metodoPago.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The metodo pago ID */
                metodoPago: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["MetodoPagoResource"];
                        meta: {
                            permisos: {
                                crear: boolean;
                                editar: boolean;
                                eliminar: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "metodoPago.update": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The metodo pago ID */
                metodoPago: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarMetodoPagoRequest"];
            };
        };
        responses: {
            /** @description `MetodoPagoResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["MetodoPagoResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "metodoPago.desactivar": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The metodo pago ID */
                metodoPago: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `MetodoPagoResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["MetodoPagoResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "notaCredito.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["NotaCreditoResource"][];
                        meta: {
                            total: number;
                            permisos: unknown[];
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "notaCredito.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The nota credito ID */
                notaCredito: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `NotaCreditoResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["NotaCreditoResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "notaCredito.activasPorCliente": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The cliente ID */
                cliente: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["NotaCreditoResource"][];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "passwordReset.cambiar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CambiarPasswordRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @constant */
                        status: "Contrasena actualizada.";
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "payroll.empleadosIndex": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["EmpleadoResource"][];
                        meta: {
                            total: number;
                            permisos: {
                                [key: string]: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "payroll.empleadosStore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CrearEmpleadoRequest"];
            };
        };
        responses: {
            /** @description `EmpleadoResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["EmpleadoResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "payroll.empleadosShow": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The empleado ID */
                empleado: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `EmpleadoResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["EmpleadoResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "payroll.nominasIndex": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["NominaResource"][];
                        meta: {
                            total: number;
                            permisos: {
                                [key: string]: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "payroll.nominasShow": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The nomina ID */
                nomina: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `NominaResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["NominaResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "payroll.nominasGenerar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GenerarNominaRequest"];
            };
        };
        responses: {
            /** @description `NominaResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["NominaResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "payroll.nominasPagar": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `NominaResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["NominaResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "pedido.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["PedidoResource"][];
                        meta: {
                            total: number;
                            permisos: {
                                [key: string]: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "pedido.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CrearPedidoRequest"];
            };
        };
        responses: {
            /** @description `PedidoResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["PedidoResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "pedido.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The pedido ID */
                pedido: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `PedidoResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["PedidoResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "pedido.cambiarEstado": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CambiarEstadoPedidoRequest"];
            };
        };
        responses: {
            /** @description `PedidoResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["PedidoResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "pedido.asignarRepartidor": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AsignarRepartidorRequest"];
            };
        };
        responses: {
            /** @description `PedidoResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["PedidoResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "permiso.index": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["Permiso"][];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "planPago.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["PlanPagoResource"][];
                        meta: {
                            total: number;
                            permisos: {
                                crear: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "planPago.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The plan ID */
                plan: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `PlanPagoResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["PlanPagoResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "planPago.crearPlan": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The venta ID */
                venta: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CrearPlanPagoRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["PlanPagoCliente"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "planPago.pagarCuota": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The plan ID */
                plan: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PagarCuotaRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["PlanPagoClienteCuota"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "prestamo.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["PrestamoResource"][];
                        meta: {
                            total: number;
                            permisos: unknown[];
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "prestamo.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CrearPrestamoRequest"];
            };
        };
        responses: {
            /** @description `PrestamoResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["PrestamoResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "prestamo.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The prestamo ID */
                prestamo: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `PrestamoResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["PrestamoResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "prestamo.registrarPago": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegistrarPagoPrestamoRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["PrestamoPago"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "produccion.insumosIndex": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["InsumoResource"][];
                        meta: {
                            total: number;
                            permisos: {
                                [key: string]: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "produccion.insumosStore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CrearInsumoRequest"];
            };
        };
        responses: {
            /** @description `InsumoResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["InsumoResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "produccion.insumoStocks": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The insumo ID */
                insumo: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["InsumoStock"][];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "produccion.insumoStocksStore": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The insumo ID */
                insumo: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarInsumoStockRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["InsumoStock"] | null;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "produccion.recetasIndex": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["RecetaResource"][];
                        meta: {
                            total: number;
                            permisos: {
                                [key: string]: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "produccion.recetasStore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CrearRecetaRequest"];
            };
        };
        responses: {
            /** @description `RecetaResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["RecetaResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "produccion.ordenesIndex": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["OrdenProduccionResource"][];
                        meta: {
                            total: number;
                            permisos: {
                                [key: string]: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "produccion.ordenesStore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CrearOrdenProduccionRequest"];
            };
        };
        responses: {
            /** @description `OrdenProduccionResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["OrdenProduccionResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "produccion.ordenesCambiarEstado": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CambiarEstadoOrdenRequest"];
            };
        };
        responses: {
            /** @description `OrdenProduccionResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @constant */
                        message: "Estado actualizado.";
                    } | {
                        data: components["schemas"]["OrdenProduccionResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "produccion.transformacionesIndex": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["TransformacionResource"][];
                        meta: {
                            total: number;
                            permisos: {
                                [key: string]: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "produccion.transformacionStore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CrearTransformacionRequest"];
            };
        };
        responses: {
            /** @description `TransformacionResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["TransformacionResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "producto.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ProductoResource"][];
                        meta: {
                            total: number;
                            permisos: {
                                crear: boolean;
                                editar: boolean;
                                eliminar: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "producto.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarProductoRequest"];
            };
        };
        responses: {
            /** @description `ProductoResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ProductoResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "producto.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The producto ID */
                producto: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ProductoResource"] & Record<string, never>;
                        meta: {
                            permisos: {
                                crear: boolean;
                                editar: boolean;
                                eliminar: boolean;
                                /**
                                 * @description Gate del boton "Registrar compra" (ver CompraController)
                                 *     -- permiso dedicado, no inventario.crear: dar de alta un
                                 *     producto y meterle stock son acciones distintas.
                                 */
                                compras_crear: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "producto.update": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The producto ID */
                producto: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarProductoRequest"];
            };
        };
        responses: {
            /** @description `ProductoResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ProductoResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "producto.desactivar": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The producto ID */
                producto: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `ProductoResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ProductoResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "productoVariante.store": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The producto ID */
                producto: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["GuardarProductoVarianteRequest"];
            };
        };
        responses: {
            /** @description `ProductoVarianteResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ProductoVarianteResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "productoVariante.update": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The variante ID */
                variante: number;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["GuardarProductoVarianteRequest"];
            };
        };
        responses: {
            /** @description `ProductoVarianteResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ProductoVarianteResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "productoVariante.desactivar": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The variante ID */
                variante: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `ProductoVarianteResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ProductoVarianteResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "proveedor.index": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["Proveedor"][];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "proveedor.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CrearProveedorRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            id: number;
                            razon_social: string;
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "reglaPrecio.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: (components["schemas"]["ReglaPrecioResource"] & Record<string, never>)[];
                        meta: {
                            total: number;
                            permisos: {
                                crear: boolean;
                                editar: boolean;
                                eliminar: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "reglaPrecio.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarReglaPrecioRequest"];
            };
        };
        responses: {
            /** @description `ReglaPrecioResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ReglaPrecioResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "reglaPrecio.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The regla ID */
                regla: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ReglaPrecioResource"] & Record<string, never>;
                        meta: {
                            permisos: {
                                crear: boolean;
                                editar: boolean;
                                eliminar: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "reglaPrecio.update": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The regla ID */
                regla: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarReglaPrecioRequest"];
            };
        };
        responses: {
            /** @description `ReglaPrecioResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ReglaPrecioResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "reglaPrecio.desactivar": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The regla ID */
                regla: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `ReglaPrecioResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["ReglaPrecioResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "rol.index": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Array of `RolResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["RolResource"][];
                        meta: {
                            total: number;
                            page: number;
                            rows: unknown;
                            filtros_aplicados: {
                                q: string;
                            };
                            permisos: {
                                crear: boolean;
                                editar: boolean;
                                eliminar: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "rol.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarRolRequest"];
            };
        };
        responses: {
            /** @description `RolResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["RolResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "rol.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The rol ID */
                rol: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["RolResource"];
                        meta: {
                            permisos: {
                                crear: boolean;
                                editar: boolean;
                                eliminar: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "rol.update": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The rol ID */
                rol: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarRolRequest"];
            };
        };
        responses: {
            /** @description `RolResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["RolResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "rol.destroy": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The rol ID */
                rol: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: null;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            /** @description An error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /**
                         * @description Error overview.
                         * @example No puedes eliminar un rol con usuarios asignados. Quita el rol de esos usuarios primero.
                         */
                        message: string;
                    };
                };
            };
        };
    };
    "sesion.show": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `SesionResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["SesionResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "sucursal.index": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["Sucursal"][];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "twoFactor.setup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        secret: string;
                        otpauth_url: string;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            /** @description An error */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /**
                         * @description Error overview.
                         * @example La autenticacion en dos pasos ya esta configurada.
                         */
                        message: string;
                    };
                };
            };
        };
    };
    "twoFactor.confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConfirmTwoFactorRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        user: components["schemas"]["UsuarioResource"];
                        recovery_codes: string[];
                    };
                };
            };
            /** @description An error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /**
                         * @description Error overview.
                         * @example Primero solicita el codigo QR.
                         */
                        message: string;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "unidadMedida.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["UnidadMedidaResource"][];
                        meta: {
                            total: number;
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "unidadMedida.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarUnidadMedidaRequest"];
            };
        };
        responses: {
            /** @description `UnidadMedidaResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["UnidadMedidaResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "unidadMedida.update": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarUnidadMedidaRequest"];
            };
        };
        responses: {
            /** @description `UnidadMedidaResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["UnidadMedidaResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "unidadMedida.destroy": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @constant */
                        message: "Unidad de medida eliminada correctamente.";
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "usuario.index": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Array of `UsuarioAdminResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["UsuarioAdminResource"][];
                        meta: {
                            total: number;
                            page: number;
                            rows: unknown;
                            filtros_aplicados: {
                                q: string;
                            };
                            permisos: {
                                crear: boolean;
                                editar: boolean;
                                eliminar: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "usuario.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarUsuarioRequest"];
            };
        };
        responses: {
            /** @description `UsuarioAdminResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["UsuarioAdminResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "usuario.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The usuario ID */
                usuario: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["UsuarioAdminResource"];
                        meta: {
                            permisos: {
                                crear: boolean;
                                editar: boolean;
                                eliminar: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "usuario.update": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The usuario ID */
                usuario: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardarUsuarioRequest"];
            };
        };
        responses: {
            /** @description `UsuarioAdminResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["UsuarioAdminResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "usuario.desactivar": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The usuario ID */
                usuario: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `UsuarioAdminResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["UsuarioAdminResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            /** @description An error */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /**
                         * @description Error overview.
                         * @example No puedes desactivar tu propio usuario.
                         */
                        message: string;
                    };
                };
            };
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "usuario.desactivarDosFactor": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The usuario ID */
                usuario: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `UsuarioAdminResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["UsuarioAdminResource"];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            /** @description An error */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /**
                         * @description Error overview.
                         * @example La autenticacion en dos pasos es obligatoria para el rol de este usuario.
                         */
                        message: string;
                    };
                };
            };
            404: components["responses"]["ModelNotFoundException"];
            /** @description An error */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /**
                         * @description Error overview.
                         * @example Este usuario no tiene la autenticacion en dos pasos activada.
                         */
                        message: string;
                    };
                };
            };
        };
    };
    "venta.porCliente": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The cliente ID */
                cliente: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["Venta"][];
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "venta.index": {
        parameters: {
            query?: {
                sort_field?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: (components["schemas"]["VentaResource"] & Record<string, never>)[];
                        meta: {
                            total: number;
                            permisos: {
                                anular: boolean;
                            };
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "venta.store": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CrearVentaRequest"];
            };
        };
        responses: {
            /** @description `VentaResource` */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["VentaResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
        };
    };
    "venta.cotizar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CotizarVentaRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            items: {
                                variante_id: number;
                                regla_precio_id: number | null;
                                cantidad: string;
                                precio_unitario: number;
                                descuento_aplicado: number;
                                subtotal: number;
                            }[];
                            subtotal: number;
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            422: components["responses"]["ValidationException"];
            /** @description An error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /**
                         * @description Error overview.
                         * @example
                         */
                        message: string;
                    };
                };
            };
        };
    };
    "venta.reporte": {
        parameters: {
            query?: {
                fecha_desde?: string;
                fecha_hasta?: string;
                sucursal_id?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            total_ventas: number;
                            numero_ventas: number;
                            ticket_promedio: number;
                            por_sucursal: {
                                sucursal_id: number;
                                sucursal_nombre: string | null;
                                total: number;
                                numero_ventas: number;
                            }[];
                            por_metodo_pago: {
                                metodo_pago_id: number;
                                metodo_pago_nombre: string;
                                total: number;
                            }[];
                            top_productos: {
                                variante_id: number;
                                producto_nombre: string;
                                talla: string | null;
                                color: string | null;
                                cantidad_vendida: number;
                                total_vendido: number;
                            }[];
                        };
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
        };
    };
    "venta.show": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The venta ID */
                venta: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description `VentaResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["VentaResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
        };
    };
    "venta.anular": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The venta ID */
                venta: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AnularVentaRequest"];
            };
        };
        responses: {
            /** @description `VentaResource` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: components["schemas"]["VentaResource"] & Record<string, never>;
                    };
                };
            };
            401: components["responses"]["AuthenticationException"];
            404: components["responses"]["ModelNotFoundException"];
            422: components["responses"]["ValidationException"];
        };
    };
}
