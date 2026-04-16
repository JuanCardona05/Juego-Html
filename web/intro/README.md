# Carpeta de Intro

## Instrucciones

Coloca tu archivo de video `intro.mp4` en esta carpeta.

El video debe cumplir con estos requisitos:
- **Nombre**: `intro.mp4`
- **Formato**: MP4 (video/mp4)
- **Duración recomendada**: 5-8 segundos
- **Codificación**: H.264 o VP9
- **Tamaño**: Se recomienda no exceder 10 MB

## Cómo usarlo

El video se mostrará automáticamente en el menú principal como logo de ChamoKart.

- Se reproduce en bucle (loop)
- Sin sonido (muted)
- Compatible con móviles (playsinline)

## Ejemplo de código (para referencia)

```html
<video id="introVideo" class="intro-video" autoplay muted loop playsinline>
  <source src="intro/intro.mp4" type="video/mp4">
</video>
```
