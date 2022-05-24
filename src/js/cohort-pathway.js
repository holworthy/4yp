window.addEventListener("load", () => {
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
						console.log(markschemes);
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
