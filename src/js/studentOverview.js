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