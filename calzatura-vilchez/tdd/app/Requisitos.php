<?php

namespace App;

/**
 * Matriz de Trazabilidad de Requisitos (MTR) — ISO 9001
 *
 * Cada entrada mapea un requisito de negocio a los tests que lo verifican.
 * Si un requisito no tiene tests → TrazabilidadTest falla.
 * Si un test referenciado no existe → TrazabilidadTest falla.
 *
 * Categorías:
 *   PROD  — Importación de Productos
 *   FAB   — Importación de Fabricantes
 *   VENTA — Importación de Ventas Diarias
 *   ESC   — Inferencia de Escenario
 *   PIPE  — Pipeline de Importación
 */
class Requisitos
{
    public const MATRIZ = [

        // ── Importación de Productos ──────────────────────────────────────────

        'REQ-PROD-001' => [
            'descripcion' => 'El nombre del producto es obligatorio',
            'categoria'   => 'Importación de Productos',
            'tests'       => [
                'Tests\\Unit\\ValidarProductoTest::test_falla_si_falta_nombre',
                'Tests\\Unit\\ValidarProductoTest::test_falla_si_nombre_esta_vacio',
            ],
        ],

        'REQ-PROD-002' => [
            'descripcion' => 'El precio debe ser un número válido',
            'categoria'   => 'Importación de Productos',
            'tests'       => [
                'Tests\\Unit\\ValidarProductoTest::test_falla_si_precio_no_es_numero',
                'Tests\\Unit\\ValidarProductoTest::test_falla_si_precio_ausente',
                'Tests\\Unit\\ValidarProductoTest::test_acepta_precio_y_stock_como_string_numerico',
                'Tests\\Unit\\ValidarProductoTest::test_acepta_precio_cero',
            ],
        ],

        'REQ-PROD-003' => [
            'descripcion' => 'El stock debe ser un número válido',
            'categoria'   => 'Importación de Productos',
            'tests'       => [
                'Tests\\Unit\\ValidarProductoTest::test_falla_si_stock_no_es_numero',
                'Tests\\Unit\\ValidarProductoTest::test_falla_si_stock_ausente',
            ],
        ],

        'REQ-PROD-004' => [
            'descripcion' => 'La categoría del producto es obligatoria',
            'categoria'   => 'Importación de Productos',
            'tests'       => [
                'Tests\\Unit\\ValidarProductoTest::test_falla_si_falta_categoria',
            ],
        ],

        'REQ-PROD-005' => [
            'descripcion' => 'Todo producto importado queda marcado como esDePrueba=true',
            'categoria'   => 'Importación de Productos',
            'tests'       => [
                'Tests\\Unit\\TransformarProductoTest::test_siempre_marca_esDePrueba_true',
                'Tests\\Feature\\CreateStatusTest::test_todos_los_transformados_llevan_esDePrueba_true',
            ],
        ],

        'REQ-PROD-006' => [
            'descripcion' => 'El producto hereda el escenario del contexto de importación',
            'categoria'   => 'Importación de Productos',
            'tests'       => [
                'Tests\\Unit\\TransformarProductoTest::test_copia_contexto_al_resultado',
                'Tests\\Feature\\InicioTest::test_escenario_del_contexto_se_propaga_a_todos_los_productos',
            ],
        ],

        'REQ-PROD-007' => [
            'descripcion' => 'El producto hereda el loteImportacion del contexto',
            'categoria'   => 'Importación de Productos',
            'tests'       => [
                'Tests\\Feature\\InicioTest::test_lote_fijado_es_identico_en_todos_los_registros',
                'Tests\\Feature\\Prueba::test_todos_los_productos_del_lote_comparten_mismo_loteImportacion',
                'Tests\\Feature\\CreateStatusTest::test_todos_los_transformados_llevan_contexto_del_lote',
            ],
        ],

        // ── Importación de Fabricantes ────────────────────────────────────────

        'REQ-FAB-001' => [
            'descripcion' => 'El DNI del fabricante debe contener exactamente 8 dígitos numéricos',
            'categoria'   => 'Importación de Fabricantes',
            'tests'       => [
                'Tests\\Unit\\ValidarFabricanteTest::test_falla_si_dni_tiene_menos_de_8_digitos',
                'Tests\\Unit\\ValidarFabricanteTest::test_falla_si_dni_tiene_mas_de_8_digitos',
                'Tests\\Unit\\ValidarFabricanteTest::test_falla_si_dni_esta_vacio',
                'Tests\\Unit\\ValidarFabricanteTest::test_falla_si_dni_es_solo_letras',
                'Tests\\Unit\\ValidarFabricanteTest::test_acepta_dni_con_guiones',
                'Tests\\Unit\\ValidarFabricanteTest::test_acepta_dni_con_espacios',
            ],
        ],

        'REQ-FAB-002' => [
            'descripcion' => 'El nombre del fabricante es obligatorio',
            'categoria'   => 'Importación de Fabricantes',
            'tests'       => [
                'Tests\\Unit\\ValidarFabricanteTest::test_falla_si_falta_nombres',
                'Tests\\Unit\\ValidarFabricanteTest::test_falla_si_nombres_esta_vacio',
            ],
        ],

        'REQ-FAB-003' => [
            'descripcion' => 'Los apellidos del fabricante son obligatorios',
            'categoria'   => 'Importación de Fabricantes',
            'tests'       => [
                'Tests\\Unit\\ValidarFabricanteTest::test_falla_si_falta_apellidos',
            ],
        ],

        'REQ-FAB-004' => [
            'descripcion' => 'La marca del fabricante es obligatoria',
            'categoria'   => 'Importación de Fabricantes',
            'tests'       => [
                'Tests\\Unit\\ValidarFabricanteTest::test_falla_si_falta_marca',
            ],
        ],

        'REQ-FAB-005' => [
            'descripcion' => 'Todo fabricante importado queda marcado como activo=true',
            'categoria'   => 'Importación de Fabricantes',
            'tests'       => [
                'Tests\\Feature\\ProfileTest::test_todos_los_fabricantes_transformados_estan_activos',
            ],
        ],

        'REQ-FAB-006' => [
            'descripcion' => 'El fabricante registra creadoEn y actualizadoEn del contexto',
            'categoria'   => 'Importación de Fabricantes',
            'tests'       => [
                'Tests\\Feature\\ProfileTest::test_fabricante_transformado_tiene_creadoEn_del_contexto',
                'Tests\\Feature\\Prueba::test_fabricantes_del_mismo_lote_son_consistentes_con_productos',
            ],
        ],

        // ── Importación de Ventas Diarias ─────────────────────────────────────

        'REQ-VENTA-001' => [
            'descripcion' => 'El productId de la venta es obligatorio',
            'categoria'   => 'Importación de Ventas Diarias',
            'tests'       => [
                'Tests\\Unit\\ValidarVentaDiariaTest::test_falla_si_falta_productId',
                'Tests\\Unit\\ValidarVentaDiariaTest::test_falla_si_productId_esta_vacio',
            ],
        ],

        'REQ-VENTA-002' => [
            'descripcion' => 'La fecha de la venta es obligatoria',
            'categoria'   => 'Importación de Ventas Diarias',
            'tests'       => [
                'Tests\\Unit\\ValidarVentaDiariaTest::test_falla_si_falta_fecha',
                'Tests\\Unit\\ValidarVentaDiariaTest::test_falla_si_fecha_esta_vacia',
            ],
        ],

        'REQ-VENTA-003' => [
            'descripcion' => 'La cantidad vendida debe ser un número válido',
            'categoria'   => 'Importación de Ventas Diarias',
            'tests'       => [
                'Tests\\Unit\\ValidarVentaDiariaTest::test_falla_si_cantidad_no_es_numero',
                'Tests\\Unit\\ValidarVentaDiariaTest::test_falla_si_cantidad_ausente',
            ],
        ],

        'REQ-VENTA-004' => [
            'descripcion' => 'El precioVenta debe ser un número válido',
            'categoria'   => 'Importación de Ventas Diarias',
            'tests'       => [
                'Tests\\Unit\\ValidarVentaDiariaTest::test_falla_si_precioVenta_no_es_numero',
                'Tests\\Unit\\ValidarVentaDiariaTest::test_falla_si_precioVenta_ausente',
            ],
        ],

        'REQ-VENTA-005' => [
            'descripcion' => 'El total de la venta debe ser un número válido',
            'categoria'   => 'Importación de Ventas Diarias',
            'tests'       => [
                'Tests\\Unit\\ValidarVentaDiariaTest::test_falla_si_total_no_es_numero',
                'Tests\\Unit\\ValidarVentaDiariaTest::test_falla_si_total_ausente',
            ],
        ],

        'REQ-VENTA-006' => [
            'descripcion' => 'Toda venta importada queda marcada como devuelto=false',
            'categoria'   => 'Importación de Ventas Diarias',
            'tests'       => [
                'Tests\\Unit\\TransformarVentaDiariaTest::test_devuelto_siempre_es_false',
                'Tests\\Feature\\CursoEloquentTest::test_todos_los_registros_tienen_devuelto_false',
            ],
        ],

        'REQ-VENTA-007' => [
            'descripcion' => 'El documentoTipo por defecto es "ninguno" si no se especifica',
            'categoria'   => 'Importación de Ventas Diarias',
            'tests'       => [
                'Tests\\Unit\\TransformarVentaDiariaTest::test_documentoTipo_default_es_ninguno',
            ],
        ],

        // ── Inferencia de Escenario ───────────────────────────────────────────

        'REQ-ESC-001' => [
            'descripcion' => 'El escenario "crisis" se detecta si el nombre de archivo contiene "crisis"',
            'categoria'   => 'Inferencia de Escenario',
            'tests'       => [
                'Tests\\Unit\\InferirEscenarioTest::test_detecta_escenario_crisis',
                'Tests\\Unit\\InferirEscenarioTest::test_es_insensible_a_mayusculas',
            ],
        ],

        'REQ-ESC-002' => [
            'descripcion' => 'El escenario "normal" se detecta si el nombre de archivo contiene "normal"',
            'categoria'   => 'Inferencia de Escenario',
            'tests'       => [
                'Tests\\Unit\\InferirEscenarioTest::test_detecta_escenario_normal',
                'Tests\\Unit\\InferirEscenarioTest::test_insensible_mayusculas_normal',
            ],
        ],

        'REQ-ESC-003' => [
            'descripcion' => 'El escenario "buenas" se detecta si el nombre contiene "buenas", "buenas_ventas" o "alta"',
            'categoria'   => 'Inferencia de Escenario',
            'tests'       => [
                'Tests\\Unit\\InferirEscenarioTest::test_detecta_escenario_buenas_por_buenas',
                'Tests\\Unit\\InferirEscenarioTest::test_detecta_escenario_buenas_por_buenas_ventas',
                'Tests\\Unit\\InferirEscenarioTest::test_detecta_escenario_buenas_por_alta',
                'Tests\\Unit\\InferirEscenarioTest::test_insensible_mayusculas_buenas',
            ],
        ],

        'REQ-ESC-004' => [
            'descripcion' => 'El escenario por defecto es "general" cuando el nombre no coincide con ningún patrón',
            'categoria'   => 'Inferencia de Escenario',
            'tests'       => [
                'Tests\\Unit\\InferirEscenarioTest::test_retorna_general_por_defecto',
                'Tests\\Feature\\InicioTest::test_contexto_general_cuando_nombre_no_coincide',
            ],
        ],

        'REQ-ESC-005' => [
            'descripcion' => 'La detección de escenario es insensible a mayúsculas y minúsculas',
            'categoria'   => 'Inferencia de Escenario',
            'tests'       => [
                'Tests\\Unit\\InferirEscenarioTest::test_es_insensible_a_mayusculas',
                'Tests\\Unit\\InferirEscenarioTest::test_insensible_mayusculas_normal',
                'Tests\\Unit\\InferirEscenarioTest::test_insensible_mayusculas_buenas',
            ],
        ],

        // ── Pipeline de Importación ───────────────────────────────────────────

        'REQ-PIPE-001' => [
            'descripcion' => 'Las filas inválidas se reportan con su número de fila (fila 1 = encabezado, datos desde fila 2)',
            'categoria'   => 'Pipeline de Importación',
            'tests'       => [
                'Tests\\Feature\\CreateStatusTest::test_numero_de_fila_en_error_comienza_en_2',
                'Tests\\Feature\\CreateStatusTest::test_segundo_error_tiene_fila_correcta',
                'Tests\\Browser\\CreateStatusTest::test_admin_recibe_reporte_de_errores_con_numero_de_fila',
            ],
        ],

        'REQ-PIPE-002' => [
            'descripcion' => 'Cada error incluye un mensaje descriptivo que identifica el campo problemático',
            'categoria'   => 'Pipeline de Importación',
            'tests'       => [
                'Tests\\Feature\\CreateStatusTest::test_lote_con_fila_invalida_la_reporta_como_error',
                'Tests\\Feature\\ProfileTest::test_fabricante_con_dni_invalido_genera_error',
                'Tests\\Feature\\CursoEloquentTest::test_importacion_venta_con_cantidad_invalida_genera_error',
            ],
        ],

        'REQ-PIPE-003' => [
            'descripcion' => 'El campo "total" del resultado equivale al número de filas enviadas',
            'categoria'   => 'Pipeline de Importación',
            'tests'       => [
                'Tests\\Feature\\CursoEloquentTest::test_total_del_resultado_coincide_con_filas_enviadas',
                'Tests\\Feature\\Prueba::test_lote_con_todos_los_tipos_mantiene_totales_correctos',
            ],
        ],

        'REQ-PIPE-004' => [
            'descripcion' => 'Un lote vacío no genera errores ni registros válidos',
            'categoria'   => 'Pipeline de Importación',
            'tests'       => [
                'Tests\\Feature\\CreateStatusTest::test_lote_vacio_retorna_cero_validos_y_cero_errores',
                'Tests\\Browser\\ExampleTest::test_importacion_vacia_no_genera_errores_ni_validos',
            ],
        ],

        'REQ-PIPE-005' => [
            'descripcion' => 'Todos los registros de un mismo lote comparten el mismo loteImportacion',
            'categoria'   => 'Pipeline de Importación',
            'tests'       => [
                'Tests\\Feature\\Prueba::test_productos_y_ventas_del_mismo_lote_son_consistentes',
                'Tests\\Browser\\CreateStatusTest::test_lote_completo_tres_tipos_sin_errores',
            ],
        ],

        'REQ-PIPE-006' => [
            'descripcion' => 'Todos los registros de un lote comparten el mismo escenario',
            'categoria'   => 'Pipeline de Importación',
            'tests'       => [
                'Tests\\Feature\\Prueba::test_todos_los_productos_del_lote_comparten_mismo_escenario',
                'Tests\\Feature\\CursoEloquentTest::test_escenario_crisis_se_propaga_a_todos_los_registros',
                'Tests\\Browser\\CreateStatusTest::test_admin_importa_fabricantes_y_ventas_del_mismo_lote',
            ],
        ],
    ];

    public static function porCategoria(): array
    {
        $agrupados = [];
        foreach (self::MATRIZ as $id => $req) {
            $agrupados[$req['categoria']][$id] = $req;
        }
        return $agrupados;
    }

    public static function totalTests(): int
    {
        return array_sum(array_map(
            fn($req) => count($req['tests']),
            self::MATRIZ
        ));
    }
}
