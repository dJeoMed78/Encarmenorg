# Evidencia real de Chromium

SHA probado: `0b05f9a14ffb58270fb9f7356d839aa2fc55a407`.
Run: https://github.com/dJeoMed78/Encarmenorg/actions/runs/40955633868

164 PASS / 1 FAIL / 0 omitidas. API sintética controlada; no MariaDB.

JPEG reducidos (máximo 640 px de ancho, calidad 55), derivados de capturas reales.

| Viewport | Inicio | Ficha | Clasificados | Formulario | Error API | Encabezado |
|---|---|---|---|---|---|---|
| 320x568 | [home](320x568-home.jpg) | [business](320x568-business.jpg) | [classifieds](320x568-classifieds.jpg) | [form](320x568-form.jpg) | [server-error](320x568-server-error.jpg) | [header](320x568-header.jpg) |
| 360x800 | [home](360x800-home.jpg) | [business](360x800-business.jpg) | [classifieds](360x800-classifieds.jpg) | [form](360x800-form.jpg) | [server-error](360x800-server-error.jpg) | [header](360x800-header.jpg) |
| 390x844 | [home](390x844-home.jpg) | [business](390x844-business.jpg) | [classifieds](390x844-classifieds.jpg) | [form](390x844-form.jpg) | [server-error](390x844-server-error.jpg) | [header](390x844-header.jpg) |
| 768x1024 | [home](768x1024-home.jpg) | [business](768x1024-business.jpg) | [classifieds](768x1024-classifieds.jpg) | [form](768x1024-form.jpg) | [server-error](768x1024-server-error.jpg) | [header](768x1024-header.jpg) |
| 1440x900 | [home](1440x900-home.jpg) | [business](1440x900-business.jpg) | [classifieds](1440x900-classifieds.jpg) | [form](1440x900-form.jpg) | [server-error](1440x900-server-error.jpg) | [header](1440x900-header.jpg) |

[Resultado completo comprimido](results.json.gz) · [Resumen legible](summary.json) · [Hashes y procedencia](manifest.json)

[Traza representativa reducida](representative-trace-reduced.zip): acciones y solicitudes de un escenario de rechazo API. Incluye manifiesto de recursos grandes omitidos. ZIP validado mediante CRC. No equivale al conjunto completo de trazas originales.

El único fallo es el botón SOS recortado a 320 px (borde derecho 352.796875). [Contexto DOM del fallo](320x568-header-context.md).

GitHub rechazó upload-artifact por cuota. Se recuperó esta evidencia de los logs con recover-evidence.py; los reportes HTML y todos los PNG/ZIP originales se generaron en el runner pero no se recuperaron.
