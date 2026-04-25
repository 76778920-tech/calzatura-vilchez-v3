<?php

namespace Tests\Unit;

use App\ImportRules;
use Tests\TestCase;

class InferirEscenarioTest extends TestCase
{
    // ── inferScenario ─────────────────────────────────────────────────────────

    public function test_detecta_escenario_crisis(): void
    {
        $this->assertSame('crisis', ImportRules::inferScenario('ventas_crisis_2024.xlsx'));
    }

    public function test_detecta_escenario_normal(): void
    {
        $this->assertSame('normal', ImportRules::inferScenario('datos_normal_enero.xlsx'));
    }

    public function test_detecta_escenario_buenas_por_buenas(): void
    {
        $this->assertSame('buenas', ImportRules::inferScenario('buenas_ventas_marzo.xlsx'));
    }

    public function test_detecta_escenario_buenas_por_buenas_ventas(): void
    {
        $this->assertSame('buenas', ImportRules::inferScenario('reporte_buenas_ventas.xlsx'));
    }

    public function test_detecta_escenario_buenas_por_alta(): void
    {
        $this->assertSame('buenas', ImportRules::inferScenario('temporada_alta.xlsx'));
    }

    public function test_retorna_general_por_defecto(): void
    {
        $this->assertSame('general', ImportRules::inferScenario('datos_importados.xlsx'));
    }

    public function test_es_insensible_a_mayusculas(): void
    {
        $this->assertSame('crisis', ImportRules::inferScenario('VENTAS_CRISIS_Q1.xlsx'));
    }

    public function test_insensible_mayusculas_normal(): void
    {
        $this->assertSame('normal', ImportRules::inferScenario('REPORTE_NORMAL.xlsx'));
    }

    public function test_insensible_mayusculas_buenas(): void
    {
        $this->assertSame('buenas', ImportRules::inferScenario('TEMPORADA_ALTA_2024.xlsx'));
    }

    // ── scenarioLabel ─────────────────────────────────────────────────────────

    public function test_label_crisis(): void
    {
        $this->assertSame('Crisis', ImportRules::scenarioLabel('crisis'));
    }

    public function test_label_normal(): void
    {
        $this->assertSame('Normal', ImportRules::scenarioLabel('normal'));
    }

    public function test_label_buenas(): void
    {
        $this->assertSame('Buenas Ventas', ImportRules::scenarioLabel('buenas'));
    }

    public function test_label_general(): void
    {
        $this->assertSame('General', ImportRules::scenarioLabel('general'));
    }

    public function test_label_clave_desconocida_retorna_general(): void
    {
        $this->assertSame('General', ImportRules::scenarioLabel('desconocido'));
    }

    public function test_label_null_retorna_general(): void
    {
        $this->assertSame('General', ImportRules::scenarioLabel(null));
    }
}
