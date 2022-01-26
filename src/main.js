let express = require("express");
let app = express();

app.use("/css", express.static("./css"));
app.use("/js", express.static("./js"));

app.listen(8080);
