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
                        "/proxyCheck" -> checkProxy(parameters)
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

    /**
     * Kiểm tra khả năng truy cập CDN URL với các headers cho trước.
     * Dùng Range: bytes=0-1 để chỉ lấy header, không tải toàn bộ.
     * Trả về JSON: { code, ok, contentType, acceptRanges, bodySnippet }
     */
    private fun checkProxy(parameters: Map<String, List<String>>): ReturnData {
        val returnData = ReturnData()
        val url = parameters["url"]?.firstOrNull()
            ?: return returnData.setErrorMsg("Missing url param")

        val headers = mutableMapOf<String, String>()
        parameters.forEach { (key, values) ->
            if (key.startsWith("h_")) {
                val name = key.removePrefix("h_")
                val value = values.firstOrNull()
                if (name.isNotBlank() && !value.isNullOrBlank()) {
                    headers[name] = value
                }
            }
        }

        LogUtils.d(TAG) { "proxyCheck url=${url.take(80)} headers=${headers.keys}" }

        return try {
            val reqBuilder = okhttp3.Request.Builder().url(url)
            
            var hasUserAgent = false
            headers.forEach { (k, v) -> 
                reqBuilder.header(k, v) 
                if (k.equals("User-Agent", ignoreCase = true)) hasUserAgent = true
            }

            if (!hasUserAgent) {
                reqBuilder.header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            }

            reqBuilder.header("Range", "bytes=0-1")

            val resp = streamHttpClient.newCall(reqBuilder.build()).execute()
            val code = resp.code
            val contentType = resp.header("Content-Type") ?: ""
            val acceptRanges = resp.header("Accept-Ranges") ?: ""
            val bodySnippet = if (code !in 200..299) resp.body?.string()?.take(300) ?: "" else ""
            resp.body?.close()

            LogUtils.d(TAG) { "proxyCheck ← HTTP $code | CT=$contentType | AR=$acceptRanges ${if (bodySnippet.isNotEmpty()) "| BODY=${bodySnippet.take(100)}" else ""}" }

            returnData.setData(
                mapOf(
                    "code" to code,
                    "ok" to (code in 200..299),
                    "contentType" to contentType,
                    "acceptRanges" to acceptRanges,
                    "body" to bodySnippet
                )
            )
        } catch (e: Exception) {
            LogUtils.d(TAG) { "proxyCheck ✗ ${e.javaClass.simpleName}: ${e.message}" }
            returnData.setErrorMsg("${e.javaClass.simpleName}: ${e.message}")
        }
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
        
        var hasUserAgent = false
        headers.forEach { (k, v) -> 
            requestBuilder.header(k, v) 
            if (k.equals("User-Agent", ignoreCase = true)) hasUserAgent = true
        }

        if (!hasUserAgent) {
            requestBuilder.header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        }

        session.headers["range"]?.let {
            requestBuilder.header("Range", it)
        }

        LogUtils.d(TAG) { "proxyStream → requesting: ${url.take(80)}... headers=${headers.keys}" }

        val cdnResponse = try {
            streamHttpClient.newCall(requestBuilder.build()).execute()
        } catch (e: Exception) {
            LogUtils.d(TAG) { "proxyStream ✗ OkHttp exception: ${e.javaClass.simpleName}: ${e.message}" }
            return newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR,
                "text/plain",
                "Proxy OkHttp error: ${e.javaClass.simpleName}: ${e.message}"
            )
        }

        val cdnCode = cdnResponse.code
        LogUtils.d(TAG) { "proxyStream ← CDN responded: HTTP $cdnCode" }

        // Relay CDN error status codes
        if (cdnCode !in 200..299) {
            val errBody = cdnResponse.body?.string() ?: "(empty)"
            LogUtils.d(TAG) { "proxyStream ✗ CDN error body: ${errBody.take(200)}" }
            val nanoStatus = when (cdnCode) {
                400 -> Response.Status.BAD_REQUEST
                401 -> Response.Status.UNAUTHORIZED
                403 -> Response.Status.FORBIDDEN
                404 -> Response.Status.NOT_FOUND
                else -> Response.Status.INTERNAL_ERROR
            }
            return newFixedLengthResponse(
                nanoStatus,
                "text/plain",
                "CDN returned HTTP $cdnCode: ${errBody.take(500)}"
            )
        }

        val inputStream = cdnResponse.body?.byteStream()
            ?: return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Stream not found")

        val status = if (cdnCode == 206) Response.Status.PARTIAL_CONTENT else Response.Status.OK
        val contentType = cdnResponse.header("Content-Type") ?: "video/mp4"
        val contentLengthStr = cdnResponse.header("Content-Length")

        val res = if (contentLengthStr != null) {
            newFixedLengthResponse(status, contentType, inputStream, contentLengthStr.toLong())
        } else {
            newChunkedResponse(status, contentType, inputStream)
        }

        cdnResponse.header("Content-Range")?.let { res.addHeader("Content-Range", it) }
        // Luôn báo browser biết range request được hỗ trợ (cần cho seek)
        res.addHeader("Accept-Ranges", cdnResponse.header("Accept-Ranges") ?: "bytes")

        return res
    }

    companion object {
        private const val TAG = "HttpServer"
    }

}
