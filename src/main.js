// imports

let express = require("express");
let expressSession = require("express-session");
let betterSqlite3 = require("better-sqlite3");
let bodyParser = require("body-parser");
let sha256 = require("sha256");
let betterSqlite3SessionStore = require("better-sqlite3-session-store");
let expressFileUpload = require("express-fileupload");
let mime = require("mime-types");

let db = betterSqlite3("database.db");

// table definitions

db.exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, nickname TEXT, email TEXT UNIQUE, salt TEXT, passwordHash TEXT, campusCardNumber TEXT UNIQUE DEFAULT NULL, threeTwoThree TEXT UNIQUE DEFAULT NULL, maxNumToSupervise INTEGER DEFAULT 0, isAdmin INTEGER DEFAULT 0, isStudent INTEGER DEFAULT 0, isSupervisor INTEGER DEFAULT 0, isHubstaff INTEGER DEFAULT 0)");

db.exec("CREATE TABLE IF NOT EXISTS markSchemes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS markSchemesParts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, weight INTEGER, markSchemeId INTEGER, FOREIGN KEY (markSchemeId) REFERENCES markSchemes(id) ON DELETE CASCADE)");
db.exec("CREATE TABLE IF NOT EXISTS marksheets (id INTEGER PRIMARY KEY AUTOINCREMENT, markSchemeId INTEGER, FOREIGN KEY (markSchemeId) REFERENCES markSchemes(id) ON DELETE CASCADE)");
db.exec("CREATE TABLE IF NOT EXISTS marksheetParts(id INTEGER PRIMARY KEY AUTOINCREMENT, marksheetId INTEGER, markSchemePartId INTEGER, mark REAL, UNIQUE(marksheetId, markSchemePartId), FOREIGN KEY (marksheetId) REFERENCES marksheets(id) ON DELETE CASCADE, FOREIGN KEY (markSchemePartId) REFERENCES markSchemeParts(id) ON DELETE CASCADE)");

db.exec("CREATE TABLE IF NOT EXISTS projectProposals (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT UNIQUE, description TEXT, approved INTEGER DEFAULT 0, archived INTEGER DEFAULT 0, markSchemeId INTEGER DEFAULT NULL, createdBy INTEGER, FOREIGN KEY (markSchemeId) REFERENCES markSchemes(id) ON DELETE RESTRICT, FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET DEFAULT)");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsSupervisors (projectProposalId INTEGER, supervisorId INTEGER, UNIQUE (projectProposalId, supervisorId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id) ON DELETE CASCADE, FOREIGN KEY (supervisorId) REFERENCES users(id) ON DELETE CASCADE)");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsMedia (projectProposalId INTEGER, url TEXT, type TEXT, UNIQUE(projectProposalId, url), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id) ON DELETE CASCADE)");
db.exec("CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsTags (projectProposalId INTEGER, tagId INTEGER, UNIQUE (projectProposalId, tagId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id) ON DELETE CASCADE, FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE)");

db.exec("CREATE TABLE IF NOT EXISTS cohorts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, archived INTEGER)");
db.exec("CREATE TABLE IF NOT EXISTS pathways (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, projectProposalId INTEGER, githubLink TEXT, overleafLink TEXT, FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id) ON DELETE RESTRICT)");
db.exec("CREATE TABLE IF NOT EXISTS projectsStudents (projectId INTEGER, studentId INTEGER, UNIQUE(projectId, studentId), FOREIGN KEY (projectId) REFERENCES project(id) ON DELETE RESTRICT, FOREIGN KEY (studentId) REFERENCES student(id) ON DELETE RESTRICT)");
db.exec("CREATE TABLE IF NOT EXISTS projectsSupervisors (projectId INTEGER, supervisorId INTEGER, marksheetId INTEGER, UNIQUE(projectId, supervisorId), FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (supervisorId) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (marksheetId) REFERENCES marksheets(id) ON DELETE RESTRICT)");
db.exec("CREATE TABLE IF NOT EXISTS projectsModerators (projectId INTEGER, moderatorId INTEGER, marksheetId INTEGER, UNIQUE(projectId, moderatorId), FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (moderatorId) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (marksheetId) REFERENCES marksheets(id) ON DELETE RESTRICT)");

