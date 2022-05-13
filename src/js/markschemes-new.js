window.addEventListener("load", () => {
	let nameInput = document.getElementById("name-input");
	let partNameInput = document.getElementById("part-name-input");
	let partWeightInput = document.getElementById("part-weight-input");
	let addPartButton = document.getElementById("add-part-button");
	let partsTbody = document.getElementById("parts-tbody");
	let createMarkschemeButton = document.getElementById("create-markscheme-button");

	let parts = [];
	addPartButton.addEventListener("click", () => {
		let name = partNameInput.value;
		let weight = Number.parseInt(partWeightInput.value);

		if(!parts.some(value => value.name == name) && name != "" && weight >= 0 && weight <= 100) {
			parts.push({name: name, weight: weight});
			let tr = document.createElement("tr");
			let td1 = document.createElement("td");
			let p1 = document.createElement("p");
			p1.innerText = name;
			td1.appendChild(p1);
			let td2 = document.createElement("td");
			let p2 = document.createElement("p");
			p2.innerText = weight;
			td2.appendChild(p2);
			let td3 = document.createElement("td");
			let removeButton = document.createElement("button");
			removeButton.innerText = "Remove";
			removeButton.addEventListener("click", () => {
				parts = parts.filter(value => value.name != name);
				partsTbody.removeChild(tr);
			});
			td3.appendChild(removeButton);
			tr.appendChild(td1);
			tr.appendChild(td2);
			tr.appendChild(td3);
			partsTbody.appendChild(tr);
			partNameInput.value = "";
			partWeightInput.value = "";
			partNameInput.focus();
		}
	});

	createMarkschemeButton.addEventListener("click", () => {
		let xhr = new XMLHttpRequest();
		xhr.open("POST", "/api/markschemes/new");
		xhr.setRequestHeader("Content-Type", "application/json");
		xhr.addEventListener("load", () => {
			let response = JSON.parse(xhr.response);
			location.href = "/markschemes/" + response.markschemeId;
		});
		xhr.addEventListener("error", () => {
			// TODO: do something when this goes wrong
		});
		xhr.send(JSON.stringify({
			name: nameInput.value,
			parts: parts
		}));
	});
});
