# Privacidad

Claude Usage Pet no recolecta ni envía datos a ningún servidor propio ni
de terceros. No hay analytics, telemetría, ni tracking de ningún tipo.

Lo único que la app hace con datos es:

- Leer localmente el token OAuth que [Claude Code](https://claude.com/claude-code)
  ya guarda en tu máquina (`~/.claude/.credentials.json`).
- Usar ese token para llamar, directamente desde tu computadora al servidor
  de Anthropic, al mismo endpoint que consulta el comando `/usage` de
  Claude Code — para leer tu propio porcentaje de uso.
- Guardar tus preferencias de la app (posición de la mascota, skin elegido,
  si arranca con Windows) en un archivo JSON local en tu carpeta de
  usuario. Ese archivo nunca sale de tu máquina.

El desarrollador de este proyecto no tiene acceso a tu token, a tu uso de
Claude, ni a ningún otro dato — todo pasa directo entre tu computadora y
Anthropic, igual que si vos mismo corrieras `/usage` en Claude Code.
