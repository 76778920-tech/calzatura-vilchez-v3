<?php

namespace Tests\Unit;

use App\ImportRules;
use Tests\TestCase;

class TransformarVentaDiariaTest extends TestCase
{
    private function ctx(): array
    {
        return [
            'fileName'        => 'test.xlsx',
            'importadoEn'     => '2024-01-15T10:00:00',
            'loteImportacion' => 'lote-abc-123',
            'escenario'       => 'crisis',
        ];
    }

    private function rowCompleto(): array
    {
        return [
            'productId'       => 'prod-001',
            'codigo'          => 'ZAP-001',
            'nombre'          => 'Zapato Negro',
            'color'           => 'Negro',
            'talla'           => '42',
            'fecha'           => '2024-01-15',
            'cantidad'        => 2,
            'precioVenta'     => 120.0,
            'total'           => 240.0,
            'costoUnitario'   => 80.0,
            'costoTotal'      => 160.0,
            'ganancia'        => 80.0,
            'documentoTipo'   => 'boleta',
            'documentoNumero' => 'B001-000123',
        ];
    }

    public function test_transforma_todos_los_campos(): void
    {
        $result = ImportRules::transformVentaDiaria($this->rowCompleto(), $this->ctx());

        $this->assertSame('prod-001', $result['productId']);
        $this->assertSame('ZAP-001', $result['codigo']);
        $this->assertSame('Zapato Negro', $result['nombre']);
        $this->assertSame('42', $result['talla']);
        $this->assertSame('2024-01-15', $result['fecha']);
        $this->assertSame(2, $result['cantidad']);
        $this->assertSame(120.0, $result['precioVenta']);
        $this->assertSame(240.0, $result['total']);
        $this->assertSame(80.0, $result['costoUnitario']);
        $this->assertSame(160.0, $result['costoTotal']);
        $this->assertSame(80.0, $result['ganancia']);
        $this->assertSame('boleta', $result['documentoTipo']);
        $this->assertSame('B001-000123', $result['documentoNumero']);
    }

    public function test_devuelto_siempre_es_false(): void
    {
        $result = ImportRules::transformVentaDiaria($this->rowCompleto(), $this->ctx());
        $this->assertFalse($result['devuelto']);
    }

    public function test_esDePrueba_siempre_es_true(): void
    {
        $result = ImportRules::transformVentaDiaria($this->rowCompleto(), $this->ctx());
        $this->assertTrue($result['esDePrueba']);
    }

    public function test_documentoTipo_default_es_ninguno(): void
    {
        $row = $this->rowCompleto();
        unset($row['documentoTipo']);
        $result = ImportRules::transformVentaDiaria($row, $this->ctx());
        $this->assertSame('ninguno', $result['documentoTipo']);
    }

    public function test_copia_contexto_al_resultado(): void
    {
        $ctx = $this->ctx();
        $result = ImportRules::transformVentaDiaria($this->rowCompleto(), $ctx);
        $this->assertSame('crisis', $result['escenario']);
        $this->assertSame($ctx['loteImportacion'], $result['loteImportacion']);
        $this->assertSame($ctx['importadoEn'], $result['creadoEn']);
        $this->assertSame($ctx['importadoEn'], $result['importadoEn']);
    }

    public function test_convierte_cantidad_y_precios_a_numericos(): void
    {
        $row = $this->rowCompleto();
        $row['cantidad']    = '3';
        $row['precioVenta'] = '99.9';
        $row['total']       = '299.7';
        $result = ImportRules::transformVentaDiaria($row, $this->ctx());
        $this->assertSame(3, $result['cantidad']);
        $this->assertSame(99.9, $result['precioVenta']);
        $this->assertSame(299.7, $result['total']);
    }

    public function test_campos_opcionales_ausentes_son_cero_o_vacio(): void
    {
        $row = ['productId' => 'p1', 'fecha' => '2024-01-01', 'cantidad' => 1, 'precioVenta' => 10, 'total' => 10];
        $result = ImportRules::transformVentaDiaria($row, $this->ctx());
        $this->assertSame(0.0, $result['costoUnitario']);
        $this->assertSame(0.0, $result['costoTotal']);
        $this->assertSame(0.0, $result['ganancia']);
        $this->assertSame('', $result['codigo']);
        $this->assertSame('', $result['documentoNumero']);
    }
}
