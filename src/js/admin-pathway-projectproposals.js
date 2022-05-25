window.addEventListener("load", () => {
	let selectButtons = document.getElementsByClassName("projectSelectButton");

	for (let i = 0; i < selectButtons.length; i++){
		let curr = selectButtons[i];
		curr.addEventListener("click", () => {
			let xhr = new XMLHttpRequest();
			xhr.open("POST", "/api/assign-project-student");
			xhr.setRequestHeader("Content-Type", "application/json");
			xhr.addEventListener("load", () => {
				location.href="/cohorts/"+location.href.split("/")[4];
			});
			xhr.addEventListener("error", () => {
				console.log("error with XHR");
			});
			xhr.send(JSON.stringify({
				projectId: curr.dataset.projectId,
				cohortId: location.href.split("/")[4],
				studentId: location.href.split("/")[6],
				pathwayId: location.href.split("/")[8]
			}))
		});
	}
});