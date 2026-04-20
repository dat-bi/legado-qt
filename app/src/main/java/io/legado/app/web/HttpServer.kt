package io.legado.app.web

import android.graphics.Bitmap
import fi.iki.elonen.NanoHTTPD
import io.legado.app.api.ReturnData
import io.legado.app.api.controller.BookController
import io.legado.app.api.controller.BookSourceController
import io.legado.app.api.controller.ReplaceRuleController
import io.legado.app.api.controller.RssSourceController
import io.legado.app.help.coroutine.Coroutine
import io.legado.app.service.WebService
import io.legado.app.utils.GSON
import io.legado.app.utils.LogUtils
import io.legado.app.utils.stackTraceStr
import io.legado.app.utils.TranslateUtils
import io.legado.app.web.utils.AssetsWeb
import kotlinx.coroutines.runBlocking
import okio.Pipe
import okio.buffer
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream

class HttpServer(port: Int) : NanoHTTPD(port) {
    private val assetsWeb = AssetsWeb("web")

    override fun serve(session: IHTTPSession): Response {
        WebService.serve()
        var returnData: ReturnData? = null
        val ct = ContentType(session.headers["content-type"]).tryUTF8()
        session.headers["content-type"] = ct.contentTypeHeader
        var uri = session.uri

        val startAt = System.currentTimeMillis()
        LogUtils.d(TAG) {
            "${session.method.name} - $uri - ${session.queryParameterString} - Start($startAt)"
        }

        try {
            when (session.method) {
                Method.OPTIONS -> {
                    val response = newFixedLengthResponse("")
                    response.addHeader("Access-Control-Allow-Methods", "POST")
                    response.addHeader("Access-Control-Allow-Headers", "content-type")
                    response.addHeader("Access-Control-Allow-Origin", session.headers["origin"])
                    //response.addHeader("Access-Control-Max-Age", "3600");
                    return response
                }

                Method.POST -> {
                    val files = HashMap<String, String>()
                    session.parseBody(files)
                    val postData = files["postData"]

                    returnData = runBlocking {
                        when (uri) {
                            "/saveBookSource" -> BookSourceController.saveSource(postData)
                            "/saveBookSources" -> BookSourceController.saveSources(postData)
                            "/deleteBookSources" -> BookSourceController.deleteSources(postData)
                            "/saveBook" -> BookController.saveBook(postData)
                            "/deleteBook" -> BookController.deleteBook(postData)
                            "/saveBookProgress" -> BookController.saveBookProgress(postData)
                            "/addLocalBook" -> BookController.addLocalBook(session.parameters, files)
                            "/saveReadConfig" -> BookController.saveWebReadConfig(postData)
                            "/saveRssSource" -> RssSourceController.saveSource(postData)
                            "/saveRssSources" -> RssSourceController.saveSources(postData)
                            "/deleteRssSources" -> RssSourceController.deleteSources(postData)
                            "/saveReplaceRule" -> ReplaceRuleController.saveRule(postData)
                            "/deleteReplaceRule" -> ReplaceRuleController.delete(postData)
                            "/testReplaceRule" -> ReplaceRuleController.testRule(postData)
                            else -> null
                        }
                    }
                }

                Method.GET -> {
                    val parameters = session.parameters

                    if (uri == "/proxyStream") {
                        val response = serveProxyStream(session)
                        response.addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                        response.addHeader("Access-Control-Allow-Headers", "Range, content-type")
                        response.addHeader("Access-Control-Allow-Origin", session.headers["origin"] ?: "*")
                        LogUtils.d(TAG) {
                            "${session.method.name} - $uri - ${session.queryParameterString} - End($startAt)"
                        }
                        return response
                    }

                    returnData = when (uri) {
                        "/getBookSource" -> BookSourceController.getSource(parameters)
                        "/getBookSources" -> BookSourceController.sources
                        "/getBookshelf" -> {
                            val translate = parameters["translate"]?.firstOrNull()?.toBoolean() ?: false
                            BookController.getBookshelf(translate)
                        }
                        "/getChapterList" -> BookController.getChapterList(parameters)
                        "/refreshToc" -> BookController.refreshToc(parameters)
                        "/getBookContent" -> BookController.getBookContent(parameters)
                        "/cover" -> BookController.getCover(parameters)
                        "/image" -> BookController.getImg(parameters)
                        "/getReadConfig" -> BookController.getWebReadConfig()
                        "/getRssSource" -> RssSourceController.getSource(parameters)
                        "/getRssSources" -> RssSourceController.sources
                        "/getReplaceRules" -> ReplaceRuleController.allRules
                        "/searchBook" -> BookController.search(parameters)
                        else -> null
                    }
                }

                else -> Unit
            }

            if (returnData == null) {
                if (uri.endsWith("/"))
                    uri += "index.html"
                return assetsWeb.getResponse(uri)
            }

            val response = if (returnData.data is Bitmap) {
                val outputStream = ByteArrayOutputStream()
                (returnData.data as Bitmap).compress(Bitmap.CompressFormat.PNG, 100, outputStream)
                val byteArray = outputStream.toByteArray()
                outputStream.close()
                val inputStream = ByteArrayInputStream(byteArray)
                newFixedLengthResponse(
                    Response.Status.OK,
                    "image/png",
                    inputStream,
                    byteArray.size.toLong()
                )
            } else {
                val data = returnData.data
                if (data is List<*> && data.size > 3000) {
                    val pipe = Pipe(16 * 1024)
                    Coroutine.async {
                        pipe.sink.buffer().outputStream().bufferedWriter(Charsets.UTF_8).use {
                            GSON.toJson(returnData, it)
                        }
                    }
                    newChunkedResponse(
                        Response.Status.OK,
                        "application/json",
                        pipe.source.buffer().inputStream()
                    )
                } else {
                    newFixedLengthResponse(GSON.toJson(returnData))
                }
            }
            response.addHeader("Access-Control-Allow-Methods", "GET, POST")
            response.addHeader("Access-Control-Allow-Origin", session.headers["origin"])
            LogUtils.d(TAG) {
                "${session.method.name} - $uri - ${session.queryParameterString} - End($startAt)"
            }
            return response
        } catch (e: Exception) {
            LogUtils.d(TAG) {
                "${session.method.name} - $uri - ${session.queryParameterString} - Error End($startAt)\n$e\n${e.stackTraceStr}"
            }
            return newFixedLengthResponse(e.message)
        }

    }

