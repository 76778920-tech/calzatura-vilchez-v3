<?php

namespace Tests\Feature;

use App\ImportPipeline;
use Tests\TestCase;

// Consistencia del lote: productos, fabricantes y ventas del mismo lote
// deben compartir el mismo loteImportacion, escenario e importadoEn.
class Prueba extends TestCase
{
    private function ctx(string $escenario = 'normal'): array
    {
        return [
            'fileName'        => 'datos_normal.xlsx',
            'importadoEn'     => '2024-03-01T08:00:00',
            'loteImportacion' => 'lote-consistencia-99',
            'escenario'       => $escenario,
        ];
    }

    public function test_todos_los_productos_del_lote_comparten_mismo_loteImportacion(): void
    {
        $rows = [
            ['nombre' => 'A', 'precio' => 10, 'stock' => 1, 'categoria' => 'X'],
            ['nombre' => 'B', 'precio' => 20, 'stock' => 2, 'categoria' => 'X'],
            ['nombre' => 'C', 'precio' => 30, 'stock' => 3, 'categoria' => 'X'],
        ];

        $resultado = ImportPipeline::procesarProductos($rows, $this->ctx());

        foreach ($resultado['validos'] as $p) {
            $this->assertSame('lote-consistencia-99', $p['loteImportacion']);
        }
    }

    public function test_todos_los_productos_del_lote_comparten_misma_fecha(): void
    {
        $rows = [
            ['nombre' => 'A', 'precio' => 10, 'stock' => 1, 'categoria' => 'X'],
            ['nombre' => 'B', 'precio' => 20, 'stock' => 2, 'categoria' => 'X'],
        ];

        $resultado = ImportPipeline::procesarProductos($rows, $this->ctx());

        foreach ($resultado['validos'] as $p) {
            $this->assertSame('2024-03-01T08:00:00', $p['importadoEn']);
        }
    }

    public function test_todos_los_productos_del_lote_comparten_mismo_escenario(): void
    {
        $rows = [
            ['nombre' => 'A', 'precio' => 10, 'stock' => 1, 'categoria' => 'X'],
            ['nombre' => 'B', 'precio' => 20, 'stock' => 2, 'categoria' => 'X'],
        ];

        $resultado = ImportPipeline::procesarProductos($rows, $this->ctx('crisis'));

        foreach ($resultado['validos'] as $p) {
            $this->assertSame('crisis', $p['escenario']);
        }
    }

    public function test_productos_y_ventas_del_mismo_lote_son_consistentes(): void
    {
        $ctx = $this->ctx();

        $productos = ImportPipeline::procesarProductos([
            ['nombre' => 'Zapato A', 'precio' => 100, 'stock' => 5, 'categoria' => 'Zapatos'],
        ], $ctx);

        $ventas = ImportPipeline::procesarVentasDiarias([
            ['productId' => 'prod-001', 'fecha' => '2024-03-01', 'cantidad' => 1, 'precioVenta' => 100, 'total' => 100],
        ], $ctx);

        $producto = $productos['validos'][0];
        $venta    = $ventas['validos'][0];

        $this->assertSame($producto['loteImportacion'], $venta['loteImportacion']);
        $this->assertSame($producto['escenario'], $venta['escenario']);
        $this->assertSame($producto['importadoEn'], $venta['importadoEn']);
    }

    public function test_fabricantes_del_mismo_lote_son_consistentes_con_productos(): void
    {
        $ctx = $this->ctx('buenas');

        $productos = ImportPipeline::procesarProductos([
            ['nombre' => 'Sandalia', 'precio' => 80, 'stock' => 10, 'categoria' => 'Sandalias'],
        ], $ctx);

        $fabricantes = ImportPipeline::procesarFabricantes([
            ['dni' => '12345678', 'nombres' => 'Ana', 'apellidos' => 'López', 'marca' => 'AL'],
        ], $ctx);

        $p = $productos['validos'][0];
        $f = $fabricantes['validos'][0];

        $this->assertSame($p['loteImportacion'], $f['loteImportacion']);
        $this->assertSame($p['escenario'], $f['escenario']);
        $this->assertSame($p['importadoEn'], $f['creadoEn']);
    }

    public function test_lote_con_todos_los_tipos_mantiene_totales_correctos(): void
    {
        $ctx = $this->ctx();

        $productos   = array_fill(0, 5, ['nombre' => 'X', 'precio' => 1, 'stock' => 1, 'categoria' => 'A']);
        $fabricantes = array_fill(0, 3, ['dni' => '12345678', 'nombres' => 'N', 'apellidos' => 'A', 'marca' => 'M']);
        $ventas      = array_fill(0, 8, ['productId' => 'p1', 'fecha' => '2024-01-01', 'cantidad' => 1, 'precioVenta' => 10, 'total' => 10]);

        $rP = ImportPipeline::procesarProductos($productos, $ctx);
        $rF = ImportPipeline::procesarFabricantes($fabricantes, $ctx);
        $rV = ImportPipeline::procesarVentasDiarias($ventas, $ctx);

        $this->assertSame(5, $rP['total']);
        $this->assertSame(3, $rF['total']);
        $this->assertSame(8, $rV['total']);
        $this->assertCount(0, $rP['errores']);
        $this->assertCount(0, $rF['errores']);
        $this->assertCount(0, $rV['errores']);
    }
}
