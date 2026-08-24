#pragma once

#include <NitroModules/ArrayBuffer.hpp>
#include <NitroModules/HybridObject.hpp>
#include <NitroModules/Promise.hpp>

#include <memory>
#include <mutex>
#include <string>

namespace camaraproang {

using namespace margelo::nitro;

/**
 * Motor nativo del asistente de composición.
 *
 * Es un `HybridObject` de Nitro escrito a mano (sin `nitrogen`): la interfaz
 * es pequeña a propósito —cargar el modelo una vez, analizar muchas veces— así
 * que no compensa generar el boilerplate de una `Spec` completa.
 *
 * Todo el back del asistente vive de este lado: el modelo se lee de los
 * assets del APK aquí mismo, sin que JavaScript toque nunca sus bytes. Eso
 * deja el camino abierto para lo que viene (visión por computador propia:
 * geometría de las líneas, dirección de la diagonal, orientación de la
 * espiral), que no es cosa de ninguna librería.
 *
 * `analyze()` corre síncrono y sin bridge (JSI puro), pensado para llamarse
 * desde el worklet del frame processor de la cámara: nada de serializar,
 * nada de saltar al hilo de JS por cada frame.
 *
 * El intérprete de TensorFlow Lite (la parte que multiplica matrices) viene
 * del runtime de Google (`com.google.ai.edge.litert`, ver `CMakeLists.txt`).
 * Es una pieza reemplazable: `analyze()` es el único punto que lo usa, así
 * que sustituirlo por otra inferencia —o rodearlo de pasos propios— no toca
 * ni el contrato JSI ni el lado TypeScript.
 */
class CompositionEngine : public virtual HybridObject {
public:
  CompositionEngine();
  ~CompositionEngine() override;

public:
  /**
   * Carga un modelo `.tflite` desde los assets del APK y reserva sus tensores.
   *
   * `assetName` es la ruta dentro de `assets/` (p. ej.
   * `"modelo_composicion_int8.tflite"`). El archivo se empaqueta desde
   * `src/features/camera/ai/assets/`, que build.gradle añade como carpeta de
   * assets del módulo.
   *
   * Devuelve una promesa porque el trabajo (leer 2,75 MB y construir el
   * intérprete) corre en el pool de hilos de Nitro: ni el hilo de JS ni el de
   * la cámara se bloquean. Se llama una sola vez, al montar el asistente.
   */
  std::shared_ptr<Promise<void>> loadModelFromAsset(const std::string& assetName);

  /**
   * Corre la inferencia sobre un buffer RGB `uint8` ya preparado por JS
   * (224×224×3, sin alfa). Devuelve las 14 probabilidades del modelo como
   * `float32`, en el mismo orden que `labels.txt` / `COMPOSITION_CLASSES`.
   *
   * Si el modelo aún no se cargó, devuelve un buffer vacío en vez de lanzar:
   * el frame processor no debería morir por una carrera de inicialización.
   */
  std::shared_ptr<ArrayBuffer> analyze(const std::shared_ptr<ArrayBuffer>& rgbPixels);

protected:
  void loadHybridMethods() override;

private:
  /** El trabajo real de `loadModelFromAsset`, ya fuera del hilo que llamó. */
  void loadModelBlocking(const std::string& assetName);

  struct Impl;
  std::unique_ptr<Impl> _impl;
  std::mutex _mutex;

  static constexpr auto TAG = "CompositionEngine";
};

} // namespace camaraproang