db.exec("CREATE TABLE IF NOT EXISTS cohortsStudents (cohortId INTEGER, studentId INTEGER, choice1 INTEGER, choice2 INTEGER, choice3 INTEGER, assignedChoice INTEGER DEFAULT NULL, doneChoosing INTEGER, projectId INTEGER, deferring INTEGER, pathwayId INTEGER, UNIQUE(cohortId, studentId), FOREIGN KEY (cohortId) REFERENCES cohorts(id) ON DELETE RESTRICT, FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE RESTRICT, FOREIGN KEY (choice1) REFERENCES projectProposals(id) ON DELETE RESTRICT, FOREIGN KEY (choice2) REFERENCES projectProposals(id) ON DELETE RESTRICT, FOREIGN KEY (choice3) REFERENCES projectProposals(id) ON DELETE RESTRICT, FOREIGN KEY (assignedChoice) REFERENCES projectProposals(id) ON DELETE RESTRICT, FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET DEFAULT, FOREIGN KEY (pathwayId) REFERENCES pathways(id) ON DELETE RESTRICT)");

db.exec("CREATE TABLE IF NOT EXISTS modules (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, code TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS prerequisites (projectProposalId INTEGER, moduleId INTEGER, UNIQUE(projectProposalId, moduleId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id) ON DELETE CASCADE, FOREIGN KEY (moduleId) REFERENCES modules(id) ON DELETE CASCADE)");
db.exec("CREATE TABLE IF NOT EXISTS studentsModules (studentId INTEGER, moduleId INTEGER, UNIQUE(studentId, moduleId), FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (moduleId) REFERENCES modules(id) ON DELETE CASCADE)");

db.exec("CREATE TABLE IF NOT EXISTS supervisorsPathways (supervisorId INTEGER, pathwayId INTEGER, UNIQUE(supervisorId, pathwayId), FOREIGN KEY (supervisorId) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (pathwayId) REFERENCES pathways(id) ON DELETE CASCADE)");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsPathways (projectProposalId INTEGER, pathwayId INTEGER, UNIQUE(projectProposalId, pathwayId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id) ON DELETE CASCADE, FOREIGN KEY (pathwayId) REFERENCES pathways(id) ON DELETE CASCADE)");

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

db.exec("INSERT OR IGNORE INTO projectProposals(title, description, approved, archived, markSchemeId) VALUES ('Example Project1', 'Description here', 1, 0, 1)");
db.exec("INSERT OR IGNORE INTO projectProposals(title, description, approved, archived, markSchemeId) VALUES ('Example Project2', 'Description here', 1, 0, 1)");
db.exec("INSERT OR IGNORE INTO projectProposals(title, description, approved, archived, markSchemeId) VALUES ('Example Project3', 'Description here', 1, 0, 1)");
// db.exec("INSERT OR IGNORE INTO projects(projectProposalId) VALUES (1)");

// db.exec("UPDATE OR IGNORE cohortsStudents SET projectid = 1 WHERE studentId = 5");

