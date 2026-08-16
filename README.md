# Claude Usage Pet

Widget de escritorio para Windows (Electron) que muestra tu uso de Claude
(límite de 5 horas, límite semanal, créditos gastados) en tiempo real, con
una mascota flotante personalizable — estilo Clippy de los 90s.

> **No oficial. No afiliado a Anthropic.** Esta app usa un endpoint interno
> y no documentado de Anthropic (el mismo que consulta el comando `/usage`
> de Claude Code) para leer tu propio porcentaje de uso desde el token OAuth
> que Claude Code ya guarda localmente en tu máquina. No es una API pública
> ni soportada oficialmente — puede cambiar de formato o dejar de funcionar
> sin aviso en cualquier momento. Cada instalación solo lee el uso de la
> persona que la instaló, con su propio token local; no se comparte ni se
> envía a ningún servidor de terceros.

## Qué hace

- Ícono en la bandeja del sistema con el % de uso en el tooltip, y un panel
  de detalle con las barras de 5 horas / semanal / créditos gastados.
- Mascota flotante, arrastrable, siempre visible, con 7 personajes para
  elegir (Action Claude, Muggy, Floppy-O, Forbino Max, Calc-a-Tron, Monitor
  Max, Smiley).
- El estado se ve de un vistazo: normal, atención (50%+) o crítico (90%+).
- Notificaciones nativas de Windows al cruzar el 50% y el 90% de cada
  límite.

## Instalación

Descargá el instalador desde la sección [Releases](../../releases) de este
repo y corré `Claude Usage Pet Setup.exe`. No requiere permisos de
administrador (se instala solo para tu usuario).

> El instalador todavía no está firmado digitalmente. Windows SmartScreen
> puede mostrar un aviso de "editor desconocido" — es esperable mientras no
> se complete ese trámite, no es un error de la instalación.

## Correr desde el código fuente

```bash
git clone https://github.com/<tu-usuario>/claude-usage-pet.git
cd claude-usage-pet
npm install
npm start
```

Requiere tener [Claude Code](https://claude.com/claude-code) instalado y
con sesión iniciada (la app lee el token OAuth que Claude Code guarda en
`~/.claude/.credentials.json`).

## Generar el instalador

```bash
npm run build
```

Genera `dist/Claude Usage Pet Setup.exe` (NSIS, Windows) con
[electron-builder](https://www.electron.build/).

## Licencia

[MIT](LICENSE)

## Firma de código

Este proyecto está en proceso de conseguir firma de código gratuita para
sus instaladores a través de [SignPath Foundation](https://signpath.org).
Ver la [política de firma](CODE_SIGNING_POLICY.md) del proyecto.
