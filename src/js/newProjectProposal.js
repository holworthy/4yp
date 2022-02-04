function checkMedia() {
	if (document.getElementById("media") == null || document.getElementById("media").files.length == 0) {
		document.getElementById("mediaAlert").style.visibility = "visible";
	} else {
		document.getElementById("mediaAlert").style.visibility = "hidden";
	}
}