db.exec("INSERT OR IGNORE INTO tags(name) VALUES ('Tag 1')");
db.exec("INSERT OR IGNORE INTO tags(name) VALUES ('Tag 2')");
db.exec("INSERT OR IGNORE INTO projectProposals(title, description, approved, archived, markSchemeId, createdBy) VALUES ('Project Proposal 1', 'Project Proposal 1 Description', 1, 0, 1, 3)");
db.exec("INSERT OR IGNORE INTO projectProposals(title, description, approved, archived, markSchemeId, createdBy) VALUES ('Project Proposal 2', 'Project Proposal 2 Description', 1, 0, 1, 3)");
db.exec("INSERT OR IGNORE INTO projectProposalsSupervisors(projectProposalId, supervisorId) VALUES (1, 1)");
db.exec("INSERT OR IGNORE INTO projectProposalsTags(projectProposalId, tagId) VALUES (1, 1)");
db.exec("INSERT OR IGNORE INTO projectProposalsTags(projectProposalId, tagId) VALUES (1, 2)");
db.exec("INSERT OR IGNORE INTO projectProposalsPathways(projectProposalId, pathwayId) VALUES (1, 1)");
db.exec("INSERT OR IGNORE INTO projectProposalsPathways(projectProposalId, pathwayId) VALUES (2, 1)");
db.exec("INSERT OR IGNORE INTO projectProposalsPathways(projectProposalId, pathwayId) VALUES (3, 1)");
db.exec("INSERT OR IGNORE INTO projectProposalsPathways(projectProposalId, pathwayId) VALUES (4, 2)");

db.exec("INSERT OR IGNORE INTO modules(name, code) VALUES ('Programming 1', 'CMP-4008Y')");
db.exec("INSERT OR IGNORE INTO modules(name, code) VALUES ('Systems Development', 'CMP-4013A')");
db.exec("INSERT OR IGNORE INTO modules(name, code) VALUES ('Web-Based Programming', 'CMP-4011A')");

// class definitions

function getUserById(userId) {
	let stmt = db.prepare("SELECT * FROM users WHERE id = ?");
	return stmt.get(userId);
}

function getAllUsers() {
	let stmt = db.prepare("SELECT * FROM users");
	return stmt.all();
}

function getMarkSchemeById(markSchemeId) {
	let stmt1 = db.prepare("SELECT * FROM markSchemes WHERE id = ?");
	let markScheme = stmt1.get(markSchemeId);

	let stmt2 = db.prepare("SELECT * FROM markSchemesParts WHERE markSchemeId = ?");
	markScheme.parts = stmt2.all(markSchemeId);

	return markScheme;
}

function getAllMarkSchemes() {
	let stmt = db.prepare("SELECT * FROM markSchemes");
	return stmt.all();
}

function getMarkSchemePartById(markSchemePartId) {
	let stmt = db.prepare("SELECT * FROM markSchemeParts WHERE id = ?");
	return stmt.all(markSchemePartId);
}

function getTagById(tagId) {
	let stmt = db.prepare("SELECT * FROM tags WHERE id = ?");
	return stmt.get(tagId);
}

function getCohortById(cohortId) {
	let stmt = db.prepare("SELECT * FROM cohorts WHERE id = ?");
	return stmt.get(cohortId);
}

function getAllCohorts() {
	let stmt = db.prepare("SELECT * FROM cohorts");
	return stmt.all();
}

function getPathwayById(pathwayId) {
	let stmt = db.prepare("SELECT * FROM pathways WHERE id = ?");
	return stmt.get(pathwayId);
}

function getAllPathways() {
	let stmt = db.prepare("SELECT * FROM pathways");
	return stmt.all();
}

function getProjectById(projectId) {
	let stmt = db.prepare("SELECT * FROM projects WHERE id = ?");
	return stmt.get(projectId);
}

function getCohortMembershipByCohortIdAndStudentId(cohortId, studentId) {
	let stmt = db.prepare("SELECT * FROM cohortsStudents WHERE cohortId = ? AND studentId = ?");
	return stmt.get(cohortId, studentId);
}

