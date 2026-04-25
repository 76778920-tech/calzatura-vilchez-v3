<?php

namespace Tests\Browser;

use App\ImportPipeline;
use App\ImportRules;
use Tests\DuskTestCase;

// Flujos de aceptación: casos límite y recuperación ante datos incorrectos.
class ExampleTest extends DuskTestCase
{
    private function ctx(string $escenario = 'normal', string $lote = 'lote-example'): array
    {
        return [
            'fileName'        => "datos_{$escenario}.xlsx",
            'importadoEn'     => '2024-06-01T09:00:00',
            'loteImportacion' => $lote,
            'escenario'       => $escenario,
        ];
    }

    public function test_importacion_con_todos_los_campos_vacios_reporta_errores_descriptivos(): void
    {
        $rows = [['nombre' => '', 'precio' => '', 'stock' => '', 'categoria' => '']];

        $resultado = ImportPipeline::procesarProductos($rows, $this->ctx());

        $this->assertCount(0, $resultado['validos']);
        $this->assertCount(1, $resultado['errores']);
        $this->assertNotEmpty($resultado['errores'][0]['error']);
    }

    public function test_importacion_vacia_no_genera_errores_ni_validos(): void
    {
        $rP = ImportPipeline::procesarProductos([], $this->ctx());
        $rF = ImportPipeline::procesarFabricantes([], $this->ctx());
        $rV = ImportPipeline::procesarVentasDiarias([], $this->ctx());

        foreach ([$rP, $rF, $rV] as $r) {
            $this->assertSame(0, $r['total']);
            $this->assertCount(0, $r['validos']);
            $this->assertCount(0, $r['errores']);
        }
    }

    public function test_multiples_lotes_tienen_ids_distintos(): void
    {
        $lote1 = ImportPipeline::crearContexto('archivo1.xlsx')['loteImportacion'];
        $lote2 = ImportPipeline::crearContexto('archivo2.xlsx')['loteImportacion'];

        $this->assertNotSame($lote1, $lote2);
    }

    public function test_precio_cero_es_valido_para_producto(): void
    {
        $rows = [['nombre' => 'Muestra gratis', 'precio' => 0, 'stock' => 100, 'categoria' => 'Promo']];

        $resultado = ImportPipeline::procesarProductos($rows, $this->ctx());

        $this->assertCount(1, $resultado['validos']);
        $this->assertSame(0.0, $resultado['validos'][0]['precio']);
    }

    public function test_dni_con_formato_mixto_es_aceptado_en_fabricante(): void
    {
        $formatos = ['12345678', '12-345-678', '1234 5678', '12 34 56 78'];
        $ctx      = $this->ctx();

        foreach ($formatos as $dni) {
            $rows      = [['dni' => $dni, 'nombres' => 'X', 'apellidos' => 'Y', 'marca' => 'Z']];
            $resultado = ImportPipeline::procesarFabricantes($rows, $ctx);
            $this->assertCount(1, $resultado['validos'], "DNI '$dni' debería ser válido");
        }
    }

    public function test_escenario_en_label_es_legible_para_el_usuario(): void
    {
        $esperados = [
            'crisis'  => 'Crisis',
            'normal'  => 'Normal',
            'buenas'  => 'Buenas Ventas',
            'general' => 'General',
            'otro'    => 'General',
        ];

        foreach ($esperados as $clave => $label) {
            $this->assertSame($label, ImportRules::scenarioLabel($clave), "Clave: '$clave'");
        }
    }

    public function test_lote_con_100_filas_validas_procesa_sin_errores(): void
    {
        $rows = [];
        for ($i = 1; $i <= 100; $i++) {
            $rows[] = ['nombre' => "Producto $i", 'precio' => $i * 10, 'stock' => $i, 'categoria' => 'Zapatos'];
        }

        $resultado = ImportPipeline::procesarProductos($rows, $this->ctx('buenas', 'lote-masivo'));

        $this->assertSame(100, $resultado['total']);
        $this->assertCount(100, $resultado['validos']);
        $this->assertCount(0, $resultado['errores']);
    }

    public function test_venta_con_valores_decimales_se_transforma_correctamente(): void
    {
        $rows = [[
            'productId'   => 'p-decimal',
            'fecha'       => '2024-06-15',
            'cantidad'    => 3,
            'precioVenta' => 99.99,
            'total'       => 299.97,
            'ganancia'    => 59.97,
        ]];

        $resultado = ImportPipeline::procesarVentasDiarias($rows, $this->ctx());

        $this->assertCount(1, $resultado['validos']);
        $this->assertSame(99.99, $resultado['validos'][0]['precioVenta']);
        $this->assertSame(299.97, $resultado['validos'][0]['total']);
        $this->assertSame(59.97, $resultado['validos'][0]['ganancia']);
    }
}
