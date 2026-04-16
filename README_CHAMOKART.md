# 🏎️ ChamoKart Arcade - Juego de Carreras 3D en Navegador

## 📋 Descripción

**ChamoKart Arcade** es un juego de carreras arcade completo estilo Mario Kart, construido con **Three.js** y ejecutable directamente en el navegador sin necesidad de instalaciones.

### ✨ Características Principales

- ✅ **6 Personajes únicos** con habilidades diferentes (Gato, Perro, Halcón, Panda, Mono, Conejo)
- ✅ **6 Vehículos distintos** con estadísticas variables (Speedster, Stable, Offroad, Formula, Truck, Buggy)
- ✅ **3 Pistas diferentes**: Naturaleza, Ciudad, Desierto - NO circulares
- ✅ **Sistema de Power-Ups**: Cohetes, Pinchos, Turbos, Escudos
- ✅ **IA completa** con 3 niveles de dificultad (Fácil, Medio, Difícil)
- ✅ **Eventos dinámicos**: Monstruo en ciudad lanzando basura, obstáculos variables
- ✅ **Sistema de Derrape (Drift)** con turbo acumulable
- ✅ **Colisiones realistas** con daño progresivo
- ✅ **Cámara tercera persona suave** con ajuste dinámico
- ✅ **Gráficos Low-Poly moderno** con flat shading
- ✅ **Sonido ambiente + música** según pista
- ✅ **Menú visual completo** con previsualización 3D
- ✅ **FPS Counter** en tiempo real

---

## 🎮 Cómo Jugar

### Instalación/Ejecución

1. **Abre el navegador** (Chrome, Firefox, Edge, Safari)
2. **Navega** a `index.html` en la carpeta `web/`
3. **¡A jugar!**

O usa un servidor HTTP:

```bash
# Con Python 3
python -m http.server 8000
# Luego visita http://localhost:8000/web/

# Con Node.js (con http-server)
npx http-server web
```

### Controles en Juego

| Tecla | Acción |
|-------|--------|
| **W** | Acelerar |
| **S** | Frenar/Reversa |
| **A** | Girar izquierda |
| **D** | Girar derecha |
| **Espacio** | Drift/Derrape |
| **Shift** | Turbo (después de driftar) |
| **E** o **Espacio+Clic** | Usar Power-Up |
| **Mouse** | Rotación de previsualización en menú |

---

## 👥 Personajes

### 1. 🐱 **Gato**
- **Habilidad**: Mayor velocidad máxima (+4)
- **Descripción**: Lleva una mochila estilo repartidor. Perfecto para circuitos con rectas largas.

### 2. 🐶 **Perro**
- **Habilidad**: Mejor manejo y drift (+0.35 giro, +0.2 drift)
- **Descripción**: Excelente para precisión en curvas. Fácil de controlar para principiantes.

### 3. 🦅 **Halcón**
- **Habilidad**: Mejor aceleración (+5.2)
- **Descripción**: Rápida salida de curvas. Ideal para salidas agresivas.

### 4. 🐼 **Panda**
- **Habilidad**: Mayor resistencia y agarre (+0.7 grip)
- **Descripción**: Mejor recuperación después de golpes. Tanque del juego.

### 5. 🐵 **Mono** *(NUEVO)*
- **Habilidad**: Equilibrio perfecto - velocidad media + buen control
- **Descripción**: Versátil para todos los estilos de juego. Recomendado para jugadores que buscan equilibrio.

### 6. 🐰 **Conejo** *(NUEVO)*
- **Habilidad**: Drift mejorado + giros rápidos (+0.5 steer, +0.3 drift)
- **Descripción**: Especialista en derrapes. Máximo control en curvas cerradas.

---

## 🚗 Vehículos

### 1. ⚡ **Speedster** - Rápido, Difícil
- Velocidad: 6 | Manejo: -0.25 | Aceleración: 0
- Ideal para: Expertos que quieren velocidad pura

