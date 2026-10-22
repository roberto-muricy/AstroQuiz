package com.astroquiz.app

import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import com.astroquiz.app.lembretes.LembreteWorker
import com.astroquiz.app.lembretes.LembretesModule
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "AstroQuizApp"

  override fun onCreate(savedInstanceState: Bundle?) {
    // Switch from SplashTheme to AppTheme before calling super
    setTheme(R.style.AppTheme)
    super.onCreate(savedInstanceState)
    anotarLembrete(intent)

    // Barra de navegação de três botões: o app já desenha a barra de abas por
    // trás dela (edge-to-edge, targetSdk 36), mas a cor herdada da SplashTheme
    // e o contraste forçado pelo sistema pintavam uma faixa roxa por cima,
    // separada das abas. Transparente e sem contraste forçado, os botões ficam
    // sobre o fundo da própria barra de abas — uma faixa só, como no iOS.
    // Visto num Galaxy A07 (Android 16) em 07/10/2026.
    @Suppress("DEPRECATION")
    window.navigationBarColor = Color.TRANSPARENT
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      window.isNavigationBarContrastEnforced = false
    }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    anotarLembrete(intent)
  }

  /** Toque num lembrete: guarda qual foi, para o JS registrar a volta. */
  private fun anotarLembrete(intent: Intent?) {
    val id = intent?.getStringExtra(LembreteWorker.EXTRA_LEMBRETE) ?: return
    LembretesModule.registrarAbertura(this, id)
    intent.removeExtra(LembreteWorker.EXTRA_LEMBRETE)
  }

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
