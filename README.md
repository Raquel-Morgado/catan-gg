# CATAN GG

Versión de CATAN GG para jugar online con 2–8 jugadoras.

## Deploy en Render

1. Sube este proyecto a tu repositorio de GitHub.
2. En Render crea un Web Service conectado al repositorio.
3. Configura:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
4. No necesitas Supabase, base de datos ni variables de entorno.

## Perfiles

Hay 8 perfiles fijos:

- Raquel
- Sara
- Carmen Hernandez
- Lucía
- Carmen gago
- Nuria
- Rebeca
- Marta

Los nombres y avatares son parte del juego y no se pueden editar.

En cada partida cada jugadora elige un color. Un color ocupado queda deshabilitado y el servidor también valida que no haya dos jugadoras con el mismo color.

## Persistencia

La partida **no se guarda** en una base de datos ni en disco. El estado vive en memoria del servidor. Si una jugadora pierde la conexión puede volver a entrar con el mismo código y perfil mientras la partida siga viva en el servidor. Si Render reinicia el proceso, la partida se pierde.

El código de partida se conserva localmente en el navegador solo para facilitar la reconexión; no es un guardado de la partida.

## Tablero

- 2 jugadores usan el mismo tablero de 19 hexágonos que 3–4 jugadores.
- Los 19 hexágonos forman una isla hexagonal perfecta.
- El mar rodea la isla y usa una ilustración de agua con olas y espuma.
- Carreteras ocupan aristas reales.
- Pueblos y ciudades ocupan vértices reales.
- Los iconos de construcción usan las piezas personalizadas de cada perfil.

## Importante

Las ilustraciones de los avatares y componentes incluidas en el proyecto son originales y están integradas como archivos locales; no necesitas añadir imágenes externas.
