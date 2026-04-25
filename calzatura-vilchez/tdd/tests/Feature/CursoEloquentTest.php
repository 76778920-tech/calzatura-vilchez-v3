<?php

namespace Tests\Feature;

use App\ImportPipeline;
use Tests\TestCase;

// Pipeline completo de importación de ventas diarias.
class CursoEloquentTest extends TestCase
{
    private function ctx(): array
    {
        return [
            'fileName'        => 'ventas_crisis_enero.xlsx',
            'importadoEn'     => '2024-01-15T10:00:00',
            'loteImportacion' => 'lote-ventas-01',
            'escenario'       => 'crisis',
        ];
    }

    private function rowValido(array $override = []): array
    {
        return array_merge([
            'productId'   => 'prod-001',
            'fecha'       => '2024-01-10',
            'cantidad'    => 2,
            'precioVenta' => 120.0,
            'total'       => 240.0,
        ], $override);
    }

    public function test_importacion_ventas_todas_validas(): void
    {
        $rows = [
            $this->rowValido(['fecha' => '2024-01-10']),
            $this->rowValido(['fecha' => '2024-01-11']),
            $this->rowValido(['fecha' => '2024-01-12']),
        ];

        $resultado = ImportPipeline::procesarVentasDiarias($rows, $this->ctx());

        $this->assertCount(3, $resultado['validos']);
        $this->assertCount(0, $resultado['errores']);
    }

    public function test_importacion_venta_con_cantidad_invalida_genera_error(): void
    {
        $rows = [$this->rowValido(['cantidad' => 'muchos'])];

        $resultado = ImportPipeline::procesarVentasDiarias($rows, $this->ctx());

        $this->assertCount(0, $resultado['validos']);
        $this->assertCount(1, $resultado['errores']);
        $this->assertStringContainsString('cantidad', $resultado['errores'][0]['error']);
    }

    public function test_importacion_venta_con_productId_vacio_genera_error(): void
    {
        $rows = [$this->rowValido(['productId' => ''])];

        $resultado = ImportPipeline::procesarVentasDiarias($rows, $this->ctx());

        $this->assertCount(1, $resultado['errores']);
        $this->assertStringContainsString('productId', $resultado['errores'][0]['error']);
    }

    public function test_todos_los_registros_tienen_devuelto_false(): void
    {
        $rows = [
            $this->rowValido(),
            $this->rowValido(['fecha' => '2024-01-11']),
        ];

        $resultado = ImportPipeline::procesarVentasDiarias($rows, $this->ctx());

        foreach ($resultado['validos'] as $venta) {
            $this->assertFalse($venta['devuelto']);
        }
    }

    public function test_total_del_resultado_coincide_con_filas_enviadas(): void
    {
        $rows = array_fill(0, 10, $this->rowValido());

        $resultado = ImportPipeline::procesarVentasDiarias($rows, $this->ctx());

        $this->assertSame(10, $resultado['total']);
    }

    public function test_lote_mixto_ventas_separa_correctamente(): void
    {
        $rows = [
            $this->rowValido(),
            $this->rowValido(['precioVenta' => 'gratis']),
            $this->rowValido(['fecha' => '']),
            $this->rowValido(),
        ];

        $resultado = ImportPipeline::procesarVentasDiarias($rows, $this->ctx());

        $this->assertCount(2, $resultado['validos']);
        $this->assertCount(2, $resultado['errores']);
    }

    public function test_escenario_crisis_se_propaga_a_todos_los_registros(): void
    {
        $rows = [$this->rowValido(), $this->rowValido()];

        $resultado = ImportPipeline::procesarVentasDiarias($rows, $this->ctx());

        foreach ($resultado['validos'] as $venta) {
            $this->assertSame('crisis', $venta['escenario']);
        }
    }
}
