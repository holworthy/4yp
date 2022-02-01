// imports

let express = require("express");
let app = express();
let sqlite3 = require("sqlite3").verbose();


// table definitions

let db = new sqlite3.Database("database.db");
db.serialize(() => {
	db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, nickname TEXT, email TEXT UNIQUE)");
	db.run("CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, campusCardNumber TEXT, threeTwoThree TEXT, FOREIGN KEY (userId) REFERENCES users (id))");
	db.run("CREATE TABLE IF NOT EXISTS supervisors (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, maxNumToSupervise INTEGER, FOREIGN KEY (userId) REFERENCES users(id))");
	db.run("CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, FOREIGN KEY (userID) REFERENCES users (id))");
	db.run("CREATE TABLE IF NOT EXISTS hubstaff (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, FOREIGN KEY (userId) REFERENCES users(id))");
	
	db.run("CREATE TABLE IF NOT EXISTS markSchemes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
	db.run("CREATE TABLE IF NOT EXISTS markSchemeParts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, weight INTEGER, markSchemeID INTEGER, FOREIGN KEY (markSchemeId) REFERENCES markScheme(id))");
	db.run("CREATE TABLE IF NOT EXISTS projectProposals (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, description TEXT, approved INTEGER, archived INTEGER, markSchemeId INTEGER, FOREIGN KEY (markSchemeId) REFERENCES markScheme(id))");
	db.run("CREATE TABLE IF NOT EXISTS projectProposalsSupervisors (projectProposalId INTEGER, supervisorId INTEGER, FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id), FOREIGN KEY (supervisorId) REFERENCES supervisors(id))")
	db.run("CREATE TABLE IF NOT EXISTS genres (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
	db.run("CREATE TABLE IF NOT EXISTS projectProposalsGenres (projectProposalId INTEGER, genreId INTEGER, FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id), FOREIGN KEY (genreId) REFERENCES genres(id))");
	db.run("CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
	db.run("CREATE TABLE IF NOT EXISTS projectProposalsTags (projectProposalId INTEGER, tagId INTEGER, FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id), FOREIGN KEY (tagId) REFERENCES tags(id))");

	db.run("CREATE TABLE IF NOT EXISTS cohorts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, archived INTEGER)");
	db.run("CREATE TABLE IF NOT EXISTS pathways (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, archived INTEGER)");
	db.run("CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, projectProposalId INTEGER, FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id))");
	db.run("CREATE TABLE IF NOT EXISTS cohortsStudents (cohortId INTEGER, studentId INTEGER, choice1 INTEGER, choice2 INTEGER, choice3 INTEGER, doneChoosing INTEGER, projectId INTEGER, deferring INTEGER, pathwayID INTEGER, FOREIGN KEY (cohortId) REFERENCES cohorts(id), FOREIGN KEY (studentId) REFERENCES students(id), FOREIGN KEY (choice1) REFERENCES projectProposals(id), FOREIGN KEY (choice2) REFERENCES projectProposals(id), FOREIGN KEY (choice3) REFERENCES projectProposals(id), FOREIGN KEY (projectId) REFERENCES projects(id), FOREIGN KEY (pathwayID) REFERENCES pathways(id))");

	db.run("INSERT OR IGNORE INTO users(name, nickname, email) VALUES ('Bob Bobson', 'Bob', 'bob@example.com')");
	db.run("INSERT OR IGNORE INTO students(userId, campusCardNumber, threeTwoThree) VALUES (1, '100255555', 'abc13xyz')");
	db.run("INSERT OR IGNORE INTO admins(userId) VALUES (1)");
	db.run("INSERT OR IGNORE INTO cohorts(name, archived) VALUES ('an example', 0)");
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
			callback(err || !row ? null : new User(row.id, row.name, row.nickname, row.email));
		});
		stmt.finalize();
	}

	// getProfiles() {
	
	// }
}

class Profile {
	constructor(id, user) {
		this.id = id;
		this.user = user;
	}

	getId() {
		return this.id;
	}

	getUser() {
		return this.user;
	}
}

class Supervisor extends Profile {
	constructor(id, user, maxNumToSupervise) {
		super(id, user);
		this.maxNumToSupervise = maxNumToSupervise;
	}

