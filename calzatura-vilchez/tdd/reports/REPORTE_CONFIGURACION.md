# Reporte De Configuracion De Pruebas

Fecha: 2026-04-18

## Entorno Detectado

PHP:

```text
PHP 8.2.12
```

Composer:

```text
Composer 2.9.5
```

PHPUnit local:

```text
PHPUnit 10.5.63
```

## Archivos De Configuracion

| Archivo | Estado |
| --- | --- |
| `tdd/composer.json` | Existe |
| `tdd/composer.lock` | Existe |
| `tdd/phpunit.xml` | Existe |
| `tdd/vendor/` | Existe |
| `tdd/tests/TestCase.php` | Existe |
| `tdd/tests/DuskTestCase.php` | Existe |

## Scripts Disponibles

Desde `tdd` puedes ejecutar:

```bash
composer test
composer test:feature
composer test:browser
composer test:unit
```

## Estado De PHPUnit Global

El PHPUnit global de XAMPP sigue siendo incompatible con PHP 8.2, pero ya no importa porque la suite usa PHPUnit local instalado en:

```text
tdd/vendor/bin/phpunit
```

## Configuracion De Suites

| Suite | Ruta |
| --- | --- |
| Unit | `tests/Unit` |
| Feature | `tests/Feature` |
| Browser | `tests/Browser` |

La suite `Feature` está configurada con `suffix=".php"` para incluir también `Prueba.php`, ya que ese archivo no termina en `Test.php`.

