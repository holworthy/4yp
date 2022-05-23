// imports
let express = require("express");
let expressSession = require("express-session");
let betterSqlite3 = require("better-sqlite3");
let bodyParser = require("body-parser");
let sha256 = require("sha256");
let betterSqlite3SessionStore = require("better-sqlite3-session-store");
let expressFileUpload = require("express-fileupload");
let mime = require("mime-types");
let compression = require("compression");
let minify = require("express-minify");

// database
let db = betterSqlite3("database.db");

// table definitions
// TODO: set all foreign keys on delete
db.exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, nickname TEXT, email TEXT UNIQUE, salt TEXT, passwordHash TEXT, campusCardNumber TEXT UNIQUE DEFAULT NULL, threeTwoThree TEXT UNIQUE DEFAULT NULL, maxNumToSupervise INTEGER DEFAULT 0, isAdmin INTEGER DEFAULT 0, isStudent INTEGER DEFAULT 0, isSupervisor INTEGER DEFAULT 0, isHubstaff INTEGER DEFAULT 0)");

db.exec("CREATE TABLE IF NOT EXISTS markschemes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS markschemesParts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, weight INTEGER, markschemeId INTEGER, FOREIGN KEY (markschemeId) REFERENCES markschemes(id) ON DELETE CASCADE)");
db.exec("CREATE TABLE IF NOT EXISTS marksheets (id INTEGER PRIMARY KEY AUTOINCREMENT, markschemeId INTEGER, FOREIGN KEY (markschemeId) REFERENCES markschemes(id) ON DELETE CASCADE)");
db.exec("CREATE TABLE IF NOT EXISTS marksheetsParts(id INTEGER PRIMARY KEY AUTOINCREMENT, marksheetId INTEGER, markschemePartId INTEGER, mark REAL, feedback TEXT, UNIQUE(marksheetId, markschemePartId), FOREIGN KEY (marksheetId) REFERENCES marksheets(id) ON DELETE CASCADE, FOREIGN KEY (markschemePartId) REFERENCES markschemesParts(id) ON DELETE CASCADE)");

db.exec("CREATE TABLE IF NOT EXISTS projectProposals (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT UNIQUE, description TEXT, approved INTEGER DEFAULT 0, archived INTEGER DEFAULT 0, markschemeId INTEGER DEFAULT NULL, createdBy INTEGER, FOREIGN KEY (markschemeId) REFERENCES markschemes(id) ON DELETE RESTRICT, FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET DEFAULT)");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsSupervisors (projectProposalId INTEGER, supervisorId INTEGER, UNIQUE (projectProposalId, supervisorId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id) ON DELETE CASCADE, FOREIGN KEY (supervisorId) REFERENCES users(id) ON DELETE CASCADE)");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsMedia (projectProposalId INTEGER, url TEXT, type TEXT, UNIQUE(projectProposalId, url), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id) ON DELETE CASCADE)");
db.exec("CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsTags (projectProposalId INTEGER, tagId INTEGER, UNIQUE (projectProposalId, tagId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id) ON DELETE CASCADE, FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE)");

db.exec("CREATE TABLE IF NOT EXISTS cohorts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, archived INTEGER, createdOn DATETIME DEFAULT (DATETIME()))");
db.exec("CREATE TABLE IF NOT EXISTS pathways (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS cohortsPathways (cohortId INTEGER, pathwayId INTEGER, FOREIGN KEY (cohortId) REFERENCES cohorts(id), FOREIGN KEY (pathwayId) REFERENCES pathways(id))");
db.exec("CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, projectProposalId INTEGER, githubLink TEXT, overleafLink TEXT, cohortId INTEGER, pathwayId INTEGER, FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id) ON DELETE RESTRICT, FOREIGN KEY (cohortId) REFERENCES cohorts(id), FOREIGN KEY (pathwayId) REFERENCES pathways(id))");
db.exec("CREATE TABLE IF NOT EXISTS projectsStudents (projectId INTEGER, studentId INTEGER, UNIQUE(projectId, studentId), FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE RESTRICT)");
db.exec("CREATE TABLE IF NOT EXISTS projectsSupervisors (projectId INTEGER, supervisorId INTEGER, marksheetId INTEGER, UNIQUE(projectId, supervisorId), FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (supervisorId) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (marksheetId) REFERENCES marksheets(id) ON DELETE RESTRICT)");
db.exec("CREATE TABLE IF NOT EXISTS projectsModerators (projectId INTEGER, moderatorId INTEGER, marksheetId INTEGER, UNIQUE(projectId, moderatorId), FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE RESTRICT, FOREIGN KEY (moderatorId) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (marksheetId) REFERENCES marksheets(id) ON DELETE RESTRICT)");

// TODO: pathway should not be default
db.exec("CREATE TABLE IF NOT EXISTS cohortsMemberships (cohortId INTEGER, studentId INTEGER, choice1 INTEGER, choice2 INTEGER, choice3 INTEGER, assignedChoice INTEGER DEFAULT NULL, doneChoosing INTEGER, projectId INTEGER, deferring INTEGER, pathwayId INTEGER DEFAULT 1, UNIQUE(cohortId, studentId), FOREIGN KEY (cohortId) REFERENCES cohorts(id) ON DELETE RESTRICT, FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE RESTRICT, FOREIGN KEY (choice1) REFERENCES projectProposals(id) ON DELETE RESTRICT, FOREIGN KEY (choice2) REFERENCES projectProposals(id) ON DELETE RESTRICT, FOREIGN KEY (choice3) REFERENCES projectProposals(id) ON DELETE RESTRICT, FOREIGN KEY (assignedChoice) REFERENCES projectProposals(id) ON DELETE RESTRICT, FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET DEFAULT, FOREIGN KEY (pathwayId) REFERENCES pathways(id) ON DELETE RESTRICT)");

db.exec("CREATE TABLE IF NOT EXISTS modules (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, code TEXT UNIQUE)");
db.exec("CREATE TABLE IF NOT EXISTS prerequisites (projectProposalId INTEGER, moduleId INTEGER, UNIQUE(projectProposalId, moduleId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id) ON DELETE CASCADE, FOREIGN KEY (moduleId) REFERENCES modules(id) ON DELETE CASCADE)");
db.exec("CREATE TABLE IF NOT EXISTS studentsModules (studentId INTEGER, moduleId INTEGER, UNIQUE(studentId, moduleId), FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (moduleId) REFERENCES modules(id) ON DELETE CASCADE)");

db.exec("CREATE TABLE IF NOT EXISTS pathwaysModerators (pathwayId INTEGER, moderatorId INTEGER, UNIQUE(pathwayId, moderatorId), FOREIGN KEY (moderatorId) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (pathwayId) REFERENCES pathways(id) ON DELETE CASCADE)");
db.exec("CREATE TABLE IF NOT EXISTS projectProposalsPathways (projectProposalId INTEGER, pathwayId INTEGER, UNIQUE(projectProposalId, pathwayId), FOREIGN KEY (projectProposalId) REFERENCES projectProposals(id) ON DELETE CASCADE, FOREIGN KEY (pathwayId) REFERENCES pathways(id) ON DELETE CASCADE)");

// TODO: does name need to be unique?
db.exec("CREATE TABLE IF NOT EXISTS deliverables (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, type INTEGER)");
db.exec("CREATE TABLE IF NOT EXISTS submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, deliverableId INTEGER, projectId INTEGER, studentId INTEGER, file TEXT, createdOn DATETIME DEFAULT (DATETIME()), agreedMarksId INTEGER, FOREIGN KEY (deliverableId) REFERENCES deliverables(id), FOREIGN KEY (projectId) REFERENCES projects(id), FOREIGN KEY (studentId) REFERENCES users(id), FOREIGN KEY (agreedMarksId) REFERENCES agreedMarks(id))");
db.exec("CREATE TABLE IF NOT EXISTS submissionsFiles (id INTEGER PRIMARY KEY AUTOINCREMENT, submissionId INTEGER, url TEXT, name TEXT, UNIQUE(submissionId, url), FOREIGN KEY (submissionId) REFERENCES submissions(id))");
db.exec("CREATE TABLE IF NOT EXISTS marking (id INTEGER PRIMARY KEY AUTOINCREMENT, submissionId INTEGER, marksheetId INTEGER, markerId INTEGER, UNIQUE(submissionId, markerId), FOREIGN KEY (submissionId) REFERENCES submissions(id), FOREIGN KEY (marksheetId) REFERENCES marksheets(id), FOREIGN KEY (markerId) REFERENCES users(id))");
db.exec("CREATE TABLE IF NOT EXISTS deliverablesMemberships (deliverableId INTEGER, cohortId INTEGER, pathwayId INTEGER, dueDate TEXT, weighting INTEGER, markschemeId INTEGER, UNIQUE(deliverableId, cohortId, pathwayId), FOREIGN KEY (deliverableId) REFERENCES deliverables(id), FOREIGN KEY (cohortId) REFERENCES cohorts(id), FOREIGN KEY (pathwayId) REFERENCES pathways(id), FOREIGN KEY (markschemeId) REFERENCES markschemes(id))");

