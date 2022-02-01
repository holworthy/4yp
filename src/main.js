// imports

let express = require("express");
let app = express();
let sqlite3 = require("sqlite3").verbose();


// table definitions

let db = new sqlite3.Database("database.db");
db.serialize(() => {
	db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, nickname TEXT, email TEXT UNIQUE)");
	db.run("CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY AUTOINCREMENT, userID INTEGER, campusCardNumber TEXT, threeTwoThree TEXT, FOREIGN KEY (userID) REFERENCES users (id))");
	db.run("CREATE TABLE IF NOT EXISTS supervisor (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, maxNumToSupervise INTEGER, FOREIGN KEY (userId) REFERENCES users(id))");
	db.run("CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY AUTOINCREMENT, userID INTEGER, FOREIGN KEY (userID) REFERENCES users (id))");
	db.run("CREATE TABLE IF NOT EXISTS hubstaff (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, FOREIGN KEY (userId) REFERENCES users(id))");
	db.run("INSERT OR IGNORE INTO users(name, nickname, email) VALUES ('Bob Bobson', 'Bob', 'bob@example.com')");
});


// class definitions

class User {
	constructor(id, name, nickname, email) {
		this.id = id;
		this.name = name;
		this.nickname = nickname;
		this.email = email;
	}

	getId() {
		return this.id;
	}

	getName() {
		return this.name;
	}

	getNickname() {
		return this.nickname;
	}

	getEmail() {
		return this.email;
	}

	static getById(id, callback) {
		let stmt = db.prepare("SELECT * FROM users WHERE id = ?", [id]);
		stmt.get((err, row) => {
			callback(new User(row.id, row.name, row.nickname, row.email));
		});
		stmt.finalize();
	}
}

User.getById(1, user => {
	console.log(user);
});


// web server

app.use("/css", express.static("./css"));
app.use("/js", express.static("./js"));
app.set("view engine", "pug");

app.get("/", (req, res) => res.render("index"));
app.get("/about", (req, res) => res.render("about"));

app.get("/pathwayselect", (req, res) => {
	res.send("Pathway Selection");
});

app.get("/genreselect", (req, res) => {
	res.send("Genre Selection");
});

app.get("/genres", (req, res) => {
	res.send("Genres");
});

app.get("/projectselection", (req, res) => {
	res.send("Project Selection");
});

app.get("/project/:id", (req, res) => {
	res.render("projectoverview", {
		id: req.params.id
	})
});

app.get("/studentoverview", (req, res) => {
	res.send("Student Overview");
});

app.get("/submission", (req, res) => {
	res.send("Submission");
});
app.get("/selectpathways", (req, res) => res.send("/selectpathways"));
app.get("/cohorts", (req, res) => res.send("cohorts"));
app.get("/cohort/new", (req, res) => res.send("new cohort"));
app.get("/cohort/archived", (req, res) => res.send("archived cohorts"));
app.get("/cohort/:id", (req, res) => res.send("cohort " + req.params.id));
app.get("/myprojectproposals", (req, res) => res.send("myprojectproposals"));
app.get("/projectproposal/new", (req, res) => res.send("new projectproposal"));
app.get("/projectproposal/:id", (req, res) => res.send("projectproposal " + req.params.id));
app.get("/mystudentprojects", (req, res) => res.send("mystudentprojects"));
app.get("/project/:id", (req, res) => res.send("project " + req.params.id));
app.get("/marking", (req, res) => res.send("/marking"));

app.get("/assign", (req, res) => res.send("assign"));
app.get("/projects", (req, res) => res.send("projects"));
app.get("/pathways/new", (req, res) => res.send("new pathways"));
app.get("/pathways", (req, res) => res.send("pathways"));
app.get("/markschemes", (req, res) => res.send("markschemes"));
app.get("/markschemes/new", (req, res) => res.send("new markschemes"));
app.get("/markscheme/:id", (req, res) => res.send("markscheme" + req.params.id));

app.listen(8080);
