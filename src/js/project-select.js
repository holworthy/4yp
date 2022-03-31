window.addEventListener("load", () => {
	let selectButtons = document.getElementsByClassName("projectSelectButton");

	for (var i = 0; i < selectButtons.length; i++){
		let curr = selectButtons[i];
		curr.addEventListener("click", () => {
			let xhr = new XMLHttpRequest();
			xhr.open("POST", "/api/projectSelection/new");
			xhr.setRequestHeader("Content-Type", "application/json");
			xhr.addEventListener("load", () => {
				location.reload();
				// TODO: make smoother
			});
			xhr.addEventListener("error", () => {
				console.log("error with XHR");
			});
			xhr.send(JSON.stringify({
				projectId: curr.dataset.projectId,
				pathway: 69
			}));
		});
	}
});