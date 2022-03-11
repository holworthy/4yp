window.addEventListener("load", () => {
	let form = document.getElementById("new-projectproposal-form");
	let mediaInput = document.getElementById("media-input");
	let createButton = document.getElementById("create-button");
	let progressBar = document.getElementById("progress-bar");
	let urlsTbody = document.getElementById("urls-tbody");
	let urlInput = document.getElementById("url-input");
	let addUrlButton = document.getElementById("add-url-button");
	let pathwayCheckboxes = document.getElementsByClassName("pathway-checkbox");
	let urls = [];

	addUrlButton.addEventListener("click", e => {
		e.preventDefault();
		let url = urlInput.value;
		if(url != "" && !urls.includes(url)) {
			urls.push(url);
			let tr = document.createElement("tr");
			let td1 = document.createElement("td");
			td1.innerText = url;
			let td2 = document.createElement("td");
			let removeButton = document.createElement("button");
			removeButton.innerText = "Remove";
			removeButton.type = "button";
			removeButton.addEventListener("click", () => {
				urls = urls.filter(item => item != url);
				tr.remove();
			});
			td2.appendChild(removeButton);
			tr.appendChild(td1);
			tr.appendChild(td2);
			urlsTbody.appendChild(tr);
		}
		urlInput.value = "";
		urlInput.focus();
	});

	createButton.addEventListener("click", e => {
		e.preventDefault();

		if(mediaInput.files.length == 0) {
			let yesno = confirm("You did not add any media. Are you sure you want to create this project proposal?");
			if(!yesno)
				return;
		}

		progressBar.removeAttribute("value");
		let fd = new FormData(form);
		fd.append("urls", urls.join(","));

		let pathways = [];
		for(let i = 0; i < pathwayCheckboxes.length; i++)
			if(pathwayCheckboxes[i].checked)
				pathways.push(pathwayCheckboxes[i].name.substring(17));
		fd.append("pathways", pathways.join(","));

		let xhr = new XMLHttpRequest();
		xhr.addEventListener("load", e => {
			let id = JSON.parse(xhr.response);
			location.href = "/projectproposals/" + id;
		});
		xhr.upload.addEventListener("progress", e => {
			progressBar.max = e.total;
			progressBar.value = e.loaded;
		});
		xhr.addEventListener("error", e => {
			
		});
		
		xhr.open("POST", "/api/projectproposals/upload");
		xhr.send(fd);
	});
});