function getProjectProposalById(projectProposalId) {
	// let stmt1 = db.prepare("SELECT * FROM projectProposals WHERE id = ?");
	// let row1 = stmt1.get(id);

	// let projectProposal = new ProjectProposal(row1.id, row1.title, row1.description, row1.approved, row1.archived, getMarkSchemeById(row1.markSchemeId));

	// let stmt2 = db.prepare("SELECT * FROM projectProposalsSupervisors WHERE projectProposalId = ?");
	// stmt2.all(row1.id).forEach(row => projectProposal.supervisors.push(getUserById(row.supervisorId)));

	// let stmt4 = db.prepare("SELECT * FROM projectProposalsTags WHERE projectProposalId = ?");
	// stmt4.all(row1.id).forEach(row => projectProposal.tags.push(getTagById(row.tagId)));

	// return projectProposal;

	let stmt = db.prepare("SELECT * FROM projectProposals WHERE id = ?");
	return stmt.get(projectProposalId);
}

// web server

let app = express();
let cacheAge = 604800000;

app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(bodyParser.json());
["css", "js", "fonts"].forEach(value => app.use("/" + value, express.static("./" + value, {maxAge: cacheAge})));
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
	users: getAllUsers()
}));

// redirect the user to their own page
app.get("/users/me", (req, res) => res.redirect(req.session.loggedIn ? "/users/" + req.session.user.id : "/"));
app.get("/users/:id", (req, res) => {
	let stmt = db.prepare("SELECT * FROM users INNER JOIN cohortsStudents ON cohortsStudents.studentId = users.id INNER JOIN projects ON cohortsStudents.projectId = projects.id INNER JOIN projectProposals ON projects.projectProposalId = projectProposals.id WHERE users.id = ?");
	try {
		res.render("user", {
			user: getUserById(req.params.id),
			cohorts: []
		});
	} catch(e) {
		res.redirect("/users");
	}
});

/* cohorts */

