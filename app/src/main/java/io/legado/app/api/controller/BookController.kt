package io.legado.app.api.controller

import android.graphics.Bitmap
import android.graphics.drawable.Drawable
import androidx.core.graphics.drawable.toBitmap
import com.bumptech.glide.Glide
import io.legado.app.api.ReturnData
import io.legado.app.R
import io.legado.app.data.appDb
import io.legado.app.data.entities.Book
import io.legado.app.data.entities.BookProgress
import io.legado.app.data.entities.BookSource
import io.legado.app.help.AppWebDav
import io.legado.app.help.CacheManager
import io.legado.app.help.book.BookHelp
import io.legado.app.help.book.ContentProcessor
import io.legado.app.help.book.isLocal
import io.legado.app.help.config.AppConfig
import io.legado.app.help.glide.ImageLoader
import io.legado.app.model.BookCover
import io.legado.app.model.ImageProvider
import io.legado.app.model.ReadBook
import io.legado.app.model.localBook.LocalBook
import io.legado.app.model.webBook.WebBook
import io.legado.app.utils.GSON
import io.legado.app.utils.cnCompare
import io.legado.app.utils.fromJsonObject
import io.legado.app.utils.printOnDebug
import io.legado.app.utils.stackTraceStr
import io.legado.app.utils.TranslateUtils
import io.legado.app.ui.book.search.SearchScope
import io.legado.app.model.webBook.SearchModel
import io.legado.app.data.entities.SearchBook
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import splitties.init.appCtx
import java.io.File
import java.util.WeakHashMap
import java.util.concurrent.TimeUnit

object BookController {

    private lateinit var book: Book
    private var bookSource: BookSource? = null
    private var bookUrl: String = ""
    private val defaultCoverCache by lazy { WeakHashMap<Drawable, Bitmap>() }

    /**
     * All books in bookshelf
     */
    /**
     * All books in bookshelf
     */
    /**
     * All books in bookshelf
     */
    fun getBookshelf(translate: Boolean): ReturnData {
        val books = appDb.bookDao.all
        val returnData = ReturnData()
        return if (books.isEmpty()) {
            returnData.setErrorMsg(appCtx.getString(R.string.no_books_added))
        } else {
            val data = when (AppConfig.bookshelfSort) {
                1 -> books.sortedByDescending { it.latestChapterTime }
                2 -> books.sortedWith { o1, o2 ->
                    o1.name.cnCompare(o2.name)
                }

                3 -> books.sortedBy { it.order }
                else -> books.sortedByDescending { it.durChapterTime }
            }
            if (translate) {
                runBlocking {
                    data.forEach {
                        it.name = TranslateUtils.translateMeta(it.name)
                        it.author = TranslateUtils.translateMeta(it.author)
                        it.latestChapterTitle = TranslateUtils.translateMeta(it.latestChapterTitle)
                        it.durChapterTitle = TranslateUtils.translateMeta(it.durChapterTitle)
                        it.intro = TranslateUtils.translateMeta(it.intro)
                        it.kind = TranslateUtils.translateMeta(it.kind)
                    }
                }
            }
            returnData.setData(data)
        }
    }

    /**
     * Get cover
     */
    fun getCover(parameters: Map<String, List<String>>): ReturnData {
        val returnData = ReturnData()
        val coverPath = parameters["path"]?.firstOrNull()
        val ftBitmap = ImageLoader.loadBitmap(appCtx, coverPath)
            .override(84, 112)
            .centerCrop()
            .submit()
        return try {
            returnData.setData(ftBitmap.get(3, TimeUnit.SECONDS))
        } catch (e: Exception) {
            try {
                val defaultBitmap = defaultCoverCache.getOrPut(BookCover.defaultDrawable) {
                    Glide.with(appCtx)
                        .asBitmap()
                        .load(BookCover.defaultDrawable.toBitmap())
                        .override(84, 112)
                        .centerCrop()
                        .submit()
                        .get()
                }
                returnData.setData(defaultBitmap)
            } catch (e: Exception) {
                returnData.setErrorMsg(e.localizedMessage ?: "getCover error")
            }
        }
    }