    private val streamHttpClient: okhttp3.OkHttpClient by lazy {
        // Client riêng cho stream video: không callTimeout, không interceptor gây nhiễu
        okhttp3.OkHttpClient.Builder()
            .connectTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(0, java.util.concurrent.TimeUnit.SECONDS)   // 0 = không timeout khi đọc stream
            .writeTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
            // Không có callTimeout - video stream có thể kéo dài hàng phút
            .followRedirects(true)
            .followSslRedirects(true)
            .sslSocketFactory(
                io.legado.app.help.http.SSLHelper.unsafeSSLSocketFactory,
                io.legado.app.help.http.SSLHelper.unsafeTrustManager
            )
            .hostnameVerifier(io.legado.app.help.http.SSLHelper.unsafeHostnameVerifier)
            .build()
    }

    private fun serveProxyStream(session: IHTTPSession): Response {
        val url = session.parameters["url"]?.firstOrNull()
            ?: return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Missing url parameter")

        val bookUrl = session.parameters["bookUrl"]?.firstOrNull()
        val headers = mutableMapOf<String, String>()

        // 1. Lấy headers nền từ BookSource trong DB (Cookie, Authorization, ...)
        if (bookUrl != null) {
            val book = io.legado.app.data.appDb.bookDao.getBook(bookUrl)
            if (book != null) {
                val bookSource = io.legado.app.data.appDb.bookSourceDao.getBookSource(book.origin)
                if (bookSource != null) {
                    headers.putAll(bookSource.getHeaderMap(true))
                    val cookie = io.legado.app.help.http.CookieStore.getCookie(bookSource.bookSourceUrl)
                    if (cookie.isNotEmpty()) {
                        headers["Cookie"] = cookie
                    }
                }
            }
        }

        // 2. Override/bổ sung bằng headers được frontend truyền qua query params (prefix "h_")
        //    Ví dụ: h_Referer=https://www.bilibili.com/ → header "Referer"
        session.parameters.forEach { (key, values) ->
            if (key.startsWith("h_")) {
                val headerName = key.removePrefix("h_")
                val headerValue = values.firstOrNull()
                if (!headerName.isBlank() && !headerValue.isNullOrBlank()) {
                    headers[headerName] = headerValue
                }
            }
        }

        val requestBuilder = okhttp3.Request.Builder().url(url)
        headers.forEach { (k, v) -> requestBuilder.header(k, v) }

        session.headers["range"]?.let {
            requestBuilder.header("Range", it)
        }

        val response = streamHttpClient.newCall(requestBuilder.build()).execute()
        val body = response.body
        val inputStream = body?.byteStream()
            ?: return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Stream not found")

        val status = if (response.code == 206) Response.Status.PARTIAL_CONTENT else Response.Status.OK
        val contentType = response.header("Content-Type") ?: "video/mp4"
        val contentLengthStr = response.header("Content-Length")

        val res = if (contentLengthStr != null) {
            newFixedLengthResponse(status, contentType, inputStream, contentLengthStr.toLong())
        } else {
            newChunkedResponse(status, contentType, inputStream)
        }

        response.header("Content-Range")?.let { res.addHeader("Content-Range", it) }
        response.header("Accept-Ranges")?.let { res.addHeader("Accept-Ranges", it) }

        return res
    }

    companion object {
        private const val TAG = "HttpServer"
    }

}
