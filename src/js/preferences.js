window.addEventListener("load", () => {
	let savePathwayModerationButton = document.getElementById("save-pathway-moderation-button");
	savePathwayModerationButton.addEventListener("click", () => {
		let pathwayModerationCheckboxes = document.getElementsByClassName("pathway-moderation-checkbox");
		let xhr = new XMLHttpRequest();
		xhr.open("POST", "/api/save-pathway-moderation");
		xhr.addEventListener("load", () => alert("Preferences Saved!"));
		xhr.addEventListener("error", () => alert("An error occurred."));
		let payload = [];
		for(let i = 0; i < pathwayModerationCheckboxes.length; i++) {
			payload.push({
				pathwayId: parseInt(pathwayModerationCheckboxes[i].dataset.pathwayId),
				checked: pathwayModerationCheckboxes[i].checked
			});
		}
		xhr.setRequestHeader("Content-Type", "application/json");
		xhr.send(JSON.stringify(payload));
	});
});