    /**
     * Get content image
     */
    fun getImg(parameters: Map<String, List<String>>): ReturnData {
        val returnData = ReturnData()
        val bookUrl = parameters["url"]?.firstOrNull()
            ?: return returnData.setErrorMsg(appCtx.getString(R.string.book_url_empty))
        val src = parameters["path"]?.firstOrNull()
            ?: return returnData.setErrorMsg(appCtx.getString(R.string.image_url_empty))
        val width = parameters["width"]?.firstOrNull()?.toInt() ?: 640
        if (this.bookUrl != bookUrl) {
            this.book = appDb.bookDao.getBook(bookUrl)
                ?: return returnData.setErrorMsg(appCtx.getString(R.string.book_url_invalid))
            this.bookSource = appDb.bookSourceDao.getBookSource(book.origin)
        }
        this.bookUrl = bookUrl
        val bitmap = runBlocking {
            ImageProvider.cacheImage(book, src, bookSource)
            ImageProvider.getImage(book, src, width)
        }
        return returnData.setData(bitmap)
    }

    /**
     * Update table of contents
     */
    fun refreshToc(parameters: Map<String, List<String>>): ReturnData {
        val returnData = ReturnData()
        try {
            val bookUrl = parameters["url"]?.firstOrNull()
            if (bookUrl.isNullOrEmpty()) {
                return returnData.setErrorMsg(appCtx.getString(R.string.error_url_empty_specify_address))
            }
            val book = appDb.bookDao.getBook(bookUrl)
                ?: return returnData.setErrorMsg(appCtx.getString(R.string.error_book_not_found_add_first))
            if (book.isLocal) {
                val toc = LocalBook.getChapterList(book)
                appDb.bookChapterDao.delByBook(book.bookUrl)
                appDb.bookChapterDao.insert(*toc.toTypedArray())
                appDb.bookDao.update(book)
                val translate = parameters["translate"]?.firstOrNull()?.toBoolean() ?: TranslateUtils.isTranslateEnabled()
                if (translate) {
                    runBlocking {
                        toc.forEach { it.title = TranslateUtils.translateChapterTitle(it.title) }
                    }
                }
                return returnData.setData(toc)
            } else {
                val bookSource = appDb.bookSourceDao.getBookSource(book.origin)
                    ?: return returnData.setErrorMsg(appCtx.getString(R.string.error_source_not_found_change))
                val toc = runBlocking {
                    if (book.tocUrl.isBlank()) {
                        WebBook.getBookInfoAwait(bookSource, book)
                    }
                    WebBook.getChapterListAwait(bookSource, book).getOrThrow()
                }
                appDb.bookChapterDao.delByBook(book.bookUrl)
                appDb.bookChapterDao.insert(*toc.toTypedArray())
                appDb.bookDao.update(book)
                val translate = parameters["translate"]?.firstOrNull()?.toBoolean() ?: TranslateUtils.isTranslateEnabled()
                if (translate) {
                    runBlocking {
                        toc.forEach { it.title = TranslateUtils.translateChapterTitle(it.title) }
                    }
                }
                return returnData.setData(toc)
            }
        } catch (e: Exception) {
            return returnData.setErrorMsg(e.localizedMessage ?: "refresh toc error")
        }
    }

    /**
     * Get table of contents
     */
    fun getChapterList(parameters: Map<String, List<String>>): ReturnData {
        val bookUrl = parameters["url"]?.firstOrNull()
        val returnData = ReturnData()
        if (bookUrl.isNullOrEmpty()) {
            return returnData.setErrorMsg(appCtx.getString(R.string.error_url_empty_specify_address))
        }
        val chapterList = appDb.bookChapterDao.getChapterList(bookUrl)
        if (chapterList.isEmpty()) {
            return refreshToc(parameters)
        }
        val translate = parameters["translate"]?.firstOrNull()?.toBoolean() ?: false
        if (translate) {
            runBlocking {
                chapterList.forEach { it.title = TranslateUtils.translateChapterTitle(it.title) }
            }
        }
        return returnData.setData(chapterList)
    }

