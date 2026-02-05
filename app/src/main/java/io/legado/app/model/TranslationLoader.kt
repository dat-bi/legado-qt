package io.legado.app.model

import io.legado.app.model.dictionary.BinaryDictionary
import io.legado.app.model.dictionary.DictionaryCompiler
import io.legado.app.utils.DictManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import splitties.init.appCtx
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.channels.FileChannel

/**
 * Loads VietPhrase translation dictionaries into memory using BinaryDictionary.
 * Supports Parallel Loading and Build-Time/On-Device Compilation.
 */
object TranslationLoader {

    @Volatile
    private var translationData: TranslationData? = null
    
    // Mutex for synchronization
    private val mutex = kotlinx.coroutines.sync.Mutex()

    /**
     * Load translation data (lazy loading, singleton pattern)
     */
    suspend fun loadTranslationData(): TranslationData? = withContext(Dispatchers.IO) {
        // Double-check locking pattern with Mutex
        // 1. Fast path (no lock)
        if (translationData != null) return@withContext translationData

        mutex.withLock {
            // 2. Slow path (inside lock)
            if (translationData != null) return@withContext translationData

            android.util.Log.d("TranslationLoader", "Starting loadTranslationData...")
            val startTime = System.currentTimeMillis()
            try {
                val namesDeferred = async { 
                    val t = System.currentTimeMillis()
                    val d = loadOrCompile(DictManager.DictType.NAMES, "names.bin") 
                    android.util.Log.d("TranslationLoader", "Loaded NAMES in ${System.currentTimeMillis() - t}ms")
                    d
                }
                val vpDeferred = async { 
                    val t = System.currentTimeMillis()
                    val d = loadOrCompile(DictManager.DictType.VIETPHRASE, "vietphrase.bin") 
                    android.util.Log.d("TranslationLoader", "Loaded VIETPHRASE in ${System.currentTimeMillis() - t}ms")
                    d
                }
                val phienAmDeferred = async { 
                    val t = System.currentTimeMillis()
                    val d = loadOrCompile(DictManager.DictType.PHIENAM, "phienam.bin") 
                    android.util.Log.d("TranslationLoader", "Loaded PHIENAM in ${System.currentTimeMillis() - t}ms")
                    d
                }
    
                translationData = TranslationData(
                    namesDeferred.await(),
                    vpDeferred.await(),
                    phienAmDeferred.await()
                )
                
                android.util.Log.d("TranslationLoader", "Total load time: ${System.currentTimeMillis() - startTime}ms")
                translationData
            } catch (e: Exception) {
                android.util.Log.e("TranslationLoader", "Error loading data", e)
                e.printStackTrace()
                null
            }
        }
    }

    private suspend fun loadOrCompile(type: DictManager.DictType, assetBin: String, retry: Boolean = true): BinaryDictionary {
        val cacheDir = File(appCtx.filesDir, "dict_cache")
        if (!cacheDir.exists()) cacheDir.mkdirs()

        // 1. Check User Custom Dict (TXT)
        if (DictManager.hasCustomDict(type)) {
            val txtFile = DictManager.getCustomDictFile(type)
            val cacheFile = File(cacheDir, "user_${type.fileName}.bin")

            // Compile if missing or outdated
            if (!cacheFile.exists() || cacheFile.lastModified() < txtFile.lastModified()) {
                withContext(kotlinx.coroutines.NonCancellable) {
                    withContext(Dispatchers.Main) {
                        android.widget.Toast.makeText(appCtx, "Đang cập nhật từ điển ${type.name}, vui lòng đợi...", android.widget.Toast.LENGTH_LONG).show()
                    }
                    DictionaryCompiler.compile(txtFile, cacheFile)
                    withContext(Dispatchers.Main) {
                        android.widget.Toast.makeText(appCtx, "Đã cập nhật xong ${type.name}!", android.widget.Toast.LENGTH_SHORT).show()
                    }
                }
            }
            return try {
                mapFile(cacheFile)
            } catch (e: Exception) {
                if (retry) {
                    android.util.Log.e("TranslationLoader", "User dict corrupted, determining...", e)
                    cacheFile.delete()
                    return loadOrCompile(type, assetBin, false)
                }
                throw e
            }
        }

        // 2. Load Asset Binary (Prebuilt)
        return try {
            try {
                mapAsset("dict/$assetBin")
            } catch (e: Exception) {
                // If mapAsset fails (e.g. invalid format in asset or missing), fallback to runtime compile
                throw e
            }
        } catch (e: Exception) {
            // 3. Fallback: Compile from Asset TXT (Runtime Build)
            val cacheFile = File(cacheDir, "asset_$assetBin")
            if (!cacheFile.exists()) {
                val assetTxt = getAssetTxtPath(type)
                val tmpFile = File.createTempFile("compile", ".txt", appCtx.cacheDir)
                appCtx.assets.open(assetTxt).use { input ->
                    FileOutputStream(tmpFile).use { output -> input.copyTo(output) }
                }
                DictionaryCompiler.compile(tmpFile, cacheFile)
                tmpFile.delete()
            }
            try {
                mapFile(cacheFile)
            } catch (ex: Exception) {
                if (retry) {
                    android.util.Log.e("TranslationLoader", "Asset dict cache corrupted, rebuilding...", ex)
                    cacheFile.delete()
                    return loadOrCompile(type, assetBin, false)
                }
                throw ex
            }
        }
    }

