let express = require("express");
let app = express();

app.use("/css", express.static("./css"));
app.use("/js", express.static("./js"));
app.set("view engine", "pug");

app.get("/", (req, res) => res.render("index"));
app.get("/about", (req, res) => res.render("about"));

app.listen(8080);
