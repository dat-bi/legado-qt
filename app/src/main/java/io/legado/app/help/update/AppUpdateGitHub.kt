package io.legado.app.help.update

import androidx.annotation.Keep
import io.legado.app.constant.AppConst
import io.legado.app.exception.NoStackTraceException
import io.legado.app.help.coroutine.Coroutine
import io.legado.app.help.http.newCallResponse
import io.legado.app.help.http.okHttpClient
import io.legado.app.help.http.text
import io.legado.app.utils.GSON
import io.legado.app.utils.fromJsonObject
import kotlinx.coroutines.CoroutineScope

@Keep
@Suppress("unused")
object AppUpdateGitHub : AppUpdate.AppUpdateInterface {

    private suspend fun getLatestRelease(): List<AppReleaseInfo> {
        val lastReleaseUrl = "https://api.github.com/repos/dat-bi/legado-qt/releases/latest"
        val res = okHttpClient.newCallResponse {
            url(lastReleaseUrl)
        }
        if (!res.isSuccessful) {
            throw NoStackTraceException("Lỗi khi lấy phiên bản mới (${res.code})")
        }
        val body = res.body.text()
        if (body.isBlank()) {
            throw NoStackTraceException("Lỗi khi lấy phiên bản mới")
        }
        return GSON.fromJsonObject<GithubRelease>(body)
            .getOrElse {
                throw NoStackTraceException("Lỗi khi lấy phiên bản mới " + it.localizedMessage)
            }
            .gitReleaseToAppReleaseInfo()
            .sortedByDescending { it.createdAt }
    }

    override fun check(
        scope: CoroutineScope,
    ): Coroutine<AppUpdate.UpdateInfo> {
        return Coroutine.async(scope) {
            getLatestRelease()
                .filter { it.appVariant == AppVariant.OFFICIAL }
                .firstOrNull { it.versionName > AppConst.appInfo.versionName }
                ?.let {
                    return@async AppUpdate.UpdateInfo(
                        it.versionName,
                        it.note,
                        it.downloadUrl,
                        it.name
                    )
                }
                ?: throw NoStackTraceException("Đã là phiên bản mới nhất")
        }.timeout(10000)
    }
}
