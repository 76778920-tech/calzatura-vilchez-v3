<?php

namespace App;

class ImportRules
{
    public const SCENARIO_LABELS = [
        'crisis'  => 'Crisis',
        'normal'  => 'Normal',
        'buenas'  => 'Buenas Ventas',
        'general' => 'General',
    ];

    // ── Escenario ─────────────────────────────────────────────────────────────

    public static function inferScenario(string $fileName): string
    {
        $n = strtolower($fileName);
        if (str_contains($n, 'crisis')) return 'crisis';
        if (str_contains($n, 'normal')) return 'normal';
        if (str_contains($n, 'buenas') || str_contains($n, 'buenas_ventas') || str_contains($n, 'alta')) return 'buenas';
        return 'general';
    }

    public static function scenarioLabel(?string $key): string
    {
        return self::SCENARIO_LABELS[$key] ?? 'General';
    }

    // ── Productos ─────────────────────────────────────────────────────────────

    public static function validateProducto(array $row): ?string
    {
        if (empty($row['nombre'])) return "Falta el campo 'nombre'";
        if (!isset($row['precio']) || !is_numeric($row['precio'])) return "El campo 'precio' debe ser un número";
        if (!isset($row['stock']) || !is_numeric($row['stock'])) return "El campo 'stock' debe ser un número";
        if (empty($row['categoria'])) return "Falta el campo 'categoria'";
        return null;
    }

    public static function transformProducto(array $row, array $ctx): array
    {
        return [
            'codigo'          => trim((string) ($row['codigo'] ?? '')),
            'nombre'          => trim((string) ($row['nombre'] ?? '')),
            'precio'          => (float) ($row['precio'] ?? 0),
            'stock'           => (int) ($row['stock'] ?? 0),
            'categoria'       => trim((string) ($row['categoria'] ?? '')),
            'descripcion'     => trim((string) ($row['descripcion'] ?? '')),
            'marca'           => trim((string) ($row['marca'] ?? '')),
            'color'           => trim((string) ($row['color'] ?? '')),
            'destacado'       => strtolower((string) ($row['destacado'] ?? '')) === 'true',
            'imagen'          => '',
            'imagenes'        => [],
            'esDePrueba'      => true,
            'importadoEn'     => $ctx['importadoEn'],
            'loteImportacion' => $ctx['loteImportacion'],
            'escenario'       => $ctx['escenario'],
        ];
    }

    // ── Fabricantes ───────────────────────────────────────────────────────────

    public static function validateFabricante(array $row): ?string
    {
        $dni = preg_replace('/\D/', '', (string) ($row['dni'] ?? ''));
        if (strlen($dni) !== 8) return 'El DNI debe tener exactamente 8 dígitos';
        if (empty($row['nombres'])) return "Falta el campo 'nombres'";
        if (empty($row['apellidos'])) return "Falta el campo 'apellidos'";
        if (empty($row['marca'])) return "Falta el campo 'marca'";
        return null;
    }

    public static function transformFabricante(array $row, array $ctx): array
    {
        return [
            'dni'             => trim((string) ($row['dni'] ?? '')),
            'nombres'         => trim((string) ($row['nombres'] ?? '')),
            'apellidos'       => trim((string) ($row['apellidos'] ?? '')),
            'marca'           => trim((string) ($row['marca'] ?? '')),
            'telefono'        => trim((string) ($row['telefono'] ?? '')),
            'observaciones'   => trim((string) ($row['observaciones'] ?? '')),
            'activo'          => true,
            'creadoEn'        => $ctx['importadoEn'],
            'actualizadoEn'   => $ctx['importadoEn'],
            'esDePrueba'      => true,
            'importadoEn'     => $ctx['importadoEn'],
            'loteImportacion' => $ctx['loteImportacion'],
            'escenario'       => $ctx['escenario'],
        ];
    }

    // ── Ventas Diarias ────────────────────────────────────────────────────────

    public static function validateVentaDiaria(array $row): ?string
    {
        if (empty($row['productId'])) return "Falta el campo 'productId'";
        if (empty($row['fecha'])) return "Falta el campo 'fecha'";
        if (!isset($row['cantidad']) || !is_numeric($row['cantidad'])) return "El campo 'cantidad' debe ser un número";
        if (!isset($row['precioVenta']) || !is_numeric($row['precioVenta'])) return "El campo 'precioVenta' debe ser un número";
        if (!isset($row['total']) || !is_numeric($row['total'])) return "El campo 'total' debe ser un número";
        return null;
    }

    public static function transformVentaDiaria(array $row, array $ctx): array
    {
        return [
            'productId'       => trim((string) ($row['productId'] ?? '')),
            'codigo'          => trim((string) ($row['codigo'] ?? '')),
            'nombre'          => trim((string) ($row['nombre'] ?? '')),
            'color'           => trim((string) ($row['color'] ?? '')),
            'talla'           => trim((string) ($row['talla'] ?? '')),
            'fecha'           => trim((string) ($row['fecha'] ?? '')),
            'cantidad'        => (int) ($row['cantidad'] ?? 0),
            'precioVenta'     => (float) ($row['precioVenta'] ?? 0),
            'total'           => (float) ($row['total'] ?? 0),
            'costoUnitario'   => (float) ($row['costoUnitario'] ?? 0),
            'costoTotal'      => (float) ($row['costoTotal'] ?? 0),
            'ganancia'        => (float) ($row['ganancia'] ?? 0),
            'documentoTipo'   => trim((string) ($row['documentoTipo'] ?? 'ninguno')),
            'documentoNumero' => trim((string) ($row['documentoNumero'] ?? '')),
            'devuelto'        => false,
            'creadoEn'        => $ctx['importadoEn'],
            'esDePrueba'      => true,
            'importadoEn'     => $ctx['importadoEn'],
            'loteImportacion' => $ctx['loteImportacion'],
            'escenario'       => $ctx['escenario'],
        ];
    }
}
