const config_host = (() => {
    let raw = typeof host !== "undefined" ? host : "";

    raw = String(raw).replace(/"/g, "").trim();
    return raw || "http://localhost:1122";
})();

function normalizeUrl(url) {
    url = url || config_host;
    return url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, config_host);
}