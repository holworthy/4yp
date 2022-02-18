// imports

let express = require("express");
let expressSession = require("express-session");
let betterSqlite3 = require("better-sqlite3");
let bodyParser = require("body-parser");
let sha256 = require("sha256");
let betterSqlite3SessionStore = require("better-sqlite3-session-store");
let expressFileUpload = require("express-fileupload");
let mime = require("mime-types");

let app = express();
let db = betterSqlite3("database.db");

app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(bodyParser.json());
app.use("/css", express.static("./css"));
app.use("/js", express.static("./js"));
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

db.exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, nickname TEXT, email TEXT UNIQUE, salt TEXT, passwordHash TEXT)");
db.exec("CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER UNIQUE, campusCardNumber TEXT, threeTwoThree TEXT, FOREIGN KEY (userId) REFERENCES users (id))");
db.exec("CREATE TABLE IF NOT EXISTS supervisors (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, maxNumToSupervise INTEGER, FOREIGN KEY (userId) REFERENCES users(id))");
db.exec("CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, FOREIGN KEY (userId) REFERENCES users (id))");
db.exec("CREATE TABLE IF NOT EXISTS hubstaff (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, FOREIGN KEY (userId) REFERENCES users(id))");

db.exec("CREATE TABLE IF NOT EXISTS markSchemes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS markSchemesParts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, weight INTEGER, markSchemeId INTEGER, FOREIGN KEY (markSchemeId) REFERENCES markSchemes(id))");
db.exec("CREATE TABLE IF NOT EXISTS projectProposals (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, description TEXT, approved INTEGER, archived INTEGER, markSchemeId INTEGER, FOREIGN KEY (markSchemeId) REFERENCES markSchemes(id))");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsSupervisors (projectProposalId INTEGER, supervisorId INTEGER, UNIQUE (projectProposalId, supervisorId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id), FOREIGN KEY (supervisorId) REFERENCES supervisors(id))");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsMedia (projectProposalId INTEGER, url TEXT, type TEXT, UNIQUE(projectProposalId, url), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id))");
db.exec("CREATE TABLE IF NOT EXISTS genres (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsGenres (projectProposalId INTEGER, genreId INTEGER, UNIQUE (projectProposalId, genreId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id), FOREIGN KEY (genreId) REFERENCES genres(id))");
db.exec("CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsTags (projectProposalId INTEGER, tagId INTEGER, UNIQUE (projectProposalId, tagId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id), FOREIGN KEY (tagId) REFERENCES tags(id))");

db.exec("CREATE TABLE IF NOT EXISTS cohorts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, archived INTEGER)");
db.exec("CREATE TABLE IF NOT EXISTS pathways (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, projectProposalId INTEGER, FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id))");
db.exec("CREATE TABLE IF NOT EXISTS cohortsStudents (cohortId INTEGER, studentId INTEGER, choice1 INTEGER, choice2 INTEGER, choice3 INTEGER, doneChoosing INTEGER, projectId INTEGER, deferring INTEGER, pathwayId INTEGER, UNIQUE(cohortId, studentId), FOREIGN KEY (cohortId) REFERENCES cohorts(id), FOREIGN KEY (studentId) REFERENCES students(id), FOREIGN KEY (choice1) REFERENCES projectProposals(id), FOREIGN KEY (choice2) REFERENCES projectProposals(id), FOREIGN KEY (choice3) REFERENCES projectProposals(id), FOREIGN KEY (projectId) REFERENCES projects(id), FOREIGN KEY (pathwayId) REFERENCES pathways(id))");

