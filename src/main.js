// imports

let express = require("express");
let expressSession = require("express-session");
let betterSqlite3 = require("better-sqlite3");
let bodyParser = require("body-parser");
let sha256 = require("sha256");
let betterSqlite3SessionStore = require("better-sqlite3-session-store");
let expressFileUpload = require("express-fileupload");
let mime = require("mime-types");
let jsStringify = require("js-stringify");

let app = express();
let db = betterSqlite3("database.db");

let cacheAge = 1000 * 60 * 60 * 24 * 7;

app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(bodyParser.json());
app.use("/css", express.static("./css", {maxAge: cacheAge}));
app.use("/js", express.static("./js", {maxAge: cacheAge}));
app.use("/fonts", express.static("./fonts", {maxAge: cacheAge}));
app.set("view engine", "pug");
app.use(expressSession({
	store: new (betterSqlite3SessionStore(expressSession))({
		client: db
	}),
	secret: "hereisasecret",
	resave: false,
	saveUninitialized: false
}));
app.use(expressFileUpload({
	createParentPath: true,
	useTempFiles: true,
	limits: {
		fileSize: 50 * (1 << 20)
	}
}));

// table definitions

db.exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, nickname TEXT, email TEXT UNIQUE, salt TEXT, passwordHash TEXT, campusCardNumber TEXT UNIQUE DEFAULT NULL, threeTwoThree TEXT UNIQUE DEFAULT NULL, maxNumToSupervise INTEGER DEFAULT 0, isAdmin INTEGER DEFAULT 0, isStudent INTEGER DEFAULT 0, isSupervisor INTEGER DEFAULT 0, isHubstaff INTEGER DEFAULT 0)");

db.exec("CREATE TABLE IF NOT EXISTS markSchemes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS markSchemesParts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, weight INTEGER, markSchemeId INTEGER, FOREIGN KEY (markSchemeId) REFERENCES markSchemes(id))");
db.exec("CREATE TABLE IF NOT EXISTS marksheets (id INTEGER PRIMARY KEY AUTOINCREMENT, markSchemeId INTEGER, FOREIGN KEY (markSchemeId) REFERENCES markSchemes(id))");
db.exec("CREATE TABLE IF NOT EXISTS marksheetParts(id INTEGER PRIMARY KEY AUTOINCREMENT, marksheetId INTEGER, markSchemePartId INTEGER, mark REAL, UNIQUE(marksheetId, markSchemePartId), FOREIGN KEY (marksheetId) REFERENCES marksheets(id), FOREIGN KEY (markSchemePartId) REFERENCES markSchemeParts(id))");

db.exec("CREATE TABLE IF NOT EXISTS projectProposals (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT UNIQUE, description TEXT, approved INTEGER DEFAULT 0, archived INTEGER DEFAULT 0, markSchemeId INTEGER DEFAULT NULL, createdBy INTEGER, FOREIGN KEY (markSchemeId) REFERENCES markSchemes(id), FOREIGN KEY (createdBy) REFERENCES users(id))");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsSupervisors (projectProposalId INTEGER, supervisorId INTEGER, UNIQUE (projectProposalId, supervisorId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id), FOREIGN KEY (supervisorId) REFERENCES users(id))");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsMedia (projectProposalId INTEGER, url TEXT, type TEXT, UNIQUE(projectProposalId, url), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id))");
db.exec("CREATE TABLE IF NOT EXISTS genres (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsGenres (projectProposalId INTEGER, genreId INTEGER, UNIQUE (projectProposalId, genreId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id), FOREIGN KEY (genreId) REFERENCES genres(id))");
db.exec("CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsTags (projectProposalId INTEGER, tagId INTEGER, UNIQUE (projectProposalId, tagId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id), FOREIGN KEY (tagId) REFERENCES tags(id))");

