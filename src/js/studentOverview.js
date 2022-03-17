function github(githubLink) {
	if (githubLink != "null")
		window.open(githubLink, '_blank').focus();
	if (document.getElementById("githubform").style.display == "none"){
		document.getElementById("githubform").style.display = "block";
	} else {
		document.getElementById("githubform").style.display = "none";
	}
}