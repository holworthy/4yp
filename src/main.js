// imports

let express = require("express");
let app = express();
let betterSqlite3 = require("better-sqlite3");


// table definitions

let db = betterSqlite3("database.db");

db.exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, nickname TEXT, email TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, campusCardNumber TEXT, threeTwoThree TEXT, FOREIGN KEY (userId) REFERENCES users (id))");
db.exec("CREATE TABLE IF NOT EXISTS supervisors (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, maxNumToSupervise INTEGER, FOREIGN KEY (userId) REFERENCES users(id))");
db.exec("CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, FOREIGN KEY (userID) REFERENCES users (id))");
db.exec("CREATE TABLE IF NOT EXISTS hubstaff (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, FOREIGN KEY (userId) REFERENCES users(id))");

db.exec("CREATE TABLE IF NOT EXISTS markSchemes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS markSchemesParts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, weight INTEGER, markSchemeId INTEGER, FOREIGN KEY (markSchemeId) REFERENCES markSchemes(id))");
db.exec("CREATE TABLE IF NOT EXISTS projectProposals (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, description TEXT, approved INTEGER, archived INTEGER, markSchemeId INTEGER, FOREIGN KEY (markSchemeId) REFERENCES markSchemes(id))");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsSupervisors (projectProposalId INTEGER, supervisorId INTEGER, UNIQUE (projectProposalId, supervisorId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id), FOREIGN KEY (supervisorId) REFERENCES supervisors(id))")
db.exec("CREATE TABLE IF NOT EXISTS genres (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsGenres (projectProposalId INTEGER, genreId INTEGER, UNIQUE (projectProposalId, genreId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id), FOREIGN KEY (genreId) REFERENCES genres(id))");
db.exec("CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsTags (projectProposalId INTEGER, tagId INTEGER, UNIQUE (projectProposalId, tagId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id), FOREIGN KEY (tagId) REFERENCES tags(id))");

db.exec("CREATE TABLE IF NOT EXISTS cohorts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, archived INTEGER)");
db.exec("CREATE TABLE IF NOT EXISTS pathways (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, projectProposalId INTEGER, FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id))");
db.exec("CREATE TABLE IF NOT EXISTS cohortsStudents (cohortId INTEGER, studentId INTEGER, choice1 INTEGER, choice2 INTEGER, choice3 INTEGER, doneChoosing INTEGER, projectId INTEGER, deferring INTEGER, pathwayID INTEGER, FOREIGN KEY (cohortId) REFERENCES cohorts(id), FOREIGN KEY (studentId) REFERENCES students(id), FOREIGN KEY (choice1) REFERENCES projectProposals(id), FOREIGN KEY (choice2) REFERENCES projectProposals(id), FOREIGN KEY (choice3) REFERENCES projectProposals(id), FOREIGN KEY (projectId) REFERENCES projects(id), FOREIGN KEY (pathwayID) REFERENCES pathways(id))");

db.exec("INSERT OR IGNORE INTO users(name, nickname, email) VALUES ('Bob Bobson', 'Bob', 'bob@example.com')");
db.exec("INSERT OR IGNORE INTO students(userId, campusCardNumber, threeTwoThree) VALUES (1, '100255555', 'abc13xyz')");
db.exec("INSERT OR IGNORE INTO admins(userId) VALUES (1)");
db.exec("INSERT OR IGNORE INTO supervisors(userId, maxNumToSupervise) VALUES (1, 5)");
db.exec("INSERT OR IGNORE INTO cohorts(name, archived) VALUES ('an example', 0)");

db.exec("INSERT OR IGNORE INTO markSchemes(name) VALUES ('Mark Scheme 1')");
db.exec("INSERT OR IGNORE INTO markSchemesParts(name, weight, markSchemeId) VALUES ('Amazingness', 100.0, 1)");

db.exec("INSERT OR IGNORE INTO genres(name) VALUES ('Genre 1')");
db.exec("INSERT OR IGNORE INTO genres(name) VALUES ('Genre 2')");
db.exec("INSERT OR IGNORE INTO tags(name) VALUES ('Tag 1')");
db.exec("INSERT OR IGNORE INTO tags(name) VALUES ('Tag 2')");
db.exec("INSERT OR IGNORE INTO projectProposals(title, description, approved, archived, markSchemeId) VALUES ('Project Proposal 1', 'Project Proposal 1 Description', 1, 0, 1)");
db.exec("INSERT OR IGNORE INTO projectProposalsSupervisors(projectProposalId, supervisorId) VALUES (1, 1)");
db.exec("INSERT OR IGNORE INTO projectProposalsGenres(projectProposalId, genreId) VALUES (1, 1)");
db.exec("INSERT OR IGNORE INTO projectProposalsGenres(projectProposalId, genreId) VALUES (1, 2)");
db.exec("INSERT OR IGNORE INTO projectProposalsTags(projectProposalId, tagId) VALUES (1, 1)");
db.exec("INSERT OR IGNORE INTO projectProposalsTags(projectProposalId, tagId) VALUES (1, 2)");


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

	static getById(id) {
		let stmt = db.prepare("SELECT * FROM users WHERE id = ?");
		let row = stmt.get(id);
		return new User(row.id, row.name, row.nickname, row.email);
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

	static getById(id) {
		let stmt = db.prepare("SELECT * FROM supervisors WHERE id = ?");
		let row1 = stmt.get(id);

		let stmt2 = db.prepare("SELECT * FROM users WHERE id = ?");
		let row2 = stmt2.get(row1.userId);
		return new Supervisor(row1.id, new User(row2.id, row2.name, row2.nickname, row2.email), row1.maxNumToSupervise);
	}
}