### 2. 🛡️ **Stable** - Estable, Lento
- Velocidad: -2 | Manejo: 0.15 | Aceleración: 2
- Ideal para: Principiantes, máximo control

### 3. 🏔️ **Offroad** - Agarre + Aceleración
- Velocidad: -4 | Manejo: 0.2 | Aceleración: 4.4
- Ideal para: Terreno irregular, buena aceleración

### 4. 🏁 **Formula** - Velocidad Máxima
- Velocidad: 9 | Manejo: -0.45 | Aceleración: 1.4
- Ideal para: Expertos que quieren el máximo rendimiento

### 5. 🚚 **Truck** *(NUEVO)* - Potencia + Resistencia
- Velocidad: -3 | Manejo: -0.15 | Aceleración: 3.0 | Resistencia: ↑↑
- Ideal para: Jugadores defensivos, soporta más daño

### 6. 🏜️ **Buggy** *(NUEVO)* - Ligero + Ágil
- Velocidad: 2 | Manejo: 0.35 | Aceleración: 3.5
- Ideal para: Agilidad máxima, giros ajustados

---

## 🗺️ Pistas (NO Circulares)

### 1. 🌲 **Naturaleza**
- Ambiente: Bosques, montañas, puentes
- Características: Curvas naturales, desniveles, terreno variable
- Obstáculos: Rocas, árboles, peligros naturales
- Eventos: Rocas cayendo aleatorias

### 2. 🏙️ **Ciudad**
- Ambiente: Rascacielos, calles urbanas, plaza central
- Características: Curvas cerradas, rectas urbanas, rampas
- Obstáculos: Monstruo lanzando basura, construcciones
- Eventos: Monstruo atacando, oleadas de tráfico

### 3. 🏜️ **Desierto** *(NUEVO)*
- Ambiente: Dunas de arena, rocas desérticas, cactus
- Características: Curvas amplias, superficies arenosas, visible
- Obstáculos: Esferas rodantes, arenas movedizas
- Eventos: Tormentas de arena dinámicas

---

## 🎁 Sistema de Power-Ups

### Tipos de Power-Ups

| Power-Up | Descripción | Efecto |
|----------|-------------|--------|
| **🚀 Cohete** | Sigue al enemigo más cercano | Persigue + impacta + detiene |
| **🧨 Pinchos** | Coloca pinchos en la pista | Daña a quien los toque |
| **⚡ Turbo** | Boost instantáneo | +1.2x velocidad por 0.22s |
| **🛡️ Escudo** | Protección temporal | Absorbe 1 golpe |
| **💥 Pulso** | Onda expansiva | Daña todos cercanos |

### Cómo Usar Power-Ups
1. **Recoger caja**: Passa sobre cajas plateadas en la pista
2. **Ver en HUD**: Arriba derecha muestra tu power-up actual
3. **Activar**: Presiona **E** o **Espacio**
4. Efecto automático

---

## 🏁 Estadísticas y Daño

### Sistema de Daño
- **Salud**: 0-100
- **Regeneración**: +2.2/seg (sin golpes)
- **Colisiones**: -8 daño
- **Hazards**: -11 a -14 daño
- **Eventos especiales**: -22 daño (monstruo)

### Inmunidad
- **Colisión**: 0.12s cooldown (no hits repetidos)
- **Hazard**: 0.3s cooldown
- **Evento**: 0.9s estupor

---

## 🤖 IA y Dificultades

### Niveles de Dificultad

| Dificultad | Velocidad | Precisión | IA Power-Ups | Atajos |
|-----------|-----------|-----------|-------------|---------|
| **Fácil** | -20% | Baja | Raro | No |
| **Medio** | 100% | Media | Normal | No |
| **Difícil** | +15% | Alta | Frecuente | Sí |

### Comportamiento IA
- Siguen waypoints de pista
- Evitan obstáculos dinámicamente
- Usan power-ups estratégicamente
- En "difícil": toman atajos y ataques coordinados

