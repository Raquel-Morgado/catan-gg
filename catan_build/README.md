# CATAN GG — versión autocontenida

Proyecto web multijugador para 2–8 jugadoras.

## Qué incluye
- Servidor Node.js + Express + WebSocket.
- Motor autoritativo de partida.
- Tablero aleatorio adaptado a 2–8 jugadoras.
- Recursos personalizados y mar de cerveza.
- Colocación inicial en serpiente.
- Producción de recursos y banco limitado.
- 7, descarte de la mitad, Cristo y robo a adyacentes.
- Construcción legal de caminos, pueblos y ciudades.
- Comercio entre jugadoras con aceptación/rechazo.
- Comercio con banco y puertos 2:1 / 3:1 / 4:1.
- Mazo de desarrollo: 14 perseguidores, 5 puntos, 2 monopolios, 2 abundancias y 2 obras.
- Restricción de no jugar cartas no-VP recién compradas.
- Camino más largo y Mayor ejército.
- Victoria a 10 puntos.
- Desconexiones durante una partida sin liberar las piezas de la jugadora.
- Fotos de perfil guardadas localmente y sincronizadas en la sala.
- Efectos de sonido generados por WebAudio, con interruptor.
- Arte SVG/CSS incluido; no hay que subir imágenes externas.

## Ejecutar en local
Requiere Node.js 20+.

```bash
npm install
npm start
```

Abrir `http://localhost:3000`.

## Publicar en Internet
El proyecto necesita un servicio que ejecute Node.js/WebSocket, no un hosting exclusivamente estático. El siguiente paso después de descargarlo es elegir el hosting y subir este proyecto tal cual.

## Nota
Las ilustraciones son originales de CATAN GG y se han construido como SVG/CSS/emoji dentro del proyecto; no se incluyen recursos oficiales de Catan.
