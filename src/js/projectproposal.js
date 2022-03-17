window.addEventListener("load", () => {
	let approveButton = document.getElementById("approve-button");
	if(approveButton)
		approveButton.addEventListener("click", () => {
			approveButton.disabled = true;
			let xhr = new XMLHttpRequest();
			xhr.open("GET", "/api/projectproposals/" + approveButton.dataset.projectProposalId + "/approve")
			xhr.addEventListener("load", () => {
				let success = JSON.parse(xhr.response);
				if(success) {
					alert("Project Approved!");
					location.href = "/projectproposals";
				} else {
					approveButton.disabled = false;
					alert("Something went wrong, try again");
				}
			});
			xhr.addEventListener("error", () => {
				approveButton.disabled = false;
				alert("Something went wrong, check your connection")
			});
			xhr.send();
		});
});
