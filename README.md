# Claude Usage Pet

Widget de escritorio para Windows (Electron) que muestra tu uso de Claude
(límite de 5 horas, límite semanal, créditos gastados) en tiempo real, con
una mascota flotante personalizable — estilo Clippy de los 90s.

> **No oficial. No afiliado a Anthropic.** Esta app lee tu propio
> porcentaje de uso de dos formas no documentadas por Anthropic: (1) el
> mismo endpoint interno que consulta el comando `/usage` de Claude Code,
> usando el token OAuth que Claude Code guarda localmente, o (2) si no
> tenés Claude Code, el historial de uso que guarda localmente la app de
> escritorio de Claude "normal". Ninguna es una API pública ni soportada
> oficialmente — pueden cambiar de formato o dejar de funcionar sin aviso
> en cualquier momento. Cada instalación solo lee el uso de la persona que
> la instaló, de su propia máquina; no se comparte ni se envía a ningún
> servidor de terceros (ver [PRIVACY.md](PRIVACY.md)).

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
git clone https://github.com/fvialeleyva/claude_usage_pet.git
cd claude_usage_pet
npm install
npm start
```

Requiere tener instalada **Claude Code** (CLI o su app de escritorio) o
la **app de escritorio de Claude** (la de chat normal), con sesión
iniciada en cualquiera de las dos. Con Claude Code ves los cuatro datos
(5h, semanal, plan, créditos gastados); con la app de Claude normal ves
solo los porcentajes de 5h y semanal (esa app no guarda plan ni créditos
en su historial local, así que esos campos quedan en "—" / "N/D" — no es
un error).

## "No se pudo leer tu uso" / la mascota no conecta

1. Si tenés **Claude Code**: abrilo y **mandale cualquier mensaje** — con
   solo tenerlo abierto de fondo no alcanza, tiene que hacer al menos una
   consulta para renovar tu sesión.
2. Si solo tenés la **app de Claude normal**: abrila y dejala un rato
   activa (actualiza su historial de uso sola cada tanto).
3. Volvé al panel de Claude Usage Pet y tocá "Reintentar".

Si el error persiste, el mensaje que muestra el panel dice la causa
exacta (ninguna sesión encontrada, sesión vencida, historial desactualizado,
o que alguno de los dos formatos no documentados cambió).

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

## Privacidad

Ver [PRIVACY.md](PRIVACY.md) — resumen corto: no se recolecta ni envía
ningún dato a nadie más que a Anthropic, con tu propio token, igual que
`/usage` en Claude Code.
