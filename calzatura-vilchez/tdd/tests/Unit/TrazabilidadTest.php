<?php

namespace Tests\Unit;

use App\Requisitos;
use Tests\TestCase;

// ISO 9001 — Trazabilidad de Requisitos
// Valida que la Matriz de Trazabilidad de Requisitos (MTR) sea completa y coherente:
//   1. Cada requisito tiene al menos un test asociado.
//   2. Cada test referenciado existe en el código.
//   3. La MTR cubre todos los módulos del sistema.
class TrazabilidadTest extends TestCase
{
    public function test_todos_los_requisitos_tienen_al_menos_un_test_asociado(): void
    {
        foreach (Requisitos::MATRIZ as $id => $req) {
            $this->assertNotEmpty(
                $req['tests'],
                "El requisito $id ('{$req['descripcion']}') no tiene ningún test asociado."
            );
        }
    }

    public function test_todos_los_tests_referenciados_existen_en_el_codigo(): void
    {
        foreach (Requisitos::MATRIZ as $id => $req) {
            foreach ($req['tests'] as $ref) {
                [$clase, $metodo] = explode('::', $ref);
                $this->assertTrue(
                    method_exists($clase, $metodo),
                    "REQ $id → test '$ref' no existe. Verifica el nombre de clase y método."
                );
            }
        }
    }

    public function test_cada_requisito_tiene_descripcion_no_vacia(): void
    {
        foreach (Requisitos::MATRIZ as $id => $req) {
            $this->assertNotEmpty(
                $req['descripcion'],
                "El requisito $id no tiene descripción."
            );
        }
    }

    public function test_cada_requisito_tiene_categoria_no_vacia(): void
    {
        foreach (Requisitos::MATRIZ as $id => $req) {
            $this->assertNotEmpty(
                $req['categoria'],
                "El requisito $id no tiene categoría."
            );
        }
    }

    public function test_la_mtr_cubre_todos_los_modulos_del_sistema(): void
    {
        $categorias = array_unique(array_column(Requisitos::MATRIZ, 'categoria'));

        $modulosRequeridos = [
            'Importación de Productos',
            'Importación de Fabricantes',
            'Importación de Ventas Diarias',
            'Inferencia de Escenario',
            'Pipeline de Importación',
        ];

        foreach ($modulosRequeridos as $modulo) {
            $this->assertContains(
                $modulo,
                $categorias,
                "El módulo '$modulo' no tiene requisitos en la MTR."
            );
        }
    }

    public function test_la_mtr_tiene_al_menos_20_requisitos(): void
    {
        $this->assertGreaterThanOrEqual(
            20,
            count(Requisitos::MATRIZ),
            'La MTR debe documentar al menos 20 requisitos de negocio.'
        );
    }

    public function test_la_mtr_tiene_al_menos_40_referencias_a_tests(): void
    {
        $this->assertGreaterThanOrEqual(
            40,
            Requisitos::totalTests(),
            'La MTR debe referenciar al menos 40 tests en total.'
        );
    }

    public function test_los_ids_de_requisito_siguen_el_formato_esperado(): void
    {
        foreach (array_keys(Requisitos::MATRIZ) as $id) {
            $this->assertMatchesRegularExpression(
                '/^REQ-[A-Z]+-\d{3}$/',
                $id,
                "El ID '$id' no sigue el formato REQ-CATEGORIA-NNN."
            );
        }
    }

    public function test_porCategoria_agrupa_correctamente(): void
    {
        $agrupados = Requisitos::porCategoria();

        $this->assertArrayHasKey('Importación de Productos', $agrupados);
        $this->assertArrayHasKey('Importación de Fabricantes', $agrupados);
        $this->assertArrayHasKey('Importación de Ventas Diarias', $agrupados);
        $this->assertArrayHasKey('Inferencia de Escenario', $agrupados);
        $this->assertArrayHasKey('Pipeline de Importación', $agrupados);

        // Cada grupo debe tener al menos un requisito
        foreach ($agrupados as $categoria => $requisitos) {
            $this->assertNotEmpty($requisitos, "La categoría '$categoria' está vacía.");
        }
    }
}
