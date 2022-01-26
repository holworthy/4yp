let express = require("express");
let pug = require("pug");
let app = express();

app.use("/css", express.static("./css"));
app.use("/js", express.static("./js"));
app.set("view engine", "pug");

app.listen(8080);
