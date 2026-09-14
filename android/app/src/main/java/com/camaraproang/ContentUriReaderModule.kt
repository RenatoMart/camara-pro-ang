package com.camaraproang

import android.net.Uri
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.FileNotFoundException

/**
 * Lee los bytes de cualquier URI que entienda el `ContentResolver` del
 * sistema — sobre todo `content://`, las que entrega el selector de fotos —
 * y los devuelve a JS como base64.
 *
 * Existe porque Skia (`Skia.Data.fromURI`, usado en
 * `utils/skiaImageIO.ts`) no resuelve `content://` de forma fiable en
 * Android: la fusión del fantasma se quedaba colgada varios segundos y
 * terminaba fallando en silencio cuando el fantasma venía de la galería en
 * vez de una foto de la propia sesión. `ContentResolver.openInputStream` es
 * la misma API que usa el propio selector de fotos de Android para sus
 * miniaturas, así que sí es fiable.
 *
 * Módulo nativo clásico (no Nitro): la interfaz es una sola función, así que
 * no compensa el boilerplate de un HybridObject.
 */
class ContentUriReaderModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "ContentUriReader"

  @ReactMethod
  fun readAsBase64(uri: String, promise: Promise) {
    // Fuera del hilo de JS: leer un archivo de varios megabytes del carrete
    // no debe bloquear el puente.
    Thread {
      try {
        val stream =
          reactApplicationContext.contentResolver.openInputStream(Uri.parse(uri))
            ?: throw FileNotFoundException("No se pudo abrir $uri")
        val bytes = stream.use { it.readBytes() }
        promise.resolve(Base64.encodeToString(bytes, Base64.NO_WRAP))
      } catch (error: Exception) {
        promise.reject("content_uri_read_failed", "No se pudo leer $uri", error)
      }
    }.start()
  }
}