    /**
     * Get content
     */
    fun getBookContent(parameters: Map<String, List<String>>): ReturnData {
        val bookUrl = parameters["url"]?.firstOrNull()
        val index = parameters["index"]?.firstOrNull()?.toInt()
        val translate = parameters["translate"]?.firstOrNull()?.toBoolean() ?: false
        val returnData = ReturnData()
        if (bookUrl.isNullOrEmpty()) {
            return returnData.setErrorMsg(appCtx.getString(R.string.error_url_empty_specify_address))
        }
        if (index == null) {
            return returnData.setErrorMsg(appCtx.getString(R.string.error_index_empty_specify_order))
        }
        val book = appDb.bookDao.getBook(bookUrl)
        val chapter = runBlocking {
            var chapter = appDb.bookChapterDao.getChapter(bookUrl, index)
            var wait = 0
            while (chapter == null && wait < 30) {
                delay(1000)
                chapter = appDb.bookChapterDao.getChapter(bookUrl, index)
                wait++
            }
            chapter
        }
        if (book == null || chapter == null) {
            return returnData.setErrorMsg(appCtx.getString(R.string.not_found))
        }
        var content: String? = BookHelp.getContent(book, chapter)
        if (content != null) {
            val contentProcessor = ContentProcessor.get(book.name, book.origin)
            content = runBlocking {
                contentProcessor.getContent(book, chapter, content, includeTitle = false, translate = translate)
                    .toString()
            }
            return returnData.setData(content)
        }
        val bookSource = appDb.bookSourceDao.getBookSource(book.origin)
            ?: return returnData.setErrorMsg(appCtx.getString(R.string.source_not_found))
        try {
            content = runBlocking {
                WebBook.getContentAwait(bookSource, book, chapter).let {
                    val contentProcessor = ContentProcessor.get(book.name, book.origin)
                    contentProcessor.getContent(book, chapter, it, includeTitle = false, translate = translate)
                        .toString()
                }
            }
            returnData.setData(content)
        } catch (e: Exception) {
            returnData.setErrorMsg(e.stackTraceStr)
        }
        return returnData
    }

    /**
     * Save book
     */
    suspend fun saveBook(postData: String?): ReturnData {
        val returnData = ReturnData()
        GSON.fromJsonObject<Book>(postData).getOrNull()?.let { book ->
            AppWebDav.uploadBookProgress(book)
            book.save()
            return returnData.setData("")
        }
        return returnData.setErrorMsg(appCtx.getString(R.string.invalid_format))
    }

    /**
     * Delete book
     */
    fun deleteBook(postData: String?): ReturnData {
        val returnData = ReturnData()
        GSON.fromJsonObject<Book>(postData).getOrNull()?.let { book ->
            book.delete()
            return returnData.setData("")
        }
        return returnData.setErrorMsg(appCtx.getString(R.string.invalid_format))
    }

    /**
     * Save progress
     */
    suspend fun saveBookProgress(postData: String?): ReturnData {
        val returnData = ReturnData()
        GSON.fromJsonObject<BookProgress>(postData)
            .onFailure { it.printOnDebug() }
            .getOrNull()?.let { bookProgress ->
                appDb.bookDao.getBook(bookProgress.name, bookProgress.author)?.let { book ->
                    book.durChapterIndex = bookProgress.durChapterIndex
                    book.durChapterPos = bookProgress.durChapterPos
                    book.durChapterTitle = bookProgress.durChapterTitle
                    book.durChapterTime = bookProgress.durChapterTime
                    AppWebDav.uploadBookProgress(bookProgress) {
                        book.syncTime = System.currentTimeMillis()
                    }
                    appDb.bookDao.update(book)
                    ReadBook.book?.let {
                        if (it.name == bookProgress.name &&
                            it.author == bookProgress.author
                        ) {
                            ReadBook.webBookProgress = bookProgress
                        }
                    }
                    return returnData.setData("")
                }
            }
        return returnData.setErrorMsg(appCtx.getString(R.string.invalid_format))
    }

