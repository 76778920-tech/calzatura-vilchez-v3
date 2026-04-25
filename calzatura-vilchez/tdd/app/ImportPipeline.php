<?php

namespace App;

class ImportPipeline
{
    public static function procesarProductos(array $rows, array $ctx): array
    {
        return self::procesar(
            $rows,
            [ImportRules::class, 'validateProducto'],
            [ImportRules::class, 'transformProducto'],
            $ctx
        );
    }

    public static function procesarFabricantes(array $rows, array $ctx): array
    {
        return self::procesar(
            $rows,
            [ImportRules::class, 'validateFabricante'],
            [ImportRules::class, 'transformFabricante'],
            $ctx
        );
    }

    public static function procesarVentasDiarias(array $rows, array $ctx): array
    {
        return self::procesar(
            $rows,
            [ImportRules::class, 'validateVentaDiaria'],
            [ImportRules::class, 'transformVentaDiaria'],
            $ctx
        );
    }

    // Construye el contexto de importación a partir del nombre de archivo.
    // El lote se puede fijar externamente (útil en tests).
    public static function crearContexto(string $fileName, string $lote = ''): array
    {
        return [
            'fileName'        => $fileName,
            'importadoEn'     => date('Y-m-d\TH:i:s'),
            'loteImportacion' => $lote !== '' ? $lote : ('lote-' . substr(md5($fileName), 0, 8)),
            'escenario'       => ImportRules::inferScenario($fileName),
        ];
    }

    private static function procesar(
        array $rows,
        callable $validator,
        callable $transformer,
        array $ctx
    ): array {
        $validos = [];
        $errores = [];

        foreach ($rows as $index => $row) {
            $error = $validator($row);
            if ($error !== null) {
                $errores[] = ['fila' => $index + 2, 'error' => $error];
            } else {
                $validos[] = $transformer($row, $ctx);
            }
        }

        return [
            'validos' => $validos,
            'errores' => $errores,
            'total'   => count($rows),
        ];
    }
}
