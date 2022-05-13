window.addEventListener("load", () => {
	let partInputs = document.getElementsByClassName("part-input");
	let submitMarkingButton = document.getElementById("submit-marking-button");
	submitMarkingButton.addEventListener("click", () => {
		let partData = [];
		for(let i = 0; i < partInputs.length; i++)
			partData.push([parseInt(partInputs[0].dataset.partId), parseFloat(partInputs[0].value)]);
		let xhr = new XMLHttpRequest();
		xhr.open("POST", "/api/marking");
		xhr.addEventListener("load", () => {

		});
		xhr.addEventListener("error", () => alert("Could not submit marking"));
		xhr.setRequestHeader("Content-Type", "application/json");
		xhr.send(JSON.stringify({
			submissionId: parseInt(document.body.dataset.submissionId),
			parts: partData
		}));
	});
});
