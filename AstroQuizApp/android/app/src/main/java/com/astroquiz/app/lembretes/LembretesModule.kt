package com.astroquiz.app.lembretes

import android.content.Context
import androidx.core.app.NotificationManagerCompat
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequest
import androidx.work.WorkManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import java.util.concurrent.TimeUnit

/**
 * Lembretes locais para voltar a jogar: agendados no próprio aparelho, sem
 * servidor e sem token de push. O JS decide quando e o que dizer
 * (src/services/lembreteService.ts); aqui só se agenda, cancela e informa.
 *
 * Usa o WorkManager, que sobrevive a reinício do aparelho — um alarme comum
 * se perderia. A versão é a que o SDK de anúncios já traz.
 */
class LembretesModule(private val contexto: ReactApplicationContext) : ReactContextBaseJavaModule(contexto) {

  override fun getName() = "AstroQuizLembretes"

  @ReactMethod
  fun permissaoConcedida(promise: Promise) {
    promise.resolve(NotificationManagerCompat.from(contexto).areNotificationsEnabled())
  }

  /** No Android o pedido em si é feito pelo JS (POST_NOTIFICATIONS); aqui só se confere o resultado. */
  @ReactMethod
  fun pedirPermissao(promise: Promise) {
    LembreteWorker.criarCanal(contexto)
    promise.resolve(NotificationManagerCompat.from(contexto).areNotificationsEnabled())
  }

  @ReactMethod
  fun agendar(itens: ReadableArray, promise: Promise) {
    try {
      val trabalho = WorkManager.getInstance(contexto)
      trabalho.cancelAllWorkByTag(TAG)
      for (i in 0 until itens.size()) {
        val item = itens.getMap(i) ?: continue
        val id = item.getString("id") ?: continue
        val segundos = item.getDouble("segundos").toLong()
        if (segundos <= 0) continue
        val pedido = OneTimeWorkRequest.Builder(LembreteWorker::class.java)
            .setInitialDelay(segundos, TimeUnit.SECONDS)
            .addTag(TAG)
            .setInputData(Data.Builder()
                .putString(LembreteWorker.CHAVE_ID, id)
                .putString(LembreteWorker.CHAVE_TITULO, item.getString("titulo"))
                .putString(LembreteWorker.CHAVE_TEXTO, item.getString("texto"))
                .build())
            .build()
        trabalho.enqueueUniqueWork("$TAG.$id", ExistingWorkPolicy.REPLACE, pedido)
      }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("lembretes", "Não foi possível agendar os lembretes.")
    }
  }

  @ReactMethod
  fun cancelar(promise: Promise) {
    WorkManager.getInstance(contexto).cancelAllWorkByTag(TAG)
    promise.resolve(null)
  }

  /** O id do lembrete que abriu o app, uma vez só. */
  @ReactMethod
  fun consumirAbertura(promise: Promise) {
    val prefs = contexto.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val id = prefs.getString(CHAVE_ABERTURA, null)
    if (id != null) prefs.edit().remove(CHAVE_ABERTURA).apply()
    promise.resolve(id)
  }

  companion object {
    const val TAG = "astroquiz.lembrete"
    const val PREFS = "astroquiz.lembretes"
    const val CHAVE_ABERTURA = "abertoPor"

    /** Chamado pela MainActivity quando um toque no lembrete abre o app. */
    fun registrarAbertura(contexto: Context, id: String) {
      contexto.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(CHAVE_ABERTURA, id).apply()
    }
  }
}