db.exec("CREATE TABLE IF NOT EXISTS cohorts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, archived INTEGER)");
db.exec("CREATE TABLE IF NOT EXISTS pathways (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, projectProposalId INTEGER, githubLink TEXT, overleafLink TEXT, FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id))");
db.exec("CREATE TABLE IF NOT EXISTS projectsStudents (projectId INTEGER, studentId INTEGER, UNIQUE(projectId, studentId), FOREIGN KEY (projectId) REFERENCES project(id), FOREIGN KEY (studentId) REFERENCES student(id))");
db.exec("CREATE TABLE IF NOT EXISTS projectsSupervisors (projectId INTEGER, supervisorId INTEGER, marksheetId INTEGER, UNIQUE(projectId, supervisorId), FOREIGN KEY (projectId) REFERENCES projects(id), FOREIGN KEY (supervisorId) REFERENCES users(id), FOREIGN KEY (marksheetId) REFERENCES marksheets(id))");
db.exec("CREATE TABLE IF NOT EXISTS projectsModerators (projectId INTEGER, moderatorId INTEGER, marksheetId INTEGER, UNIQUE(projectId, moderatorId), FOREIGN KEY (projectId) REFERENCES projects(id), FOREIGN KEY (moderatorId) REFERENCES users(id), FOREIGN KEY (marksheetId) REFERENCES marksheets(id))");

db.exec("CREATE TABLE IF NOT EXISTS cohortsStudents (cohortId INTEGER, studentId INTEGER, choice1 INTEGER, choice2 INTEGER, choice3 INTEGER, assignedChoice INTEGER DEFAULT NULL, doneChoosing INTEGER, projectId INTEGER, deferring INTEGER, pathwayId INTEGER, UNIQUE(cohortId, studentId), FOREIGN KEY (cohortId) REFERENCES cohorts(id), FOREIGN KEY (studentId) REFERENCES users(id), FOREIGN KEY (choice1) REFERENCES projectProposals(id), FOREIGN KEY (choice2) REFERENCES projectProposals(id), FOREIGN KEY (choice3) REFERENCES projectProposals(id), FOREIGN KEY (assignedChoice) REFERENCES projectProposals(id), FOREIGN KEY (projectId) REFERENCES projects(id), FOREIGN KEY (pathwayId) REFERENCES pathways(id))");

db.exec("CREATE TABLE IF NOT EXISTS modules (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, code TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS prerequisites (projectProposalId INTEGER, moduleId INTEGER, UNIQUE(projectProposalId, moduleId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id), FOREIGN KEY (moduleId) REFERENCES modules(id))");
db.exec("CREATE TABLE IF NOT EXISTS studentsModules (studentId INTEGER, moduleId INTEGER, UNIQUE(studentId, moduleId), FOREIGN KEY (studentId) REFERENCES users(id), FOREIGN KEY (moduleId) REFERENCES modules(id))");

db.exec("CREATE TABLE IF NOT EXISTS supervisorsPathways (supervisorId INTEGER, pathwayId INTEGER, UNIQUE(supervisorId, pathwayId), FOREIGN KEY (supervisorId) REFERENCES users(id), FOREIGN KEY (pathwayId) REFERENCES pathways(id))");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsPathways (projectProposalId INTEGER, pathwayId INTEGER, UNIQUE(projectProposalId, pathwayId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id), FOREIGN KEY (pathwayId) REFERENCES pathways(id))");

// db.exec("INSERT OR IGNORE INTO users(name, nickname, email, salt, passwordHash, campusCardNumber, threeTwoThree, maxNumToSupervise, isAdmin, isStudent, isSupervisor, isHubstaff) VALUES ()");
db.exec("INSERT OR IGNORE INTO users(name, nickname, email, salt, passwordHash, isAdmin) VALUES ('Amy Admin', 'Amy', 'amy@example.com', '00000000', '5470866c4182b753e5d8c095e65628e3f0c31a3645a92270ff04478ee96c2564', 1)");
db.exec("INSERT OR IGNORE INTO users(name, nickname, email, salt, passwordHash, campusCardNumber, threeTwoThree, isStudent) VALUES ('Sammy Student', 'Sammy', 'sammy@example.com', '00000000', '5470866c4182b753e5d8c095e65628e3f0c31a3645a92270ff04478ee96c2564', '100000000', 'abc12xyz', 1)");
db.exec("INSERT OR IGNORE INTO users(name, nickname, email, salt, passwordHash, maxNumToSupervise, isSupervisor) VALUES ('Simon Supervisor', 'Simon', 'simon@example.com', '00000000', '5470866c4182b753e5d8c095e65628e3f0c31a3645a92270ff04478ee96c2564', 5, 1)");
db.exec("INSERT OR IGNORE INTO users(name, nickname, email, salt, passwordHash, isHubstaff) VALUES ('Helen Hubstaff', 'Helen', 'helen@example.com', '00000000', '5470866c4182b753e5d8c095e65628e3f0c31a3645a92270ff04478ee96c2564', 1)");