db.exec("CREATE TABLE IF NOT EXISTS agreedMarks (id INTEGER PRIMARY KEY AUTOINCREMENT, submissionId INTEGER, mark REAL, total INTEGER, FOREIGN KEY (submissionId) REFERENCES submissions(id))");
db.exec("CREATE TABLE IF NOT EXISTS agreedMarksMemberships (agreedMarkId INTEGER, markingId INTEGER, FOREIGN KEY (agreedMarkId) REFERENCES agreedMarks(id), FOREIGN KEY (markingId) REFERENCES marking(id))");

db.exec("CREATE VIEW IF NOT EXISTS projectsFilled AS SELECT projects.*, projectProposals.title AS projectProposalTitle, projectProposals.description AS projectProposalDescription, projectProposals.markSchemeId AS projectProposalMarkschemeId, cohorts.name AS cohortName, cohorts.archived AS cohortArchived FROM projects LEFT JOIN projectProposals ON projects.projectProposalId = projectProposals.id LEFT JOIN cohorts ON projects.cohortId = cohorts.id;");
db.exec("CREATE VIEW IF NOT EXISTS cohortsMembershipsFilled AS SELECT cohorts.name AS cohortName, cohorts.archived AS cohortArchived, u0.name AS studentName, pp1.title AS choice1Title, pp1.id AS choice1CreatedBy, u1.name AS choice1CreatedByName, pp2.title AS choice2Title, pp2.id AS choice2CreatedBy, u2.name AS choice2CreatedByName, pp3.title AS choice3Title, pp3.id AS choice3CreatedBy, u3.name AS choice3CreatedByName, pp4.title AS assignedChoiceTitle, pp4.id AS assignedChoiceCreatedBy, u4.name AS assignedChoiceCreatedByName, pathways.name AS pathwayName, cohortsMemberships.* FROM cohortsMemberships LEFT JOIN cohorts ON cohortsMemberships.cohortId = cohorts.id LEFT JOIN users u0 ON cohortsMemberships.studentId = u0.id LEFT JOIN projectproposals pp1 ON cohortsMemberships.choice1 = pp1.id LEFT JOIN users u1 ON choice1createdBy = u1.id LEFT JOIN projectproposals pp2 ON cohortsMemberships.choice2 = pp2.id LEFT JOIN users u2 ON choice2createdBy = u2.id LEFT JOIN projectproposals pp3 ON cohortsMemberships.choice3 = pp3.id LEFT JOIN users u3 ON choice3createdBy = u3.id LEFT JOIN projectproposals pp4 ON cohortsMemberships.assignedChoice = pp4.id LEFT JOIN users u4 ON assignedChoiceCreatedBy = u4.id LEFT JOIN pathways ON cohortsMemberships.pathwayId = pathways.id;");
db.exec("CREATE VIEW IF NOT EXISTS projectsStudentsFilled AS SELECT projects.projectProposalId AS projectProjectProposalId, projects.githubLink AS projectGithubLink, projects.overleafLink AS projectOverleafLink, projects.cohortId AS projectCohortId, users.name AS studentName, users.nickname AS studentNickname, users.email AS studentEmail, users.salt AS studentSalt, users.passwordHash AS studentPasswordHash, users.campusCardNumber AS studentCampusCardNumber, users.threeTwoThree AS studentThreeTwoThree, users.maxNumToSupervise AS studentMaxNumToSupervise, users.isAdmin AS studentIsAdmin, users.isStudent AS studentIsStudent, users.isSupervisor AS studentIsSupervisor, users.isHubstaff AS studentIsHubstaff, projectsStudents.* FROM projectsStudents LEFT JOIN projects ON projectsStudents.projectId = projects.id LEFT JOIN users ON projectsStudents.studentId = users.id;");
db.exec("CREATE VIEW IF NOT EXISTS markingFilled AS SELECT submissions.deliverableId AS submissionDeliverableId, submissions.projectId AS submissionProjectId, submissions.studentId AS submissionStudentId, submissions.file AS submissionFile, submissions.createdOn AS submissionCreatedOn, marksheets.markschemeId AS marksheetMarkschemeId, users.name AS markerName, users.nickname AS markerNickname, users.email AS markerEmail, users.salt AS markerSalt, users.passwordHash AS markerPasswordHash, users.campusCardNumber AS markerCampusCardNumber, users.threeTwoThree AS markerThreeTwoThree, users.maxNumToSupervise AS markerMaxNumToSupervise, users.isAdmin AS markerIsAdmin, users.isStudent AS markerIsStudent, users.isSupervisor AS markerIsSupervisor, users.isHubstaff AS markerIsHubstaff, marking.* FROM marking LEFT JOIN submissions ON marking.submissionId = submissions.id LEFT JOIN marksheets ON marking.marksheetId = marksheets.id LEFT JOIN users ON marking.markerId = users.id;");
db.exec("CREATE VIEW IF NOT EXISTS marksheetsFilled AS SELECT markschemes.name AS markschemeName, SUM(mark) AS totalMark, SUM(weight) AS totalWeight, marksheets.* FROM marksheets LEFT JOIN markschemes ON marksheets.markschemeId = markschemes.id LEFT JOIN marksheetsParts ON marksheets.id = marksheetsParts.marksheetId LEFT JOIN markschemesParts ON markschemesParts.id = marksheetsParts.markschemePartId GROUP BY marksheets.id");
db.exec("CREATE VIEW IF NOT EXISTS markschemesFilled AS SELECT markschemes.*, SUM(weight) AS totalWeight FROM markschemes LEFT JOIN markschemesParts ON markschemesParts.markschemeId = markschemes.id GROUP BY markschemes.id");

db.exec("CREATE TRIGGER IF NOT EXISTS pathwayCreated AFTER INSERT ON pathways BEGIN INSERT INTO pathwaysModerators SELECT NEW.id AS pathwayId, users.id AS moderatorId FROM users WHERE users.isSupervisor = 1; END");

db.exec("INSERT OR IGNORE INTO cohorts(name, archived) VALUES ('Cohort 2021/2022', 0)");

db.exec("INSERT OR IGNORE INTO users(name, nickname, email, salt, passwordHash, isAdmin) VALUES ('Amy Admin', 'Amy', 'amy@example.com', '00000000', '5470866c4182b753e5d8c095e65628e3f0c31a3645a92270ff04478ee96c2564', 1)");
db.exec("INSERT OR IGNORE INTO users(name, nickname, email, salt, passwordHash, campusCardNumber, threeTwoThree, isStudent) VALUES ('Sammy Student', 'Sammy', 'sammy@example.com', '00000000', '5470866c4182b753e5d8c095e65628e3f0c31a3645a92270ff04478ee96c2564', '100000000', 'abc12xyz', 1)");
db.exec("INSERT OR IGNORE INTO users(name, nickname, email, salt, passwordHash, maxNumToSupervise, isSupervisor) VALUES ('Simon Supervisor', 'Simon', 'simon@example.com', '00000000', '5470866c4182b753e5d8c095e65628e3f0c31a3645a92270ff04478ee96c2564', 5, 1)");
db.exec("INSERT OR IGNORE INTO users(name, nickname, email, salt, passwordHash, isHubstaff) VALUES ('Helen Hubstaff', 'Helen', 'helen@example.com', '00000000', '5470866c4182b753e5d8c095e65628e3f0c31a3645a92270ff04478ee96c2564', 1)");
db.exec("INSERT OR IGNORE INTO users(name, nickname, email, salt, passwordHash, campusCardNumber, threeTwoThree, isStudent) VALUES ('a student', 'student1', 'student@example.com', '00000000', '5470866c4182b753e5d8c095e65628e3f0c31a3645a92270ff04478ee96c2564', '100255555', 'abc123xz', 1)");
db.exec("INSERT OR IGNORE INTO users(name, nickname, email, salt, passwordHash, maxNumToSupervise, isSupervisor) VALUES ('Sarah Supervisor', 'Sarah', 'sarah@example.com', '00000000', '5470866c4182b753e5d8c095e65628e3f0c31a3645a92270ff04478ee96c2564', 5, 1)");

