<?php

namespace Tests\Feature;

use App\ImportPipeline;
use Tests\TestCase;

// Pipeline completo de importación de productos.
class CreateStatusTest extends TestCase
{
    private function ctx(): array
    {
        return [
            'fileName'        => 'productos_normal.xlsx',
            'importadoEn'     => '2024-01-15T10:00:00',
            'loteImportacion' => 'lote-test-01',
            'escenario'       => 'normal',
        ];
    }

    private function rowValido(array $override = []): array
    {
        return array_merge([
            'nombre'    => 'Zapato Negro',
            'precio'    => 150,
            'stock'     => 10,
            'categoria' => 'Zapatos',
        ], $override);
    }

    public function test_lote_sin_errores_produce_todos_validos(): void
    {
        $rows = [
            $this->rowValido(['nombre' => 'Zapato A']),
            $this->rowValido(['nombre' => 'Zapato B']),
            $this->rowValido(['nombre' => 'Zapato C']),
        ];

        $resultado = ImportPipeline::procesarProductos($rows, $this->ctx());

        $this->assertCount(3, $resultado['validos']);
        $this->assertCount(0, $resultado['errores']);
        $this->assertSame(3, $resultado['total']);
    }

    public function test_lote_con_fila_invalida_la_reporta_como_error(): void
    {
        $rows = [
            $this->rowValido(['precio' => 'gratis']),
        ];

        $resultado = ImportPipeline::procesarProductos($rows, $this->ctx());

        $this->assertCount(0, $resultado['validos']);
        $this->assertCount(1, $resultado['errores']);
        $this->assertStringContainsString('precio', $resultado['errores'][0]['error']);
    }

    public function test_numero_de_fila_en_error_comienza_en_2(): void
    {
        // Fila 0 del array → fila 2 del Excel (fila 1 es el encabezado)
        $rows = [$this->rowValido(['nombre' => ''])];

        $resultado = ImportPipeline::procesarProductos($rows, $this->ctx());

        $this->assertSame(2, $resultado['errores'][0]['fila']);
    }

    public function test_lote_mixto_separa_validos_de_errores(): void
    {
        $rows = [
            $this->rowValido(['nombre' => 'Válido 1']),
            $this->rowValido(['nombre' => '']),            // inválido: nombre vacío
            $this->rowValido(['nombre' => 'Válido 2']),
            $this->rowValido(['precio' => 'abc']),         // inválido: precio no numérico
            $this->rowValido(['nombre' => 'Válido 3']),
        ];

        $resultado = ImportPipeline::procesarProductos($rows, $this->ctx());

        $this->assertCount(3, $resultado['validos']);
        $this->assertCount(2, $resultado['errores']);
        $this->assertSame(5, $resultado['total']);
    }

    public function test_lote_vacio_retorna_cero_validos_y_cero_errores(): void
    {
        $resultado = ImportPipeline::procesarProductos([], $this->ctx());

        $this->assertCount(0, $resultado['validos']);
        $this->assertCount(0, $resultado['errores']);
        $this->assertSame(0, $resultado['total']);
    }

    public function test_todos_los_transformados_llevan_esDePrueba_true(): void
    {
        $rows = [
            $this->rowValido(['nombre' => 'A']),
            $this->rowValido(['nombre' => 'B']),
        ];

        $resultado = ImportPipeline::procesarProductos($rows, $this->ctx());

        foreach ($resultado['validos'] as $producto) {
            $this->assertTrue($producto['esDePrueba']);
        }
    }

    public function test_todos_los_transformados_llevan_contexto_del_lote(): void
    {
        $rows = [$this->rowValido(), $this->rowValido(['nombre' => 'B'])];
        $ctx  = $this->ctx();

        $resultado = ImportPipeline::procesarProductos($rows, $ctx);

        foreach ($resultado['validos'] as $producto) {
            $this->assertSame($ctx['loteImportacion'], $producto['loteImportacion']);
            $this->assertSame($ctx['escenario'], $producto['escenario']);
            $this->assertSame($ctx['importadoEn'], $producto['importadoEn']);
        }
    }

    public function test_segundo_error_tiene_fila_correcta(): void
    {
        $rows = [
            $this->rowValido(),              // fila 2 → válida
            $this->rowValido(['nombre' => '']), // fila 3 → error
        ];

        $resultado = ImportPipeline::procesarProductos($rows, $this->ctx());

        $this->assertSame(3, $resultado['errores'][0]['fila']);
    }
}
