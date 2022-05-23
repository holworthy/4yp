function addPathway(addButton){
	let xhr = new XMLHttpRequest();
	xhr.addEventListener("load", () => {
		if (JSON.parse(xhr.response))
			location.reload();
	});
	xhr.open("POST", "/api/add-pathway-cohort?cohortId="+location.pathname.substring(9));
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.send(JSON.stringify({pathwayId: document.getElementById("pathways").value}));
}

function removePathway(removeButton){
	let xhr = new XMLHttpRequest();
	xhr.addEventListener("load", () => {
		if (JSON.parse(xhr.response))
			location.reload();
	});
	xhr.open("POST", "/api/remove-pathway-cohort?cohortId="+location.pathname.substring(9));
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.send(JSON.stringify({pathwayId: removeButton.dataset.pathwayId}));
}

function removeStudent(removeButton){
	let xhr = new XMLHttpRequest();
	xhr.addEventListener("load", () => {
		if (JSON.parse(xhr.response))
			location.reload();
	});
	xhr.open("POST", "/api/remove-from-cohort?cohortId="+location.pathname.substring(9));
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.send(JSON.stringify({studentId: removeButton.dataset.studentId}));
}

function remove(removeButton){
	let tds = removeButton.parentElement.parentElement.childNodes;
	let xhr = new XMLHttpRequest();
	xhr.addEventListener("load", () => {
		if (JSON.parse(xhr.response)) 
				location.reload();
	});
	xhr.open("POST", "/api/remove-deliverable-in-cohort?cohortId="+location.pathname.substring(9));
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.send(JSON.stringify({
		deliverableId: tds[0].dataset.deliverableId,
		pathwayId: tds[1].dataset.pathwayId
	}))
}

function edit(editButton){
	let tds = editButton.parentElement.parentElement.childNodes;

	tds[1].innerHTML = "";
	let pathwaySelect = document.createElement("select");
	pathwaySelect.setAttribute("name", "pathway");
	pathwaySelect.setAttribute("id", "pathway");
	let xhr = new XMLHttpRequest();
	xhr.addEventListener("load", () => {
		let pathways = JSON.parse(xhr.response);
		for (let j = 0; j < pathways.length; j++){
			let option = document.createElement("option");
			option.setAttribute("value", pathways[j].id);
			if (pathways[j].id == tds[1].dataset.pathwayId)
				option.setAttribute("selected", "selected");
			option.appendChild(document.createTextNode(pathways[j].name));
			pathwaySelect.appendChild(option);
		}
	});
	xhr.open("GET", "/api/all-pathways?cohortId="+location.pathname.substring(9));
	xhr.send();
	tds[1].appendChild(pathwaySelect);

	tds[2].innerHTML = "";
	let weightingInput = document.createElement("input");
	weightingInput.setAttribute("type", "text");
	weightingInput.setAttribute("name", "weight");
	weightingInput.setAttribute("value", tds[2].dataset.weight);
	tds[2].appendChild(weightingInput);

	tds[4].innerHTML = "";
	let markschemeSelect = document.createElement("select");
	markschemeSelect.setAttribute("name", "markscheme");
	markschemeSelect.setAttribute("id", "markscheme");
	let xhr2 = new XMLHttpRequest();
	xhr2.addEventListener("load", () => {
		let markschemes = JSON.parse(xhr2.response);
		for (let j = 0; j < markschemes.length; j++){
			let option = document.createElement("option");
			option.setAttribute("value", markschemes[j].id);
			option.appendChild(document.createTextNode(markschemes[j].name));
			markschemeSelect.appendChild(option);
		}
	});
	xhr2.open("GET", "/api/all-markschemes");
	xhr2.send();
	tds[4].appendChild(markschemeSelect);

	tds[3].innerHTML = "";
	let dateInput = document.createElement("input");
	dateInput.setAttribute("type", "date");
	dateInput.setAttribute("name", "dueDate");
	dateInput.setAttribute("value", tds[4].dataset.date);
	tds[3].appendChild(dateInput);

	tds[5].removeChild(editButton);
	let submit = document.createElement("button");
	submit.addEventListener("click", () => {
		let xhr2 = new XMLHttpRequest();
		xhr2.addEventListener("load", () => {
			if (JSON.parse(xhr2.response) === true) 
				location.reload();
			else if (JSON.parse(xhr2.response) === "past"){
				let p = document.createElement("p");
				p.appendChild(document.createTextNode("This date is in the past!"));
				p.classList.add("red-text");
				submit.parentElement.appendChild(p);
			}
		});
		xhr2.open("POST", "/api/change-deliverable-in-cohort?cohortId="+location.pathname.substring(9));
		xhr2.setRequestHeader("Content-Type", "application/json");

		xhr2.send(JSON.stringify({
			newPathway: pathwaySelect.value,
			dueDate: dateInput.value,
			weight: weightingInput.value,
			markscheme: markschemeSelect.value,
			deliverableId: tds[0].dataset.deliverableId,
			pathwayId: tds[1].dataset.pathwayId
		}));
	});
	submit.appendChild(document.createTextNode("Update"));
	tds[5].appendChild(submit);
}

