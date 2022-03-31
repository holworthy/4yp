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
				projectId: curr.dataset.projectId
			}));
		});
	}

	let removeButtons = document.getElementsByClassName("removeSelectionButton");

	for (var i = 0; i < removeButtons.length; i++){
		let curr = removeButtons[i];
		curr.addEventListener("click", () => {
			let xhr = new XMLHttpRequest();
			xhr.open("POST", "/api/projectSelection/remove");
			xhr.setRequestHeader("Content-Type", "application/json");
			xhr.addEventListener("load", () => {
				location.reload();
				// TODO: make smoother
			});
			xhr.addEventListener("error", () => {
				console.log("error with XHR");
			});
			xhr.send(JSON.stringify({
				choiceId: curr.dataset.choiceId
			}))
		});
	}
});