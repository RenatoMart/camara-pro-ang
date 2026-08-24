# CMakeLists.txt de la app.
#
# El plugin de React Native genera uno equivalente a este por defecto y lo
# esconde dentro de `node_modules` (`default-app-setup/CMakeLists.txt`), así
# que un proyecto normal no necesita tocar C++ para nada. Este archivo es esa
# misma base, ampliada a mano siguiendo las instrucciones de personalización
# que trae el propio comentario del original: existe porque el asistente de
# composición (`composition/`) es C++ propio —inferencia TFLite y, más
# adelante, la geometría de `estructura_cambios.md`— y no depende de ninguna
# librería de React Native para ello.
#
# Referencia: node_modules/react-native/ReactAndroid/cmake-utils/default-app-setup/CMakeLists.txt

cmake_minimum_required(VERSION 3.13)

project(appmodules)

# Registro de TurboModules/Fabric de siempre (JSI, autolinking…). Al haber un
# `OnLoad.cpp` propio en esta misma carpeta (ver más abajo), esta inclusión
# lo usa a él en vez del `OnLoad.cpp` que trae React Native por defecto.
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# ─── Motor de composición IA (C++ propio, sin librerías de RN) ─────────────
add_subdirectory(composition)
target_link_libraries(${CMAKE_PROJECT_NAME} composition_engine)