app.get("/cohorts", (req, res) => res.render("cohorts", {cohorts: getAllCohorts()}));
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
app.get("/cohorts/:cohortId", (req, res) => {
	try {
		let cohortStmt = db.prepare("SELECT * FROM cohorts WHERE id = ?");
		let cohort = cohortStmt.get(req.params.cohortId);

		let cohortStudentsStmt = db.prepare("SELECT cohortsStudents.*, cohortsStudents.studentId, users.name, p1.title AS choice1Title, p2.title AS choice2Title, p3.title AS choice3Title, p4.title AS assignedChoiceTitle FROM cohortsStudents LEFT JOIN users ON cohortsStudents.studentId = users.id LEFT JOIN projectProposals p1 ON cohortsStudents.choice1 = p1.id LEFT JOIN projectProposals p2 ON cohortsStudents.choice2 = p2.id LEFT JOIN projectProposals p3 ON cohortsStudents.choice3 = p3.id LEFT JOIN projectProposals p4 ON cohortsStudents.assignedChoice = p4.id WHERE cohortId = ?");
		let cohortStudents = cohortStudentsStmt.all(req.params.cohortId); 

		res.render("cohort", {
			cohort: cohort,
			cohortStudents: cohortStudents
		});
	} catch(e) {
		res.redirect("/cohorts");
	}
});
app.get("/cohorts/:cohortId/assignprojects", (req, res) => {
	let cohortStudentsStmt = db.prepare("SELECT * FROM cohortsStudents WHERE cohortId = ?");
	let cohortStudents = cohortStudentsStmt.all(req.params.cohortId);

	let projectProposalsStmt = db.prepare("SELECT * FROM projectProposals");
	let projectProposals = projectProposalsStmt.all();

	let supervisorsStmt = db.prepare("SELECT * FROM users WHERE users.isSupervisor = 1");
	let supervisors = supervisorsStmt.all();

	function shuffle(list) {
		for(let i = 0; i < list.length; i++) {
			let r = Math.floor(Math.random() * list.length);
			let temp = list[r];
			list[r] = list[i];
			list[i] = temp;
		}
	}

	shuffle(cohortStudents);

	function projectProposalSupervisorsContains(projectProposalId, supervisorId) {
		let stmt = db.prepare("SELECT * FROM projectProposalsSupervisors WHERE projectProposalId = ? AND supervisorId = ?");
		let row = stmt.get(projectProposalId, supervisorId);
		return !!row;
	}

	function checkConditions() {
		for(let i = 0; i < supervisors.length; i++) {
			let spacesLeft = supervisors[i].maxNumToSupervise;
			for(let j = 0; j < cohortStudents.length; j++) {
				if(cohortStudents.assignedChoice != null && projectProposalSupervisorsContains(cohortStudents.assignedChoice, supervisors[i].id)) {
					spacesLeft--;
					if(spacesLeft < 0)
						return false;
				}
			}
		}

		return true;
	}

	function backtrack(i) {
		if(i >= cohortStudents.length)
			return true;
		if(cohortStudents[i].assignedChoice == null) {
			let choices = [];
			if(cohortStudents[i].choice1 != null)
				choices.push(cohortStudents[i].choice1);
			if(cohortStudents[i].choice2 != null)
				choices.push(cohortStudents[i].choice2);
			if(cohortStudents[i].choice3 != null)
				choices.push(cohortStudents[i].choice3);

			for(let choiceI = 0; choiceI < choices.length; choiceI++) {
				let choice = choices[choiceI];
				cohortStudents[i].assignedChoice = choice;
				if(checkConditions() && backtrack(i + 1))
					return true;
			}

			let projectProposals2 = [];
			for(let j = 0; j < projectProposals.length; j++)
				projectProposals2.push(projectProposals[j]);
			shuffle(projectProposals2);
			for(let choiceI = 0; choiceI < projectProposals2.length; choiceI++) {
				let choice = projectProposals2[choiceI].id;
				cohortStudents[i].assignedChoice = choice;
				if(checkConditions() && backtrack(i + 1))
					return true;
			}

			cohortStudents[i].assignedChoice = null;
			return false;
		} else {
			return backtrack(i + 1);
		}
	}

	let result = backtrack(0);
	if(result) {
		for(let j = 0; j < cohortStudents.length; j++) {
			let stmt = db.prepare("UPDATE cohortsStudents SET assignedChoice = ? WHERE cohortId = ? AND studentId = ?");
			stmt.run(cohortStudents[j].assignedChoice, cohortStudents[j].cohortId, cohortStudents[j].studentId);

			// TODO: verify that this ran successfully
		}
		res.redirect("/cohorts/" + req.params.cohortId);
	} else {
		res.send("hmm. that didnt work. something is very wrong");
	}

	/*
	source vertex
	edge from source to each student (cap: 1, cost: 0)
	edge from student to each pp (cap: 1, cost: dependant)
	edge from pp to supervisor (cap: 1, cost: 0)
	edge from supervisor to sink (cap: dependant, cost: 0)
	sink vertex
	*/
});

app.get("/api/student-search", (req, res) => {
	res.setHeader("Content-Type", "application/json");
	if(!req.session.loggedIn) {
		res.sendStatus(403);
	} else {
		let stmt = db.prepare("SELECT id, name, email FROM users WHERE users.name LIKE '%' || ? || '%' LIMIT 5"); // TODO: check for SQL injection
		res.send(JSON.stringify(stmt.all(req.query.name)));
	}
});
app.get("/api/add-student-to-cohort", (req, res) => {
	res.setHeader("Content-Type", "application/json");
	// TODO: permission check
	if(!req.session.loggedIn) {
		res.sendStatus(403);
	} else {
		let stmt = db.prepare("INSERT OR IGNORE INTO cohortsStudents(cohortId, studentId, choice1, choice2, choice3, doneChoosing, projectId, deferring, pathwayId) VALUES (?, ?, NULL, NULL, NULL, 0, NULL, 0, NULL)"); // TODO: check for SQL injection
		stmt.run(req.query.cohortId, req.query.studentId);
		res.sendStatus(200);
	}
});

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

