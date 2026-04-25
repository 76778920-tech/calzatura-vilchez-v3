<?php

namespace Tests\Feature;

use App\ImportPipeline;
use Tests\TestCase;

// Pipeline completo de importación de fabricantes.
class ProfileTest extends TestCase
{
    private function ctx(): array
    {
        return [
            'fileName'        => 'fabricantes_normal.xlsx',
            'importadoEn'     => '2024-01-15T10:00:00',
            'loteImportacion' => 'lote-fab-01',
            'escenario'       => 'normal',
        ];
    }

    private function rowValido(array $override = []): array
    {
        return array_merge([
            'dni'       => '12345678',
            'nombres'   => 'Juan',
            'apellidos' => 'Pérez',
            'marca'     => 'JP Shoes',
        ], $override);
    }

    public function test_importacion_fabricantes_todos_validos(): void
    {
        $rows = [
            $this->rowValido(['nombres' => 'Juan']),
            $this->rowValido(['nombres' => 'María', 'dni' => '87654321']),
            $this->rowValido(['nombres' => 'Carlos', 'dni' => '11223344']),
        ];

        $resultado = ImportPipeline::procesarFabricantes($rows, $this->ctx());

        $this->assertCount(3, $resultado['validos']);
        $this->assertCount(0, $resultado['errores']);
    }

    public function test_fabricante_con_dni_invalido_genera_error(): void
    {
        $rows = [$this->rowValido(['dni' => '1234'])];

        $resultado = ImportPipeline::procesarFabricantes($rows, $this->ctx());

        $this->assertCount(0, $resultado['validos']);
        $this->assertCount(1, $resultado['errores']);
        $this->assertStringContainsString('DNI', $resultado['errores'][0]['error']);
    }

    public function test_fabricante_con_dni_con_guiones_es_valido(): void
    {
        $rows = [$this->rowValido(['dni' => '12-345-678'])];

        $resultado = ImportPipeline::procesarFabricantes($rows, $this->ctx());

        $this->assertCount(1, $resultado['validos']);
        $this->assertCount(0, $resultado['errores']);
    }

    public function test_fabricante_sin_nombres_genera_error(): void
    {
        $rows = [$this->rowValido(['nombres' => ''])];

        $resultado = ImportPipeline::procesarFabricantes($rows, $this->ctx());

        $this->assertCount(1, $resultado['errores']);
        $this->assertStringContainsString('nombres', $resultado['errores'][0]['error']);
    }

    public function test_todos_los_fabricantes_transformados_estan_activos(): void
    {
        $rows = [
            $this->rowValido(['nombres' => 'Ana', 'dni' => '11223344']),
            $this->rowValido(['nombres' => 'Luis', 'dni' => '44332211']),
        ];

        $resultado = ImportPipeline::procesarFabricantes($rows, $this->ctx());

        foreach ($resultado['validos'] as $fabricante) {
            $this->assertTrue($fabricante['activo']);
        }
    }

    public function test_fabricante_transformado_tiene_creadoEn_del_contexto(): void
    {
        $rows = [$this->rowValido()];
        $ctx  = $this->ctx();

        $resultado = ImportPipeline::procesarFabricantes($rows, $ctx);

        $this->assertSame($ctx['importadoEn'], $resultado['validos'][0]['creadoEn']);
        $this->assertSame($ctx['importadoEn'], $resultado['validos'][0]['actualizadoEn']);
    }

    public function test_lote_mixto_fabricantes_separa_correctamente(): void
    {
        $rows = [
            $this->rowValido(),
            $this->rowValido(['dni' => '999']),          // inválido
            $this->rowValido(['dni' => '22334455']),
            $this->rowValido(['apellidos' => '']),        // inválido
        ];

        $resultado = ImportPipeline::procesarFabricantes($rows, $this->ctx());

        $this->assertCount(2, $resultado['validos']);
        $this->assertCount(2, $resultado['errores']);
    }
}
