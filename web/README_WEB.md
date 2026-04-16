# Turbo Trail Rush Web 3D

Prototipo de carreras arcade en Three.js (3D) inspirado en un circuito tropical, con estilo original.

## Ejecutar en local (Windows)

## Opcion 1: VS Code Live Server

1. Abre la carpeta web en VS Code.
2. Click derecho en index.html.
3. Selecciona Open with Live Server.

## Opcion 2: Python

1. Abre PowerShell en la carpeta web.
2. Ejecuta:

```powershell
python -m http.server 8080
```

3. Abre en navegador:

http://localhost:8080

## Opcion 3: Node (si tienes npx)

```powershell
npx serve .
```

## Controles

- W/S o Flechas arriba/abajo: acelerar y frenar
- A/D o Flechas izquierda/derecha: girar
- Shift Izquierdo o Derecho: boost arcade
- Enter o Espacio en pantalla inicial: iniciar carrera
- R: reiniciar

## Estructura

- index.html: HUD y overlays
- styles.css: estilos de la interfaz
- src/main.js: logica completa del juego 3D (escena, pista, jugador, IA, camara, minimapa)

## Caracteristicas

- Conduccion arcade en tercera persona.
- Pista curva 3D con barreras y colision lateral.
- Entorno tropical con palmeras, cabanas, agua y banderines.
- IA basica rival siguiendo la pista.
- HUD con velocidad, posicion, vuelta y estado de boost.
- Mini mapa renderizado en esquina superior derecha.

## Publicar en web

Puedes subir la carpeta web a Netlify, Vercel, GitHub Pages o Itch.io (como proyecto HTML).
