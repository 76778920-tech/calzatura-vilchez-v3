<?php

namespace Tests\Unit;

use App\ImportRules;
use Tests\TestCase;

class ValidarProductoTest extends TestCase
{
    public function test_valida_correctamente_un_producto_completo(): void
    {
        $row = ['nombre' => 'Zapato Negro', 'precio' => 150, 'stock' => 10, 'categoria' => 'Zapatos'];
        $this->assertNull(ImportRules::validateProducto($row));
    }

    public function test_falla_si_falta_nombre(): void
    {
        $row = ['precio' => 150, 'stock' => 10, 'categoria' => 'Zapatos'];
        $this->assertSame("Falta el campo 'nombre'", ImportRules::validateProducto($row));
    }

    public function test_falla_si_nombre_esta_vacio(): void
    {
        $row = ['nombre' => '', 'precio' => 150, 'stock' => 10, 'categoria' => 'Zapatos'];
        $this->assertSame("Falta el campo 'nombre'", ImportRules::validateProducto($row));
    }

    public function test_falla_si_precio_no_es_numero(): void
    {
        $row = ['nombre' => 'Zapato', 'precio' => 'abc', 'stock' => 10, 'categoria' => 'Zapatos'];
        $this->assertSame("El campo 'precio' debe ser un número", ImportRules::validateProducto($row));
    }

    public function test_falla_si_precio_ausente(): void
    {
        $row = ['nombre' => 'Zapato', 'stock' => 10, 'categoria' => 'Zapatos'];
        $this->assertSame("El campo 'precio' debe ser un número", ImportRules::validateProducto($row));
    }

    public function test_falla_si_stock_no_es_numero(): void
    {
        $row = ['nombre' => 'Zapato', 'precio' => 150, 'stock' => 'muchos', 'categoria' => 'Zapatos'];
        $this->assertSame("El campo 'stock' debe ser un número", ImportRules::validateProducto($row));
    }

    public function test_falla_si_stock_ausente(): void
    {
        $row = ['nombre' => 'Zapato', 'precio' => 150, 'categoria' => 'Zapatos'];
        $this->assertSame("El campo 'stock' debe ser un número", ImportRules::validateProducto($row));
    }

    public function test_falla_si_falta_categoria(): void
    {
        $row = ['nombre' => 'Zapato', 'precio' => 150, 'stock' => 10];
        $this->assertSame("Falta el campo 'categoria'", ImportRules::validateProducto($row));
    }

    public function test_acepta_precio_y_stock_como_string_numerico(): void
    {
        $row = ['nombre' => 'Zapato', 'precio' => '150.5', 'stock' => '5', 'categoria' => 'Botas'];
        $this->assertNull(ImportRules::validateProducto($row));
    }

    public function test_acepta_precio_cero(): void
    {
        $row = ['nombre' => 'Zapato', 'precio' => 0, 'stock' => 0, 'categoria' => 'Botas'];
        $this->assertNull(ImportRules::validateProducto($row));
    }
}