---

## 💥 Eventos Especiales

### Pista Ciudad: Monstruo Atacador
- 🦹 Aparece en sector específico
- 💀 Lanza basura a jugadores
- 🎯 Inflige 22 de daño
- 🏃 Se mueve hacia el jugador más cercano
- Reaparece si es destruido

### Pista Desierto: Obstáculos Rodantes
- 🏜️ Esferas dinámicas que rebotan
- 💥 Daño en colisión
- ⏱️ Desaparecen por tiempo limitado
- Reaparecen después

### Pista Naturaleza: Rocas Cayendo
- 🪨 Aparecen aleatoriamente
- ⚠️ Pequeño aviso visual
- 💢 Daño leve + desvío
- Evento ambiental

---

## 🎨 Sistema Visual

### Estilo Low-Poly Moderno
- **Geometrías**: Simples pero bien definidas
- **Flat Shading**: Caras marcadas, sin suavizado
- **Paleta de Colores**: Vibrantes, saturados, cálidos
- **Contraste**: Fuerte entre elemento y entorno
- **Iluminación**: DirectionalLight fuerte + sombras VSM
- **Tonos**: Azulados y morados en sombras

### Efectos Visuales
- Humo al driftar (gris/blanco)
- Chispas en colisiones
- Destellos emissive en power-ups
- Glow bloom moderado

---

## 🔊 Audio

### Ambiente
- 🎵 Música de fondo loop
- 🌳 Sonidos ambientes según pista (aves, viento, tráfico)

### Vehículo
- 🏎️ Motor dinámico (varía con velocidad)
- 💨 Sonido derrape
- 💥 Sonido colisión

### Eventos
- ⚡ Power-up recolectado
- 💣 Power-up activado
- 🎯 Golpe recibido
- 🏁 Victoria
- 💀 Eliminación

---

## 📊 Arquitectura del Código

```
web/
├── index.html              # Menú y estructura HTML
├── styles.css              # Estilos CSS
├── src/
│   ├── main.js            # Entrada principal
│   └── arcade/
│       ├── GameManager.js       # Lógica principal del juego
│       ├── PlayerController.js  # Controles jugador + modelos 3D
│       ├── AIController.js      # IA de oponentes
│       ├── TrackGenerator.js    # Generación de pistas
│       ├── PowerUpSystem.js     # Sistema de power-ups
│       ├── SmokeSystem.js       # Partículas de humo
│       ├── AudioManager.js      # Sistema de sonido
│       ├── UIManager.js         # HUD y menú
│       ├── MenuPreview.js       # Previsualización 3D en menú
│       ├── CharacterModels.js   # Modelos 3D personajes (NEW)
│       ├── VehicleModels.js     # Modelos 3D vehículos (NEW)
│       └── EventsSystem.js      # Eventos dinámicos (NEW)
```

### Módulos Nuevos

#### **CharacterModels.js**
- Exporta 6 modelos de personajes en 3D
- Cada uno con low-poly design personalizado
- `getCharacterModel(id)` para instanciar

#### **VehicleModels.js**
- Exporta 6 modelos de vehículos distintos
- Detalles visibles (ruedas, faros, distintivos)
- `getVehicleModel(id, color)` para instanciar con color dinámico

#### **EventsSystem.js**
- Gestiona eventos por pista
- `CityMonster` - Monstruo en ciudad
- `DynamicObstacle` - Obstáculos variables
- `Projectile` - Proyectiles de eventos

---

## 🔧 Optimizaciones Implementadas

### GPU
- ✅ Instanced meshes para props repetitivos
- ✅ LOD de luces (faros deshabilitados >120m)
- ✅ Frustum culling activo
- ✅ Shadow maps adaptables (2048x2048 o 1024x1024)
- ✅ Post-processing 85% resolución interna

