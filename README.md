# CATAN GG — versión definitiva autocontenida

Juego web multijugador para 2–8 jugadoras. El ZIP ya contiene el servidor, cliente, motor de reglas y recursos visuales; no hay que añadir imágenes, cartas ni código externo.

## Ejecutarlo en local
Requiere Node.js 20+.

```bash
npm install
npm start
```

Abrir `http://localhost:3000`.

## Publicarlo gratis
Este proyecto está preparado para un **Web Service** de Render porque necesita Node.js y WebSockets. Render admite WebSockets en sus Web Services y ofrece un subdominio `onrender.com`; el plan Free sirve para un proyecto de hobby/pruebas, aunque los servicios gratuitos pueden apagarse por inactividad. Consulta la guía oficial de Render para crear el servicio.

Archivos de despliegue incluidos:
- `render.yaml`
- `.node-version`
- `package.json`

Configuración manual equivalente:
- Runtime: Node
- Build: `npm install`
- Start: `npm start`
- Plan: Free

## Arte incluido
Los recursos y piezas personalizados están incluidos como SVG originales y la interfaz genera parte de la ilustración mediante SVG/CSS. No se usan imágenes oficiales de Catan.
