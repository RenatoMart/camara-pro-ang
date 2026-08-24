#include "CompositionEngine.hpp"

#include <android/asset_manager.h>
#include <android/asset_manager_jni.h>
#include <android/log.h>
#include <fbjni/fbjni.h>
#include <tflite/c/c_api.h>

#include <stdexcept>
#include <utility>
#include <vector>

namespace camaraproang {

namespace {
constexpr auto LOG_TAG = "CompositionEngine";
/** El modelo espera exactamente 224×224×3 bytes `uint8` RGB — ver MODELO.md. */
constexpr size_t EXPECTED_INPUT_BYTES = 224 * 224 * 3;
/** 14 salidas `float32`: ver `COMPOSITION_CLASSES` en el lado TypeScript. */
constexpr size_t EXPECTED_OUTPUT_FLOATS = 14;

/** Convierte una excepción de Java en una de C++, para no seguir a ciegas. */
void rethrowJavaException(JNIEnv* env, const char* contexto) {
  if (env->ExceptionCheck() == JNI_FALSE) {
    return;
  }
  env->ExceptionDescribe();
  env->ExceptionClear();
  throw std::runtime_error(std::string("CompositionEngine: la JVM falló al ") + contexto);
}

/**
 * Lee un archivo de `assets/` del APK entero en memoria.
 *
 * Los assets viven comprimidos dentro del APK, así que no hay ruta de fichero
 * que abrir con `fopen`: la única puerta es `AAssetManager`, y ése sólo se
 * obtiene a partir del `AssetManager` de Java. En vez de pedirle a Kotlin que
 * nos lo pase (lo que obligaría a mantener una clase Java sólo para esto), se
 * le pregunta a la propia JVM por el `Application` en curso con
 * `ActivityThread.currentApplication()`, que es una clase del framework y por
 * tanto visible desde cualquier hilo nativo. Así la carga del modelo es C++
 * de principio a fin.
 */
std::vector<uint8_t> readAsset(const std::string& assetName) {
  // El pool de hilos de Nitro no está unido a la JVM: `ThreadScope` lo une
  // mientras dure la lectura y lo desune al salir.
  facebook::jni::ThreadScope scope;
  JNIEnv* env = facebook::jni::Environment::current();
  if (env == nullptr) {
    throw std::runtime_error("CompositionEngine: no hay JNIEnv con el que leer los assets");
  }

  jclass activityThreadClass = env->FindClass("android/app/ActivityThread");
  rethrowJavaException(env, "buscar android.app.ActivityThread");
  jmethodID currentApplication =
      env->GetStaticMethodID(activityThreadClass, "currentApplication", "()Landroid/app/Application;");
  rethrowJavaException(env, "buscar ActivityThread.currentApplication()");

  jobject application = env->CallStaticObjectMethod(activityThreadClass, currentApplication);
  rethrowJavaException(env, "llamar a ActivityThread.currentApplication()");
  if (application == nullptr) {
    throw std::runtime_error("CompositionEngine: la app todavía no tiene Application; el modelo se carga demasiado pronto");
  }

  jclass contextClass = env->GetObjectClass(application);
  jmethodID getAssets = env->GetMethodID(contextClass, "getAssets", "()Landroid/content/res/AssetManager;");
  rethrowJavaException(env, "buscar Context.getAssets()");
  jobject assetManagerObject = env->CallObjectMethod(application, getAssets);
  rethrowJavaException(env, "llamar a Context.getAssets()");

  AAssetManager* assetManager = AAssetManager_fromJava(env, assetManagerObject);
  if (assetManager == nullptr) {
    throw std::runtime_error("CompositionEngine: AAssetManager_fromJava devolvió null");
  }

  AAsset* asset = AAssetManager_open(assetManager, assetName.c_str(), AASSET_MODE_BUFFER);
  if (asset == nullptr) {
    throw std::runtime_error("CompositionEngine: '" + assetName + "' no está en los assets del APK");
  }

  const off_t length = AAsset_getLength(asset);
  std::vector<uint8_t> bytes(static_cast<size_t>(length));
  const int read = AAsset_read(asset, bytes.data(), bytes.size());
  AAsset_close(asset);

  if (read < 0 || static_cast<size_t>(read) != bytes.size()) {
    throw std::runtime_error("CompositionEngine: lectura incompleta de '" + assetName + "'");
  }
  return bytes;
}
} // namespace

/** Estado nativo de TFLite; separado del header para no filtrar `tflite/c/c_api.h` fuera de este .cpp. */
struct CompositionEngine::Impl {
  /**
   * Los bytes del `.tflite`.
   *
   * TFLite **no copia** el modelo: `TfLiteModelCreate` se queda con un puntero
   * al buffer, así que tiene que seguir vivo mientras viva el intérprete. Por
   * eso los bytes se guardan aquí y no en una variable local de la carga.
   */
  std::vector<uint8_t> modelBytes;
  TfLiteModel* model = nullptr;
  TfLiteInterpreterOptions* options = nullptr;
  TfLiteInterpreter* interpreter = nullptr;

