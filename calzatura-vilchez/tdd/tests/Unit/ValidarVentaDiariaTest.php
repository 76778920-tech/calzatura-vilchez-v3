<?php

namespace Tests\Unit;

use App\ImportRules;
use Tests\TestCase;

class ValidarVentaDiariaTest extends TestCase
{
    private function rowValido(): array
    {
        return [
            'productId'   => 'prod-001',
            'fecha'       => '2024-01-15',
            'cantidad'    => 2,
            'precioVenta' => 120.0,
            'total'       => 240.0,
        ];
    }

    public function test_valida_venta_diaria_correcta(): void
    {
        $this->assertNull(ImportRules::validateVentaDiaria($this->rowValido()));
    }

    public function test_falla_si_falta_productId(): void
    {
        $row = $this->rowValido();
        unset($row['productId']);
        $this->assertSame("Falta el campo 'productId'", ImportRules::validateVentaDiaria($row));
    }

    public function test_falla_si_productId_esta_vacio(): void
    {
        $row = $this->rowValido();
        $row['productId'] = '';
        $this->assertSame("Falta el campo 'productId'", ImportRules::validateVentaDiaria($row));
    }

    public function test_falla_si_falta_fecha(): void
    {
        $row = $this->rowValido();
        unset($row['fecha']);
        $this->assertSame("Falta el campo 'fecha'", ImportRules::validateVentaDiaria($row));
    }

    public function test_falla_si_fecha_esta_vacia(): void
    {
        $row = $this->rowValido();
        $row['fecha'] = '';
        $this->assertSame("Falta el campo 'fecha'", ImportRules::validateVentaDiaria($row));
    }

    public function test_falla_si_cantidad_no_es_numero(): void
    {
        $row = $this->rowValido();
        $row['cantidad'] = 'dos';
        $this->assertSame("El campo 'cantidad' debe ser un número", ImportRules::validateVentaDiaria($row));
    }

    public function test_falla_si_cantidad_ausente(): void
    {
        $row = $this->rowValido();
        unset($row['cantidad']);
        $this->assertSame("El campo 'cantidad' debe ser un número", ImportRules::validateVentaDiaria($row));
    }

    public function test_falla_si_precioVenta_no_es_numero(): void
    {
        $row = $this->rowValido();
        $row['precioVenta'] = 'caro';
        $this->assertSame("El campo 'precioVenta' debe ser un número", ImportRules::validateVentaDiaria($row));
    }

    public function test_falla_si_precioVenta_ausente(): void
    {
        $row = $this->rowValido();
        unset($row['precioVenta']);
        $this->assertSame("El campo 'precioVenta' debe ser un número", ImportRules::validateVentaDiaria($row));
    }

    public function test_falla_si_total_no_es_numero(): void
    {
        $row = $this->rowValido();
        $row['total'] = 'mucho';
        $this->assertSame("El campo 'total' debe ser un número", ImportRules::validateVentaDiaria($row));
    }

    public function test_falla_si_total_ausente(): void
    {
        $row = $this->rowValido();
        unset($row['total']);
        $this->assertSame("El campo 'total' debe ser un número", ImportRules::validateVentaDiaria($row));
    }

    public function test_acepta_valores_numericos_como_string(): void
    {
        $row = $this->rowValido();
        $row['cantidad'] = '3';
        $row['precioVenta'] = '99.9';
        $row['total'] = '299.7';
        $this->assertNull(ImportRules::validateVentaDiaria($row));
    }
}
