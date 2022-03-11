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
				console.log(students[i]);

				let studentDiv = document.createElement("div");
				studentDiv.classList.add("cohort-student-div");
				studentDiv.innerHTML = "<p>" + students[i].name + "</p><p>" + students[i].email + "</p>";

				let button = document.createElement("button");
				studentDiv.append(button);
				button.innerText = "Add to cohort";
				button.addEventListener("click", () => {
					let xhr2 = new XMLHttpRequest();
					xhr2.open("GET", "/api/add-student-to-cohort?cohortId=" + location.pathname.substring(9) + "&studentId=" + students[i].id);
					xhr2.send();

					console.log();
				});

				studentBox.append(studentDiv);
			}
		});
		xhr.open("GET", "/api/student-search?name=" + encodeURIComponent(name));
		xhr.send();
	});
});