  ~Impl() {
    if (interpreter != nullptr) {
      TfLiteInterpreterDelete(interpreter);
    }
    if (options != nullptr) {
      TfLiteInterpreterOptionsDelete(options);
    }
    if (model != nullptr) {
      TfLiteModelDelete(model);
    }
  }
};

CompositionEngine::CompositionEngine() : HybridObject(TAG), _impl(std::make_unique<Impl>()) {}

CompositionEngine::~CompositionEngine() = default;

std::shared_ptr<Promise<void>> CompositionEngine::loadModelFromAsset(const std::string& assetName) {
  // El `shared_ptr` mantiene vivo el motor hasta que termine la carga, aunque
  // JS suelte la referencia mientras tanto. Es `dynamic_pointer_cast` y no
  // `static_pointer_cast` porque `HybridObject` es una base **virtual**: el
  // compilador no puede calcular el desplazamiento en tiempo de compilación.
  auto self = std::dynamic_pointer_cast<CompositionEngine>(shared_from_this());
  return Promise<void>::async([self, assetName]() { self->loadModelBlocking(assetName); });
}

void CompositionEngine::loadModelBlocking(const std::string& assetName) {
  auto impl = std::make_unique<Impl>();
  impl->modelBytes = readAsset(assetName);

  impl->model = TfLiteModelCreate(impl->modelBytes.data(), impl->modelBytes.size());
  if (impl->model == nullptr) {
    throw std::runtime_error("CompositionEngine: no se pudo interpretar el .tflite (¿archivo corrupto?)");
  }

  impl->options = TfLiteInterpreterOptionsCreate();
  // Un solo hilo: el frame processor ya corre en su propio hilo dedicado, y
  // sumar hilos internos de TFLite solo compite por CPU con el resto de la
  // cámara sin bajar la latencia lo bastante como para justificarlo.
  TfLiteInterpreterOptionsSetNumThreads(impl->options, 1);

  impl->interpreter = TfLiteInterpreterCreate(impl->model, impl->options);
  if (impl->interpreter == nullptr) {
    throw std::runtime_error("CompositionEngine: no se pudo crear el intérprete de TFLite");
  }

  if (TfLiteInterpreterAllocateTensors(impl->interpreter) != kTfLiteOk) {
    throw std::runtime_error("CompositionEngine: fallo reservando los tensores del modelo");
  }

  __android_log_print(ANDROID_LOG_INFO, LOG_TAG, "Modelo de composición cargado desde assets/%s (%zu bytes)",
                      assetName.c_str(), impl->modelBytes.size());

  // El intérprete se construye fuera del candado y sólo se publica al final:
  // así una recarga no deja `analyze()` esperando mientras se lee el archivo.
  std::lock_guard<std::mutex> lock(_mutex);
  _impl = std::move(impl);
}

std::shared_ptr<ArrayBuffer> CompositionEngine::analyze(const std::shared_ptr<ArrayBuffer>& rgbPixels) {
  std::lock_guard<std::mutex> lock(_mutex);

  if (_impl->interpreter == nullptr) {
    // El modelo puede tardar un instante en cargar tras montar el asistente;
    // el frame processor no debe morir por eso, simplemente no hay sugerencia
    // todavía.
    return ArrayBuffer::allocate(0);
  }

  if (rgbPixels->size() != EXPECTED_INPUT_BYTES) {
    __android_log_print(ANDROID_LOG_WARN, LOG_TAG, "Buffer de entrada con tamaño inesperado: %zu (se esperaban %zu)",
                         rgbPixels->size(), EXPECTED_INPUT_BYTES);
    return ArrayBuffer::allocate(0);
  }

  TfLiteTensor* input = TfLiteInterpreterGetInputTensor(_impl->interpreter, 0);
  // Sin normalizar y sin restar medias: `preprocess_input` va dentro del
  // grafo del `.tflite` (ver MODELO.md). El bitmap se pasa tal cual.
  if (TfLiteTensorCopyFromBuffer(input, rgbPixels->data(), rgbPixels->size()) != kTfLiteOk) {
    throw std::runtime_error("CompositionEngine: fallo copiando el frame al tensor de entrada");
  }

  if (TfLiteInterpreterInvoke(_impl->interpreter) != kTfLiteOk) {
    throw std::runtime_error("CompositionEngine: fallo al invocar el intérprete");
  }

  const TfLiteTensor* output = TfLiteInterpreterGetOutputTensor(_impl->interpreter, 0);
  size_t outputBytes = TfLiteTensorByteSize(output);
  if (outputBytes != EXPECTED_OUTPUT_FLOATS * sizeof(float)) {
    __android_log_print(ANDROID_LOG_WARN, LOG_TAG, "Salida del modelo con tamaño inesperado: %zu bytes", outputBytes);
  }

  auto result = ArrayBuffer::allocate(outputBytes);
  if (TfLiteTensorCopyToBuffer(output, result->data(), outputBytes) != kTfLiteOk) {
    throw std::runtime_error("CompositionEngine: fallo copiando la salida del modelo");
  }

  return result;
}

void CompositionEngine::loadHybridMethods() {
  HybridObject::loadHybridMethods();
  registerHybrids(this, [](Prototype& prototype) {
    prototype.registerHybridMethod("loadModelFromAsset", &CompositionEngine::loadModelFromAsset);
    prototype.registerHybridMethod("analyze", &CompositionEngine::analyze);
  });
}

} // namespace camaraproang