db.exec("INSERT OR IGNORE INTO pathways(name) VALUES ('Computer Science')");
db.exec("INSERT OR IGNORE INTO pathways(name) VALUES ('Business')");
db.exec("INSERT OR IGNORE INTO pathways(name) VALUES ('Stats')");

db.exec("INSERT OR IGNORE INTO cohorts(name, archived) VALUES ('Cohort 2021/2022', 0)");

db.exec("INSERT OR IGNORE INTO users(name, nickname, email, salt, passwordHash, campusCardNumber, threeTwoThree, isStudent) VALUES ('a student', 'student1', 'student@example.com', '00000000', '5470866c4182b753e5d8c095e65628e3f0c31a3645a92270ff04478ee96c2564', '100255555', 'abc123xz', 1)");
// db.exec("UPDATE OR IGNORE cohortsStudents SET doneChoosing = 1 WHERE studentId = 5");

db.exec("INSERT OR IGNORE INTO pathways(name) VALUES ('Computer Science')");

db.exec("INSERT OR IGNORE INTO markSchemes(name) VALUES ('Mark Scheme 1')");
db.exec("INSERT OR IGNORE INTO markSchemesParts(name, weight, markSchemeId) VALUES ('Amazingness', 100.0, 1)");

db.exec("INSERT OR IGNORE INTO projectProposals(title, description, approved, archived, markSchemeId) VALUES ('Example Project', 'Description here', 1, 0, 1)");
// db.exec("INSERT OR IGNORE INTO projects(projectProposalId) VALUES (1)");

// db.exec("UPDATE OR IGNORE cohortsStudents SET projectid = 1 WHERE studentId = 5");

db.exec("INSERT OR IGNORE INTO genres(name) VALUES ('Genre 1')");
db.exec("INSERT OR IGNORE INTO genres(name) VALUES ('Genre 2')");
db.exec("INSERT OR IGNORE INTO tags(name) VALUES ('Tag 1')");
db.exec("INSERT OR IGNORE INTO tags(name) VALUES ('Tag 2')");
db.exec("INSERT OR IGNORE INTO projectProposals(title, description, approved, archived, markSchemeId, createdBy) VALUES ('Project Proposal 1', 'Project Proposal 1 Description', 1, 0, 1, 3)");
db.exec("INSERT OR IGNORE INTO projectProposals(title, description, approved, archived, markSchemeId, createdBy) VALUES ('Project Proposal 2', 'Project Proposal 2 Description', 1, 0, 1, 3)");
db.exec("INSERT OR IGNORE INTO projectProposalsSupervisors(projectProposalId, supervisorId) VALUES (1, 1)");
db.exec("INSERT OR IGNORE INTO projectProposalsGenres(projectProposalId, genreId) VALUES (1, 1)");
db.exec("INSERT OR IGNORE INTO projectProposalsGenres(projectProposalId, genreId) VALUES (1, 2)");
db.exec("INSERT OR IGNORE INTO projectProposalsTags(projectProposalId, tagId) VALUES (1, 1)");
db.exec("INSERT OR IGNORE INTO projectProposalsTags(projectProposalId, tagId) VALUES (1, 2)");

db.exec("INSERT OR IGNORE INTO modules(name, code) VALUES ('Programming 1', 'CMP-4008Y')");
db.exec("INSERT OR IGNORE INTO modules(name, code) VALUES ('Systems Development', 'CMP-4013A')");
db.exec("INSERT OR IGNORE INTO modules(name, code) VALUES ('Web-Based Programming', 'CMP-4011A')");

// class definitions