app.get("/api/tag-search", (req, res) => {
	res.setHeader("Content-Type", "application/json");
	// TODO: permission check here too
	if(!req.session.loggedIn) {
		res.sendStatus(403);
	} else {
		let stmt = db.prepare("SELECT id, name FROM tags where tags.name LIKE '%' || ? || '%' LIMIT 5");
		res.send(JSON.stringify(stmt.all(req.query.name)));
	}
});

app.get("/pathways", (req, res) => res.render("pathways", {
	user: req.session.user,
	pathways: getAllPathways()
}));
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
	if(req.session.user.isStudent) {
		res.redirect(req.url + "/projectproposals");
	} else {
		let pathwayId = req.params.id;
		try {
			let projectProposalsStmt = db.prepare("SELECT projectProposals.*, users.name AS createdByName FROM projectProposalsPathways INNER JOIN projectProposals ON projectProposals.id = projectProposalsPathways.projectProposalId LEFT JOIN users ON projectProposals.createdBy = users.id WHERE projectProposalsPathways.pathwayId = ?");
			let projectProposals = projectProposalsStmt.all(pathwayId);
			
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
			// TODO:
			// let supervisorsStmt = db.prepare("SELECT * FROM supervisorsPathways INNER JOIN users ON supervisorsPathways.supervisorId = users.id");
			
			res.render("pathway", {
				pathway: getPathwayById(pathwayId),
				projectProposals: projectProposals,
				cohorts: cohorts,
				supervisors: supervisors
			});
		} catch(e) {
			console.log(e);
			res.redirect("/pathways");
		}
	}
});

app.get("/pathways/:pathwayId/projectproposals", (req, res) => {
	let pathwayId = req.params.pathwayId;
	try{
		let projectProposalsStmt = db.prepare("SELECT projectProposals.*, users.name AS createdByName FROM projectProposalsPathways INNER JOIN projectProposals ON projectProposals.id = projectProposalsPathways.projectProposalId LEFT JOIN users ON projectProposals.createdBy = users.id WHERE projectProposalsPathways.pathwayId = ?");
		let projectProposals = projectProposalsStmt.all(pathwayId);

		let getCS = db.prepare("SELECT * FROM cohortsStudents WHERE studentId = ?");
		let rowCS = getCS.get(req.session.user.id);

		let choice1 = db.prepare("SELECT projectproposals.*, users.name AS createdByName FROM projectProposalsPathways INNER JOIN projectProposals ON projectProposals.id = projectProposalsPathways.projectProposalId LEFT JOIN users ON projectProposals.createdBy = users.id WHERE projectProposals.id = ?").get(rowCS.choice1); 
		let choice2 = db.prepare("SELECT projectproposals.*, users.name AS createdByName FROM projectProposalsPathways INNER JOIN projectProposals ON projectProposals.id = projectProposalsPathways.projectProposalId LEFT JOIN users ON projectProposals.createdBy = users.id WHERE projectProposals.id = ?").get(rowCS.choice2);
		let choice3 = db.prepare("SELECT projectproposals.*, users.name AS createdByName FROM projectProposalsPathways INNER JOIN projectProposals ON projectProposals.id = projectProposalsPathways.projectProposalId LEFT JOIN users ON projectProposals.createdBy = users.id WHERE projectProposals.id = ?").get(rowCS.choice3);
		let choices = [choice1, choice2, choice3];

		res.render("pathway-projectproposals", {
			pathway: getPathwayById(pathwayId),
			projectProposals: projectProposals,
			choices: choices
		});
	}
	catch(e) {
		console.log(e);
		res.redirect("/pathways");
	}
});

