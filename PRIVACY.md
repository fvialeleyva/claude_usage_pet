# Privacidad

Claude Usage Pet no recolecta ni envía datos a ningún servidor propio ni
de terceros. No hay analytics, telemetría, ni tracking de ningún tipo.

Lo único que la app hace con datos es, según qué tengas instalado:

- Si tenés **Claude Code**: leer localmente el token OAuth que ya guarda
  en tu máquina (`~/.claude/.credentials.json`) y usarlo para llamar,
  directamente desde tu computadora al servidor de Anthropic, al mismo
  endpoint que consulta el comando `/usage` — para leer tu propio
  porcentaje de uso.
- Si tenés la **app de escritorio de Claude** (la de chat normal): leer
  localmente el historial de uso que esa app ya guarda sola
  (`plan-usage-history.json`, en tu carpeta de usuario). No se llama a
  ningún servidor para esto — es un archivo que la otra app ya escribió.
- Guardar tus preferencias de la app (posición de la mascota, skin elegido
  —incluida cualquier imagen propia que subas—, si arranca con Windows) en
  archivos JSON locales en tu carpeta de usuario. Esos archivos nunca
  salen de tu máquina.

El desarrollador de este proyecto no tiene acceso a tu token, a tu uso de
Claude, ni a ningún otro dato — todo pasa directo entre tu computadora y
Anthropic (o se lee de un archivo que ya estaba en tu compu), igual que si
vos mismo corrieras `/usage` en Claude Code o abrieras la app de Claude.