    /**
     * Add local book
     */
    fun addLocalBook(
        parameters: Map<String, List<String>>,
        files: Map<String, String>
    ): ReturnData {
        val returnData = ReturnData()
        val fileName = parameters["fileName"]?.firstOrNull()
            ?: return returnData.setErrorMsg(appCtx.getString(R.string.filename_not_empty))
        val fileData = files["fileData"]
            ?: return returnData.setErrorMsg(appCtx.getString(R.string.filedata_not_empty))
        kotlin.runCatching {
            val uri = LocalBook.saveBookFile(File(fileData).inputStream(), fileName)
            LocalBook.importFile(uri)
        }.onFailure {
            return when (it) {
                is SecurityException -> returnData.setErrorMsg(appCtx.getString(R.string.reset_save_location))
                else -> returnData.setErrorMsg(appCtx.getString(R.string.save_book_error, it.localizedMessage))
            }
        }
        return returnData.setData(true)
    }

    /**
     * Save web reading interface config
     */
    fun saveWebReadConfig(postData: String?): ReturnData {
        val returnData = ReturnData()
        postData?.let {
            CacheManager.put("webReadConfig", postData)
        } ?: CacheManager.delete("webReadConfig")
        return returnData.setData("")
    }

    /**
     * Get web reading interface config
     */
    fun getWebReadConfig(): ReturnData {
        val returnData = ReturnData()
        val data = CacheManager.get("webReadConfig")
            ?: return returnData.setErrorMsg(appCtx.getString(R.string.no_config))
        return returnData.setData(data)
    }

    /**
     * Search book
     */
    fun search(parameters: Map<String, List<String>>): ReturnData {
        val returnData = ReturnData()
        val key = parameters["key"]?.firstOrNull()
        if (key.isNullOrBlank()) {
            return returnData.setErrorMsg(appCtx.getString(R.string.cannot_empty))
        }
        val translate = parameters["translate"]?.firstOrNull()?.toBoolean() ?: false
        val page = parameters["page"]?.firstOrNull()?.toInt() ?: 1
        val deferred = CompletableDeferred<List<SearchBook>>()
        // Get bookshelf results
        val shelfResults = appDb.bookDao.search(key).map { it.toSearchBook() }
        val results = mutableListOf<SearchBook>()
        results.addAll(shelfResults)

        // Use MainScope to align with how SearchViewModel and BookSearchWebSocket do it
        val scope = MainScope()
        
        val searchModel = SearchModel(scope, object : SearchModel.CallBack {
            override fun getSearchScope(): SearchScope = SearchScope(AppConfig.searchScope)
            override fun onSearchStart() {}
            override fun onSearchSuccess(searchBooks: List<SearchBook>) {
                synchronized(results) {
                    results.clear()
                    results.addAll(shelfResults)
                    results.addAll(searchBooks)
                }
            }
            override fun onSearchFinish(isEmpty: Boolean, hasMore: Boolean) {
                deferred.complete(results.toList())
            }
            override fun onSearchCancel(exception: Throwable?) {
                if (exception != null) {
                    deferred.completeExceptionally(exception)
                } else {
                    deferred.complete(results.toList())
                }
            }
        })

        runBlocking {
            try {
                // Execute search
                searchModel.search(System.currentTimeMillis(), key)
                
                // Await completion with a realistic timeout (some sources take a while)
                withTimeout(30000L) {
                    val finalResults = deferred.await()
                    if (translate) {
                        finalResults.forEach {
                            it.name = TranslateUtils.translateMeta(it.name)
                            it.author = TranslateUtils.translateMeta(it.author)
                            it.intro = TranslateUtils.translateMeta(it.intro)
                            it.latestChapterTitle = TranslateUtils.translateMeta(it.latestChapterTitle)
                            it.kind = TranslateUtils.translateMeta(it.kind)
                        }
                    }
                    returnData.setData(finalResults)
                }
            } catch (e: Exception) {
                // If timeout or error, return whatever we have so far
                if (results.isEmpty() && shelfResults.isEmpty()) {
                    returnData.setErrorMsg(e.localizedMessage ?: "Search failed")
                } else {
                    returnData.setData(results.toList())
                }
            } finally {
                searchModel.close()
            }
        }
        return returnData
    }

}