// TODO: this assumes that each student is only in one cohort. need to get the cohort from the req
// TODO: this should return some json rather than use HTTP response codes
app.post("/api/projectSelection/new", (req, res) => {
	let projectId = req.body.projectId;
	
	let getCS = db.prepare("SELECT * FROM cohortsStudents WHERE studentId = ?");
	let cS = getCS.get(req.session.user.id);

	if(cS.choice1 == null) {
		let choice1Stmt = db.prepare("UPDATE OR IGNORE cohortsStudents SET choice1 = ? WHERE studentId = ?");
		choice1Stmt.run(projectId, cS.studentId);
		res.sendStatus(200);
	} else if(cS.choice2 == null) {
		let choice2Stmt = db.prepare("UPDATE OR IGNORE cohortsStudents SET choice2 = ? WHERE studentId = ?");
		choice2Stmt.run(projectId, cS.studentId);
		res.sendStatus(200);
	} else if(cS.choice3 == null) {
		let choice3Stmt = db.prepare("UPDATE OR IGNORE cohortsStudents SET choice3 = ? WHERE studentId = ?");
		choice3Stmt.run(projectId, cS.studentId);
		res.sendStatus(200);
	}
});

// TODO: this removes choices for every cohort for that student
app.post("/api/projectSelection/remove", (req, res) => {
	if (req.body.choiceId == 1) {
		let choiceStmt = db.prepare("UPDATE cohortsStudents SET choice1 = null WHERE studentId = ?");
		choiceStmt.run(req.session.user.id);
		res.sendStatus(200);
	}
	else if (req.body.choiceId == 2) {
		let choiceStmt = db.prepare("UPDATE cohortsStudents SET choice2 = null WHERE studentId = ?");
		choiceStmt.run(req.session.user.id);
		res.sendStatus(200);
	}
	else if (req.body.choiceId == 3) {
		let choiceStmt = db.prepare("UPDATE cohortsStudents SET choice3 = null WHERE studentId = ?");
		choiceStmt.run(req.session.user.id);
		res.sendStatus(200);
	}
});

app.post("/api/projectSelection/swap", (req, res) => {
	if (req.body.fromId == 0)
		from = db.prepare("SELECT choice1 FROM cohortsStudents WHERE studentId = ?").get(req.session.user.id).choice1;
	else if (req.body.fromId == 1)
		from = db.prepare("SELECT choice2 FROM cohortsStudents WHERE studentId = ?").get(req.session.user.id).choice2;
	else
		from = db.prepare("SELECT choice3 FROM cohortsStudents WHERE studentId = ?").get(req.session.user.id).choice3;
	console.log(from);
	if (req.body.toId == 0) {
		to = db.prepare("SELECT choice1 FROM cohortsStudents WHERE studentId = ?").get(req.session.user.id).choice1;
		db.prepare("UPDATE cohortsStudents SET choice1 = ? WHERE studentId = ?").run(from, req.session.user.id);
	}
	else if (req.body.toId == 1) {
		to = db.prepare("SELECT choice2 FROM cohortsStudents WHERE studentId = ?").get(req.session.user.id).choice2;
		db.prepare("UPDATE cohortsStudents SET choice2 = ? WHERE studentId = ?").run(from, req.session.user.id);
	}
	else{
		to = db.prepare("SELECT choice3 FROM cohortsStudents WHERE studentId = ?").get(req.session.user.id).choice3;
		db.prepare("UPDATE cohortsStudents SET choice3 = ? WHERE studentId = ?").run(from, req.session.user.id);
	}
	if (req.body.fromId == 0)
		db.prepare("UPDATE cohortsStudents SET choice1 = ? WHERE studentId = ?").run(to, req.session.user.id);
	else if (req.body.fromId == 1)
		db.prepare("UPDATE cohortsStudents SET choice2 = ? WHERE studentId = ?").run(to, req.session.user.id);
	else
		db.prepare("UPDATE cohortsStudents SET choice3 = ? WHERE studentId = ?").run(to, req.session.user.id);
});