db.exec("INSERT OR IGNORE INTO users(name, nickname, email, salt, passwordHash) VALUES ('Bob Bobson', 'Bob', 'bob@example.com', '00000000', '5470866c4182b753e5d8c095e65628e3f0c31a3645a92270ff04478ee96c2564')");
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

	getProfiles() {
		let supervisor = Supervisor.getByUserId(this.id);
		let hubstaff = HubStaff.getByUserId(this.id);
		let student = Student.getByUserId(this.id);
		let admin = Admin.getByUserId(this.id);

		let profiles = [];
		if(supervisor)
			profiles.push(supervisor);
		if(hubstaff)
			profiles.push(hubstaff);
		if(student)
			profiles.push(student);
		if(admin)
			profiles.push(admin);
		return profiles;
	}
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

	static getByUserId(userId) {
		let stmt = db.prepare("SELECT * FROM supervisors WHERE userId = ?");
		let row = stmt.get(userId);
		return row ? this.getById(row.id) : null;
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

	static getByUserId(userId) {
		let stmt = db.prepare("SELECT * FROM hubstaff WHERE userId = ?");
		let row = stmt.get(userId);
		return row ? this.getById(row.id) : null;
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

	static getByUserId(userId) {
		let stmt = db.prepare("SELECT * FROM students WHERE userId = ?");
		let row = stmt.get(userId);
		return row ? this.getById(row.id) : null;
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

	static getByUserId(userId) {
		let stmt = db.prepare("SELECT * FROM admins WHERE userId = ?");
		let row = stmt.get(userId);
		return row ? this.getById(row.id) : null;
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
			students.push(new CohortStudent(rows[i].cohortId, Student.getById(rows[i].studentId), rows[i].choice1, rows[i].choice2, rows[i].choice3, rows[i].doneChoosing, Project.getById(rows[i].projectId), rows[i].deferring, null));
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
		return row ? new Cohort(row.id, row.projectProposalId) : null;
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


// web server

app.get("/", (req, res) => {
	if(req.session.loggedIn)
		res.redirect("/overview");
	else
		res.redirect("/login");
});

app.get("/uea.png", (req, res) => res.sendFile("uea.png", {root: "."}));

app.get("/about", (req, res) => res.render("about"));

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
			req.session.save();
			res.redirect("/overview");
		} else {
			res.redirect("/login");
		}
	}
});

app.get("/logout", (req, res) => {
	req.session.loggedIn = false;
	req.session.save();
	res.redirect("/");
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
app.get("/cohort/new", (req, res) => {
	res.render("cohort-new");
});
app.post("/cohort/new", (req, res) => {
	let name = req.body.name;
	if(name) {
		try {
			let stmt = db.prepare("INSERT INTO cohorts(name, archived) VALUES (?, 0)");
			stmt.run(name);

			stmt = db.prepare("SELECT * FROM cohorts ORDER BY id DESC LIMIT 1");
			let row = stmt.get();

			res.redirect("/cohort/" + row.id);
		} catch(e) {
			console.log(e);
			res.redirect("/cohort/new"); // TODO: add error message
		}
	} else {
		res.redirect("/cohort/new"); // TODO: add error message
	}
});
app.get("/cohort/archived", (req, res) => res.send("archived cohorts"));
app.get("/cohort/:id", (req, res) => {
	try {
		res.render("cohort", {cohort: Cohort.getById(req.params.id)});
	} catch(e) {
		res.redirect("/cohorts");
	}
});
app.get("/cohort", (req, res) => res.redirect("/cohorts"));
app.get("/cohorts", (req, res) => res.render("cohorts", {cohorts: Cohort.getAll()}));
app.get("/api/student-search", (req, res) => {
	if(!req.session.loggedIn) {
		res.sendStatus(403);
	} else {
		let stmt = db.prepare("SELECT students.id, userId, name, email FROM students INNER JOIN users ON students.userId = users.id WHERE users.name LIKE '%' || ? || '%' LIMIT 5"); // TODO: check for SQL injection
		res.send(JSON.stringify(stmt.all(req.query.name)));
	}
});
app.get("/api/add-student-to-cohort", (req, res) => {
	// TODO: permission check
	if(!req.session.loggedIn) {
		res.sendStatus(403);
	} else {
		let stmt = db.prepare("INSERT OR IGNORE INTO cohortsStudents(cohortId, studentId, choice1, choice2, choice3, doneChoosing, projectId, deferring, pathwayId) VALUES (?, ?, NULL, NULL, NULL, 0, NULL, 0, NULL)"); // TODO: check for SQL injection
		stmt.run(req.query.cohortId, req.query.studentId);
		res.sendStatus(200);
	}
});

app.get("/myprojectproposals", (req, res) => res.send("myprojectproposals"));
app.get("/projectproposal/new", (req, res) => res.render("newProjectProposal"));

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
	try {
		res.render("pathway", {pathway: Pathway.getById(req.params.id)});
	} catch(e) {
		res.redirect("/pathways");
	}
});

app.get("/markscheme", (req, res) => res.render("markschemes", {markschemes: MarkScheme.getAll()}));
app.get("/markscheme/new", (req, res) => res.render("markschemes-new"));
app.post("/api/markscheme/new", (req, res) => {
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
app.get("/markscheme/:id", (req, res) => {
	let markScheme = MarkScheme.getById(req.params.id);
	res.render("markscheme", {markScheme: markScheme});
});

app.get("/overview", (req, res) => {
	res.render("overview", {user: User.getById(req.session.userId)});
});


app.use("/media", express.static("./media"));

app.listen(8080);