class HubStaff extends Profile {
	constructor(id, user) {
		super(id, user);
	}

	static getById(id) {
		let stmt = db.prepare("SELECT * FROM hubstaff WHERE id = ?");
		let row1 = stmt.get(id);

		let stmt2 = db.prepare("SELECT * FROM users WHERE id = ?");
		let row2 = stmt2.get(row1.userId);
		return new HubStaff(row1.id, new User(row2.id, row2.name, row2.nickname, row2.email));
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

	static getById(id) {
		let stmt = db.prepare("SELECT * FROM students WHERE id = ?");
		let row1 = stmt.get(id);

		let stmt2 = db.prepare("SELECT * FROM users WHERE id = ?");
		let row2 = stmt2.get(row1.userId);
		return new Student(row1.id, new User(row2.id, row2.name, row2.nickname, row2.email), row1.campusCardNumber, row1.threeTwoThree);
	}
}

class Admin extends Profile {
	constructor(id, user) {
		super(id, user);
	}

	static getById(id) {
		let stmt = db.prepare("SELECT * FROM admins WHERE id = ?");
		let row1 = stmt.get(id);

		let stmt2 = db.prepare("SELECT * FROM users WHERE id = ?");
		let row2 = stmt2.get(row1.userId);
		return new Admin(row1.id, new User(row2.id, row2.name, row2.nickname, row2.email));
	}
}

class MarkScheme {
	constructor(id, name) {
		this.id = id;
		this.name = name;
		this.parts = [];
	}

	getId() {
		return this.id;
	}

	getName() {
		return this.name;
	}

	getParts() {
		return this.parts;
	}

	static getById(id) {
		let stmt1 = db.prepare("SELECT * FROM markSchemes WHERE id = ?");
		let row1 = stmt1.get(id);
		
		let markScheme = new MarkScheme(row1.id, row1.name);
		let stmt2 = db.prepare("SELECT * FROM markSchemesParts WHERE id = ?");
		stmt2.all(id).forEach(row2 => markScheme.parts.push(new MarkSchemePart(row2.id, row2.name, row2.weight, markScheme)));

		return markScheme;
	}
}

class MarkSchemePart {
	constructor(id, name, weight, markScheme) {
		this.id = id;
		this.name = name;
		this.weight = weight;
		this.markScheme = markScheme;
	}
}

class Genre {
	constructor(id, name) {
		this.id = id;
		this.name = name;
	}

	getId() {
		return this.id;
	}

	getName() {
		return this.name;
	}

	static getById(id) {
		let stmt = db.prepare("SELECT * FROM genres WHERE id = ?");
		let row = stmt.get(id);
		return new Genre(row.id, row.name);
	}
}

class Tag {
	constructor(id, name) {
		this.id = id;
		this.name = name;
	}

	getId() {
		return this.id;
	}

	getName() {
		return this.name;
	}

	static getById(id) {
		let stmt = db.prepare("SELECT * FROM tags WHERE id = ?");
		let row = stmt.get(id);
		return new Tag(row.id, row.name);
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

	static getById(id) {
		let stmt = db.prepare("SELECT * FROM cohorts WHERE id = ?");
		let row = stmt.get(id);
		return new Cohort(row.id, row.name, row.archived == 0 ? false : true);
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

	static getById(id) {
		let stmt = db.prepare("SELECT * FROM cohorts WHERE id = ?");
		let row = stmt.get(id);
		return new Cohort(row.id, row.name, row.archived == 0 ? false : true);
	}
}

class Project {
	constructor(id, projectProposalId) {
		this.id = id;
		this.projectProposalId = projectProposalId;
	}

	getId() {
		return this.id;
	}

	getProjectProposalId() {
		return this.projectProposalId;
	}

	static getById(id) {
		let stmt = db.prepare("SELECT * FROM projects WHERE id = ?");
		let row = stmt.get(id);
		return new Cohort(row.id, row.projectProposalId);
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

class ProjectProposal {
	constructor(id, title, description, approved, archived, markScheme) {
		this.id = id;
		this.title = title;
		this.description = description;
		this.approved = approved;
		this.archived = archived;
		this.markScheme = markScheme;

		this.supervisors = [];
		this.genres = [];
		this.tags = [];
	}

	static getById(id) {
		let stmt1 = db.prepare("SELECT * FROM projectProposals WHERE id = ?");
		let row1 = stmt1.get(id);

		let projectProposal = new ProjectProposal(row1.id, row1.title, row1.description, row1.approved, row1.archived, MarkScheme.getById(row1.markSchemeId));

		let stmt2 = db.prepare("SELECT * FROM projectProposalsSupervisors WHERE projectProposalId = ?");
		stmt2.all(row1.id).forEach(row => projectProposal.supervisors.push(Supervisor.getById(row.supervisorId)));

		let stmt3 = db.prepare("SELECT * FROM projectProposalsGenres WHERE projectProposalId = ?");
		stmt3.all(row1.id).forEach(row => projectProposal.genres.push(Genre.getById(row.genreId)));

		let stmt4 = db.prepare("SELECT * FROM projectProposalsTags WHERE projectProposalId = ?");
		stmt4.all(row1.id).forEach(row => projectProposal.tags.push(Tag.getById(row.tagId)));

		return projectProposal;
	}
}

console.log(ProjectProposal.getById(1));


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
