<?php

namespace Tests\Unit;

use App\ImportRules;
use Tests\TestCase;

class TransformarProductoTest extends TestCase
{
    private function ctx(): array
    {
        return [
            'fileName'        => 'test.xlsx',
            'importadoEn'     => '2024-01-15T10:00:00',
            'loteImportacion' => 'lote-abc-123',
            'escenario'       => 'normal',
        ];
    }

    public function test_transforma_campos_de_texto_correctamente(): void
    {
        $row = [
            'codigo'     => 'ZAP-001',
            'nombre'     => ' Zapato Negro ',
            'precio'     => 150,
            'stock'      => 10,
            'categoria'  => 'Zapatos',
            'descripcion'=> '',
            'marca'      => 'Nike',
            'color'      => 'Negro',
            'destacado'  => 'false',
        ];
        $result = ImportRules::transformProducto($row, $this->ctx());

        $this->assertSame('ZAP-001', $result['codigo']);
        $this->assertSame('Zapato Negro', $result['nombre']); // trimmed
        $this->assertSame('Zapatos', $result['categoria']);
        $this->assertSame('Nike', $result['marca']);
        $this->assertSame('Negro', $result['color']);
    }

    public function test_convierte_precio_y_stock_a_tipos_numericos(): void
    {
        $row = ['nombre' => 'X', 'precio' => '99.99', 'stock' => '5', 'categoria' => 'A'];
        $result = ImportRules::transformProducto($row, $this->ctx());
        $this->assertSame(99.99, $result['precio']);
        $this->assertSame(5, $result['stock']);
    }

    public function test_destacado_false_cuando_campo_es_false(): void
    {
        $row = ['nombre' => 'X', 'precio' => 1, 'stock' => 1, 'categoria' => 'A', 'destacado' => 'false'];
        $result = ImportRules::transformProducto($row, $this->ctx());
        $this->assertFalse($result['destacado']);
    }

    public function test_destacado_true_cuando_campo_es_true(): void
    {
        $row = ['nombre' => 'X', 'precio' => 1, 'stock' => 1, 'categoria' => 'A', 'destacado' => 'true'];
        $result = ImportRules::transformProducto($row, $this->ctx());
        $this->assertTrue($result['destacado']);
    }

    public function test_imagen_e_imagenes_vacios_por_defecto(): void
    {
        $row = ['nombre' => 'X', 'precio' => 1, 'stock' => 1, 'categoria' => 'A'];
        $result = ImportRules::transformProducto($row, $this->ctx());
        $this->assertSame('', $result['imagen']);
        $this->assertSame([], $result['imagenes']);
    }

    public function test_siempre_marca_esDePrueba_true(): void
    {
        $row = ['nombre' => 'X', 'precio' => 1, 'stock' => 1, 'categoria' => 'A'];
        $result = ImportRules::transformProducto($row, $this->ctx());
        $this->assertTrue($result['esDePrueba']);
    }

    public function test_copia_contexto_al_resultado(): void
    {
        $row = ['nombre' => 'X', 'precio' => 1, 'stock' => 1, 'categoria' => 'A'];
        $ctx = $this->ctx();
        $result = ImportRules::transformProducto($row, $ctx);
        $this->assertSame($ctx['importadoEn'], $result['importadoEn']);
        $this->assertSame($ctx['loteImportacion'], $result['loteImportacion']);
        $this->assertSame($ctx['escenario'], $result['escenario']);
    }

    public function test_campos_opcionales_ausentes_quedan_vacios(): void
    {
        $row = ['nombre' => 'X', 'precio' => 1, 'stock' => 1, 'categoria' => 'A'];
        $result = ImportRules::transformProducto($row, $this->ctx());
        $this->assertSame('', $result['codigo']);
        $this->assertSame('', $result['descripcion']);
        $this->assertSame('', $result['marca']);
        $this->assertSame('', $result['color']);
    }
}
