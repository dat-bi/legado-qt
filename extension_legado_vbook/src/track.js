load('config.js');

function execute(url) {
    // url = normalizeUrl(url);
    return Response.success({
        data: url,
        type: "native",
        headers: {},
        host: config_host,
        timeSkip: []
    });
}
