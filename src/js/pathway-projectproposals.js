const listItems = [];

function dragStart() {
	dragStartIndex = +this.closest('li').getAttribute('data-index');
}

function dragEnter() {
	 this.classList.add("over");
}

function dragLeave() {
	this.classList.remove("over");
}

function dragOver(e) {
	// needed to remove default functionality
	e.preventDefault();
}

function dragDrop() {
	const dragEndIndex = +this.getAttribute("data-index");
	swapItems(dragStartIndex, dragEndIndex);

	this.classList.remove("over");
}

function swapItems(from, to) {
	const item1 = listItems[from].querySelector(".draggable");
	const item2 = listItems[to].querySelector(".draggable");

	listItems[from].appendChild(item2);
	listItems[to].appendChild(item1);

	let xhr = new XMLHttpRequest();
	xhr.open("POST", "/api/projectSelection/swap");
	xhr.setRequestHeader("Content-Type", "application/json");
	// check load
	xhr.addEventListener("error", () => {
		console.log("error with XHR");
	});
	xhr.send(JSON.stringify({
		fromId: from,
		toId: to,
		cohortId: location.href.split("/")[4]
	}))
}

window.addEventListener("load", () => {
	let selectButtons = document.getElementsByClassName("projectSelectButton");

	for (var i = 0; i < selectButtons.length; i++){
		let curr = selectButtons[i];
		curr.addEventListener("click", () => {
			let xhr = new XMLHttpRequest();
			xhr.open("POST", "/api/projectSelection/new");
			xhr.setRequestHeader("Content-Type", "application/json");
			xhr.addEventListener("load", () => {
				console.log(JSON.parse(xhr.response));
				if (JSON.parse(xhr.response) === true){
					console.log("yes");
					location.reload();
				} else if (JSON.parse(xhr.response) == "full") {
					console.log("full2");
					let p = document.createElement("p");
					p.appendChild(document.createTextNode("All projects selected"))
					p.classList.add("red-text");
					curr.parentElement.appendChild(p);
				} else {
					console.log("no");
					let p = document.createElement("p");
					p.appendChild(document.createTextNode("Project already selected"));
					p.classList.add('red-text');
					curr.parentElement.appendChild(p);
				}
			});
			xhr.addEventListener("error", () => {
				console.log("error with XHR");
			});
			xhr.send(JSON.stringify({
				projectId: curr.dataset.projectId,
				cohortId: parseInt(location.href.split("/")[4]),
				pathwayId: parseInt(location.href.split("/")[6])
			}));
		});
	}

	let removeButtons = document.getElementsByClassName("removeSelectionButton");

	for (var i = 0; i < removeButtons.length; i++){
		let curr = removeButtons[i];
		curr.addEventListener("click", () => {
			let xhr = new XMLHttpRequest();
			xhr.open("POST", "/api/projectSelection/remove");
			xhr.setRequestHeader("Content-Type", "application/json");
			xhr.addEventListener("load", () => {
				location.reload();
				// TODO: make smoother
			});
			xhr.addEventListener("error", () => {
				console.log("error with XHR");
			});
			xhr.send(JSON.stringify({
				cohortId: location.href.split("/")[4],
				choiceId: curr.dataset.choiceId
			}))
		});
	}

	let draggables = document.getElementsByClassName("draggable");

	for (var i = 0; i < draggables.length; i++) {
		draggables[i].addEventListener("dragstart", dragStart);
	}

	let dragListItems = document.querySelectorAll('.draggable-list li');

	for (var i = 0; i < dragListItems.length; i++) {
		dragListItems[i].addEventListener("dragover", dragOver);
		dragListItems[i].addEventListener("drop", dragDrop);
		dragListItems[i].addEventListener("dragenter", dragEnter);
		dragListItems[i].addEventListener("dragleave", dragLeave);
		listItems.push(dragListItems[i]);
	}
});