### CPU
- ✅ Vector3 pooling (sin new() por frame)
- ✅ Geometry/Material caching en PowerUpSystem
- ✅ Distance gates en hazards
- ✅ Particle capping (max 160 smoke, 120 sparks)

### Colisiones (Mejorado)
- ✅ Sphere-based vehicle collision
- ✅ 0.12s cooldown por par (no hit spam)
- ✅ Damage model (no resets instantáneos)
- ✅ Safety respawn (solo si >1.7s fuera / >3s stuck)
- ✅ Rampas con transiciones suaves

---

## 🐛 Problemas Conocidos y Soluciones

### Colisiones en Rampas
- ✅ **Solucionado**: Sphere collision más suave
- ✅ **Solucionado**: Cooldown de colisión
- ✅ **Solucionado**: Damage model en lugar de reset

### Performance
- ✅ **Optimizado**: Instancing de props
- ✅ **Optimizado**: Particle pooling
- ✅ **Optimizado**: Distance culling
- ✅ **Optimizado**: Adaptive quality tiers

---

## 🎯 Características Futuras Posibles

- [ ] Modo multijugador local (2-4 controles)
- [ ] Replay system
- [ ] Customización vehículo (pegatinas, neons)
- [ ] Carrera de campeonato (multiple rounds)
- [ ] Leaderboard local
- [ ] Efectos de partículas GPU
- [ ] Modo Time Trial
- [ ] Tracks generadas proceduralmente

---

## 📱 Compatibilidad

### Navegadores Soportados
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+ (parcial)

### Requisitos
- WebGL 2.0 compatible
- 2GB RAM mínimo
- 100MB espacio disco

---

## 📝 Cambios Principales v2.0

### Nuevos Personajes
- Mono: Equilibrio perfecto
- Conejo: Agilidad y drift especializado

### Nuevos Vehículos
- Truck: Potencia defensiva
- Buggy: Agilidad ofensiva

### Nueva Pista
- Desierto: Ambiente y mecánicas nuevas

### Nuevos Sistemas
- EventsSystem: Eventos dinámicos por pista
- CharacterModels: Modelos 3D procedurales low-poly
- VehicleModels: 6 vehículos con detalles visuales

### Mejoras
- Colisiones mejoradas con damage model
- Eventos dinámicos (monstruo, obstáculos)
- Sonido ambiente mejorado
- Rendimiento optimizado

---

## 🎓 Instrucciones Técnicas

### Extender el Juego

#### Agregar un Personaje
1. En `CharacterModels.js`, crea función `createXCharacter()`
2. Agrega a `CHARACTER_MODELS` y `AVAILABLE_CHARACTERS`
3. En `PlayerController.js`, agrega entrada a `CHARACTER_PROFILE`
4. En `index.html`, agrega `<option>` al select

#### Agregar un Vehículo
1. En `VehicleModels.js`, crea función `createX(colorHex)`
2. Agrega a `VEHICLE_SPECS`
3. En `PlayerController.js`, agrega entrada a `VEHICLE_PROFILE`
4. En `index.html`, agrega `<option>` al select

#### Agregar un Evento
1. En `EventsSystem.js`, crea clase `EventoNuevo`
2. En `EventsSystem.initializeTrack()`, agrega lógica
3. En `EventsSystem.update()`, agrega llamada y lógica

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea rama feature (`git checkout -b feature/MiFeature`)
3. Commit cambios (`git commit -m 'Agrega MiFeature'`)
4. Push a rama (`git push origin feature/MiFeature`)
5. Abre Pull Request

---

## 📄 Licencia

Este proyecto utiliza Three.js (MIT License) y es de código abierto.

---

## 🎮 ¡Disfruta del Juego!

**¡Que gane el mejor piloto!**

Para preguntas o sugerencias, abre un issue en el repositorio.

---

**Última actualización**: Abril 2026  
**Versión**: 2.0  
**Desarrollador**: Senior Game Developer