class User {
	constructor(id, name, nickname, email, salt, passwordHash, campusCardNumber, threeTwoThree, maxNumToSupervise, isAdmin, isStudent, isSupervisor, isHubstaff) {
		this.id = id;
		this.name = name;
		this.nickname = nickname;
		this.email = email;
		this.salt = salt;
		this.passwordHash = passwordHash;
		this.campusCardNumber = campusCardNumber;
		this.threeTwoThree = threeTwoThree;
		this.maxNumToSupervise = maxNumToSupervise;
		this.isAdmin = isAdmin;
		this.isStudent = isStudent;
		this.isSupervisor = isSupervisor;
		this.isHubstaff = isHubstaff;
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

	getSalt() {
		return this.salt;
	}

	getPasswordHash() {
		return this.passwordHash;
	}

	getCampusCardNumber() {
		return this.campusCardNumber;
	}

	getThreeTwoThree() {
		return this.threeTwoThree;
	}

	getMaxNumToSupervise() {
		return this.maxNumToSupervise;
	}

	getIsAdmin() {
		return this.isAdmin;
	}

	getIsStudent() {
		return this.isStudent;
	}

	getIsSupervisor() {
		return this.isSupervisor;
	}

	getIsHubstaff() {
		return this.isHubstaff;
	}
	
	static getById(id) {
		let stmt = db.prepare("SELECT * FROM users WHERE id = ?");
		let row = stmt.get(id);
		return new User(row.id, row.name, row.nickname, row.email, row.salt, row.passwordHash, row.campusCardNumber, row.threeTwoThree, row.maxNumToSupervise, row.isAdmin, row.isStudent, row.isSupervisor, row.isHubstaff);
	}

	static getAll() {
		let stmt = db.prepare("SELECT * FROM users");
		return stmt.all();
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
		let stmt2 = db.prepare("SELECT * FROM markSchemesParts WHERE markSchemeId = ?");
		stmt2.all(id).forEach(row2 => markScheme.parts.push(new MarkSchemePart(row2.id, row2.name, row2.weight, markScheme)));

		return markScheme;
	}

	static getAll() {
		let stmt = db.prepare("SELECT * FROM markschemes");
		let markschemes = [];
		let rows = stmt.all();
		for(let i = 0; i < rows.length; i++)
			markschemes.push(new MarkScheme(rows[i].id, rows[i].name));
		return markschemes;
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

	getStudents() {
		let stmt = db.prepare("SELECT * FROM cohortsStudents WHERE cohortId = ?");
		let students = [];
		let rows = stmt.all(this.id);
		for(let i = 0; i < rows.length; i++)
			students.push(new CohortStudent(rows[i].cohortId, User.getById(rows[i].studentId), rows[i].choice1, rows[i].choice2, rows[i].choice3, rows[i].doneChoosing, Project.getById(rows[i].projectId), rows[i].deferring, null));
		return students;
	}

	static getById(id) {
		let stmt = db.prepare("SELECT * FROM cohorts WHERE id = ?");
		let row = stmt.get(id);
		return new Cohort(row.id, row.name, row.archived == 1);
	}

	static getAll() {
		let stmt = db.prepare("SELECT * FROM cohorts WHERE archived = 0");
		let cohorts = [];
		let rows = stmt.all();
		for(let i = 0; i < rows.length; i++)
			cohorts.push(new Cohort(rows[i].id, rows[i].name, rows[i].archived == 1));
		return cohorts;
	}
}

class Pathway {
	constructor(id, name) {
		this.id = id;
		this.name = name;
		// this.archived = archived;
	}

	getId() {
		return this.id;
	}

	getName() {
		return this.name;
	}

	// getArchived() {
	// 	return this.archived;
	// }

	static getById(id) {
		let stmt = db.prepare("SELECT * FROM pathways WHERE id = ?");
		let row = stmt.get(id);
		return new Pathway(row.id, row.name);
	}

	static getAll() {
		let stmt = db.prepare("SELECT * FROM pathways");
		let pathways = [];
		let rows = stmt.all();
		for(let i = 0; i < rows.length; i++)
			pathways.push(new Pathway(rows[i].id, rows[i].name));
		return pathways;
	}
}

class Project {
	constructor(id, projectProposalId, githubLink, overleafLink) {
		this.id = id;
		this.projectProposalId = projectProposalId;
		this.githubLink = githubLink;
		this.overleafLink = overleafLink;
	}

	getId() {
		return this.id;
	}

	getProjectProposalId() {
		return this.projectProposalId;
	}

	getGithubLink() {
		return this.githubLink;
	}

	getOverleafLink() {
		return this.getOverleafLink;
	}

	static getById(id) {
		let stmt = db.prepare("SELECT * FROM projects WHERE id = ?");
		let row = stmt.get(id);
		return row ? new Project(row.id, row.projectProposalId, row.githubLink, row.overleafLink) : null;
	}
}

class CohortStudent {
	constructor(cohort, student, choice1, choice2, choice3, assignedChoice, doneChoosing, project, deferring, pathway) {
		this.cohort = cohort;
		this.student = student;
		this.choice1 = choice1;
		this.choice2 = choice2;
		this.choice3 = choice3;
		this.assignedChoice = assignedChoice;
		this.doneChoosing = doneChoosing;
		this.project = project;
		this.deferring = deferring;
		this.pathway = pathway;
	}

	toConsole(){
		console.log("Cohort:"+this.cohort+"\n"+
					"Student:"+this.student+"\n"+
					"choice1:"+this.choice1+"\n"+
					"choice2:"+this.choice2+"\n"+
					"choice3:"+this.choice3+"\n"+
					"assigned:"+this.assignedChoice+"\n"+
					"doneChoosing"+this.doneChoosing+"\n"+
					"project"+this.project+"\n"+
					"defering"+this.deferring+"\n"+
					"Pathway"+this.pathway);
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

	getAssignedChoice() {
		return this.assignedChoice;
	}

	getDoneChoosing() {
		return this.doneChoosing;
	}

	getProject() {
		return this.project;
	}

	getDeferring() {
		return this.deferring;
	}

	getPathway() {
		return this.pathway;
	}

	static getByCohortIdAndStudentId(cohortId, studentId) {
		let stmt = db.prepare("SELECT * FROM cohortsStudents WHERE cohortId = ? AND studentId = ?");
		let row = stmt.get();
		return row; // TODO: this is wrong
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
		stmt2.all(row1.id).forEach(row => projectProposal.supervisors.push(User.getById(row.supervisorId)));

		let stmt3 = db.prepare("SELECT * FROM projectProposalsGenres WHERE projectProposalId = ?");
		stmt3.all(row1.id).forEach(row => projectProposal.genres.push(Genre.getById(row.genreId)));

		let stmt4 = db.prepare("SELECT * FROM projectProposalsTags WHERE projectProposalId = ?");
		stmt4.all(row1.id).forEach(row => projectProposal.tags.push(Tag.getById(row.tagId)));

		return projectProposal;
	}

	static getAll() {
		let stmt = db.prepare("SELECT projectProposals.*, users.name AS createdByName FROM projectProposals LEFT JOIN users ON projectProposals.createdBy = users.id");
		return stmt.all();
	}
}


// web server

// log page in console
app.use((req, res, next) => {
	console.log(new Date(), req.path);
	next();
});

// remove trailing slashes from urls
app.use((req, res, next) => {
	if(req.path.endsWith("/") && req.path != "/")
		res.redirect(req.path.substring(0, req.path.length - 1));
	else
		next();
});

// root
app.get("/", (req, res) => res.redirect(req.session.loggedIn ? "/overview" : "/login"));

// favicon
app.get("/uea.png", (req, res) => res.sendFile("uea.png", {root: ".", maxAge: cacheAge}));

// about page
app.get("/about", (req, res) => res.render("about"));

// login page
app.get("/login", (req, res) => {
	if(req.session.loggedIn)
		res.redirect("/overview");
	else
		res.render("login");
});
app.post("/login", (req, res) => {
	let email = req.body.email;
	let password = req.body.password;

	let stmt = db.prepare("SELECT * FROM users WHERE email = ?");
	let row = stmt.get(email);

	if(!row) {
		res.redirect("/login");
	} else {
		if(sha256(row.salt + password) == row.passwordHash) {
			req.session.loggedIn = true;
			req.session.userId = row.id;
			req.session.user = row;
			req.session.save();
			res.redirect("/overview");
		} else {
			res.redirect("/login");
		}
	}
});

// users must be logged in to view any page defined below this
app.use((req, res, next) => {
	if(req.session.loggedIn)
		next();
	else
		res.redirect("/");
});

// logout page
app.get("/logout", (req, res) => {
	req.session.loggedIn = false;
	req.session.save();
	res.redirect("/");
});

// users
app.get("/users", (req, res) => res.render("users", {
	users: User.getAll()
}));
app.get("/users/me", (req, res) => res.redirect(req.session.loggedIn ? "/users/" + req.session.userId : "/"));
app.get("/users/:id", (req, res) => {
	let stmt = db.prepare("SELECT * FROM users INNER JOIN cohortsStudents ON cohortsStudents.studentId = users.id INNER JOIN projects ON cohortsStudents.projectId = projects.id INNER JOIN projectProposals ON projects.projectProposalId = projectProposals.id WHERE users.id = ?");
	try {
		res.render("user", {
			user: User.getById(req.params.id),
			cohorts: []
		});
	} catch(e) {
		res.redirect("/users");
	}
});

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

/* cohorts */

app.get("/cohorts", (req, res) => res.render("cohorts", {cohorts: Cohort.getAll()}));
app.get("/cohorts/new", (req, res) => {
	res.render("cohorts-new");
});
app.post("/cohorts/new", (req, res) => {
	let name = req.body.name;
	if(name) {
		try {
			let stmt = db.prepare("INSERT INTO cohorts(name, archived) VALUES (?, 0)");
			stmt.run(name);

			stmt = db.prepare("SELECT * FROM cohorts ORDER BY id DESC LIMIT 1");
			let row = stmt.get();

			res.redirect("/cohorts/" + row.id);
		} catch(e) {
			console.log(e);
			res.redirect("/cohorts/new"); // TODO: add error message
		}
	} else {
		res.redirect("/cohorts/new"); // TODO: add error message
	}
});
app.get("/cohorts/archived", (req, res) => res.send("archived cohorts"));
app.get("/cohorts/:id", (req, res) => {
	try {
		res.render("cohort", {cohort: Cohort.getById(req.params.id)});
	} catch(e) {
		res.redirect("/cohorts");
	}
});

app.get("/api/student-search", (req, res) => {
	if(!req.session.loggedIn) {
		res.sendStatus(403);
	} else {
		let stmt = db.prepare("SELECT id, name, email FROM users WHERE users.name LIKE '%' || ? || '%' LIMIT 5"); // TODO: check for SQL injection
		res.send(JSON.stringify(stmt.all(req.query.name)));
	}
});
app.get("/api/add-student-to-cohort", (req, res) => {
	// TODO: permission check
	if(!req.session.loggedIn) {
		res.sendStatus(403);
	} else {
		console.log(req.query);
		let stmt = db.prepare("INSERT OR IGNORE INTO cohortsStudents(cohortId, studentId, choice1, choice2, choice3, doneChoosing, projectId, deferring, pathwayId) VALUES (?, ?, NULL, NULL, NULL, 0, NULL, 0, NULL)"); // TODO: check for SQL injection
		stmt.run(req.query.cohortId, req.query.studentId);
		res.sendStatus(200);
	}
});

app.get("/myprojectproposals", (req, res) => res.send("myprojectproposals"));

app.use("/uploads", express.static("./uploads"));
app.post("/projectproposal/new", (req, res) => {
	if(req.session.loggedIn) {
		let title = req.body.title;
		let description = req.body.description;

		let files = req.files;
		for(let i = 0; i < req.files.media.length; i++) {
			let file = req.files.media[i];
			console.log(file);
			if(file.truncated) {
				// TODO: file too big!
			} else {
				file.mv("./uploads/" + file.md5 + "." + mime.extension(file.mimetype));
			}
		}

		// TODO: add to database
		
		res.redirect("/projectproposal/new");
	} else {
		res.redirect("/");
	}
});


app.get("/projectproposal/:id", (req, res) => res.send("projectproposal " + req.params.id));
app.get("/mystudentprojects", (req, res) => res.send("mystudentprojects"));
app.get("/project/:id", (req, res) => res.send("project " + req.params.id));
app.get("/marking", (req, res) => res.send("/marking"));

app.get("/assign", (req, res) => res.send("assign"));
app.get("/projects", (req, res) => res.send("projects"));

app.get("/pathways", (req, res) => res.render("pathways", {pathways: Pathway.getAll()}));
app.get("/pathways/new", (req, res) => res.render("pathways-new"));
app.post("/pathways/new", (req, res) => {
	let name = req.body.name;
	if(name) {
		try {
			let stmt = db.prepare("INSERT INTO pathways(name) VALUES (?)");
			stmt.run(name);

			stmt = db.prepare("SELECT * FROM pathways ORDER BY id DESC LIMIT 1");
			let row = stmt.get();

			res.redirect("/pathways/" + row.id);
		} catch(e) {
			console.log(e);
			res.redirect("/pathways/new"); // TODO: add error message
		}
	} else {
		res.redirect("/pathways/new"); // TODO: add error message
	}
});
app.get("/pathways/:id", (req, res) => {
	let pathwayId = req.params.id;
	try {

		let cohorts = [];
		let stmt = db.prepare("SELECT *, cohorts.name AS cohortName, users.name AS userName FROM cohortsStudents INNER JOIN cohorts ON cohortsStudents.cohortId = cohorts.id INNER JOIN users ON cohortsStudents.studentId = users.id WHERE pathwayId = ?");
		let rows = stmt.all(pathwayId);
		for(let i = 0; i < rows.length; i++) {
			let row = rows[i];

			let cohortExists = false;
			let cohort;
			for(let j = 0; j < cohorts.length; j++) {
				if(cohorts[j].id == rows[i].cohortId) {
					cohortExists = true;
					cohort = cohorts[j];
					break;
				}
			}
			if(!cohortExists) {
				cohort = {
					id: row.cohortId,
					name: row.cohortName,
					students: []
				};
				cohorts.push(cohort);
			}

			cohort.students.push({
				id: row.studentId,
				user: {
					id: row.userId,
					name: row.userName,
					campusCardNumber: row.campusCardNumber,
					email: row.email
				},
				choice1: row.choice1,
				choice2: row.choice2,
				choice3: row.choice3,
				doneChoosing: row.doneChoosing
			});
		}

		let supervisors = [];
		let supervisorsStmt = db.prepare("SELECT * FROM supervisorsPathways INNER JOIN users ON supervisorsPathways.supervisorId = users.id");
		console.log(supervisorsStmt.all());

		res.render("pathway", {
			pathway: Pathway.getById(pathwayId),
			cohorts: cohorts,
			supervisors: supervisors
		});
	} catch(e) {
		console.log(e);
		res.redirect("/pathways");
	}
});

app.get("/projectproposals", (req, res) => {
	res.render("projectproposals", {
		projectProposals: ProjectProposal.getAll()
	});
});
app.get("/projectproposals/new", (req, res) => {
	res.render("projectproposals-new", {pathways: Pathway.getAll()});
});
app.post("/api/projectproposals/upload", (req, res) => {
	let title = req.body.title;
	let description = req.body.description;

	let media = req.files ? req.files.media ? req.files.media : [] : [];
	let mediaUrls = [];
	for(let i = 0; i < media.length; i++) {
		let file = media[i];
		// console.log(file);
		if(file.truncated) {
			// TODO: file too big!
		} else {
			let name = file.md5 + "." + mime.extension(file.mimetype)
			file.mv("./uploads/" + name);
			mediaUrls.push("/uploads/" + name);
		}
	}

	let stmt1 = db.prepare("INSERT INTO projectProposals(title, description, createdBy) VALUES (?, ?, ?)");
	stmt1.run(title, description, req.session.user.id);

	let stmt2 = db.prepare("SELECT id FROM projectProposals WHERE createdBy = ? ORDER BY id DESC LIMIT 1");
	let projectProposal = stmt2.get(req.session.user.id);
	
	for(let i = 0; i < mediaUrls.length; i++) {
		let stmt3 = db.prepare("INSERT INTO projectProposalsMedia(projectProposalId, url, type) VALUES (?, ?, ?)");
		stmt3.run(projectProposal.id, mediaUrls[i], mime.lookup(mediaUrls[i]).split("/")[0]);
	}

	let urls = req.body.urls.split(",");
	for(let i = 0; i < urls.length; i++) {
		let stmt4 = db.prepare("INSERT INTO projectProposalsMedia(projectProposalId, url, type) VALUES (?, ?, 'url')");
		stmt4.run(projectProposal.id, urls[i]);
	}

	let pathways = req.body.pathways.split(",");
	for(let i = 0; i < pathways.length; i++) {
		let stmt5 = db.prepare("INSERT INTO projectProposalsPathways(projectProposalId, pathwayId) VALUES (?, ?)");
		stmt5.run(projectProposal.id, pathways[i]);
	}

	let stmt6 = db.prepare("INSERT INTO projectProposalsSupervisors(projectProposalId, supervisorId) VALUES (?, ?)");
	stmt6.run(projectProposal.id, req.session.user.id);

	res.send(JSON.stringify(projectProposal.id));
});
app.get("/projectproposals/:id", (req, res) => {
	res.render("projectproposal", {projectProposal: ProjectProposal.getById(req.params.id)});
});

app.get("/markschemes", (req, res) => res.render("markschemes", {markschemes: MarkScheme.getAll()}));
app.get("/markschemes/new", (req, res) => res.render("markschemes-new"));
app.post("/api/markschemes/new", (req, res) => {
	let name = req.body.name;
	let parts = req.body.parts;

	let stmt = db.prepare("INSERT OR IGNORE INTO markSchemes(name) VALUES (?)");
	stmt.run(name);

	// TODO: check if this fails
	stmt = db.prepare("SELECT id, name FROM markSchemes WHERE name = ?");
	let markSchemeId = stmt.get(name).id;

	for(let i = 0; i < parts.length; i++) {
		let part = parts[i];
		stmt = db.prepare("INSERT OR IGNORE INTO markSchemesParts(name, weight, markSchemeId) VALUES (?, ?, ?)");
		stmt.run(part.name, part.weight, markSchemeId);
		// TODO: check if this fails
	}

	res.send(JSON.stringify({
		markSchemeId: markSchemeId
	}));
});
app.get("/markschemes/:id", (req, res) => {
	let markScheme = MarkScheme.getById(req.params.id);
	res.render("markscheme", {markScheme: markScheme});
});

// modules
app.get("/modules", (req, res) => {
	let stmt = db.prepare("SELECT * FROM modules");
	let rows = stmt.all();
	res.render("modules", {modules: rows});
});
app.get("/modules/new", (req, res) => {
	res.render("modules-new");
});
app.post("/modules/new", (req, res) => {
	let name = req.body.name;
	let code = req.body.code;

	let stmt = db.prepare("INSERT INTO modules(name, code) VALUES (?, ?)");
	let result = stmt.run(name, code);

	res.redirect("/modules/" + result.lastInsertRowid);
});
app.get("/modules/:moduleId", (req, res) => {
	let stmt = db.prepare("SELECT * FROM modules WHERE id = ?");
	let row = stmt.get(req.params.moduleId);
	res.render("module", {mod: row});
});

app.get("/overview", (req, res) => {
	if (User.getById(req.session.userId).getIsStudent()){
		let stmt1 = db.prepare("SELECT * FROM cohortsStudents WHERE studentId = ?");
		let row1 = stmt1.get(req.session.userId);
		let cS = new CohortStudent(row1.cohortId, row1.studentId, row1.choice1, row1.choice2, row1.choice3, row1.assignedChoice, row1.doneChoosing, row1.projectId, row1.deferring, row1.pathwayId);
		if (cS.getDoneChoosing()){
			res.render("studentoverview", {user: User.getById(req.session.userId), project: Project.getById(cS.getProject())});
		}
		else{
			res.redirect("/pathways");
		}
		
	}
	else {
		res.render("overview", {user: User.getById(req.session.userId)});
	}
});
app.post("/overview", (req, res) => {
	if (User.getById(req.session.userId).getIsStudent()){
		let stmt1 = db.prepare("SELECT * FROM cohortsStudents WHERE studentId = ?");
		let row1 = stmt1.get(req.session.userId);
		let cS = new CohortStudent(row1.cohortId, row1.studentId, row1.choice1, row1.choice2, row1.choice3, row1.assignedChoice, row1.doneChoosing, row1.projectId, row1.deferring, row1.pathwayId);
		let project = Project.getById(cS.getProject());
		let stmt2 = db.prepare("UPDATE OR IGNORE projects SET githubLink = ? WHERE id = ?");
		let gLink = req.body.githubLink
		stmt2.run(gLink, project.getId());
	}
	res.redirect("/overview");
});


app.use("/media", express.static("./media"));

app.listen(8080);
