<?php

namespace Tests\Feature;

use App\ImportPipeline;
use App\ImportRules;
use Tests\TestCase;

// Integración entre el nombre de archivo, la inferencia de escenario y el contexto.
class InicioTest extends TestCase
{
    private function rowProducto(string $nombre = 'Zapato'): array
    {
        return ['nombre' => $nombre, 'precio' => 100, 'stock' => 5, 'categoria' => 'Zapatos'];
    }

    public function test_contexto_de_crisis_se_infiere_del_nombre_de_archivo(): void
    {
        $ctx = ImportPipeline::crearContexto('ventas_crisis_q1.xlsx', 'lote-fijo');
        $this->assertSame('crisis', $ctx['escenario']);
    }

    public function test_contexto_de_buenas_ventas_se_infiere_del_nombre(): void
    {
        $ctx = ImportPipeline::crearContexto('temporada_alta_2024.xlsx', 'lote-fijo');
        $this->assertSame('buenas', $ctx['escenario']);
    }

    public function test_contexto_normal_se_infiere_del_nombre(): void
    {
        $ctx = ImportPipeline::crearContexto('datos_normal_enero.xlsx', 'lote-fijo');
        $this->assertSame('normal', $ctx['escenario']);
    }

    public function test_contexto_general_cuando_nombre_no_coincide(): void
    {
        $ctx = ImportPipeline::crearContexto('importacion_2024.xlsx', 'lote-fijo');
        $this->assertSame('general', $ctx['escenario']);
    }

    public function test_escenario_del_contexto_se_propaga_a_todos_los_productos(): void
    {
        $ctx  = ImportPipeline::crearContexto('ventas_crisis_enero.xlsx', 'lote-fijo');
        $rows = [$this->rowProducto('A'), $this->rowProducto('B'), $this->rowProducto('C')];

        $resultado = ImportPipeline::procesarProductos($rows, $ctx);

        foreach ($resultado['validos'] as $producto) {
            $this->assertSame('crisis', $producto['escenario']);
        }
    }

    public function test_lote_fijado_es_identico_en_todos_los_registros(): void
    {
        $ctx  = ImportPipeline::crearContexto('datos.xlsx', 'lote-identificador-unico');
        $rows = [$this->rowProducto('A'), $this->rowProducto('B')];

        $resultado = ImportPipeline::procesarProductos($rows, $ctx);

        foreach ($resultado['validos'] as $producto) {
            $this->assertSame('lote-identificador-unico', $producto['loteImportacion']);
        }
    }

    public function test_contexto_tiene_todos_los_campos_requeridos(): void
    {
        $ctx = ImportPipeline::crearContexto('ventas.xlsx', 'lote-x');

        $this->assertArrayHasKey('fileName', $ctx);
        $this->assertArrayHasKey('importadoEn', $ctx);
        $this->assertArrayHasKey('loteImportacion', $ctx);
        $this->assertArrayHasKey('escenario', $ctx);
    }

    public function test_importadoEn_del_contexto_tiene_formato_de_fecha(): void
    {
        $ctx = ImportPipeline::crearContexto('ventas.xlsx', 'lote-x');

        $this->assertMatchesRegularExpression(
            '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/',
            $ctx['importadoEn']
        );
    }
}
