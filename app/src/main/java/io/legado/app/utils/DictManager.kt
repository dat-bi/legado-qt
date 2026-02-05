package io.legado.app.utils

import android.content.Context
import android.net.Uri
import android.util.Log
import io.legado.app.model.DictionaryImportState
import io.legado.app.model.TranslationLoader
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import splitties.init.appCtx
import java.io.File

object DictManager {

    private const val TAG = "DictManager"
    private const val DICT_DIR = "translate/custom"
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    enum class DictType(val fileName: String) {
        NAMES("Names.txt"),
        VIETPHRASE("VietPhrase.txt"),
        PHIENAM("ChinesePhienAmWords.txt")
    }

    private val _importState = MutableStateFlow<DictionaryImportState>(DictionaryImportState.Idle)
    val importState: StateFlow<DictionaryImportState> = _importState

    fun importDict(context: Context, uri: Uri, type: DictType): Job {
        return scope.launch {
            try {
                val startTime = System.currentTimeMillis()
                Log.d(TAG, "=== IMPORT START: ${type.fileName} ===")
                
                _importState.value = DictionaryImportState.Loading("Đang đọc ${type.fileName}...")
                
                // Step 1: Open stream
                val t1 = System.currentTimeMillis()
                val inputStream = context.contentResolver.openInputStream(uri) 
                    ?: throw Exception("Không thể mở file")
                Log.d(TAG, "Step 1 - Open stream: ${System.currentTimeMillis() - t1}ms")
                
                val destFile = getCustomDictFile(type)
                var count = 0
                
                // Step 2: Copy file
                val t2 = System.currentTimeMillis()
                inputStream.bufferedReader(Charsets.UTF_8).useLines { lines ->
                    destFile.bufferedWriter(Charsets.UTF_8).use { writer ->
                        lines.forEach { line ->
                            if (line.contains("=") && line.isNotBlank()) {
                                writer.write(line)
                                writer.newLine()
                                count++
                            }
                        }
                    }
                }
                Log.d(TAG, "Step 2 - Copy file ($count lines): ${System.currentTimeMillis() - t2}ms")
                
                if (count > 0) {
                    // Step 3: Compile dictionary (THIS IS LIKELY THE SLOW PART)
                    _importState.value = DictionaryImportState.Loading("Đang biên dịch từ điển...")
                    val t3 = System.currentTimeMillis()
                    Log.d(TAG, "Step 3 - Starting reloadType...")
                    TranslationLoader.reloadType(type)
                    Log.d(TAG, "Step 3 - reloadType done: ${System.currentTimeMillis() - t3}ms")
                    
                    // Step 4: Clear cache
                    val t4 = System.currentTimeMillis()
                    withContext(Dispatchers.Main) { TranslateUtils.clearCache() }
                    Log.d(TAG, "Step 4 - Clear cache: ${System.currentTimeMillis() - t4}ms")
                    
                    _importState.value = DictionaryImportState.Success(count)
                    Log.d(TAG, "=== IMPORT DONE: ${System.currentTimeMillis() - startTime}ms total ===")
                } else {
                    _importState.value = DictionaryImportState.Error("Không có dữ liệu hợp lệ")
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Import failed", e)
                _importState.value = DictionaryImportState.Error(e.message ?: "Lỗi không xác định")
            }
        }
    }

    fun cancelImport() {
        scope.coroutineContext.cancelChildren()
        _importState.value = DictionaryImportState.Idle
    }

    fun getCustomDictDir(): File {
        val dir = File(appCtx.filesDir, DICT_DIR)
        if (!dir.exists()) dir.mkdirs()
        return dir
    }

    fun getCustomDictFile(type: DictType) = File(getCustomDictDir(), type.fileName)

    fun hasCustomDict(type: DictType) = getCustomDictFile(type).exists()

    fun deleteCustomDict(type: DictType): Boolean {
        val cacheFile = File(appCtx.filesDir, "dict_cache/user_${type.fileName}.bin")
        if (cacheFile.exists()) cacheFile.delete()
        val file = getCustomDictFile(type)
        return file.exists() && file.delete()
    }
}