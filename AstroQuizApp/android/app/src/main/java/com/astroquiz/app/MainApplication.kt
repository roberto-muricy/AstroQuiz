package com.astroquiz.app

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactNativeApplicationEntryPoint
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.OkHttpClient
import okhttp3.Protocol

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(this.applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    // In RN 0.76+, use ReactNativeApplicationEntryPoint which initialises SoLoader
    // with the merged SO mapping (OpenSourceMergedSoMapping) required for libreactnative.so
    ReactNativeApplicationEntryPoint.loadReactNative(this)

    // Forca HTTP/1.1 nas requisicoes do app.
    //
    // Sobre HTTP/2, requisicoes POST para o backend eram cortadas com
    // StreamResetException("stream was reset: CANCEL") — o servidor enviava o
    // 200 e em seguida um RST_STREAM, e o OkHttp propaga isso como falha de
    // rede. Afetava start, answer e finish; GET passava. No iOS o React Native
    // usa NSURLSession, outra implementacao de HTTP/2, e o problema nao
    // aparecia — por isso era exclusivo do Android.
    //
    // HTTP/1.1 nao tem fluxos, entao nao ha o que resetar. Perde-se
    // multiplexacao, irrelevante no volume deste app, e ganha-se uma classe
    // inteira de falha a menos.
    OkHttpClientProvider.setOkHttpClientFactory(
        object : OkHttpClientFactory {
          override fun createNewNetworkModuleClient(): OkHttpClient =
              OkHttpClientProvider.createClientBuilder(this@MainApplication)
                  .protocols(listOf(Protocol.HTTP_1_1))
                  .build()
        }
    )
  }
}
