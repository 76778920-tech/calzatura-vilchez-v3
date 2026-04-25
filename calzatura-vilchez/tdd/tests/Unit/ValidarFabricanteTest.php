<?php

namespace Tests\Unit;

use App\ImportRules;
use Tests\TestCase;

class ValidarFabricanteTest extends TestCase
{
    public function test_valida_fabricante_correcto(): void
    {
        $row = ['dni' => '12345678', 'nombres' => 'Juan', 'apellidos' => 'Pérez', 'marca' => 'JP Shoes'];
        $this->assertNull(ImportRules::validateFabricante($row));
    }

    public function test_falla_si_dni_tiene_menos_de_8_digitos(): void
    {
        $row = ['dni' => '1234567', 'nombres' => 'Juan', 'apellidos' => 'Pérez', 'marca' => 'JP'];
        $this->assertSame('El DNI debe tener exactamente 8 dígitos', ImportRules::validateFabricante($row));
    }

    public function test_falla_si_dni_tiene_mas_de_8_digitos(): void
    {
        $row = ['dni' => '123456789', 'nombres' => 'Juan', 'apellidos' => 'Pérez', 'marca' => 'JP'];
        $this->assertSame('El DNI debe tener exactamente 8 dígitos', ImportRules::validateFabricante($row));
    }

    public function test_acepta_dni_con_guiones(): void
    {
        $row = ['dni' => '12-345-678', 'nombres' => 'Juan', 'apellidos' => 'Pérez', 'marca' => 'JP'];
        $this->assertNull(ImportRules::validateFabricante($row));
    }

    public function test_acepta_dni_con_espacios(): void
    {
        $row = ['dni' => '1234 5678', 'nombres' => 'Juan', 'apellidos' => 'Pérez', 'marca' => 'JP'];
        $this->assertNull(ImportRules::validateFabricante($row));
    }

    public function test_falla_si_dni_esta_vacio(): void
    {
        $row = ['dni' => '', 'nombres' => 'Juan', 'apellidos' => 'Pérez', 'marca' => 'JP'];
        $this->assertSame('El DNI debe tener exactamente 8 dígitos', ImportRules::validateFabricante($row));
    }

    public function test_falla_si_dni_es_solo_letras(): void
    {
        $row = ['dni' => 'abcdefgh', 'nombres' => 'Juan', 'apellidos' => 'Pérez', 'marca' => 'JP'];
        $this->assertSame('El DNI debe tener exactamente 8 dígitos', ImportRules::validateFabricante($row));
    }

    public function test_falla_si_falta_nombres(): void
    {
        $row = ['dni' => '12345678', 'apellidos' => 'Pérez', 'marca' => 'JP'];
        $this->assertSame("Falta el campo 'nombres'", ImportRules::validateFabricante($row));
    }

    public function test_falla_si_nombres_esta_vacio(): void
    {
        $row = ['dni' => '12345678', 'nombres' => '', 'apellidos' => 'Pérez', 'marca' => 'JP'];
        $this->assertSame("Falta el campo 'nombres'", ImportRules::validateFabricante($row));
    }

    public function test_falla_si_falta_apellidos(): void
    {
        $row = ['dni' => '12345678', 'nombres' => 'Juan', 'marca' => 'JP'];
        $this->assertSame("Falta el campo 'apellidos'", ImportRules::validateFabricante($row));
    }

    public function test_falla_si_falta_marca(): void
    {
        $row = ['dni' => '12345678', 'nombres' => 'Juan', 'apellidos' => 'Pérez'];
        $this->assertSame("Falta el campo 'marca'", ImportRules::validateFabricante($row));
    }
}
