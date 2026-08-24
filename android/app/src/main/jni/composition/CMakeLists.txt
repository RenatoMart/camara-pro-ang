# Motor de composición IA — CMake propio.
#
# Biblioteca compartida aparte (no fuentes sueltas en el target de la app)
# para que el motor tenga sus propias dependencias nativas (TensorFlow Lite)
# sin mezclarlas con las del resto de la app, y para que sea un punto de
# extensión claro cuando llegue la parte de geometría (OpenCV) de
# `estructura_cambios.md` §6.

cmake_minimum_required(VERSION 3.13)

add_library(composition_engine SHARED
    CompositionEngine.cpp
    OnLoad.cpp
)

target_include_directories(composition_engine PRIVATE
    .
    lib/litert/headers
    # Los headers de LiteRT incluyen sus tipos por la ruta original del
    # repositorio de TensorFlow (`tensorflow/compiler/mlir/...`), que el AAR
    # deja colgando de `external/org_tensorflow`.
    lib/litert/headers/external/org_tensorflow
)

# TensorFlow Lite (LiteRT): motor numérico de Google para correr el .tflite.
# Los .h y el .so los deja aquí una tarea de Gradle (`extractLitertHeaders` /
# `extractLitertSO` en android/app/build.gradle) a partir del AAR
# `com.google.ai.edge.litert:litert`; no se compila desde cero — reimplementar
# un intérprete de redes neuronales no aporta nada, igual que nadie
# reimplementa OpenCV. Lo que sí es código propio es todo lo que rodea a esta
# llamada: la carga del modelo, el pre/post-procesado y la parte geométrica.
find_library(
    TFLITE_JNI
    tensorflowlite_jni
    PATHS "${CMAKE_CURRENT_SOURCE_DIR}/lib/litert/jni/${ANDROID_ABI}"
    NO_DEFAULT_PATH
    NO_CMAKE_FIND_ROOT_PATH
)

find_package(react-native-nitro-modules REQUIRED CONFIG)

# JSI y el runtime de React Native. Los headers de Nitro
# (`NitroModules/ArrayBuffer.hpp`) incluyen `<jsi/jsi.h>`, pero su prefab no
# arrastra esa dependencia, así que hay que declararla aquí: sin esto la
# compilación muere con «'jsi/jsi.h' file not found».
if(NOT TARGET ReactAndroid::jsi)
    find_package(ReactAndroid REQUIRED CONFIG)
endif()

# fbjni: sólo para pedirle a la JVM el `AssetManager` con el que leer el
# modelo desde `assets/` (ver `readAsset()` en CompositionEngine.cpp). Es el
# mismo `libfbjni.so` que ya carga React Native, así que no suma peso al APK.
# `ReactNative-application.cmake` ya lo resolvió en el CMakeLists padre; el
# `if` evita volver a declarar el mismo target importado.
if(NOT TARGET fbjni::fbjni)
    find_package(fbjni REQUIRED CONFIG)
endif()

find_library(LOG_LIB log)

target_link_libraries(composition_engine
    PRIVATE
    ${LOG_LIB}
    android
    ${TFLITE_JNI}
    fbjni::fbjni
    ReactAndroid::jsi
    ReactAndroid::reactnative
    react-native-nitro-modules::NitroModules
)

# C++20: lo exigen los headers de Nitro (`std::remove_cvref_t`, `contains()`,
# plantillas con `auto`). React Native se lo pone al target de la app con
# `target_compile_reactnative_options`, pero esta biblioteca es aparte y tiene
# que declararlo por su cuenta.
target_compile_features(composition_engine PRIVATE cxx_std_20)

# RTTI y excepciones: Nitro las usa para convertir tipos y para propagar los
# errores de C++ como excepciones de JavaScript.
target_compile_options(composition_engine PRIVATE -frtti -fexceptions -Wall -Wextra)
