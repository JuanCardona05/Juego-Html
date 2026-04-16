# Prototipo Arcade Racer (Unity + C#)

Este documento explica como montar un prototipo jugable de carreras arcade con contenido original usando primitives.

## 1) Crear proyecto

1. Abre Unity Hub.
2. Crea un proyecto 3D Core (Unity 2021 LTS o superior).
3. Copia la carpeta Assets de este workspace dentro de tu proyecto.

## 2) Escena base

1. Crea una escena nueva llamada MainRace.
2. Agrega un objeto vacio llamado Systems.
3. En Systems agrega estos componentes:
   - GameManager
   - LapSystem
   - UIManager
4. Crea un objeto vacio llamado Track.
5. Dentro de Track crea el circuito con primitives:
   - Suelo principal con Cube escalado (ejemplo 120x1x120).
   - Bordes y muros con Cubes para curvas.
   - Obstaculos con Cylinders o Cubes.
   - Atajo con un camino alternativo mas corto pero mas estrecho.

## 3) Waypoints y checkpoints

1. Crea un objeto vacio llamado WaypointCircuit en Track.
2. Agrega el script WaypointCircuit.
3. Crea hijos vacios WP_00, WP_01, etc. (12 o mas) siguiendo la linea central de la pista.
4. En el componente WaypointCircuit, arrastra los WP en orden a la lista waypoints.
5. Crea checkpoints:
   - Crea objetos Cube o Plane con Collider en modo Is Trigger.
   - Agrega script CheckpointTrigger a cada uno.
   - Asigna checkpointIndex desde 0 hasta N-1 en el mismo orden que los waypoints.
6. En LapSystem asigna la referencia a WaypointCircuit y totalLaps = 3.

## 4) Kart del jugador

1. Crea un objeto vacio PlayerKart.
2. Como hijo, crea primitives para cuerpo y ruedas (cubes/cylinders).
3. En PlayerKart agrega:
   - Rigidbody (masa 1.4 a 2.0, drag 0.1 aprox.)
   - CapsuleCollider o BoxCollider
   - ArcadeKartController
   - RacerIdentity (isPlayer activado)
   - PlayerController
   - PowerUpSystem
4. Opcional recomendado:
   - Crea un objeto visual de escudo (Sphere semitransparente) y asignalo en shieldVisual.
   - Crea Particle Systems para drift/boost/colision y asignalos.

## 5) Oponentes IA (minimo 3)

1. Duplica el kart del jugador tres veces: AI_1, AI_2, AI_3.
2. En cada uno:
   - Desactiva PlayerController.
   - Agrega AIController.
   - En RacerIdentity desactiva isPlayer.
   - En AIController asigna circuito (WaypointCircuit).
3. Ajusta stats en ArcadeKartController para dar variedad:
   - AI rapido: maxSpeed alto, handling medio.
   - AI agil: maxSpeed medio, handling alto.
   - AI pesado: maxSpeed alto, acceleration baja.

## 6) Power-ups

1. Crea prefab simple de misil:
   - Sphere + Collider (Is Trigger) + script ProjectileMissile.
2. Crea prefab simple de trampa:
   - Cylinder plano + Collider (Is Trigger) + script Trap.
3. Asigna ambos prefabs en PowerUpSystem de todos los karts.
4. Crea cajas de power-up en pista:
   - Cubes flotantes con Collider Is Trigger + script PowerUpPickup.
   - Distribuyelas por la pista y atajos.

## 7) Camara tercera persona

1. Selecciona Main Camera.
2. Agrega script ThirdPersonCamera.
3. Asigna target = PlayerKart.

## 8) HUD y pantallas

1. Crea Canvas (Screen Space - Overlay).
2. Crea textos UI:
   - PositionText
   - LapText
   - PowerUpText
   - StartHintText
3. Crea StartPanel con mensaje de inicio.
4. Crea FinishPanel con texto final (oculto por defecto).
5. En UIManager asigna los textos.
6. En GameManager asigna StartPanel, FinishPanel y FinishText.

## 9) Fisica y colisiones divertidas

- Usa Physic Material con poca friccion lateral en pista para facilitar deslizamiento.
- Mantener bordes con colision permite choques con rebote divertido.
- Ajusta VehicleStats por kart para balancear sensacion arcade.

## 10) Controles por teclado

- Acelerar: W o Flecha Arriba
- Frenar/Reversa: S o Flecha Abajo
- Girar: A/D o Flechas Izquierda/Derecha
- Derrape: Espacio
- Usar power-up: Shift Izquierdo o E
- Reiniciar carrera: R
- Iniciar carrera: Espacio o Enter

## Scripts incluidos

- Core:
  - GameManager: flujo inicio/fin/reinicio.
  - RacerIdentity: datos del corredor y referencias.
- Vehicle:
  - VehicleStats: estadisticas por vehiculo.
  - ArcadeKartController: fisica arcade, drift + boost, colisiones.
  - PlayerController: entrada de teclado.
- AI:
  - AIController: sigue waypoints y usa power-ups.
- Race:
  - WaypointCircuit: ruta de pista.
  - CheckpointTrigger: valida paso por checkpoint.
  - LapSystem: vueltas, anti-trampa por checkpoints, ranking.
- Powerups:
  - PowerUpType: enum de items.
  - PowerUpPickup: item box aleatoria.
  - PowerUpSystem: inventario y ejecucion de items.
  - ProjectileMissile: misil guiado.
  - Trap: trampa en suelo.
- UI/Camera:
  - UIManager: HUD (posicion, vuelta, power-up).
  - ThirdPersonCamera: camara suave tercera persona.

## Problemas comunes

- El kart no se mueve: revisa que la carrera haya iniciado (Space/Enter) y que Rigidbody no este en kinematic.
- No cuentan vueltas: revisa orden de checkpointIndex y que Is Trigger este activo.
- IA no sigue pista: asigna WaypointCircuit en AIController o en LapSystem.
- HUD no muestra datos: en RacerIdentity del jugador activa isPlayer.

## Mejores siguientes pasos

1. Agregar audio de motor, derrape, impacto y pickup.
2. Mejorar IA con adelantamientos y uso tactico de atajos.
3. Agregar minimapa y cronometro por vuelta.
4. Agregar sistema de menu principal y seleccion de kart.
5. Integrar VFX low poly para boost, explosiones y polvo.
