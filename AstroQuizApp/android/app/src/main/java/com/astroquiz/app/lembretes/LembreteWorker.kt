package com.astroquiz.app.lembretes

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.astroquiz.app.MainActivity
import com.astroquiz.app.R

/**
 * Mostra um lembrete agendado pelo app (ver LembretesModule).
 *
 * O texto já vem pronto, no idioma de quem jogou, porque é montado no JS na
 * hora de agendar. Aqui só se exibe — e só se a pessoa ainda permite
 * notificações: ela pode ter desligado nos Ajustes depois do agendamento.
 */
class LembreteWorker(contexto: Context, parametros: WorkerParameters) : Worker(contexto, parametros) {

  override fun doWork(): Result {
    val id = inputData.getString(CHAVE_ID) ?: return Result.success()
    val titulo = inputData.getString(CHAVE_TITULO) ?: return Result.success()
    val texto = inputData.getString(CHAVE_TEXTO) ?: return Result.success()

    val gerenciador = NotificationManagerCompat.from(applicationContext)
    if (!gerenciador.areNotificationsEnabled()) return Result.success()

    criarCanal(applicationContext)

    val abrir = Intent(applicationContext, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      putExtra(EXTRA_LEMBRETE, id)
    }
    val toque = PendingIntent.getActivity(
        applicationContext,
        id.hashCode(),
        abrir,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val notificacao = NotificationCompat.Builder(applicationContext, CANAL)
        .setSmallIcon(R.drawable.ic_stat_lembrete)
        .setContentTitle(titulo)
        .setContentText(texto)
        .setStyle(NotificationCompat.BigTextStyle().bigText(texto))
        .setContentIntent(toque)
        .setAutoCancel(true)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .build()

    try {
      gerenciador.notify(id.hashCode(), notificacao)
    } catch (_: SecurityException) {
      // Permissão retirada entre a checagem e o aviso: nada a mostrar.
    }
    return Result.success()
  }

  companion object {
    const val CANAL = "lembretes"
    const val CHAVE_ID = "id"
    const val CHAVE_TITULO = "titulo"
    const val CHAVE_TEXTO = "texto"
    const val EXTRA_LEMBRETE = "astroquiz.lembrete"

    fun criarCanal(contexto: Context) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
      val canal = NotificationChannel(
          CANAL,
          contexto.getString(R.string.lembretes_canal),
          NotificationManager.IMPORTANCE_DEFAULT,
      )
      contexto.getSystemService(NotificationManager::class.java)?.createNotificationChannel(canal)
    }
  }
}
