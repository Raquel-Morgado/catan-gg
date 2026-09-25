# CATAN GG

Proyecto web multijugador autocontenido para 2–8 jugadoras.

## Esta versión incluye
- Tablero hexagonal con forma de isla Catan y tamaños adaptados a 2–8.
- Vértices y aristas reales para colocar pueblos/ciudades y carreteras.
- Selección visual: al elegir una construcción se iluminan las posiciones legales.
- Validación de las posiciones también en servidor.
- Recursos y terrenos ilustrados en SVG originales.
- Mar de cerveza ilustrado con oleaje y flotadores temáticos.
- Piezas personalizadas de las 8 jugadoras como ilustraciones vectoriales.
- Cartas de recursos y desarrollo ilustradas.
- Puertos ilustrados.
- Cristo como figura especial.
- Multijugador por WebSocket, códigos de sala y transferencia de anfitriona.
- Reglas de recursos, construcción, comercio, desarrollo, 7/Cristo, Camino más largo, Mayor ejército y victoria.

No necesita descargar imágenes ni añadir assets externos.

## Ejecutar en local
Requiere Node.js 20+.

```bash
npm install
npm start
```

Abrir `http://localhost:3000`.

## Desplegar
El proyecto está preparado para un Web Service de Render.

- Runtime: Node
- Build Command: `npm install`
- Start Command: `npm start`
- Branch: `main`
- Root Directory: vacío
- Plan: Free

El archivo `render.yaml` ya está incluido.
