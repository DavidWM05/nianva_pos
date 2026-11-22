// Generado desde docs/api/openapi.json (UI-11b). No lo edites a mano: cambia el FormRequest,
// regenera la especificacion y corre `node libs/api-contrato/scripts/generar.mjs`.
export const LIMITES = {
  "/apartados": {
    "post": {
      "lista_precio_id": {
        "requerido": false
      },
      "cliente_id": {
        "requerido": true
      },
      "items": {
        "requerido": true,
        "elemento": {
          "variante_id": {
            "requerido": true
          },
          "cantidad": {
            "requerido": true,
            "minimum": 0.001,
            "maximum": 99999999999.999,
            "decimales": 3
          }
        }
      },
      "fecha_vencimiento": {
        "requerido": false
      },
      "notas": {
        "requerido": false
      }
    }
  },
  "/apartados/{apartado}/abonos": {
    "post": {
      "monto": {
        "requerido": true,
        "minimum": 0.01,
        "decimales": 2
      },
      "pagos": {
        "requerido": true,
        "elemento": {
          "metodo_pago_id": {
            "requerido": true
          },
          "monto": {
            "requerido": true,
            "minimum": 0.01,
            "decimales": 2
          }
        }
      },
      "notas": {
        "requerido": false
      }
    }
  },
  "/apartados/{apartado}/cancelar": {
    "patch": {
      "motivo": {
        "requerido": true,
        "maxLength": 255
      }
    }
  },
  "/atributos": {
    "post": {
      "nombre": {
        "requerido": true,
        "maxLength": 60
      },
      "orden": {
        "requerido": false,
        "minimum": 0,
        "maximum": 65535
      }
    }
  },
  "/atributos/{atributo}": {
    "put": {
      "nombre": {
        "requerido": true,
        "maxLength": 60
      },
      "orden": {
        "requerido": false,
        "minimum": 0,
        "maximum": 65535
      }
    }
  },
  "/atributos/{atributo}/valores": {
    "post": {
      "nombre": {
        "requerido": true,
        "maxLength": 60
      },
      "orden": {
        "requerido": false,
        "minimum": 0,
        "maximum": 65535
      }
    }
  },
  "/atributo-valores/{valor}": {
    "put": {
      "nombre": {
        "requerido": true,
        "maxLength": 60
      },
      "orden": {
        "requerido": false,
        "minimum": 0,
        "maximum": 65535
      }
    }
  },
  "/autorizaciones": {
    "post": {
      "supervisor_id": {
        "requerido": true,
        "minimum": 1
      },
      "pin": {
        "requerido": true
      },
      "accion": {
        "requerido": true
      },
      "recurso": {
        "requerido": false
      },
      "datos": {
        "requerido": true
      }
    }
  },
  "/caja/abrir": {
    "post": {
      "monto_apertura": {
        "requerido": true,
        "minimum": 0,
        "decimales": 2
      }
    }
  },
  "/caja/{cajaSesion}/cerrar": {
    "patch": {
      "conteos": {
        "requerido": true,
        "elemento": {
          "metodo_pago_id": {
            "requerido": true
          },
          "monto": {
            "requerido": true,
            "minimum": 0,
            "maximum": 9999999999.99,
            "decimales": 2
          }
        }
      }
    }
  },
  "/categorias": {
    "post": {
      "nombre": {
        "requerido": true,
        "maxLength": 120
      },
      "descripcion": {
        "requerido": false
      }
    }
  },
  "/categorias/{categoria}": {
    "put": {
      "nombre": {
        "requerido": true,
        "maxLength": 120
      },
      "descripcion": {
        "requerido": false
      }
    }
  },
  "/clientes": {
    "post": {
      "nombre": {
        "requerido": true,
        "maxLength": 200
      },
      "documento_fiscal": {
        "requerido": false,
        "maxLength": 30
      },
      "telefono": {
        "requerido": false,
        "maxLength": 20
      },
      "correo": {
        "requerido": false,
        "maxLength": 150
      },
      "direccion": {
        "requerido": false
      }
    }
  },
  "/clientes/{cliente}": {
    "put": {
      "nombre": {
        "requerido": true,
        "maxLength": 200
      },
      "documento_fiscal": {
        "requerido": false,
        "maxLength": 30
      },
      "telefono": {
        "requerido": false,
        "maxLength": 20
      },
      "correo": {
        "requerido": false,
        "maxLength": 150
      },
      "direccion": {
        "requerido": false
      }
    }
  },
  "/compras": {
    "post": {
      "proveedor_id": {
        "requerido": true
      },
      "numero_comprobante": {
        "requerido": false,
        "maxLength": 60
      },
      "items": {
        "requerido": true,
        "elemento": {
          "variante_id": {
            "requerido": true
          },
          "cantidad": {
            "requerido": true,
            "minimum": 0.001,
            "maximum": 99999999999.999,
            "decimales": 3
          },
          "precio_compra": {
            "requerido": true,
            "minimum": 0,
            "decimales": 2
          }
        }
      }
    }
  },
  "/configuracion": {
    "put": {
      "cupon_combinable_con_promociones": {
        "requerido": false
      },
      "tasa_iva_default": {
        "requerido": false,
        "decimales": 4
      },
      "moneda": {
        "requerido": true,
        "maxLength": 5
      },
      "margen_descuento_supervisor": {
        "requerido": false,
        "minimum": 0,
        "maximum": 9999999999.99,
        "decimales": 2
      },
      "umbral_descuadre_supervisor": {
        "requerido": false,
        "minimum": 0,
        "maximum": 9999999999.99,
        "decimales": 2
      },
      "zona_horaria": {
        "requerido": false
      },
      "mensaje_ticket": {
        "requerido": false
      },
      "logo_url": {
        "requerido": false,
        "maxLength": 500
      },
      "mostrar_rfc": {
        "requerido": true
      },
      "mostrar_telefono": {
        "requerido": true
      },
      "mostrar_correo": {
        "requerido": true
      },
      "backup_auto": {
        "requerido": true
      },
      "backup_frecuencia": {
        "requerido": true
      },
      "codigo_barras_automatico": {
        "requerido": true
      }
    }
  },
  "/configuracion-seguridad": {
    "put": {
      "dias_dispositivo_normal": {
        "requerido": true,
        "minimum": 1,
        "maximum": 90
      },
      "dias_dispositivo_admin": {
        "requerido": true,
        "minimum": 1,
        "maximum": 90
      },
      "minutos_inactividad": {
        "requerido": true,
        "minimum": 5,
        "maximum": 480
      }
    }
  },
  "/cotizaciones": {
    "post": {
      "lista_precio_id": {
        "requerido": false
      },
      "cliente_id": {
        "requerido": false
      },
      "sucursal_id": {
        "requerido": false
      },
      "validez_dias": {
        "requerido": false,
        "minimum": 1,
        "maximum": 365
      },
      "descuento": {
        "requerido": false,
        "minimum": 0,
        "decimales": 2
      },
      "uso_cfdi": {
        "requerido": false,
        "maxLength": 10
      },
      "observaciones": {
        "requerido": false,
        "maxLength": 1000
      },
      "items": {
        "requerido": true,
        "elemento": {
          "variante_id": {
            "requerido": true
          },
          "cantidad": {
            "requerido": true,
            "minimum": 0.001,
            "maximum": 99999999999.999,
            "decimales": 3
          },
          "precio_unitario": {
            "requerido": false,
            "minimum": 0,
            "decimales": 2
          },
          "descuento": {
            "requerido": false,
            "minimum": 0,
            "decimales": 2
          }
        }
      }
    }
  },
  "/cotizaciones/{cotizacion}": {
    "put": {
      "lista_precio_id": {
        "requerido": false
      },
      "cliente_id": {
        "requerido": false
      },
      "validez_dias": {
        "requerido": false,
        "minimum": 1,
        "maximum": 365
      },
      "descuento": {
        "requerido": false,
        "minimum": 0,
        "decimales": 2
      },
      "uso_cfdi": {
        "requerido": false,
        "maxLength": 10
      },
      "observaciones": {
        "requerido": false,
        "maxLength": 1000
      },
      "items": {
        "requerido": true,
        "elemento": {
          "variante_id": {
            "requerido": true
          },
          "cantidad": {
            "requerido": true,
            "minimum": 0.001,
            "maximum": 99999999999.999,
            "decimales": 3
          },
          "precio_unitario": {
            "requerido": false,
            "minimum": 0,
            "decimales": 2
          },
          "descuento": {
            "requerido": false,
            "minimum": 0,
            "decimales": 2
          }
        }
      }
    }
  },
  "/cotizaciones/{cotizacion}/convertir": {
    "post": {
      "metodo_pago_id": {
        "requerido": true
      }
    }
  },
  "/clientes/{cliente}/interacciones": {
    "post": {
      "tipo": {
        "requerido": true
      },
      "observacion": {
        "requerido": true,
        "maxLength": 5000
      }
    }
  },
  "/clientes/{cliente}/loyalty/ajustar": {
    "post": {
      "puntos": {
        "requerido": true,
        "minimum": -999999,
        "maximum": 999999
      },
      "motivo": {
        "requerido": true,
        "maxLength": 500
      }
    }
  },
  "/crm/campanas/enviar": {
    "post": {
      "segmento": {
        "requerido": false
      },
      "cliente_ids": {
        "requerido": false
      },
      "asunto": {
        "requerido": true,
        "maxLength": 200
      },
      "mensaje": {
        "requerido": true,
        "maxLength": 5000
      }
    }
  },
  "/cuentas-cobrar/{cuentaCobrar}/abonos": {
    "post": {
      "monto": {
        "requerido": true,
        "minimum": 0.01,
        "decimales": 2
      },
      "metodo_pago_id": {
        "requerido": true
      },
      "referencia": {
        "requerido": false,
        "maxLength": 100
      }
    }
  },
  "/cuentas-pagar/{cuentaPagar}/pagos": {
    "post": {
      "monto": {
        "requerido": true,
        "minimum": 0.01,
        "decimales": 2
      },
      "metodo_pago_id": {
        "requerido": true
      },
      "referencia": {
        "requerido": false,
        "maxLength": 100
      }
    }
  },
  "/cupones": {
    "post": {
      "codigo": {
        "requerido": true,
        "maxLength": 50
      },
      "nombre": {
        "requerido": true,
        "maxLength": 120
      },
      "tipo": {
        "requerido": true
      },
      "porcentaje": {
        "requerido": false,
        "minimum": 0,
        "maximum": 100,
        "decimales": 4
      },
      "monto": {
        "requerido": false,
        "minimum": 0,
        "decimales": 2
      },
      "uso_maximo": {
        "requerido": false,
        "minimum": 1
      },
      "uso_maximo_por_cliente": {
        "requerido": false,
        "minimum": 1
      },
      "fecha_inicio": {
        "requerido": false
      },
      "fecha_fin": {
        "requerido": false
      }
    }
  },
  "/cupones/{cupon}": {
    "put": {
      "codigo": {
        "requerido": true,
        "maxLength": 50
      },
      "nombre": {
        "requerido": true,
        "maxLength": 120
      },
      "tipo": {
        "requerido": true
      },
      "porcentaje": {
        "requerido": false,
        "minimum": 0,
        "maximum": 100,
        "decimales": 4
      },
      "monto": {
        "requerido": false,
        "minimum": 0,
        "decimales": 2
      },
      "uso_maximo": {
        "requerido": false,
        "minimum": 1
      },
      "uso_maximo_por_cliente": {
        "requerido": false,
        "minimum": 1
      },
      "fecha_inicio": {
        "requerido": false
      },
      "fecha_fin": {
        "requerido": false
      }
    }
  },
  "/cupones/validar": {
    "post": {
      "codigo": {
        "requerido": true
      },
      "total": {
        "requerido": true,
        "minimum": 0,
        "decimales": 2
      }
    }
  },
  "/departamentos": {
    "post": {
      "nombre": {
        "requerido": true,
        "maxLength": 120
      },
      "descripcion": {
        "requerido": false
      }
    }
  },
  "/departamentos/{departamento}": {
    "put": {
      "nombre": {
        "requerido": true,
        "maxLength": 120
      },
      "descripcion": {
        "requerido": false
      }
    }
  },
  "/devoluciones": {
    "post": {
      "venta_id": {
        "requerido": true
      },
      "tipo": {
        "requerido": true
      },
      "items_devueltos": {
        "requerido": true,
        "elemento": {
          "venta_detalle_id": {
            "requerido": false
          },
          "variante_id": {
            "requerido": true
          },
          "cantidad": {
            "requerido": true,
            "minimum": 0.001,
            "maximum": 99999999999.999,
            "decimales": 3
          },
          "va_a_merma": {
            "requerido": false
          }
        }
      },
      "items_nuevos": {
        "requerido": false,
        "elemento": {
          "variante_id": {
            "requerido": false
          },
          "cantidad": {
            "requerido": false,
            "minimum": 0.001,
            "maximum": 99999999999.999,
            "decimales": 3
          }
        }
      },
      "pagos": {
        "requerido": false,
        "elemento": {
          "metodo_pago_id": {
            "requerido": false
          },
          "monto": {
            "requerido": false,
            "minimum": 0.01,
            "decimales": 2
          }
        }
      },
      "motivo": {
        "requerido": false,
        "maxLength": 255
      },
      "tipo_reembolso": {
        "requerido": false
      }
    }
  },
  "/gastos": {
    "post": {
      "descripcion": {
        "requerido": true,
        "maxLength": 255
      },
      "monto": {
        "requerido": true,
        "minimum": 0.01,
        "decimales": 2
      }
    }
  },
  "/gift-cards": {
    "post": {
      "cliente_id": {
        "requerido": false
      },
      "monto": {
        "requerido": true,
        "minimum": 0.01,
        "decimales": 2
      },
      "fecha_expiracion": {
        "requerido": false
      }
    }
  },
  "/gift-cards/{giftCard}/recargar": {
    "post": {
      "monto": {
        "requerido": true,
        "minimum": 0.01,
        "maximum": 9999999999.99,
        "decimales": 2
      },
      "pagos": {
        "requerido": true,
        "elemento": {
          "metodo_pago_id": {
            "requerido": true
          },
          "monto": {
            "requerido": true,
            "minimum": 0.01,
            "maximum": 9999999999.99,
            "decimales": 2
          }
        }
      }
    }
  },
  "/precios/listas": {
    "post": {
      "nombre": {
        "requerido": true,
        "maxLength": 120
      },
      "activo": {
        "requerido": false
      }
    }
  },
  "/precios/listas/{lista}": {
    "put": {
      "nombre": {
        "requerido": true,
        "maxLength": 120
      },
      "activo": {
        "requerido": false
      }
    }
  },
  "/precios/listas/{lista}/items": {
    "post": {
      "producto_id": {
        "requerido": false
      },
      "variante_id": {
        "requerido": false
      },
      "precio": {
        "requerido": true,
        "minimum": 0,
        "maximum": 9999999999.99,
        "decimales": 2
      }
    }
  },
  "/precios/listas/{lista}/items/{item}": {
    "put": {
      "producto_id": {
        "requerido": false
      },
      "variante_id": {
        "requerido": false
      },
      "precio": {
        "requerido": true,
        "minimum": 0,
        "maximum": 9999999999.99,
        "decimales": 2
      }
    }
  },
  "/precios/listas/{lista}/clientes": {
    "post": {
      "cliente_id": {
        "requerido": true
      }
    }
  },
  "/metodos-pago": {
    "post": {
      "nombre": {
        "requerido": true,
        "maxLength": 80
      },
      "tipo": {
        "requerido": true
      },
      "incluir_en_financiero": {
        "requerido": true
      }
    }
  },
  "/metodos-pago/{metodoPago}": {
    "put": {
      "nombre": {
        "requerido": true,
        "maxLength": 80
      },
      "tipo": {
        "requerido": true
      },
      "incluir_en_financiero": {
        "requerido": true
      }
    }
  },
  "/password/change": {
    "post": {
      "password_actual": {
        "requerido": true
      },
      "password": {
        "requerido": true
      },
      "password_confirmation": {
        "requerido": true
      }
    }
  },
  "/empleados": {
    "post": {
      "usuario_id": {
        "requerido": true
      },
      "sucursal_id": {
        "requerido": true
      },
      "salario_base": {
        "requerido": false,
        "minimum": 0
      },
      "tipo_salario": {
        "requerido": false
      },
      "fecha_ingreso": {
        "requerido": false
      },
      "numero_seguridad_social": {
        "requerido": false,
        "maxLength": 30
      }
    }
  },
  "/nominas/generar": {
    "post": {
      "sucursal_id": {
        "requerido": false
      },
      "periodo_inicio": {
        "requerido": true
      },
      "periodo_fin": {
        "requerido": true
      }
    }
  },
  "/pedidos": {
    "post": {
      "cliente_id": {
        "requerido": true
      },
      "sucursal_id": {
        "requerido": false
      },
      "direccion_entrega": {
        "requerido": false,
        "maxLength": 500
      },
      "referencia": {
        "requerido": false,
        "maxLength": 255
      },
      "costo_delivery": {
        "requerido": false,
        "minimum": 0
      },
      "tiempo_estimado": {
        "requerido": false,
        "minimum": 1
      },
      "notas": {
        "requerido": false,
        "maxLength": 1000
      },
      "items": {
        "requerido": false,
        "elemento": {
          "variante_id": {
            "requerido": false
          },
          "cantidad": {
            "requerido": false,
            "minimum": 0.001,
            "maximum": 99999999999.999,
            "decimales": 3
          },
          "precio_unitario": {
            "requerido": false,
            "minimum": 0
          }
        }
      }
    }
  },
  "/pedidos/{id}/estado": {
    "patch": {
      "estado": {
        "requerido": true
      }
    }
  },
  "/pedidos/{id}/repartidor": {
    "patch": {
      "repartidor_id": {
        "requerido": true
      }
    }
  },
  "/configuracion/perfil-giro": {
    "put": {
      "perfil": {
        "requerido": true
      }
    }
  },
  "/sesion/pin": {
    "put": {
      "pin": {
        "requerido": true
      },
      "password_actual": {
        "requerido": true
      }
    }
  },
  "/sesion/desbloquear": {
    "post": {
      "pin": {
        "requerido": true
      }
    }
  },
  "/ventas/{venta}/plan-pago": {
    "post": {
      "numero_cuotas": {
        "requerido": true,
        "minimum": 2,
        "maximum": 36
      },
      "tasa_interes": {
        "requerido": false,
        "minimum": 0,
        "maximum": 100
      },
      "periodicidad": {
        "requerido": false
      },
      "fecha_inicio": {
        "requerido": false
      }
    }
  },
  "/planes-pago-cliente/{plan}/pagar-cuota": {
    "post": {
      "cuota_id": {
        "requerido": true
      },
      "monto": {
        "requerido": false,
        "minimum": 0.01,
        "decimales": 2
      }
    }
  },
  "/producto-variantes/{variante}/presentaciones": {
    "post": {
      "nombre": {
        "requerido": true,
        "maxLength": 120
      },
      "factor": {
        "requerido": true,
        "minimum": 0.001,
        "maximum": 99999999999.999,
        "decimales": 3
      },
      "codigo_barras": {
        "requerido": false,
        "maxLength": 50
      },
      "precio_venta": {
        "requerido": false,
        "minimum": 0,
        "maximum": 9999999999.99,
        "decimales": 2
      }
    }
  },
  "/producto-variantes/{variante}/presentaciones/{presentacion}": {
    "put": {
      "nombre": {
        "requerido": true,
        "maxLength": 120
      },
      "factor": {
        "requerido": true,
        "minimum": 0.001,
        "maximum": 99999999999.999,
        "decimales": 3
      },
      "codigo_barras": {
        "requerido": false,
        "maxLength": 50
      },
      "precio_venta": {
        "requerido": false,
        "minimum": 0,
        "maximum": 9999999999.99,
        "decimales": 2
      }
    }
  },
  "/prestamos": {
    "post": {
      "proveedor_id": {
        "requerido": false
      },
      "referencia": {
        "requerido": false,
        "maxLength": 100
      },
      "monto": {
        "requerido": true,
        "minimum": 0.01
      },
      "interes": {
        "requerido": false,
        "minimum": 0,
        "maximum": 100
      },
      "fecha_prestamo": {
        "requerido": true
      },
      "fecha_vencimiento": {
        "requerido": false
      },
      "notas": {
        "requerido": false,
        "maxLength": 1000
      }
    }
  },
  "/prestamos/{id}/pagos": {
    "post": {
      "monto": {
        "requerido": true,
        "minimum": 0.01
      },
      "caja_sesion_id": {
        "requerido": false
      },
      "notas": {
        "requerido": false,
        "maxLength": 500
      }
    }
  },
  "/insumos": {
    "post": {
      "nombre": {
        "requerido": true,
        "maxLength": 200
      },
      "sku": {
        "requerido": false,
        "maxLength": 50
      },
      "unidad_medida_id": {
        "requerido": true
      },
      "costo": {
        "requerido": false,
        "minimum": 0
      },
      "stock_minimo": {
        "requerido": false,
        "minimum": 0,
        "maximum": 99999999999.999,
        "decimales": 3
      }
    }
  },
  "/insumos/{insumo}/stocks": {
    "post": {
      "sucursal_id": {
        "requerido": false
      },
      "cantidad": {
        "requerido": true,
        "minimum": 0.001,
        "maximum": 99999999999.999,
        "decimales": 3
      },
      "lote": {
        "requerido": false,
        "maxLength": 50
      },
      "fecha_vencimiento": {
        "requerido": false
      }
    }
  },
  "/recetas": {
    "post": {
      "variante_id": {
        "requerido": true
      },
      "nombre": {
        "requerido": true,
        "maxLength": 200
      },
      "rendimiento": {
        "requerido": false,
        "minimum": 0.001,
        "maximum": 99999999999.999,
        "decimales": 3
      },
      "instrucciones": {
        "requerido": false
      },
      "descripcion": {
        "requerido": false
      },
      "ingredientes": {
        "requerido": true,
        "elemento": {
          "insumo_id": {
            "requerido": true
          },
          "cantidad": {
            "requerido": true,
            "minimum": 0.001,
            "maximum": 99999999999.999,
            "decimales": 3
          },
          "unidad_medida_id": {
            "requerido": true
          }
        }
      }
    }
  },
  "/ordenes-produccion": {
    "post": {
      "receta_id": {
        "requerido": true
      },
      "cantidad_programada": {
        "requerido": true,
        "minimum": 0.001,
        "maximum": 99999999999.999,
        "decimales": 3
      },
      "fecha_programada": {
        "requerido": false
      },
      "notas": {
        "requerido": false,
        "maxLength": 1000
      }
    }
  },
  "/ordenes-produccion/{ordenProduccion}/estado": {
    "patch": {
      "estado": {
        "requerido": true
      },
      "cantidad_producida": {
        "requerido": false,
        "minimum": 0.001,
        "maximum": 99999999999.999,
        "decimales": 3
      }
    }
  },
  "/transformaciones": {
    "post": {
      "variante_origen_id": {
        "requerido": true
      },
      "variante_destino_id": {
        "requerido": true
      },
      "cantidad_origen": {
        "requerido": true,
        "minimum": 0.001,
        "maximum": 99999999999.999,
        "decimales": 3
      },
      "cantidad_destino": {
        "requerido": true,
        "minimum": 0.001,
        "maximum": 99999999999.999,
        "decimales": 3
      },
      "notas": {
        "requerido": false,
        "maxLength": 1000
      }
    }
  },
  "/productos": {
    "post": {
      "nombre": {
        "requerido": true,
        "maxLength": 200
      },
      "descripcion": {
        "requerido": false
      },
      "categoria_id": {
        "requerido": false
      },
      "departamento_id": {
        "requerido": false
      },
      "precio_compra": {
        "requerido": true,
        "minimum": 0,
        "decimales": 2
      },
      "precio_venta": {
        "requerido": false,
        "minimum": 0,
        "decimales": 2
      },
      "tasa_iva": {
        "requerido": false,
        "decimales": 4
      },
      "exento_iva": {
        "requerido": false
      },
      "imagen_url": {
        "requerido": false,
        "maxLength": 500
      },
      "no_resurtible": {
        "requerido": false
      },
      "sin_descuento": {
        "requerido": false
      }
    }
  },
  "/productos/{producto}": {
    "put": {
      "nombre": {
        "requerido": true,
        "maxLength": 200
      },
      "descripcion": {
        "requerido": false
      },
      "categoria_id": {
        "requerido": false
      },
      "departamento_id": {
        "requerido": false
      },
      "precio_compra": {
        "requerido": false,
        "minimum": 0,
        "decimales": 2
      },
      "precio_venta": {
        "requerido": false,
        "minimum": 0,
        "decimales": 2
      },
      "tasa_iva": {
        "requerido": false,
        "decimales": 4
      },
      "exento_iva": {
        "requerido": false
      },
      "imagen_url": {
        "requerido": false,
        "maxLength": 500
      },
      "no_resurtible": {
        "requerido": false
      },
      "sin_descuento": {
        "requerido": false
      }
    }
  },
  "/productos/{producto}/variantes": {
    "post": {
      "precio_venta": {
        "requerido": false,
        "minimum": 0,
        "maximum": 9999999999.99,
        "decimales": 2
      },
      "costo": {
        "requerido": false,
        "minimum": 0,
        "maximum": 9999999999.99,
        "decimales": 2
      },
      "codigo_barras": {
        "requerido": false,
        "maxLength": 50
      },
      "valores": {
        "requerido": false
      }
    }
  },
  "/producto-variantes/{variante}": {
    "put": {
      "precio_venta": {
        "requerido": false,
        "minimum": 0,
        "maximum": 9999999999.99,
        "decimales": 2
      },
      "costo": {
        "requerido": false,
        "minimum": 0,
        "maximum": 9999999999.99,
        "decimales": 2
      },
      "codigo_barras": {
        "requerido": false,
        "maxLength": 50
      },
      "valores": {
        "requerido": false
      }
    }
  },
  "/proveedores": {
    "post": {
      "razon_social": {
        "requerido": true,
        "maxLength": 200
      },
      "rfc": {
        "requerido": false,
        "maxLength": 20
      },
      "telefono": {
        "requerido": false,
        "maxLength": 20
      },
      "correo": {
        "requerido": false,
        "maxLength": 150
      },
      "direccion": {
        "requerido": false
      }
    }
  },
  "/reglas-precio": {
    "post": {
      "prioridad": {
        "requerido": false,
        "minimum": 0,
        "maximum": 65535
      },
      "combinable": {
        "requerido": false
      },
      "nombre": {
        "requerido": true,
        "maxLength": 120
      },
      "tipo": {
        "requerido": true
      },
      "porcentaje": {
        "requerido": false,
        "minimum": 0,
        "maximum": 100,
        "decimales": 4
      },
      "monto": {
        "requerido": false,
        "minimum": 0,
        "decimales": 2
      },
      "cantidad_compra": {
        "requerido": false,
        "minimum": 0.001,
        "maximum": 99999999999.999,
        "decimales": 3
      },
      "cantidad_paga": {
        "requerido": false,
        "minimum": 0.001,
        "maximum": 99999999999.999,
        "decimales": 3
      },
      "precio_bundle": {
        "requerido": false,
        "minimum": 0,
        "decimales": 2
      },
      "aplica_a": {
        "requerido": true
      },
      "categoria_id": {
        "requerido": false
      },
      "producto_id": {
        "requerido": false
      },
      "variante_id": {
        "requerido": false
      },
      "fecha_inicio": {
        "requerido": false
      },
      "fecha_fin": {
        "requerido": false
      }
    }
  },
  "/reglas-precio/{regla}": {
    "put": {
      "prioridad": {
        "requerido": false,
        "minimum": 0,
        "maximum": 65535
      },
      "combinable": {
        "requerido": false
      },
      "nombre": {
        "requerido": true,
        "maxLength": 120
      },
      "tipo": {
        "requerido": true
      },
      "porcentaje": {
        "requerido": false,
        "minimum": 0,
        "maximum": 100,
        "decimales": 4
      },
      "monto": {
        "requerido": false,
        "minimum": 0,
        "decimales": 2
      },
      "cantidad_compra": {
        "requerido": false,
        "minimum": 0.001,
        "maximum": 99999999999.999,
        "decimales": 3
      },
      "cantidad_paga": {
        "requerido": false,
        "minimum": 0.001,
        "maximum": 99999999999.999,
        "decimales": 3
      },
      "precio_bundle": {
        "requerido": false,
        "minimum": 0,
        "decimales": 2
      },
      "aplica_a": {
        "requerido": true
      },
      "categoria_id": {
        "requerido": false
      },
      "producto_id": {
        "requerido": false
      },
      "variante_id": {
        "requerido": false
      },
      "fecha_inicio": {
        "requerido": false
      },
      "fecha_fin": {
        "requerido": false
      }
    }
  },
  "/roles": {
    "post": {
      "nombre": {
        "requerido": true,
        "maxLength": 80
      },
      "descripcion": {
        "requerido": false
      },
      "permisos": {
        "requerido": false
      }
    }
  },
  "/roles/{rol}": {
    "put": {
      "nombre": {
        "requerido": true,
        "maxLength": 80
      },
      "descripcion": {
        "requerido": false
      },
      "permisos": {
        "requerido": false
      }
    }
  },
  "/sesion/terminal": {
    "put": {
      "terminal_id": {
        "requerido": true,
        "minimum": 1
      }
    }
  },
  "/terminales": {
    "post": {
      "nombre": {
        "requerido": true,
        "maxLength": 100
      },
      "sucursal_id": {
        "requerido": true
      }
    }
  },
  "/terminales/{terminal}": {
    "put": {
      "nombre": {
        "requerido": true,
        "maxLength": 100
      },
      "sucursal_id": {
        "requerido": true
      }
    }
  },
  "/two-factor/confirm": {
    "post": {
      "code": {
        "requerido": true
      }
    }
  },
  "/unidades-medida": {
    "post": {
      "nombre": {
        "requerido": true,
        "maxLength": 50
      },
      "abreviatura": {
        "requerido": true,
        "maxLength": 10
      },
      "tipo": {
        "requerido": true
      }
    }
  },
  "/unidades-medida/{id}": {
    "put": {
      "nombre": {
        "requerido": true,
        "maxLength": 50
      },
      "abreviatura": {
        "requerido": true,
        "maxLength": 10
      },
      "tipo": {
        "requerido": true
      }
    }
  },
  "/usuarios": {
    "post": {
      "nombre": {
        "requerido": true,
        "maxLength": 150
      },
      "apellido": {
        "requerido": false,
        "maxLength": 150
      },
      "alias": {
        "requerido": false,
        "maxLength": 50
      },
      "correo": {
        "requerido": true,
        "maxLength": 150
      },
      "password": {
        "requerido": true
      },
      "telefono": {
        "requerido": false,
        "maxLength": 20
      },
      "sucursal_id": {
        "requerido": false
      },
      "roles": {
        "requerido": true
      }
    }
  },
  "/usuarios/{usuario}": {
    "put": {
      "nombre": {
        "requerido": true,
        "maxLength": 150
      },
      "apellido": {
        "requerido": false,
        "maxLength": 150
      },
      "alias": {
        "requerido": false,
        "maxLength": 50
      },
      "correo": {
        "requerido": true,
        "maxLength": 150
      },
      "password": {
        "requerido": false
      },
      "telefono": {
        "requerido": false,
        "maxLength": 20
      },
      "sucursal_id": {
        "requerido": false
      },
      "roles": {
        "requerido": false
      }
    }
  },
  "/ventas": {
    "post": {
      "lista_precio_id": {
        "requerido": false
      },
      "cliente_id": {
        "requerido": true
      },
      "items": {
        "requerido": true,
        "elemento": {
          "presentacion_id": {
            "requerido": false
          },
          "variante_id": {
            "requerido": true
          },
          "cantidad": {
            "requerido": true,
            "minimum": 0.001,
            "maximum": 99999999999.999,
            "decimales": 3
          }
        }
      },
      "pagos": {
        "requerido": true,
        "elemento": {
          "metodo_pago_id": {
            "requerido": true
          },
          "monto": {
            "requerido": true,
            "minimum": 0.01,
            "decimales": 2
          }
        }
      },
      "cupon_codigo": {
        "requerido": false
      },
      "descuento_manual": {
        "requerido": false,
        "minimum": 0,
        "decimales": 2
      },
      "gift_card_codigo": {
        "requerido": false,
        "maxLength": 50
      },
      "nota_credito_id": {
        "requerido": false
      }
    }
  },
  "/ventas/cotizar": {
    "post": {
      "lista_precio_id": {
        "requerido": false
      },
      "cliente_id": {
        "requerido": false
      },
      "items": {
        "requerido": true,
        "elemento": {
          "presentacion_id": {
            "requerido": false
          },
          "variante_id": {
            "requerido": true
          },
          "cantidad": {
            "requerido": true,
            "minimum": 0.001,
            "maximum": 99999999999.999,
            "decimales": 3
          }
        }
      }
    }
  },
  "/ventas/{venta}/anular": {
    "patch": {
      "motivo": {
        "requerido": true,
        "maxLength": 255
      }
    }
  }
} as const;