window.addEventListener("load", () => {
	let studentNameInput = document.getElementById("student-name-input");
	let studentBox = document.getElementById("student-box");
	studentNameInput.addEventListener("keyup", () => {
		let name = studentNameInput.value;

		let xhr = new XMLHttpRequest();
		xhr.addEventListener("load", () => {
			let students = JSON.parse(xhr.response);
			studentBox.innerHTML = "";

			for(let i = 0; i < students.length; i++) {
				let studentDiv = document.createElement("div");
				studentDiv.classList.add("cohort-student-div");
				studentDiv.innerHTML = "<p>" + students[i].name + "</p><p>" + students[i].email + "</p>";

				let button = document.createElement("button");
				studentDiv.append(button);
				button.innerText = "Add to cohort";
				button.addEventListener("click", () => {
					let xhr2 = new XMLHttpRequest();
					xhr2.addEventListener("load", () => location.reload());
					xhr2.open("GET", "/api/add-student-to-cohort?cohortId=" + location.pathname.substring(9) + "&studentId=" + students[i].id);
					xhr2.send();
				});

				studentBox.append(studentDiv);
			}
		});
		xhr.open("GET", "/api/student-search?name=" + encodeURIComponent(name)+"&cohortId=" + encodeURIComponent(location.pathname.substring(9)));
		xhr.send();
	});

	let deliverableNameInput = document.getElementById("deliverable-name-input");
	let deliverableBox = document.getElementById("deliverable-box");
	deliverableNameInput.addEventListener("keyup", () => {
		let name = deliverableNameInput.value;

		let xhr = new XMLHttpRequest();
		xhr.addEventListener("load", () => {
			let deliverables = JSON.parse(xhr.response);
			deliverableBox.innerHTML = "";

			for(let i = 0; i < deliverables.length; i++) {
				let deliverableDiv = document.createElement("div");
				deliverableDiv.classList.add("cohort-student-div");
				deliverableDiv.innerHTML = "<p>" + deliverables[i].name + "</p>";

				let button = document.createElement("button");
				deliverableDiv.append(button);
				button.innerText = "Add";
				button.addEventListener("click", () => {
					deliverableDiv.removeChild(button);
					let form = document.createElement("form");
					let inputDeliverableID = document.createElement("input");
					inputDeliverableID.setAttribute("type", "hidden");
					inputDeliverableID.setAttribute("name", "id");
					inputDeliverableID.setAttribute("value", deliverables[i].id);
					form.appendChild(inputDeliverableID);

					let pathwaySelect = document.createElement("select");
					pathwaySelect.setAttribute("name", "pathway");
					pathwaySelect.setAttribute("id", "pathway");
					let xhr4 = new XMLHttpRequest();
					xhr4.addEventListener("load", () => {
						let pathways = JSON.parse(xhr4.response);
						for (let j = 0; j < pathways.length; j++){
							let option = document.createElement("option");
							option.setAttribute("value", pathways[j].id);
							option.appendChild(document.createTextNode(pathways[j].name));
							pathwaySelect.appendChild(option);
						}
					});
					xhr4.open("GET", "/api/all-pathways?cohortId="+location.pathname.substring(9)); 
					xhr4.send();
					form.appendChild(pathwaySelect);

					let markschemeSelect = document.createElement("select");
					markschemeSelect.setAttribute("name", "markscheme");
					markschemeSelect.setAttribute("id", "markscheme");
					let xhr3 = new XMLHttpRequest();
					xhr3.addEventListener("load", () => {
						let markschemes = JSON.parse(xhr3.response);
						for (let j = 0; j < markschemes.length; j++){
							let option = document.createElement("option");
							option.setAttribute("value", markschemes[j].id);
							option.appendChild(document.createTextNode(markschemes[j].name));
							markschemeSelect.appendChild(option);
						}
					});
					xhr3.open("GET", "/api/all-markschemes");
					xhr3.send();
					form.appendChild(markschemeSelect);

					let dateInput = document.createElement("input");
					dateInput.setAttribute("type", "date");
					dateInput.setAttribute("name", "dueDate");
					form.appendChild(dateInput);

					let weightingInput = document.createElement("input");
					weightingInput.setAttribute("type", "text");
					weightingInput.setAttribute("name", "weight");
					form.appendChild(weightingInput);

					let submit = document.createElement("input");
					submit.setAttribute("type", "submit");
					form.appendChild(submit);
					form.setAttribute("action", "/api/add-deliverable-to-cohort?cohortId="+location.pathname.substring(9));
					form.setAttribute("method", "post");
					deliverableDiv.appendChild(form);
				});

				deliverableBox.append(deliverableDiv);
			}
		});
		xhr.open("GET", "/api/deliverable-search?name=" + encodeURIComponent(name));
		xhr.send();
	});
});
