function deleteTag(tagElement) {
	tagElement.parentElement.remove();
	let tagsDiv = document.getElementById("tags");
	tagsDiv.dataset.currentTagsNum -= 1;
	if (tagsDiv.dataset.currentTagsNum == 0);
		document.getElementById("tagsLabel").style.display = "none";
}

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

	let tagNameInput = document.getElementById("tag-name-input");
	let tagBox = document.getElementById("tag-box");
	tagNameInput.addEventListener("keyup", () => {
		let name = tagNameInput.value;

		let xhr = new XMLHttpRequest();
		xhr.addEventListener("load", () => {
			let tags = JSON.parse(xhr.response);
			tagBox.innerHTML = "";

			for(let i = 0; i < tags.length; i++) {
				console.log(tags[i]);

				let tagDiv = document.createElement("div");
				tagDiv.classList.add("cohort-tag-div");
				tagDiv.innerHTML = "<p>" + tags[i].name + "</p>";

				let button = document.createElement("button");
				tagDiv.append(button);
				button.innerText = "Add to project";
				button.setAttribute("type", "button");
				button.addEventListener("click", () => {
					let para = document.createElement("p");
					let node = document.createTextNode(tags[i].name);
					let remove = document.createElement("p");
					let x = document.createTextNode("🗙");
					para.appendChild(node);
					remove.appendChild(x);
					remove.setAttribute("class", "delete-tag");
					remove.setAttribute("onclick", "deleteTag(this)");

					let tagDiv2 = document.createElement("div");
					tagDiv2.setAttribute("class", "tag");
					tagDiv2.setAttribute("data-tag-id", tags[i].id);
					tagDiv2.appendChild(para);
					tagDiv2.appendChild(remove);
					let tagsDiv = document.getElementById("tags");
					tagsDiv.appendChild(tagDiv2);
					tagsDiv.dataset.currentTagsNum += 1;

					let tagsLabel = document.getElementById("tagsLabel");
					if (tagsLabel.style.display == "none")
						tagsLabel.style.display = "inline";
					
				});

				tagBox.append(tagDiv);
			}
		});
		xhr.open("GET", "/api/tag-search?name=" + encodeURIComponent(name));
		xhr.send();
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

		let tags = [];
		let tagDivs = document.getElementsByClassName("tag");
		for (let i = 0; i < tagDivs.length; i++){
			tags.push(tagDivs[i].getAttribute("data-tag-id"));
		}
		fd.append("tags", tags.join(","));

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
