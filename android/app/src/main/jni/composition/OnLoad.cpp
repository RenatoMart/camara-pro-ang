#include "CompositionEngine.hpp"

#include <NitroModules/HybridObjectRegistry.hpp>

namespace camaraproang {

namespace {

/**
 * Registro del motor de composición en `HybridObjectRegistry`.
 *
 * `libcomposition_engine.so` no lo carga la JVM directamente
 * (`System.loadLibrary`): lo arrastra `libappmodules.so` como dependencia de
 * enlazado (`target_link_libraries`), así que su `JNI_OnLoad` —si tuviera
 * uno— nunca se llamaría. El cargador dinámico sí garantiza que el
 * constructor de un objeto estático se ejecute en cuanto la biblioteca
 * compartida se carga en el proceso, venga de donde venga la carga; por eso
 * el registro va aquí y no en un `JNI_OnLoad`.
 */
struct Registrar {
  Registrar() {
    margelo::nitro::HybridObjectRegistry::registerHybridObjectConstructor(
        "CompositionEngine", []() -> std::shared_ptr<margelo::nitro::HybridObject> {
          return std::make_shared<CompositionEngine>();
        });
  }
};

[[maybe_unused]] const Registrar registrar{};

} // namespace

} // namespace camaraproang
