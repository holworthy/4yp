function github(githubLink) {
	if (document.getElementById("overleafForm").style.display == "block")
		document.getElementById("overleafForm").style.display = "none";
	if (githubLink != null)
		window.open(githubLink, '_blank').focus();
	if (document.getElementById("githubform").style.display == "none")
		document.getElementById("githubform").style.display = "block";
	else 
		document.getElementById("githubform").style.display = "none";
}

function overleaf(overleafLink){
	if (document.getElementById("githubform").style.display == "block")
		document.getElementById("githubform").style.display = "none";
	if (overleafLink != null)
		window.open(overleafLink, '_blank').focus();
	if (document.getElementById("overleafForm").style.display == "none")
		document.getElementById("overleafForm").style.display = "block";
	else 
		document.getElementById("overleafForm").style.display = "none";
}

window.addEventListener("load", () => {
	let moderatorNameInput = document.getElementById("moderator-name-input");
	let moderatorBox = document.getElementById("moderator-box");
	moderatorNameInput.addEventListener("keyup", () => {
		let name = moderatorNameInput.value;

		let xhr = new XMLHttpRequest();
		xhr.addEventListener("load", () => {
			let moderators = JSON.parse(xhr.response);
			moderatorBox.innerHTML = "";

			for (let i = 0; i < moderators.length; i++) {
				let moderatorDiv = document.createElement("div");
				moderatorDiv.classList.add("cohort-student-div");
				moderatorDiv.innerHTML = "<p>" + moderators[i].name + "</p><p>" + moderators[i].email + "</p>";
				let button = document.createElement("button");
				moderatorDiv.append(button);
				button.innerText = "Add to project";
				button.addEventListener("click", () => {
					let xhr2 = new XMLHttpRequest();
					xhr2.addEventListener("load", () => location.reload());
					xhr2.open("GET", "/api/add-moderator-to-project?projectId=" + location.href.split("/")[4] + "&moderatorId=" + moderators[i].id);
					xhr2.send();
				});

				moderatorBox.append(moderatorDiv);
			}
		});
		xhr.open("GET", "/api/moderator-search?name=" + encodeURIComponent(name)+"&projectId=" + location.href.split("/")[4]);
		xhr.send();
	});
});