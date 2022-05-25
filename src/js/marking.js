window.addEventListener("load", () => {
	let rows = document.getElementsByClassName("part-row");
	let submitMarkingButton = document.getElementById("submit-marking-button");
	submitMarkingButton.addEventListener("click", () => {
		let partData = [];
		for(let i = 0; i < rows.length; i++)
			partData.push({
				partId: parseInt(rows[i].dataset.partId),
				mark: parseFloat(rows[i].getElementsByClassName("mark-input")[0].value),
				feedback: rows[i].getElementsByTagName("textarea")[0].value
			});
		let xhr = new XMLHttpRequest();
		xhr.open("POST", "/api/marking");
		xhr.addEventListener("load", () => {
			let result = JSON.parse(xhr.response);
			location.href = "/marksheets/" + result.marksheetId;
		});
		xhr.addEventListener("error", () => alert("Could not submit marking"));
		xhr.setRequestHeader("Content-Type", "application/json");
		xhr.send(JSON.stringify({
			submissionId: parseInt(document.body.dataset.submissionId),
			parts: partData
		}));
	});
});
