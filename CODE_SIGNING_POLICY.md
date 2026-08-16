# Política de firma de código

Este documento existe porque [SignPath Foundation](https://signpath.org)
lo pide publicado como condición para firmar código gratis a proyectos
open source — es la referencia que se linkea en la postulación.

## Roles

Claude Usage Pet es mantenido por una sola persona
([@fvialeleyva](https://github.com/fvialeleyva)), que hoy cumple los tres
roles del proceso de firma:

- **Autor**: escribe y commitea el código.
- **Revisor**: revisa los cambios antes de un release.
- **Aprobador**: aprueba qué build específico se firma y publica.

Si el proyecto suma colaboradores estables, estos roles se van a separar
entre distintas personas.

## Qué se firma

Solo se firman los instaladores (`.exe` generado por `electron-builder`,
target NSIS) publicados como [GitHub Release](https://github.com/fvialeleyva/claude_usage_pet/releases)
de este repositorio, construidos a partir del código fuente público en la
rama `main`. No se firma nada que no salga de este código.

## Autenticación

La cuenta de GitHub del mantenedor tiene verificación en dos pasos (2FA)
activada.

## Contacto

Reportar un problema de seguridad o una duda sobre un build firmado:
abrir un [issue](https://github.com/fvialeleyva/claude_usage_pet/issues)
en este repositorio.
