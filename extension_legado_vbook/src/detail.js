load('config.js');
function execute(url) {
	// let config_host = 'http://192.168.0.102:1122'
	let book_url = decodeURIComponent(url.split("/getChapterList?url=")[1].split("&type=")[0])

	if (typeof config_host === "undefined")
		return Response.error(book_url);

	let response = fetch(config_host + "/getBookshelf")
	if (response.ok) {
		try {
			let json = response.json();
			let book_list = json.data;
			let book_info = book_list.find(obj => obj.bookUrl.includes(book_url));
			
			if (!book_info) {
				return Response.error("Sách không có trong kệ (Hãy thêm sách vào ứng dụng đọc truyện trước để xem chi tiết)");
			}

			let type_book = (url.includes("&type=comic")) ? "comic" : "chinese_novel";
			
			let detailHtml = [];
			if (book_info.author) detailHtml.push("👤 Tác giả: " + book_info.author);
			if (book_info.kind) detailHtml.push("🏷️ Thể loại: " + book_info.kind);
			if (book_info.wordCount) detailHtml.push("📝 Số chữ: " + book_info.wordCount);
			if (book_info.latestChapterTitle) detailHtml.push("🕒 Mới nhất: " + book_info.latestChapterTitle);
			if (book_info.originName) detailHtml.push("🌐 Nguồn: " + book_info.originName);

			return Response.success({
				name: book_info.name || "Chưa rõ tên",
				cover: config_host + "/cover?path=" + book_info.coverUrl,
				author: book_info.author || "Unknown",
				description: (book_info.intro || "").replace(/\r\n/g, "<br>").replace(/\n/g, "<br>"),
				detail: detailHtml.join("<br>"),
				host: config_host,
				type: type_book
			});
		} catch (error) {
			return Response.error(error.toString());
		}
	}
	return null;
}