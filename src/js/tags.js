function deleteTag(tagId, e) {
	let yesno = confirm("Are you sure you want to delete this tag?");
	if(yesno) {
		let xhr = new XMLHttpRequest();
		xhr.open("GET", "/api/tags/" + tagId + "/delete");
		xhr.addEventListener("load", () => {
			if(JSON.parse(xhr.response)) {
				e.parentElement.remove();
				alert("Tag deleted!");
			} else {
				alert("Something went wrong. Try again later.");
			}
		});
		xhr.addEventListener("error", () => alert("That didn't work. Check your connection."));
		xhr.send();
	}
}
