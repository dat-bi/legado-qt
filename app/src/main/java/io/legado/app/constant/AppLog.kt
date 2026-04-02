package io.legado.app.constant

import android.util.Log
import io.legado.app.BuildConfig
import io.legado.app.help.config.AppConfig
import io.legado.app.utils.LogUtils
import io.legado.app.utils.toastOnUi
import splitties.init.appCtx
import io.legado.app.R
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.launch

@OptIn(DelicateCoroutinesApi::class)
object AppLog {

    private val mLogs = arrayListOf<Triple<Long, String, Throwable?>>()

    val logs get() = mLogs.toList()

    @Synchronized
    fun put(message: String?, throwable: Throwable? = null, toast: Boolean = false) {
        message ?: return
        if (io.legado.app.utils.TranslateUtils.isTranslateEnabled()) {
            kotlinx.coroutines.GlobalScope.launch(kotlinx.coroutines.Dispatchers.IO) {
                val translatedMsg = io.legado.app.utils.TranslateUtils.translateContent(message)
                val translatedThrowableMsg = throwable?.localizedMessage?.let { 
                    io.legado.app.utils.TranslateUtils.translateContent(it) 
                }
                val finalMsg = if (translatedThrowableMsg != null) "$translatedMsg\n${appCtx.getString(R.string.error)}: $translatedThrowableMsg" else translatedMsg
                putInternal(finalMsg, throwable, toast)
            }
        } else {
            putInternal(message, throwable, toast)
        }
    }

    @Synchronized
    private fun putInternal(message: String, throwable: Throwable?, toast: Boolean) {
        if (mLogs.size > 100) {
            mLogs.removeLastOrNull()
        }
        if (throwable == null) {
            LogUtils.d("AppLog", message)
        } else {
            LogUtils.d("AppLog", "$message\n${throwable.stackTraceToString()}")
        }
        mLogs.add(0, Triple(System.currentTimeMillis(), message, throwable))
        if (BuildConfig.DEBUG) {
            val stackTrace = Thread.currentThread().stackTrace
            Log.e(stackTrace[3].className, message, throwable)
        }
    }

    @Synchronized
    fun putNotSave(message: String?, throwable: Throwable? = null, toast: Boolean = false) {
        message ?: return
        if (io.legado.app.utils.TranslateUtils.isTranslateEnabled()) {
            kotlinx.coroutines.GlobalScope.launch(kotlinx.coroutines.Dispatchers.IO) {
                val translatedMsg = io.legado.app.utils.TranslateUtils.translateContent(message)
                val translatedThrowableMsg = throwable?.localizedMessage?.let { 
                    io.legado.app.utils.TranslateUtils.translateContent(it) 
                }
                val finalMsg = if (translatedThrowableMsg != null) "$translatedMsg\n${appCtx.getString(R.string.error)}: $translatedThrowableMsg" else translatedMsg
                putNotSaveInternal(finalMsg, throwable, toast)
            }
        } else {
            putNotSaveInternal(message, throwable, toast)
        }
    }

    @Synchronized
    private fun putNotSaveInternal(message: String, throwable: Throwable?, toast: Boolean) {
        if (toast) {
            appCtx.toastOnUi(message)
        }
        if (mLogs.size > 100) {
            mLogs.removeLastOrNull()
        }
        mLogs.add(0, Triple(System.currentTimeMillis(), message, throwable))
        if (BuildConfig.DEBUG) {
            val stackTrace = Thread.currentThread().stackTrace
            Log.e(stackTrace[3].className, message, throwable)
        }
    }

    @Synchronized
    fun clear() {
        mLogs.clear()
    }

    fun putDebug(message: String?, throwable: Throwable? = null) {
        if (AppConfig.recordLog) {
            put(message, throwable)
        }
    }

}