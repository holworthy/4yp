function checkMedia() {
	if (document.getElementById("Media") == null || document.getElementById("Media").files.length == 0) {
		document.getElementById("MediaAlert").style.visibility = "visible";
	} else {
		document.getElementById("MediaAlert").style.visibility = "hidden";
	}
}
