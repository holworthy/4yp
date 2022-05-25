window.addEventListener("load", () => {
	let input = document.getElementById("agreed-mark-input");
	let button = document.getElementById("agreed-mark-button");
	button.addEventListener("click", () => {
		let xhr = new XMLHttpRequest();
		xhr.open("POST", "/api/set-agreed-mark");
		xhr.addEventListener("load", () => {
			alert("Agreed Mark Set");
			location.href = "/";
		});
		xhr.setRequestHeader("Content-Type", "application/json")
		xhr.send(JSON.stringify({
			submissionId: parseInt(location.href.split("/")[4]),
			mark: parseFloat(input.value)
		}));
	});
});
