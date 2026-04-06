load('config.js');
function execute(key, page) {
	if (!page) page = 1;
	let response = fetch(config_host + "/searchBook?key=" + key + "&page=" + page);
	if (response.ok) {
		let doc = response.json();
		let item_list = doc.data;
		if (!item_list) return Response.success([]);
		const data = [];
		item_list.forEach((e) => {
			let isComic = (e.type & 64) !== 0;
			let type_book = isComic ? "&type=comic" : "";
			let book_url = encodeURIComponent(e.bookUrl)
			data.push({
				name: e.name,
				link: config_host + "/getChapterList?url=" + book_url + type_book,
				cover: config_host + "/cover?path=" + e.coverUrl,
				description: e.author,
				host: config_host
			})
		});
		return Response.success(data)
	}
	return null;
}