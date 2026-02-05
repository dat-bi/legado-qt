package io.legado.app.model

import io.legado.app.utils.DictManager

/**
 * Simple import state - just 3 states: Loading, Success, Error
 */
sealed class DictionaryImportState {
    object Idle : DictionaryImportState()
    data class Loading(val message: String) : DictionaryImportState()
    data class Success(val count: Int) : DictionaryImportState()
    data class Error(val message: String) : DictionaryImportState()
}