db.exec("INSERT OR IGNORE INTO pathways(name) VALUES ('Computer Science')");
db.exec("INSERT OR IGNORE INTO pathways(name) VALUES ('Business')");
db.exec("INSERT OR IGNORE INTO pathways(name) VALUES ('Stats')");

db.exec("INSERT OR IGNORE INTO markschemes(name) VALUES ('Mark Scheme 1')");
db.exec("INSERT OR IGNORE INTO markschemesParts(name, weight, markschemeId) VALUES ('Amazingness', 100.0, 1)");

db.exec("INSERT OR IGNORE INTO projectProposals(title, description, approved, archived, markschemeId) VALUES ('Example Project1', 'Description here', 1, 0, 1)");
db.exec("INSERT OR IGNORE INTO projectProposals(title, description, approved, archived, markschemeId) VALUES ('Example Project2', 'Description here', 1, 0, 1)");
db.exec("INSERT OR IGNORE INTO projectProposals(title, description, approved, archived, markschemeId) VALUES ('Example Project3', 'Description here', 1, 0, 1)");

db.exec("INSERT OR IGNORE INTO tags(name) VALUES ('Tag 1')");
db.exec("INSERT OR IGNORE INTO tags(name) VALUES ('Tag 2')");
db.exec("INSERT OR IGNORE INTO projectProposals(title, description, approved, archived, markschemeId, createdBy) VALUES ('Project Proposal 1', 'Project Proposal 1 Description', 1, 0, 1, 3)");
db.exec("INSERT OR IGNORE INTO projectProposals(title, description, approved, archived, markschemeId, createdBy) VALUES ('Project Proposal 2', 'Project Proposal 2 Description', 1, 0, 1, 3)");
db.exec("INSERT OR IGNORE INTO projectProposalsSupervisors(projectProposalId, supervisorId) VALUES (1, 3)");
db.exec("INSERT OR IGNORE INTO projectProposalsTags(projectProposalId, tagId) VALUES (1, 1)");
db.exec("INSERT OR IGNORE INTO projectProposalsTags(projectProposalId, tagId) VALUES (1, 2)");
db.exec("INSERT OR IGNORE INTO projectProposalsPathways(projectProposalId, pathwayId) VALUES (1, 1)");
db.exec("INSERT OR IGNORE INTO projectProposalsPathways(projectProposalId, pathwayId) VALUES (2, 1)");
db.exec("INSERT OR IGNORE INTO projectProposalsPathways(projectProposalId, pathwayId) VALUES (3, 1)");
db.exec("INSERT OR IGNORE INTO projectProposalsPathways(projectProposalId, pathwayId) VALUES (4, 2)");

db.exec("INSERT OR IGNORE INTO modules(name, code) VALUES ('Programming 1', 'CMP-4008Y')");
db.exec("INSERT OR IGNORE INTO modules(name, code) VALUES ('Systems Development', 'CMP-4013A')");
db.exec("INSERT OR IGNORE INTO modules(name, code) VALUES ('Web-Based Programming', 'CMP-4011A')");

db.exec("INSERT OR IGNORE INTO deliverables(name) VALUES ('Progress and Engagement Report'), ('Poster'), ('Final Report'), ('Code')");
db.exec("INSERT OR IGNORE INTO deliverablesMemberships VALUES (1, 1, 1, '2022-05-20', 50, 1)");
db.exec("INSERT OR IGNORE INTO deliverablesMemberships VALUES (3, 1, 1, '2022-05-20', 50, 1)");

// function definitions
function getUserById(userId) {
	let stmt = db.prepare("SELECT * FROM users WHERE id = ?");
	return stmt.get(userId);
}

function getAllUsers() {
	let stmt = db.prepare("SELECT * FROM users");
	return stmt.all();
}

function getMarkSchemeById(markschemeId) {
	let stmt1 = db.prepare("SELECT * FROM markschemesFilled WHERE id = ?");
	let markscheme = stmt1.get(markschemeId);

	let stmt2 = db.prepare("SELECT * FROM markschemesParts WHERE markschemeId = ?");
	markscheme.parts = stmt2.all(markschemeId);

	return markscheme;
}

function getAllMarkSchemes() {
	let stmt = db.prepare("SELECT * FROM markschemes");
	return stmt.all();
}

function getMarkSchemePartById(markschemePartId) {
	let stmt = db.prepare("SELECT * FROM markschemeParts WHERE id = ?");
	return stmt.all(markschemePartId);
}