    private fun getAssetTxtPath(type: DictManager.DictType): String {
        return when (type) {
            DictManager.DictType.NAMES -> "translate/vietphrase/Names.txt"
            DictManager.DictType.VIETPHRASE -> "translate/vietphrase/VietPhrase.txt"
            DictManager.DictType.PHIENAM -> "translate/vietphrase/ChinesePhienAmWords.txt"
        }
    }

    private fun mapFile(file: File): BinaryDictionary {
        val channel = FileInputStream(file).channel
        val buffer = channel.map(FileChannel.MapMode.READ_ONLY, 0, channel.size())
        return BinaryDictionary(buffer)
    }

    private fun mapAsset(path: String): BinaryDictionary {
        val afd = appCtx.assets.openFd(path)
        val channel = FileInputStream(afd.fileDescriptor).channel
        val buffer = channel.map(FileChannel.MapMode.READ_ONLY, afd.startOffset, afd.length)
        return BinaryDictionary(buffer)
    }

    /**
     * Clear cached data
     */
    fun clearCache() {
        translationData?.names?.close()
        translationData?.vietPhrase?.close()
        translationData?.chinesePhienAm?.close()
        translationData = null
    }

    /**
     * Reload specific dictionary type only (not all 3)
     */
    suspend fun reloadType(type: DictManager.DictType) = withContext(Dispatchers.IO) {
        val startTime = System.currentTimeMillis()
        android.util.Log.d("TranslationLoader", "reloadType START: ${type.fileName}")
        
        val cacheDir = File(appCtx.filesDir, "dict_cache")
        if (!cacheDir.exists()) cacheDir.mkdirs()
        
        val txtFile = DictManager.getCustomDictFile(type)
        val cacheFile = File(cacheDir, "user_${type.fileName}.bin")
        
        // Delete old cache to force recompile
        if (cacheFile.exists()) cacheFile.delete()
        
        // Compile new dictionary
        android.util.Log.d("TranslationLoader", "Compiling ${txtFile.name}...")
        val compileStart = System.currentTimeMillis()
        io.legado.app.model.dictionary.DictionaryCompiler.compile(txtFile, cacheFile)
        android.util.Log.d("TranslationLoader", "Compile done: ${System.currentTimeMillis() - compileStart}ms")
        
        // Load the new binary
        val newDict = mapFile(cacheFile)
        android.util.Log.d("TranslationLoader", "Loaded new dict")
        
        // Update in-memory data (thread-safe)
        mutex.withLock {
            val current = translationData
            translationData = when {
                current == null -> {
                    // First load - just create with default empty for others
                    when (type) {
                        DictManager.DictType.NAMES -> TranslationData(newDict, current?.vietPhrase ?: newDict, current?.chinesePhienAm ?: newDict)
                        DictManager.DictType.VIETPHRASE -> TranslationData(current?.names ?: newDict, newDict, current?.chinesePhienAm ?: newDict)
                        DictManager.DictType.PHIENAM -> TranslationData(current?.names ?: newDict, current?.vietPhrase ?: newDict, newDict)
                    }
                }
                else -> {
                    when (type) {
                        DictManager.DictType.NAMES -> { current.names.close(); current.copy(names = newDict) }
                        DictManager.DictType.VIETPHRASE -> { current.vietPhrase.close(); current.copy(vietPhrase = newDict) }
                        DictManager.DictType.PHIENAM -> { current.chinesePhienAm.close(); current.copy(chinesePhienAm = newDict) }
                    }
                }
            }
        }
        
        android.util.Log.d("TranslationLoader", "reloadType DONE: ${System.currentTimeMillis() - startTime}ms total")
    }

    /**
     * Reset to asset dictionary (after deleting custom dict)
     */
    suspend fun reloadFromAsset(type: DictManager.DictType) = withContext(Dispatchers.IO) {
        android.util.Log.d("TranslationLoader", "reloadFromAsset: ${type.fileName}")
        
        // Delete user cache
        val cacheDir = File(appCtx.filesDir, "dict_cache")
        val userCache = File(cacheDir, "user_${type.fileName}.bin")
        if (userCache.exists()) userCache.delete()
        
        // Clear and reload from asset using loadOrCompile
        mutex.withLock {
            val assetBin = when (type) {
                DictManager.DictType.NAMES -> "names.bin"
                DictManager.DictType.VIETPHRASE -> "vietphrase.bin"
                DictManager.DictType.PHIENAM -> "phienam.bin"
            }
            
            val newDict = loadOrCompile(type, assetBin)
            
            val current = translationData
            if (current != null) {
                when (type) {
                    DictManager.DictType.NAMES -> { current.names.close(); translationData = current.copy(names = newDict) }
                    DictManager.DictType.VIETPHRASE -> { current.vietPhrase.close(); translationData = current.copy(vietPhrase = newDict) }
                    DictManager.DictType.PHIENAM -> { current.chinesePhienAm.close(); translationData = current.copy(chinesePhienAm = newDict) }
                }
            }
        }
        
        android.util.Log.d("TranslationLoader", "reloadFromAsset DONE: ${type.fileName}")
    }
}