app.get("/projectproposals", (req, res) => {
	let projectProposalsStmt = db.prepare("SELECT projectProposals.*, users.name AS createdByName FROM projectProposals LEFT JOIN users ON projectProposals.createdBy = users.id");
	let unapprovedProjectProposalsStmt = db.prepare("SELECT projectProposals.*, users.name AS createdByName FROM projectProposals LEFT JOIN users ON projectProposals.createdBy = users.id WHERE approved = 0");
	let approvedProjectProposalsStmt = db.prepare("SELECT projectProposals.*, users.name AS createdByName FROM projectProposals LEFT JOIN users ON projectProposals.createdBy = users.id WHERE approved = 1");
	res.render("projectproposals", {
		user: req.session.user,
		projectProposals: projectProposalsStmt.all(),
		unapprovedProjectProposals: unapprovedProjectProposalsStmt.all(),
		approvedProjectProposals: approvedProjectProposalsStmt.all()
	});
});
app.get("/projectproposals/new", (req, res) => {
	res.render("projectproposals-new", {pathways: getAllPathways()});
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

	let tags = req.body.tags.split(",");
	for (let i = 0; i < tags.length; i++){
		let stmt7 = db.prepare("INSERT INTO projectProposalsTags(projectProposalId, tagId) VALUES (?, ?)");
		stmt7.run(projectProposal.id, tags[i]);
	}

	res.send(JSON.stringify(projectProposal.id));
});
app.get("/projectproposals/:id", (req, res) => {
	res.render("projectproposal", {projectProposal: getProjectProposalById(req.params.id)});
});
app.get("/api/projectproposals/:projectProposalId/approve", (req, res) => {
	res.setHeader("Content-Type", "application/json");
	try {
		let stmt = db.prepare("UPDATE projectProposals SET approved = 1 WHERE id = ?");
		stmt.run(req.params.projectProposalId);
		res.send("true");
	} catch(e) {
		res.send("false");
	}
});

app.get("/markschemes", (req, res) => res.render("markschemes", {markschemes: getAllMarkSchemes()}));
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

	res.setHeader("Content-Type", "application/json");
	res.send(JSON.stringify({
		markSchemeId: markSchemeId
	}));
});
app.get("/markschemes/:id", (req, res) => res.render("markscheme", {
	markScheme: getMarkSchemeById(req.params.id)
}));

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

app.get("/tags", (req, res) => {
	let tagsStmt = db.prepare("SELECT * FROM tags");
	res.render("tags", {
		user: req.session.user,
		tags: tagsStmt.all()
	});
});
app.get("/api/tags/:tagId/delete", (req, res) => {
	res.setHeader("Content-Type", "application/json");
	try {
		let stmt = db.prepare("DELETE FROM tags WHERE id = ?");
		stmt.run(req.params.tagId);
		res.send("true");
	} catch(e) {
		console.log(e);
		res.send("false");
	}
});

app.get("/overview", (req, res) => {
	if(req.session.user.isStudent) {
		try {
			let stmt1 = db.prepare("SELECT * FROM cohortsStudents WHERE studentId = ?");
			let row1 = stmt1.get(parseInt(req.session.user.id));
			if (row1.doneChoosing){
				res.render("studentoverview", {
					user: getUserById(req.session.user.id),
					project: getProjectById(row1.projectId)
				});
			}
			else{
				res.redirect("/pathways");
			}
		}
		catch {
			res.redirect("/pathways");
		}
	} else {
		// TODO: fix cohorts
		res.render("overview", {
			user: getUserById(req.session.user.id),
			cohorts: []
		});
	}
});

["github", "overleaf"].forEach(e => {
	app.post("/overview/" + e, (req, res) => {
		if(req.session.user.isStudent){
			let stmt1 = db.prepare("SELECT * FROM cohortsStudents WHERE studentId = ?");
			let row1 = stmt1.get(req.session.user.id);
			let project = getProjectById(row1.projectId);
			let stmt2 = db.prepare("UPDATE OR IGNORE projects SET " + e + "Link = ? WHERE id = ?");
			stmt2.run(req.body[e + "Link"], project.id);
		}
		res.redirect("/overview");
	});
});

app.use("/media", express.static("./media"));

app.listen(8080);
