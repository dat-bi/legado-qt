@file:Suppress("unused")
@file:OptIn(DelicateCoroutinesApi::class)

package io.legado.app.utils

import android.annotation.SuppressLint
import android.content.Context
import android.widget.Toast
import androidx.fragment.app.Fragment
import io.legado.app.BuildConfig
import io.legado.app.databinding.ViewToastBinding
import io.legado.app.help.config.AppConfig
import io.legado.app.lib.theme.bottomBackground
import io.legado.app.lib.theme.getPrimaryTextColor
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import splitties.systemservices.layoutInflater

private var toast: Toast? = null

private var toastLegacy: Toast? = null

fun Context.toastOnUi(message: Int, duration: Int = Toast.LENGTH_SHORT) {
    toastOnUi(getString(message), duration)
}

@SuppressLint("InflateParams")
@Suppress("DEPRECATION", "SetTextI18n")
fun Context.toastOnUi(message: CharSequence?, duration: Int = Toast.LENGTH_SHORT) {
    if (message == null) return
    if (io.legado.app.utils.TranslateUtils.isTranslateEnabled()) {
        kotlinx.coroutines.GlobalScope.launch(kotlinx.coroutines.Dispatchers.Main) {
            val translated = io.legado.app.utils.TranslateUtils.translateContent(message.toString())
            showActualToast(this@toastOnUi, translated, duration)
        }
    } else {
        showActualToast(this, message, duration)
    }
}

@Suppress("DEPRECATION")
private fun showActualToast(context: Context, message: CharSequence, duration: Int) {
    runOnUI {
        kotlin.runCatching {
            toast?.cancel()
            toast = Toast(context)
            val isLight = ColorUtils.isColorLight(context.bottomBackground)
            ViewToastBinding.inflate(context.layoutInflater).run {
                toast?.view = root
                cvToast.setCardBackgroundColor(context.bottomBackground)
                tvText.setTextColor(context.getPrimaryTextColor(isLight))
                tvText.text = message
            }
            toast?.duration = duration
            toast?.show()
        }
    }
}

fun Context.toastOnUiLegacy(message: CharSequence) {
    if (io.legado.app.utils.TranslateUtils.isTranslateEnabled()) {
        kotlinx.coroutines.GlobalScope.launch(kotlinx.coroutines.Dispatchers.Main) {
            val translated = io.legado.app.utils.TranslateUtils.translateContent(message.toString())
            showActualToastLegacy(this@toastOnUiLegacy, translated, Toast.LENGTH_SHORT)
        }
    } else {
        showActualToastLegacy(this, message, Toast.LENGTH_SHORT)
    }
}

private fun showActualToastLegacy(context: Context, message: CharSequence, duration: Int) {
    runOnUI {
        kotlin.runCatching {
            if (toastLegacy == null || BuildConfig.DEBUG || AppConfig.recordLog) {
                toastLegacy = Toast.makeText(context, message, duration)
            } else {
                toastLegacy?.setText(message)
                toastLegacy?.duration = duration
            }
            toastLegacy?.show()
        }
    }
}

fun Context.longToastOnUi(message: Int) {
    toastOnUi(message, Toast.LENGTH_LONG)
}

fun Context.longToastOnUi(message: CharSequence?) {
    toastOnUi(message, Toast.LENGTH_LONG)
}

fun Context.longToastOnUiLegacy(message: CharSequence) {
    if (io.legado.app.utils.TranslateUtils.isTranslateEnabled()) {
        kotlinx.coroutines.GlobalScope.launch(kotlinx.coroutines.Dispatchers.Main) {
            val translated = io.legado.app.utils.TranslateUtils.translateContent(message.toString())
            showActualToastLegacy(this@longToastOnUiLegacy, translated, Toast.LENGTH_LONG)
        }
    } else {
        showActualToastLegacy(this, message, Toast.LENGTH_LONG)
    }
}

fun Fragment.toastOnUi(message: Int) = requireActivity().toastOnUi(message)

fun Fragment.toastOnUi(message: CharSequence) = requireActivity().toastOnUi(message)

fun Fragment.longToast(message: Int) = requireContext().longToastOnUi(message)

fun Fragment.longToast(message: CharSequence) = requireContext().longToastOnUi(message)
