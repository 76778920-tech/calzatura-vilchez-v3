<?php

namespace Tests\Browser;

use App\ImportPipeline;
use App\ImportRules;
use Tests\DuskTestCase;

// Flujo de aceptación: el administrador importa los 3 tipos de datos
// en un mismo escenario y verifica la consistencia del lote resultante.
class CreateStatusTest extends DuskTestCase
{
    private function ctxCrisis(): array
    {
        return [
            'fileName'        => 'ventas_crisis_enero.xlsx',
            'importadoEn'     => '2024-01-15T08:00:00',
            'loteImportacion' => 'lote-aceptacion-01',
            'escenario'       => 'crisis',
        ];
    }

    public function test_admin_importa_productos_de_escenario_crisis(): void
    {
        $ctx  = $this->ctxCrisis();
        $rows = [
            ['nombre' => 'Zapato A', 'precio' => 80,  'stock' => 15, 'categoria' => 'Zapatos'],
            ['nombre' => 'Sandalia', 'precio' => 45,  'stock' => 30, 'categoria' => 'Sandalias'],
            ['nombre' => 'Bota B',   'precio' => 120, 'stock' => 8,  'categoria' => 'Botas'],
        ];

        $resultado = ImportPipeline::procesarProductos($rows, $ctx);

        $this->assertCount(3, $resultado['validos']);
        $this->assertCount(0, $resultado['errores']);

        foreach ($resultado['validos'] as $p) {
            $this->assertSame('crisis', $p['escenario']);
            $this->assertSame('lote-aceptacion-01', $p['loteImportacion']);
            $this->assertTrue($p['esDePrueba']);
        }
    }

    public function test_admin_importa_fabricantes_y_ventas_del_mismo_lote(): void
    {
        $ctx = $this->ctxCrisis();

        $fabricantes = ImportPipeline::procesarFabricantes([
            ['dni' => '12345678', 'nombres' => 'Juan', 'apellidos' => 'Ríos', 'marca' => 'JR'],
            ['dni' => '87654321', 'nombres' => 'Ana',  'apellidos' => 'Vega', 'marca' => 'AV'],
        ], $ctx);

        $ventas = ImportPipeline::procesarVentasDiarias([
            ['productId' => 'p1', 'fecha' => '2024-01-10', 'cantidad' => 3, 'precioVenta' => 80,  'total' => 240],
            ['productId' => 'p2', 'fecha' => '2024-01-11', 'cantidad' => 1, 'precioVenta' => 45,  'total' => 45],
            ['productId' => 'p1', 'fecha' => '2024-01-12', 'cantidad' => 2, 'precioVenta' => 120, 'total' => 240],
        ], $ctx);

        $this->assertCount(2, $fabricantes['validos']);
        $this->assertCount(3, $ventas['validos']);

        foreach ($fabricantes['validos'] as $f) {
            $this->assertSame('crisis', $f['escenario']);
        }
        foreach ($ventas['validos'] as $v) {
            $this->assertSame('crisis', $v['escenario']);
            $this->assertFalse($v['devuelto']);
        }
    }

    public function test_admin_recibe_reporte_de_errores_con_numero_de_fila(): void
    {
        $ctx  = $this->ctxCrisis();
        $rows = [
            ['nombre' => 'Válido',   'precio' => 100, 'stock' => 5,    'categoria' => 'Zapatos'], // fila 2
            ['nombre' => '',         'precio' => 100, 'stock' => 5,    'categoria' => 'Zapatos'], // fila 3 – error
            ['nombre' => 'Válido 2', 'precio' => 'x', 'stock' => 5,   'categoria' => 'Zapatos'], // fila 4 – error
            ['nombre' => 'Válido 3', 'precio' => 80,  'stock' => 'y',  'categoria' => 'Zapatos'], // fila 5 – error
            ['nombre' => 'Válido 4', 'precio' => 60,  'stock' => 10,   'categoria' => 'Zapatos'], // fila 6
        ];

        $resultado = ImportPipeline::procesarProductos($rows, $ctx);

        $this->assertCount(2, $resultado['validos']);
        $this->assertCount(3, $resultado['errores']);
        $this->assertSame(3, $resultado['errores'][0]['fila']);
        $this->assertSame(4, $resultado['errores'][1]['fila']);
        $this->assertSame(5, $resultado['errores'][2]['fila']);
    }

    public function test_admin_infiere_escenario_automaticamente_del_nombre_de_archivo(): void
    {
        $archivos = [
            'reporte_crisis_q1.xlsx'    => 'crisis',
            'datos_normal_marzo.xlsx'   => 'normal',
            'temporada_alta.xlsx'       => 'buenas',
            'importacion_general.xlsx'  => 'general',
        ];

        foreach ($archivos as $archivo => $escenarioEsperado) {
            $ctx = ImportPipeline::crearContexto($archivo, 'lote-x');
            $this->assertSame($escenarioEsperado, $ctx['escenario'], "Archivo: $archivo");
        }
    }

    public function test_lote_completo_tres_tipos_sin_errores(): void
    {
        $ctx = $this->ctxCrisis();

        $rP = ImportPipeline::procesarProductos([
            ['nombre' => 'Zapato', 'precio' => 90, 'stock' => 20, 'categoria' => 'Zapatos'],
        ], $ctx);

        $rF = ImportPipeline::procesarFabricantes([
            ['dni' => '11223344', 'nombres' => 'Luis', 'apellidos' => 'Mora', 'marca' => 'LM'],
        ], $ctx);

        $rV = ImportPipeline::procesarVentasDiarias([
            ['productId' => 'p1', 'fecha' => '2024-01-10', 'cantidad' => 2, 'precioVenta' => 90, 'total' => 180],
        ], $ctx);

        $this->assertSame(0, count($rP['errores']) + count($rF['errores']) + count($rV['errores']));

        $lote = $ctx['loteImportacion'];
        $this->assertSame($lote, $rP['validos'][0]['loteImportacion']);
        $this->assertSame($lote, $rF['validos'][0]['loteImportacion']);
        $this->assertSame($lote, $rV['validos'][0]['loteImportacion']);
    }
}