	getMaxNumToSupervise() {
		return this.maxNumToSupervise;
	}
}

class HubStaff extends Profile {
	constructor(id, user) {
		super(id, user);
	}
}

class Student extends Profile {
	constructor(id, user, campusCardNumber, threeTwoThree) {
		super(id, user);
		this.campusCardNumber = campusCardNumber;
		this.threeTwoThree = threeTwoThree;
	}

	getCampusCardNumber() {
		return this.campusCardNumber;
	}

	getThreeTwoThree() {
		return this.threeTwoThree;
	}

	static getById(id, callback) {
		let stmt = db.prepare("SELECT * FROM students WHERE id = ?", [id]);
		stmt.get((err, row) => {
			if (!(err || !row)) {
				let stmt2 = db.prepare("SELECT * FROM users WHERE id = ?", [row.userId]);
				stmt2.get((err, row2) => {
					callback(err || !row ? null : new Student(row.id, new User(row2.id, row2.name, row2.nickname, row2.email), row.campusCardNumber, row.threeTwoThree));
				});
			}
			else
				callback(null);
		});
	}
}

class Admin extends Profile {
	constructor(id, user) {
		super(id, user);
	}

	static getById(id, callback) {
		let stmt = db.prepare("SELECT * FROM admins WHERE id = ?", [id]);
		stmt.get((err, row) => {
			if (err || !row)
				callback(null);
			else {
				let stmt2 = db.prepare("SELECT * FROM users WHERE id = ?", [row.userId]);
				stmt2.get((err, row2) => {
					callback(err || !row2 ? null : new Admin(row.id, new User(row2.id, row2.name, row2.nickname, row2.email)));
				});
			}
		});
	}
}

class Cohort {
	constructor(id, name, archived) {
		this.id = id;
		this.name = name;
		this.archived = archived;
	}

	getId() {
		return this.id;
	}

	getName() {
		return this.name;
	}

	getArchived() {
		return this.archived;
	}

	static getById(id, callback) {
		let stmt = db.prepare("SELECT * FROM cohorts WHERE id = ?", [id]);
		stmt.get((err, row) => {
			callback(err || !row ? null : new Cohort(row.id, row.name, row.archived == 0 ? false : true));
		});
	}
}

class Pathway {
	constructor(id, name) {
		this.id = id;
		this.name = name;
		this.archived = archived;
	}

	getId() {
		return this.id;
	}

	getName() {
		return this.name;
	}

	getArchived() {
		return this.archived;
	}

	static getById(id, callback) {
		let stmt = db.prepare("SELECT * FROM cohorts WHERE id = ?", [id]);
		stmt.get((err, row) => {
			callback(err || !row ? null : new Cohort(row.id, row.name, row.archived == 0 ? false : true));
		});
	}
}

class Project {
	constructor(id, projectProposalID) {
		this.id = id;
		this.projectProposalID = projectProposalID;
	}

	getId() {
		return this.id;
	}

	getProjectProposalID() {
		return this.projectProposalID;
	}

	static getById(id, callback) {
		let stmt = db.prepare("SELECT * FROM projects WHERE id = ?", [id]);
		stmt.get((err, row) => {
			callback(err || !row ? null : new Cohort(row.id, row.projectProposalID));
		});
	}
}

class CohortStudent {
	constructor(cohort, student, choice1, choice2, choice3, doneChoosing, project, deferring, pathway) {
		this.cohort = cohort;
		this.student = student;
		this.choice1 = choice1;
		this.choice2 = choice2;
		this.choice3 = choice3;
		this.doneChoosing = doneChoosing;
		this.project = project;
		this.deferring = deferring;
		this.pathway = pathway;
	}

	getCohort() {
		return this.cohort;
	}

	getStudent() {
		return this.student;
	}

	getChoice1() {
		return this.choice1;
	}

	getChoice2() {
		return this.choice2;
	}

	getChoice3() {
		return this.choice3;
	}

	getDoneChoosing() {
		return this.doneChoosing;
	}

	getProject() {
		return this.Project;
	}

	getDeferring() {
		return this.deferring;
	}

	getPathway() {
		return this.pathway;
	}
}

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
