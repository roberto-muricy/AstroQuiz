package com.astroquiz.app.lembretes

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class LembretesPackage : ReactPackage {
  override fun createNativeModules(contexto: ReactApplicationContext): List<NativeModule> =
      listOf(LembretesModule(contexto))

  override fun createViewManagers(contexto: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