function getMarkschemePartsByMarkshemeId(markschemeId) {
	let stmt = db.prepare("SELECT * FROM markschemesParts WHERE markschemeId = ?");
	return stmt.all(markschemeId);
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

function getCohortsAndCohortsMembershipByStudentId(studentId) {
	let cohortsStmt = db.prepare("SELECT * FROM cohorts INNER JOIN cohortsMemberships ON cohorts.id = cohortsMemberships.cohortId WHERE cohortsMemberships.studentId = ?");
	return cohortsStmt.all(studentId);
}

function getPathwayById(pathwayId) {
	let stmt = db.prepare("SELECT * FROM pathways WHERE id = ?");
	return stmt.get(pathwayId);
}

function getAllPathways() {
	let stmt = db.prepare("SELECT * FROM pathways");
	return stmt.all();
}

function getAllCohortPathways(cohortId) {
	let stmt = db.prepare("SELECT * FROM pathways WHERE id IN (SELECT pathwayId FROM cohortsPathways WHERE cohortId = ?)");
	return stmt.all(cohortId);
}

function getProjectById(projectId) {
	let stmt = db.prepare("SELECT * FROM projectsFilled WHERE id = ?");
	return stmt.get(projectId);
}

function getCohortMembershipByCohortIdAndStudentId(cohortId, studentId) {
	let stmt = db.prepare("SELECT * FROM cohortsMembershipsFilled WHERE cohortId = ? AND studentId = ?");
	return stmt.get(cohortId, studentId);
}

function getProjectProposalById(projectProposalId) {
	let stmt = db.prepare("SELECT projectproposals.*, users.name AS createdByName FROM projectProposalsPathways INNER JOIN projectProposals ON projectProposals.id = projectProposalsPathways.projectProposalId LEFT JOIN users ON projectProposals.createdBy = users.id WHERE projectProposals.id = ?");
	return stmt.get(projectProposalId);
}

function getDeliverableById(deliverableId) {
	let stmt = db.prepare("SELECT * FROM deliverables WHERE id = ?");
	return stmt.get(deliverableId);
}

function getProjectProposalsByPathwayId(pathwayId) {
	let stmt = db.prepare("SELECT projectProposals.*, users.name AS createdByName FROM projectProposalsPathways LEFT JOIN projectProposals ON projectProposals.id = projectProposalsPathways.projectProposalId LEFT JOIN users ON projectProposals.createdBy = users.id WHERE projectProposalsPathways.pathwayId = ?");
	return stmt.all(pathwayId);
}

function getProjectsBySupervisorId(supervisorId) {
	let stmt = db.prepare("SELECT projectsFilled.* FROM projectsSupervisors LEFT JOIN projectsFilled ON projectsSupervisors.projectId = projectsFilled.id WHERE supervisorId = ?");
	return stmt.all(supervisorId);
}

function getAllProjects() {
	let stmt = db.prepare("SELECT * FROM projects");
	return stmt.all();
}

function getSubmissionsByProjectIdAndStudentId(projectId, studentId) {
	let stmt = db.prepare("SELECT * FROM submissions WHERE projectId = ? AND studentId = ?");
	return stmt.all(projectId, studentId);
}

function getSubmissionsByDeliverableIdAndProjectIdAndStudentId(deliverableId, projectId, studentId) {
	let stmt = db.prepare("SELECT * FROM submissions WHERE deliverableId = ? AND projectId = ? AND studentId = ?");
	return stmt.all(deliverableId, projectId, studentId);
}

function getSubmissionFilesBySubmissionId(submissionId) {
	let stmt = db.prepare("SELECT * FROM submissionsFiles WHERE submissionId = ?");
	return stmt.all(submissionId);
}

function getSubmissionsByProjectId(projectId) {
	let stmt = db.prepare("SELECT submissions.*, users.name AS studentName FROM submissions LEFT JOIN users ON submissions.studentId = users.id WHERE projectId = ?");
	return stmt.all(projectId);
}

function getSubmissionById(submissionId) {
	let stmt = db.prepare("SELECT projectsFilled.*, deliverables.name AS deliverableName, users.name AS studentName, submissions.* FROM submissions LEFT JOIN projectsFilled ON submissions.projectId = projectsFilled.id LEFT JOIN deliverables ON submissions.deliverableId = deliverables.id LEFT JOIN users ON submissions.studentId = users.id WHERE submissions.id = ?");
	return stmt.get(submissionId);
}

function getDeliverablesMembershipsByDeliverableId(deliverableId) {
	let stmt = db.prepare("SELECT cohorts.name AS cohortName, pathways.name AS pathwayName, deliverablesMemberships.* FROM deliverablesMemberships LEFT JOIN cohorts ON deliverablesMemberships.cohortId = cohorts.id LEFT JOIN pathways ON deliverablesMemberships.pathwayId = pathways.id WHERE deliverableId = ?");
	return stmt.all(deliverableId);
}

function getDeliverablesMembershipByDeliverableIdAndCohortIdAndPathwayId(deliverableId, cohortId, pathwayId) {
	let stmt = db.prepare("SELECT * FROM deliverablesMemberships WHERE deliverableId = ? AND cohortId = ? AND pathwayId = ?");
	return stmt.get(deliverableId, cohortId, pathwayId);
}

function getMarksheetById(marksheetId) {
	let stmt = db.prepare("SELECT * FROM marksheetsFilled WHERE id = ?");
	return stmt.get(marksheetId);
}

function getMarksheetPartsByMarksheetId(marksheetId) {
	let stmt = db.prepare("SELECT markschemesParts.name AS markschemePartName, markschemesParts.weight AS markschemePartWeight, marksheetsParts.* FROM marksheetsParts LEFT JOIN markschemesParts ON marksheetsParts.markschemePartId = markschemesParts.id WHERE marksheetId = ?");
	return stmt.all(marksheetId);
}

// web server
let app = express();
let cacheAge = 604800000;

// express middlewares
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(compression({threshold: 0}));
app.use(minify());
app.use("/css", express.static("css", {maxAge: cacheAge}));
app.use("/js", express.static("js", {maxAge: cacheAge}));
app.use("/fonts", express.static("fonts", {maxAge: cacheAge}));
app.use("/img", express.static("img", {maxAge: cacheAge}));
// TODO: decide if we want to cache these
app.use("/media", express.static("./media"));
app.use("/uploads", express.static("./uploads"));
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

app.use("/api/*", (req, res, next) => req.session.loggedIn ? next() : res.json(false));

// users must be logged in to view any page defined below this
app.use((req, res, next) => {
	if(req.session.loggedIn) {
		// once the user is logged in we can make user available to all the views
		res.locals.user = req.session.user;
		next();
	} else {
		res.redirect("/");
	}
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
	try {
		res.render("user", {
			user: getUserById(req.params.id),
			cohorts: getCohortsAndCohortsMembershipByStudentId(req.params.id)
		});
	} catch(e) {
		res.redirect("/users");
	}
});

/* cohorts */

app.get("/cohorts", (req, res) => {
	let stmt = db.prepare("SELECT *, COUNT(cohortsMemberships.cohortId) AS numStudents FROM cohorts LEFT JOIN cohortsMemberships ON cohorts.id = cohortsMemberships.cohortId GROUP BY cohorts.id");
	res.render("cohorts", {
		cohorts: stmt.all()
	})
});

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

app.post("/api/add-pathway-cohort", (req, res) => {
	try {
		db.prepare("INSERT INTO cohortsPathways(cohortId, pathwayId) VALUES (?, ?)").run(req.query.cohortId, req.body.pathwayId);
		res.json(true);
	} catch {
		res.json(false);
	}
});

app.post("/api/remove-pathway-cohort", (req, res) => {
	try {
		db.prepare("DELETE FROM cohortsPathways WHERE cohortId = ? AND pathwayId = ?").run(req.query.cohortId, req.body.pathwayId);
		res.json(true);
	} catch {
		res.json(false);
	}
});

app.get("/cohorts/:cohortId/students/:studentId", (req,res) => {
	let cohortId = req.params.cohortId;
	let studentId = req.params.studentId;

	let membership = getCohortMembershipByCohortIdAndStudentId(cohortId, studentId);
	if (req.session.user.isAdmin && membership){
		res.render("admin-cohort-pathways", {
			studentId: studentId,
			cohortId: cohortId,
			pathways: getAllCohortPathways(cohortId)
		});
	} else {
		res.send(403);
	}
});

app.get("/cohorts/:cohortId/students/:studentId/pathways/:pathwayId", (req, res) => {
	let cohortId = req.params.cohortId;
	let studentId = req.params.studentId;
	let pathwayId = req.params.pathwayId;

	let membership = getCohortMembershipByCohortIdAndStudentId(cohortId, studentId);
	if (req.session.user.isAdmin && membership){
		res.render("admin-pathway-projectproposals", {
			student: getUserById(studentId),
			pathway: getPathwayById(pathwayId),
			projectProposals: getProjectProposalsByPathwayId(pathwayId)
		});
	} else {
		res.send(403);
	}
});

app.post("/api/assign-project-student", (req, res) => {
	let cohortId = req.body.cohortId;
	let studentId = req.body.studentId

	let membership = getCohortMembershipByCohortIdAndStudentId(cohortId, studentId);
	if (req.session.user.isAdmin && membership) {
		db.prepare("UPDATE cohortsMemberships SET assignedChoice = ?, pathwayId = ? WHERE cohortId = ? AND studentId = ?").run(req.body.projectId, req.body.pathwayId, cohortId, studentId);
		res.json(true);
	} else {
		res.sendStatus(403);
	}
});

// TODO: update student view of this page
app.get("/cohorts/:cohortId", (req, res) => {
	let cohortId = req.params.cohortId;

	let membership = getCohortMembershipByCohortIdAndStudentId(cohortId, req.session.user.id);
	if(!membership && req.session.user.isStudent) {
		res.redirect("/cohorts");
	} else {
		if(membership && membership.projectId) {
			res.redirect("/projects/" + membership.projectId);
		} else {
			try {
				let cohortStmt = db.prepare("SELECT * FROM cohorts WHERE id = ?");
				let cohort = cohortStmt.get(req.params.cohortId);
				
				let cohortStudentsStmt = db.prepare("SELECT cohortsMemberships.*, cohortsMemberships.studentId, pathways.name AS pathwayName, users.name, p1.title AS choice1Title, p2.title AS choice2Title, p3.title AS choice3Title, p4.title AS assignedChoiceTitle, CASE WHEN numStudents IS NULL THEN 0 ELSE numStudents END AS numStudents FROM cohortsMemberships LEFT JOIN users ON cohortsMemberships.studentId = users.id LEFT JOIN projectProposals p1 ON cohortsMemberships.choice1 = p1.id LEFT JOIN projectProposals p2 ON cohortsMemberships.choice2 = p2.id LEFT JOIN projectProposals p3 ON cohortsMemberships.choice3 = p3.id LEFT JOIN projectProposals p4 ON cohortsMemberships.assignedChoice = p4.id LEFT JOIN projects ON cohortsMemberships.projectId = projects.id LEFT JOIN pathways ON cohortsMemberships.pathwayId = pathways.id LEFT JOIN (SELECT projectsStudents.projectId, COUNT(projectsStudents.projectId) AS numStudents FROM projectsStudents GROUP BY projectsStudents.projectId) AS counts ON projects.id = counts.projectId WHERE cohortsMemberships.cohortId = ?");
				let cohortStudents = cohortStudentsStmt.all(req.params.cohortId);
				console.log(cohortStudents[0]);
				
				let deliverables = db.prepare("SELECT deliverablesMemberships.*, deliverables.name AS deliverableName, pathways.name AS pathwayName FROM deliverablesMemberships LEFT JOIN  deliverables ON deliverablesMemberships.deliverableId = deliverables.id LEFT JOIN pathways ON deliverablesMemberships.pathwayId = pathways.id WHERE deliverablesMemberships.cohortId = ?").all(req.params.cohortId);
				
				let pathwaysCohort = getAllCohortPathways(req.params.cohortId);
				let pathways = db.prepare("SELECT * FROM pathways WHERE id NOT IN (SELECT pathwayId FROM cohortsPathways WHERE cohortId = ?)").all(req.params.cohortId);

				let pathwaysCheck = pathwaysCohort.length;
				for (let i = 0; i < pathwaysCohort.length; i++){
					for (let j = 0; j < deliverables.length; j++){
						if (deliverables[j].pathwayId == pathwaysCohort[i].id) {
							pathwaysCheck -= 1;
							break;
						}
					}
				}
				
				if (pathwaysCheck <= 0)
					assign = true;
				else 
					assign = false;
				if (cohortStudents.length == 0)
					assign = false;

				let create = false;
				for (let i = 0; i < cohortStudents.length; i++){
					if (cohortStudents[i].assignedChoice != null){
						create = true;
						break;
					}
				}

				res.render("cohort", {
					cohort: cohort,
					cohortStudents: cohortStudents,
					deliverables: deliverables,
					membership: membership,
					pathways: pathways,
					pathwaysCohort: pathwaysCohort,
					assign: assign,
					create: create
				});
			} catch(e) {
				console.log(e);
				res.redirect("/cohorts");
			}
		}
	}
});

app.get("/cohorts/:cohortId/assignprojects", (req, res) => {
	let cohortStudentsStmt = db.prepare("SELECT * FROM cohortsMemberships WHERE cohortId = ?");
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
			let stmt = db.prepare("UPDATE cohortsMemberships SET assignedChoice = ? WHERE cohortId = ? AND studentId = ?");
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

app.get("/cohorts/:cohortId/pathways", (req, res) => {
	res.render("cohort-pathways", {
		cohort: getCohortById(req.params.cohortId),
		pathways: getAllCohortPathways(req.params.cohortId)
	});
});

// TODO: move /pathways/:pathwayId here
app.get("/cohorts/:cohortId/pathways/:pathwayId", (req, res) => {
	// res.render("cohort-pathway", {
	// 	cohort: getCohortById(req.params.cohortId),
	// 	pathway: getPathwayById(req.params.pathwayId)
	// });

	let cohortId = req.params.cohortId;
	let pathwayId = req.params.pathwayId;

	try{
		let projectproposals = getProjectProposalsByPathwayId(pathwayId);
		let membership = getCohortMembershipByCohortIdAndStudentId(cohortId, req.session.user.id);

		res.render("pathway-projectproposals", {
			cohort: getCohortById(cohortId),
			pathway: getPathwayById(pathwayId),
			membership: membership,
			projectproposals: projectproposals,
			choices: [
				getProjectProposalById(membership.choice1),
				getProjectProposalById(membership.choice2),
				getProjectProposalById(membership.choice3)
			]
		});
	}
	catch(e) {
		console.log(e);
		res.redirect("/pathways");
	}
});

app.get("/cohorts/:cohortId/pathways/:pathwayId/donechoosing", (req, res) => {
	let stmt = db.prepare("UPDATE cohortsMemberships SET doneChoosing = 1, pathwayId = ? WHERE cohortId = ? AND studentId = ?");
	stmt.run(req.params.pathwayId, req.params.cohortId, req.session.user.id);
	res.redirect("/cohorts/" + req.params.cohortId);
});

app.get("/api/all-pathways", (req, res) => {
	if(!req.session.loggedIn) {
		res.sendStatus(403);
	} else {
		console.log(getAllCohortPathways(req.query.cohortId));
		res.json(getAllCohortPathways(req.query.cohortId));
	}
});

app.get("/api/all-markschemes", (req, res) => {
	if(!req.session.loggedIn) {
		res.sendStatus(403);
	} else {
		let stmt = db.prepare("SELECT * FROM markschemes"); // TODO: check for SQL injection
		res.json(stmt.all());
	}
});

app.post("/api/remove-deliverable-in-cohort", (req, res) => {
	if(!req.session.loggedIn) {
		res.sendStatus(403);
	} else {
		db.prepare("DELETE FROM deliverablesMemberships WHERE deliverableId = ? AND cohortId = ? AND pathwayId = ?").run(req.body.deliverableId, req.query.cohortId, req.body.pathwayId);
		res.json(true);
	}
});

app.post("/api/change-deliverable-in-cohort", (req, res) => {
	if(!req.session.loggedIn) {
		res.sendStatus(403);
	} else {
		// TODO: check date formats are good
		let stmt = db.prepare("UPDATE deliverablesMemberships SET pathwayId = ?, dueDate = ?, weighting = ?, markschemeId = ? WHERE deliverableId = ? AND cohortId = ? AND pathwayId = ?");
		stmt.run(req.body.newPathway, req.body.dueDate, req.body.weight, req.body.markscheme, req.body.deliverableId, req.query.cohortId, req.body.pathwayId);
		res.json(true);
	}
});

app.post("/api/add-deliverable-to-cohort", (req, res) => {
	if(!req.session.loggedIn) {
		res.sendStatus(403);
	} else {
		// TODO: check date formats are good
		let stmt = db.prepare("INSERT INTO deliverablesMemberships(deliverableId, cohortId, pathwayId, dueDate, weighting) VALUES (?, ?, ?, ?, ?)");
		stmt.run(req.body.id, req.query.cohortId, req.body.pathway, req.body.dueDate, req.body.weight);
		res.redirect("/cohorts/"+req.query.cohortId);
	}
});

app.get("/api/deliverable-search", (req, res) => {
	if(!req.session.loggedIn) {
		res.sendStatus(403);
	} else {
		let stmt = db.prepare("SELECT * FROM deliverables WHERE deliverables.name LIKE '%' || ? || '%' LIMIT 5"); // TODO: check for SQL injection
		res.json(stmt.all(req.query.name));
	}
});

app.get("/cohorts/:cohortId/createprojects", (req, res) => {
		// TODO: fix this code that jack clearly wrote while he was asleep
		let cohortId = req.params.cohortId;
		let memberships = db.prepare("SELECT studentId, assignedChoice, pathwayId FROM cohortsMemberships WHERE cohortId = ? AND assignedChoice IS NOT NULL").all(cohortId);
		for (let i = 0; i < memberships.length; i++) {
			let projId = db.prepare("INSERT INTO projects(projectProposalId, cohortId, pathwayId) VALUES (?, ?, ?)").run(memberships[i].assignedChoice, cohortId, memberships[i].pathwayId).lastInsertRowid;
			db.prepare("INSERT INTO projectsStudents(projectId, studentId) VALUES (?, ?)").run(projId, memberships[i].studentId);
			let supervisorId = db.prepare("SELECT supervisorId FROM projectProposalsSupervisors WHERE projectProposalId = ?").all(memberships[i].assignedChoice);
			for (let j =0; j < supervisorId.length; j++){
				db.prepare("INSERT INTO projectsSupervisors(projectId, supervisorId) VALUES (?, ?)").run(projId, supervisorId[j].supervisorId);
			}
			db.prepare("UPDATE cohortsMemberships SET projectId = ? WHERE cohortId = ? AND studentId = ?").run(projId, cohortId, memberships[i].studentId);
		}
		res.redirect("/cohorts/" + cohortId);
	 
});

app.get("/api/student-search", (req, res) => {
	if(!req.session.loggedIn) {
		res.sendStatus(403);
	} else {
		let stmt = db.prepare("SELECT id, name, email FROM users WHERE users.name LIKE '%' || ? || '%' AND isStudent = 1 AND id NOT IN (SELECT studentId FROM cohortsMemberships WHERE cohortId = ?) LIMIT 5"); // TODO: check for SQL injection
		res.json(stmt.all(req.query.name, req.query.cohortId));
	}
});

app.post("/api/remove-from-cohort", (req, res) => {
	try {
		db.prepare("DELETE FROM cohortsMemberships WHERE cohortId = ? AND studentId = ? AND projectId IS null").run(req.query.cohortId, req.body.studentId);
		res.json(true);
	} catch {
		res.json(false);
	}
});

app.get("/api/add-student-to-cohort", (req, res) => {
	// TODO: permission check
	if(!req.session.loggedIn) {
		res.sendStatus(403);
	} else {
		let stmt = db.prepare("INSERT OR IGNORE INTO cohortsMemberships(cohortId, studentId, choice1, choice2, choice3, doneChoosing, projectId, deferring) VALUES (?, ?, NULL, NULL, NULL, 0, NULL, 0)"); // TODO: check for SQL injection
		stmt.run(req.query.cohortId, req.query.studentId);
		res.sendStatus(200);
	}
});

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

app.post("/api/tag-search", (req, res) => {
	// TODO: permission check here too
	if(!req.session.loggedIn) {
		res.sendStatus(403);
	} else {
		tagIds = req.body;
		strStmt = "SELECT id, name FROM tags where tags.name LIKE '%' || ? || '%'";
		for (let i = 0; i < tagIds.length; i ++)
			strStmt += " AND NOT id = "+tagIds[i];
		strStmt += " LIMIT 5";
		let stmt = db.prepare(strStmt);
		res.json(stmt.all(req.query.name));
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
			let stmt = db.prepare("SELECT *, cohorts.name AS cohortName, users.name AS userName FROM cohortsMemberships INNER JOIN cohorts ON cohortsMemberships.cohortId = cohorts.id INNER JOIN users ON cohortsMemberships.studentId = users.id WHERE pathwayId = ?");
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

// TODO: this only allows choices for first cohort user is in
// TODO: should this be deleted?
// TODO: not all of it
// app.get("/pathways/:pathwayId/projectproposals", (req, res) => {
// 	let pathwayId = req.params.pathwayId;
// 	try{
// 		let projectProposalsStmt = db.prepare("SELECT projectProposals.*, users.name AS createdByName FROM projectProposalsPathways INNER JOIN projectProposals ON projectProposals.id = projectProposalsPathways.projectProposalId LEFT JOIN users ON projectProposals.createdBy = users.id WHERE projectProposalsPathways.pathwayId = ?");
// 		let projectProposals = projectProposalsStmt.all(pathwayId);

// 		let getCS = db.prepare("SELECT * FROM cohortsMemberships WHERE studentId = ?");
// 		let rowCS = getCS.get(req.session.user.id);

// 		let choice1 = db.prepare("SELECT projectproposals.*, users.name AS createdByName FROM projectProposalsPathways INNER JOIN projectProposals ON projectProposals.id = projectProposalsPathways.projectProposalId LEFT JOIN users ON projectProposals.createdBy = users.id WHERE projectProposals.id = ?").get(rowCS.choice1); 
// 		let choice2 = db.prepare("SELECT projectproposals.*, users.name AS createdByName FROM projectProposalsPathways INNER JOIN projectProposals ON projectProposals.id = projectProposalsPathways.projectProposalId LEFT JOIN users ON projectProposals.createdBy = users.id WHERE projectProposals.id = ?").get(rowCS.choice2);
// 		let choice3 = db.prepare("SELECT projectproposals.*, users.name AS createdByName FROM projectProposalsPathways INNER JOIN projectProposals ON projectProposals.id = projectProposalsPathways.projectProposalId LEFT JOIN users ON projectProposals.createdBy = users.id WHERE projectProposals.id = ?").get(rowCS.choice3);
// 		let choices = [choice1, choice2, choice3];

// 		res.render("pathway-projectproposals", {
// 			pathway: getPathwayById(pathwayId),
// 			projectProposals: projectProposals,
// 			choices: choices
// 		});
// 	}
// 	catch(e) {
// 		console.log(e);
// 		res.redirect("/pathways");
// 	}
// });

// app.get("/pathways/:pathwayId/deliverables", (req, res) => {
// 	res.render("pathway-deliverables", {
// 		pathway: getPathwayById(req.params.pathwayId),
// 		deliverables: getDeliverablesByPathwayId(req.params.pathwayId)
// 	});
// });
// app.get("/pathways/:pathwayId/deliverables/new", (req, res) => {
// 	res.render("pathway-deliverables-new");
// });
// app.post("/pathways/:pathwayId/deliverables/new", (req, res) => {
// 	let stmt = db.prepare("INSERT INTO deliverables (pathwayId, name, weighting, type) VALUES (?, ?, ?, ?)");
// 	let result = stmt.run(req.params.pathwayId, req.body.name, req.body.weighting, 0);
// 	res.redirect("/pathways/"+req.params.pathwayId+"/deliverables/" + result.lastInsertRowid);
// });
// app.get("/pathways/:pathwayId/deliverables/:deliverableId", (req, res) => {
// 	res.render("pathway-deliverable", {
// 		pathway: getPathwayById(req.params.pathwayId),
// 		deliverable: getDeliverableById(req.params.deliverableId)
// 	});
// });

// TODO: this should return some json rather than use HTTP response codes
app.post("/api/projectSelection/new", (req, res) => {
	let projectId = req.body.projectId;
	let cohortId = req.body.cohortId;
	let pathwayId = req.body.pathwayId;
	let studentId = req.session.user.id;

	let membership = getCohortMembershipByCohortIdAndStudentId(cohortId, studentId);
	if(membership.choice1 == null) {
		let choice1Stmt = db.prepare("UPDATE cohortsMemberships SET choice1 = ?, pathwayId = ? WHERE studentId = ? AND cohortId = ?");
		choice1Stmt.run(projectId, pathwayId, membership.studentId, cohortId);
		res.sendStatus(200);
	} else if(membership.choice2 == null) {
		let choice2Stmt = db.prepare("UPDATE cohortsMemberships SET choice2 = ?, pathwayId = ? WHERE studentId = ? AND cohortId = ?");
		choice2Stmt.run(projectId, pathwayId, membership.studentId, cohortId);
		res.sendStatus(200);
	} else if(membership.choice3 == null) {
		let choice3Stmt = db.prepare("UPDATE cohortsMemberships SET choice3 = ?, pathwayId = ? WHERE studentId = ? AND cohortId = ?");
		choice3Stmt.run(projectId, pathwayId, membership.studentId, cohortId);
		res.sendStatus(200);
	}
});

// TODO: this removes choices for every cohort for that student
app.post("/api/projectSelection/remove", (req, res) => {
	if (req.body.choiceId == 1) {
		let choiceStmt = db.prepare("UPDATE cohortsMemberships SET choice1 = null WHERE studentId = ?");
		choiceStmt.run(req.session.user.id);
		res.sendStatus(200);
	}
	else if (req.body.choiceId == 2) {
		let choiceStmt = db.prepare("UPDATE cohortsMemberships SET choice2 = null WHERE studentId = ?");
		choiceStmt.run(req.session.user.id);
		res.sendStatus(200);
	}
	else if (req.body.choiceId == 3) {
		let choiceStmt = db.prepare("UPDATE cohortsMemberships SET choice3 = null WHERE studentId = ?");
		choiceStmt.run(req.session.user.id);
		res.sendStatus(200);
	}
});

// TODO: this assumes that each student is only in one cohort. need to get the cohort from the req
app.post("/api/projectSelection/swap", (req, res) => {
	if (req.body.fromId == 0)
		from = db.prepare("SELECT choice1 FROM cohortsMemberships WHERE studentId = ?").get(req.session.user.id).choice1;
	else if (req.body.fromId == 1)
		from = db.prepare("SELECT choice2 FROM cohortsMemberships WHERE studentId = ?").get(req.session.user.id).choice2;
	else
		from = db.prepare("SELECT choice3 FROM cohortsMemberships WHERE studentId = ?").get(req.session.user.id).choice3;
	console.log(from);
	if (req.body.toId == 0) {
		to = db.prepare("SELECT choice1 FROM cohortsMemberships WHERE studentId = ?").get(req.session.user.id).choice1;
		db.prepare("UPDATE cohortsMemberships SET choice1 = ? WHERE studentId = ?").run(from, req.session.user.id);
	}
	else if (req.body.toId == 1) {
		to = db.prepare("SELECT choice2 FROM cohortsMemberships WHERE studentId = ?").get(req.session.user.id).choice2;
		db.prepare("UPDATE cohortsMemberships SET choice2 = ? WHERE studentId = ?").run(from, req.session.user.id);
	}
	else{
		to = db.prepare("SELECT choice3 FROM cohortsMemberships WHERE studentId = ?").get(req.session.user.id).choice3;
		db.prepare("UPDATE cohortsMemberships SET choice3 = ? WHERE studentId = ?").run(from, req.session.user.id);
	}
	if (req.body.fromId == 0)
		db.prepare("UPDATE cohortsMemberships SET choice1 = ? WHERE studentId = ?").run(to, req.session.user.id);
	else if (req.body.fromId == 1)
		db.prepare("UPDATE cohortsMemberships SET choice2 = ? WHERE studentId = ?").run(to, req.session.user.id);
	else
		db.prepare("UPDATE cohortsMemberships SET choice3 = ? WHERE studentId = ?").run(to, req.session.user.id);
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

	let media = req.files ? req.files.media.length ? req.files.media : [req.files.media] : [];
	let mediaUrls = [];
	for(let i = 0; i < media.length; i++) {
		let file = media[i];
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

	if(req.body.tags != "") {
		let tags = req.body.tags.split(",");
		for (let i = 0; i < tags.length; i++){
			let stmt7 = db.prepare("INSERT INTO projectProposalsTags(projectProposalId, tagId) VALUES (?, ?)");
			stmt7.run(projectProposal.id, tags[i]);
		}
	}

	res.json(projectProposal.id);
});

app.get("/projectproposals/:id", (req, res) => {
	files = db.prepare("SELECT * FROM projectProposalsMedia WHERE projectProposalId = ?").all(req.params.id);
	images = [];
	urls = [];
	videos = [];
	for (let i = 0; i < files.length; i++) {
		if (files[i].type == "url")
			urls.push(files[i].url);
		else if (files[i].type == "image")
			images.push(files[i].url);
		else if (files[i].type == "video")
			videos.push(files[i].url);
		else {
			//TODO handle illegal files
		}
	}
	console.log(urls);
	console.log(images);
	res.render("projectproposal", {
		projectProposal: getProjectProposalById(req.params.id),
		urls: urls,
		images: images,
		videos: videos
	});
});

app.get("/api/projectproposals/:projectProposalId/approve", (req, res) => {
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

	let stmt = db.prepare("INSERT OR IGNORE INTO markschemes(name) VALUES (?)");
	stmt.run(name);

	// TODO: check if this fails
	stmt = db.prepare("SELECT id, name FROM markschemes WHERE name = ?");
	let markschemeId = stmt.get(name).id;

	for(let i = 0; i < parts.length; i++) {
		let part = parts[i];
		stmt = db.prepare("INSERT OR IGNORE INTO markschemesParts(name, weight, markschemeId) VALUES (?, ?, ?)");
		stmt.run(part.name, part.weight, markschemeId);
		// TODO: check if this fails
	}

	res.json({
		markschemeId: markschemeId
	});
});

app.get("/markschemes/:id", (req, res) => res.render("markscheme", {
	markscheme: getMarkSchemeById(req.params.id)
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
	try {
		let stmt = db.prepare("DELETE FROM tags WHERE id = ?");
		stmt.run(req.params.tagId);
		res.send("true");
	} catch(e) {
		console.log(e);
		res.send("false");
	}
});

// TODO: if we change the user in settings we need to update the session copy of user

function getProjectStudentsByProjectId(projectId) {
	let stmt = db.prepare("SELECT * FROM projectsStudentsFilled WHERE projectId = ?");
	return stmt.all(projectId);
}

function getDeliverablesByCohortIdAndPathwayId(cohortId, pathwayId) {
	let stmt = db.prepare("SELECT deliverables.* FROM deliverablesMemberships INNER JOIN deliverables ON deliverablesMemberships.deliverableId = deliverables.id WHERE cohortId = ? AND pathwayId = ?");
	return stmt.all(cohortId, pathwayId);
}

function getMarkingBySubmissionId(submissionId) {
	let stmt = db.prepare("SELECT * FROM markingFilled WHERE submissionId = ?");
	return stmt.all(submissionId);
}

app.get("/overview", (req, res) => {
	let projects = [];

	if(req.session.user.isSupervisor) {
		projects = getProjectsBySupervisorId(req.session.user.id);
		for(let project of projects) {
			project.studentMemberships = getProjectStudentsByProjectId(project.id);
			for(let projectStudentMembership of project.studentMemberships) {
				let cohortMembership = getCohortMembershipByCohortIdAndStudentId(project.cohortId, projectStudentMembership.studentId);
				projectStudentMembership.deliverables = getDeliverablesByCohortIdAndPathwayId(project.cohortId, cohortMembership.pathwayId);
				for(let deliverable of projectStudentMembership.deliverables) {
					deliverable.submissions = getSubmissionsByDeliverableIdAndProjectIdAndStudentId(deliverable.id, project.id, projectStudentMembership.studentId);
					for(let submission of deliverable.submissions) {
						submission.marking = getMarkingBySubmissionId(submission.id);
					}
				}
			}
		}
	}

	/*
	
	display new submissions
	which have not been marked by us

	submissions based on project we supervise

	*/

	res.render("overview", {
		cohorts: req.session.user.isStudent ? getCohortsAndCohortsMembershipByStudentId(req.session.user.id) : [],
		projectsSupervising: projects
	});
});

["github", "overleaf"].forEach(e => {
	app.post("/overview/" + e, (req, res) => {
		if(req.session.user.isStudent){
			let stmt1 = db.prepare("SELECT * FROM cohortsMemberships WHERE studentId = ?");
			let row1 = stmt1.get(req.session.user.id);
			let project = getProjectById(row1.projectId);
			let stmt2 = db.prepare("UPDATE OR IGNORE projects SET " + e + "Link = ? WHERE id = ?");
			stmt2.run(req.body[e + "Link"], project.id);
		}
		res.redirect("/overview");
	});
});

// TODO: do something useful with this
app.get("/marking", (req, res) => {
	
});

app.get("/marking/:submissionId", (req, res) => {
	// TODO: check we can actually mark this either as a supervisor or as a moderator

	let submission = getSubmissionById(req.params.submissionId);
	let project = getProjectById(submission.projectId);
	let cohortMembership = getCohortMembershipByCohortIdAndStudentId(project.cohortId, submission.studentId);
	let deliverableMembership = getDeliverablesMembershipByDeliverableIdAndCohortIdAndPathwayId(submission.deliverableId, submission.cohortId, cohortMembership.pathwayId);
	let markscheme = getMarkSchemeById(deliverableMembership.markschemeId);

	res.render("marking", {
		markscheme: markscheme,
		markschemeParts: getMarkschemePartsByMarkshemeId(markscheme.id),
		submission: submission,
		submissionFiles: getSubmissionFilesBySubmissionId(req.params.submissionId)
	});
});

app.post("/api/marking", (req, res) => {
	// TODO: this can probably be simplified using one of the views
	let submissionId = req.body.submissionId;
	let submission = getSubmissionById(submissionId);
	let cohortMembership = getCohortMembershipByCohortIdAndStudentId(submission.cohortId, submission.studentId);
	let membership = getDeliverablesMembershipByDeliverableIdAndCohortIdAndPathwayId(submission.deliverableId, submission.cohortId, cohortMembership.pathwayId);

	let marksheetStmt = db.prepare("INSERT INTO marksheets(markschemeId) VALUES (?)");
	let marksheetResult = marksheetStmt.run(membership.markschemeId);
	// TODO: check this id isnt null
	let marksheetId = marksheetResult.lastInsertRowid;

	let parts =  req.body.parts;
	for(let i = 0; i < parts.length; i++) {
		// TODO: check bounds on these
		let marksheetPartStmt = db.prepare("INSERT INTO marksheetsParts(marksheetId, markschemePartId, mark, feedback) VALUES (?, ?, ?, ?)");
		let result = marksheetPartStmt.run(marksheetId, parts[i].partId, parts[i].mark, parts[i].feedback);
	}

	let markingStmt = db.prepare("INSERT INTO marking(submissionId, marksheetId, markerId) VALUES (?, ?, ?)");
	markingStmt.run(submissionId, marksheetId, req.session.user.id);

	res.json({
		marksheetId: marksheetId
	});
});

// TODO: do something with this
app.get("/marksheets", (req, res) => {

});

app.get("/marksheets/:marksheetId", (req, res) => {
	let marksheetId = req.params.marksheetId;
	let marksheet = getMarksheetById(marksheetId);
	res.render("marksheet", {
		marksheet: marksheet,
		marksheetParts: getMarksheetPartsByMarksheetId(marksheetId)
	});
});

app.get("/projects", (req, res) => {
	if (req.session.user.isStudent) {
		let row1 = db.prepare("SELECT * FROM cohortsMemberships WHERE studentId = ?").all(req.session.user.id);
		let projects = [];
		for (let i = 0; i < row1.length; i++) 
			projects.push(getProjectById(row1[i].projectId));
		res.render("projects", {projects: projects});
	}
	res.render("projects", {projects: getAllProjects()});
});

function getAgreedMarksByStudentId(studentId) {
	let stmt = db.prepare("SELECT agreedMarks.id, agreedMarks.mark, agreedMarks.total, submissions.id AS submissionId FROM submissions INNER JOIN agreedMarks ON submissions.agreedMarksId = agreedMarks.id WHERE studentId = ?");
	return stmt.all(studentId);
}

// TODO: for the love of all things good this needs a refactor
app.get("/projects/:projectId", (req, res) => {
	let projectStudentsStmt = db.prepare("SELECT * FROM projectsStudents LEFT JOIN users ON projectsStudents.studentId = users.id WHERE projectId = ?");
	let projectSupervisorsStmt = db.prepare("SELECT * FROM projectsSupervisors LEFT JOIN users ON projectsSupervisors.supervisorId = users.id WHERE projectId = ?");
	let deliverablesStmt = db.prepare("SELECT * FROM projects INNER JOIN cohortsMemberships ON projects.id = cohortsMemberships.projectId AND cohortsMemberships.studentId = ? INNER JOIN deliverablesMemberships ON cohortsMemberships.cohortId = deliverablesMemberships.cohortId AND cohortsMemberships.pathwayId = deliverablesMemberships.pathwayId INNER JOIN deliverables ON deliverablesMemberships.deliverableId = deliverables.id WHERE projects.id = ? ORDER BY dueDate ASC");
	let deliverablesPerPathwayStmt = db.prepare("SELECT * FROM projects INNER JOIN cohortsMemberships ON projects.id = cohortsMemberships.projectId")

	let project = getProjectById(req.params.projectId);

	let deliverables = deliverablesStmt.all(req.session.user.id, req.params.projectId);
	for(let i = 0; i < deliverables.length; i++)
		deliverables[i].submissions = getSubmissionsByDeliverableIdAndProjectIdAndStudentId(deliverables[i].id, req.params.projectId, req.session.user.id);

	// TODO: agreedmarks add deliverable name
	res.render("project", {
		project: project,
		projectStudents: projectStudentsStmt.all(req.params.projectId),
		projectSupervisors: projectSupervisorsStmt.all(req.params.projectId),
		deliverables: deliverables,
		submissions: getSubmissionsByProjectIdAndStudentId(project.id, req.session.user.id),
		allProjectSubmissions: getSubmissionsByProjectId(req.params.projectId),
		agreedMarks: getAgreedMarksByStudentId(req.session.user.id)
	});
});

app.get("/preferences", (req, res) => {
	let stmt = db.prepare("SELECT pathways.id AS pathwayId, pathways.name as pathwayName, CASE WHEN moderatorId IS NULL THEN FALSE ELSE TRUE END AS isModerating FROM pathways LEFT JOIN pathwaysModerators ON pathways.id = pathwaysModerators.pathwayId AND moderatorId = ?");
	res.render("preferences", {
		user: req.session.user,
		pathwayModerators: stmt.all(req.session.user.id)
	});
});

app.post("/api/save-pathway-moderation", (req, res) => {
	let checkboxes = req.body
	for(let i = 0; i < checkboxes.length; i++) {
		if(checkboxes[i].checked) {
			let stmt = db.prepare("INSERT OR IGNORE INTO pathwaysModerators(pathwayId, moderatorId) VALUES (?, ?)");
			stmt.run(checkboxes[i].pathwayId, req.session.user.id);
		} else {
			let stmt = db.prepare("DELETE FROM pathwaysModerators WHERE pathwayId = ?");
			stmt.run(checkboxes[i].pathwayId);
		}
	}

	res.send("true");
});

app.get("/projects/:projectId/makesubmission/:deliverableId", (req, res) => {
	res.render("project-makesubmission", {
		project: getProjectById(req.params.projectId),
		deliverable: getDeliverableById(req.params.deliverableId)
	});
});

app.post("/projects/:projectId/makesubmission/:deliverableId", (req, res) => {
	// TODO: check for files 
	// TODO: check file extensions

	let submissionStmt = db.prepare("INSERT INTO submissions(deliverableId, projectId, studentId) VALUES (?, ?, ?)");
	let result = submissionStmt.run(req.params.deliverableId, req.params.projectId, req.session.user.id);

	// TODO: check this succeeded
	let submissionId = result.lastInsertRowid;
	
	for(let i = 0; i < req.files.files.length; i++) {
		let file = req.files.files[i];
		let fileNameParts = file.name.split(".");
		let newFileName = "/uploads/" + file.md5 + "." + fileNameParts[fileNameParts.length - 1];
		file.mv("." + newFileName);

		let stmt = db.prepare("INSERT INTO submissionsFiles(submissionId, url, name) VALUES (?, ?, ?)");
		stmt.run(submissionId, newFileName, file.name);
	}

	res.redirect("/projects/" + req.params.projectId);
});

app.get("/submissions", (req, res) => {
	// TODO: do something useful with this
});

app.get("/submissions/:submissionId", (req, res) => {
	let submissionId = req.params.submissionId;
	res.render("submission", {
		submission: getSubmissionById(submissionId),
		submissionFiles: getSubmissionFilesBySubmissionId(submissionId)
	});
});

// TODO: do something with this
app.get("/deliverables", (req, res) => {
	res.sendStatus(200);
});

// TODO: add description to deliverables
app.get("/deliverables/:deliverableId", (req, res) => {
	let deliverableId = req.params.deliverableId;
	res.render("deliverable", {
		deliverable: getDeliverableById(deliverableId),
		deliverablesMemberships: getDeliverablesMembershipsByDeliverableId(deliverableId)
	});
});

function getMarkschemeBySubmissionId(submissionId) {
	let submission = getSubmissionById(submissionId);
	let project = getProjectById(submission.projectId);
	let deliverableMembership = getDeliverablesMembershipByDeliverableIdAndCohortIdAndPathwayId(submission.deliverableId, project.cohortId, project.pathwayId);
	return getMarkSchemeById(deliverableMembership.markschemeId);
}

app.get("/agreedmarks/:submissionId", (req, res) => {
	if(!req.session.user.isAdmin) {
		res.redirect("/");
	} else {
		let submission = getSubmissionById(req.params.submissionId);
		let project = getProjectById(submission.projectId);
		let deliverableMembership = getDeliverablesMembershipByDeliverableIdAndCohortIdAndPathwayId(submission.deliverableId, project.cohortId, project.pathwayId);
		let markscheme = getMarkSchemeById(deliverableMembership.markschemeId);

		if(!submission) {
			res.redirect("/");
		} else {
			let markings = getMarkingBySubmissionId(req.params.submissionId);
			for(let marking of markings) {
				marking.marksheet = getMarksheetById(marking.marksheetId);
				marking.marksheet.parts = getMarksheetPartsByMarksheetId(marking.marksheetId);
			}
			res.render("agreedmarks", {
				submission: submission,
				markings: markings,
				markscheme: markscheme
			});
		}
	}
});

// TODO: check mark is actually okay
// TODO: check user is admin
app.post("/api/set-agreed-mark", (req, res) => {
	let submissionId = req.body.submissionId;
	let mark = req.body.mark;
	let markscheme = getMarkschemeBySubmissionId(submissionId);
	let agreedMarkStmt = db.prepare("INSERT INTO agreedMarks(mark, total) VALUES (?, ?)")
	let agreedMarkResult = agreedMarkStmt.run(mark, markscheme.totalWeight);
	let submissionStmt = db.prepare("UPDATE submissions SET agreedMarksId = ? WHERE id = ?");
	submissionStmt.run(agreedMarkResult.lastInsertRowid, submissionId);
	res.json(true);
});

app.listen(8080);
