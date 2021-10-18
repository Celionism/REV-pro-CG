const moduleAlias = require('module-alias');
moduleAlias.addAliases({
    '@root': __dirname,
    '@config': __dirname + '/config.js',
    '@collections': __dirname + '/database'
});
require('module-alias/register');

var config = require("@config");

var informationFilled = config.isInformationFilled();
if (informationFilled.result != true) {
    console.log(`Movie Buddy Failed to Start: ${informationFilled.reason}`);
    process.exit(1);
}


var express = require("express");
var http = require("http");
var https = require("https");
var helmet = require("helmet");
//Passport Modules
var express_session = require("express-session");
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var connect_ensure_login = require('connect-ensure-login');

var mongoose = require("mongoose");
const MongoStore = require('connect-mongo');

var validator = require("validator");
var User = require("@collections/users.js");
var Invite = require("@collections/invite_code.js");


//Connect to the MongoDB Database
mongoose.connect(config.mongoDBUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Database connection successful")
    })
    .catch(err => {
        console.error(err)
    });

var app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");

//Body Parser, mainly for forms
app.use(express.urlencoded({ extended: true }));//use body parser
app.use(express.json());//allow for JSON bodyParseing

//Use helmet for security
app.use(helmet({ contentSecurityPolicy: false }));


//passport stuff
passport.use(new LocalStrategy({
    usernameField: "email_input",
    passwordField: "password_input"
},
    async function (email, password, done) {
        let response = null;
        email = email != null ? email.toLowerCase().trim() : "";
        try {
            response = await User.validate_user(email, password);
        } catch (err) {
            return done(err);
        }
        if (response != null) {//the user is not null meaning nothing severe went wrong
            if (response["success"] == true) {
                console.log(response);
                return done(null, response.user, { success: true, redirect: "/" });
            }
            else {
                return done(null, false, response);
            }
        }
    }));

passport.serializeUser(function (user, done) {
    done(null, user._id);
});

passport.deserializeUser(async function (id, done) {
    let user = null;
    try {
        user = await User.get_details(id);
    } catch (err) {
        done(err);
    }

    if (user != null) {
        done(null, user);
    }
});

app.use(express_session({
    secret: "secret",
    saveUninitialized: false, // don't create session until something stored
    resave: false, //don't save session if unmodified
    store: new MongoStore({
        mongoUrl: config.mongoDBUri
    }),
    cookie: { maxAge: 3 * 24 * 60 * 60 * 1000 }
}));

app.use(passport.initialize());
app.use(passport.session());

//temp video
app.get("/video", (req, res) => {
    res.sendFile("\\\\192.168.1.24\\river_drive\\Media\\files\\shows\\1429\\1\\1\\1429_1_1.mp4");
})

//temp invite generation
app.get("/generate", (req, res) => {
    Invite.generate_code(null);
    res.redirect("/");
});

//Logout
app.get('/logout', (req, res) => {
    req.session.destroy(function (err) {
        if (req.cookies != null) {
            res.clearCookie('connect.sid');
        }
        res.redirect('/');
    });
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login/send", (req, res, next) => {
    let login_form = req.body;

    let email = login_form["email_input"] != null ? login_form["email_input"] : "";
    let password = login_form["password_input"] != null ? login_form["password_input"] : "";

    let results = {};
    let proceed_login = true;

    if (validator.isEmpty(email)) {
        results["email_input"] = { success: false, reason: "The email field cannot be empty" };
        proceed_login = false;
    }
    if (validator.isEmpty(password)) {
        results["password_input"] = { success: false, reason: "The password field cannot be empty" };
        proceed_login = false;
    }

    if (proceed_login == true) {
        passport.authenticate('local', function (err, user, info) {
            if (err) {
                return next(err); // will generate a 500 error
            }
            if (!user) {
                if (info["key"] == "email") {
                    results["email_input"] = info;
                }
                else if (info["key"] == "password") {
                    results["password_input"] = info;
                }
                return res.send(results);
            }
            req.login(user, async loginErr => {
                if (loginErr) {
                    return next(loginErr);
                }

                results["success"] = info;
                return res.send(results);
            });
        })(req, res, next);
    }
    else {
        res.send(results);
    }
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register/send", async (req, res) => {
    let register_form = req.body;

    //this chunk of code ensures that the inputs are not null
    let email = register_form["email_input"] != null ? register_form["email_input"] : "";
    let first_name = register_form["first_name_input"] != null ? register_form["first_name_input"] : "";
    let last_name = register_form["last_name_input"] != null ? register_form["last_name_input"] : "";
    let password = register_form["password_input"] != null ? register_form["password_input"] : "";
    let confirm_password = register_form["password_confirm_input"] != null ? register_form["password_confirm_input"] : "";
    let invite_code = register_form["invite_code_input"] != null ? register_form["invite_code_input"] : "";

    email = validator.normalizeEmail(email);
    first_name = first_name.trim();
    last_name = last_name.trim();
    password = password;
    confirm_password = confirm_password;
    invite_code = invite_code.trim();

    //The options that define a strong password
    let options = {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 0,
        returnScore: false
    }

    //The results of each field
    let results = {};

    //Checks if the user already exists
    let user_exists = await User.does_email_exist(email);
    let proceed_creation = true;

    //Email Validation
    if (user_exists) {
        results["email_input"] = { success: false, reason: "A user with that email already exists" };
        proceed_creation = false;
    }
    else if (!validator.isEmail(email)) {
        results["email_input"] = { success: false, reason: "The email you entered is invalid" };
        proceed_creation = false;
    }
    else {
        results["email_input"] = { success: true };
    }

    //First Name Validation
    if (validator.isEmpty(first_name)) {
        results["first_name_input"] = { success: false, reason: "The first name field cannot be empty" };
    }
    else {
        results["first_name_input"] = { success: true };
    }

    //Last Name Validation
    if (validator.isEmpty(last_name)) {
        results["last_name_input"] = { success: false, reason: "The last name field cannot be empty" };
    }
    else {
        results["last_name_input"] = { success: true };
    }

    //Password Validation
    if (password != confirm_password) {
        results["password_input"] = { success: false, reason: "Passwords do not match" };
        results["password_confirm_input"] = { success: false, reason: "Passwords do not match" };

        proceed_creation = false;
    }
    else if (!validator.isStrongPassword(password, options)) {
        results["password_input"] = { success: false, reason: "The password you entered is not strong enough" };

        proceed_creation = false;
    }
    else {
        results["password_input"] = { success: true };
        results["password_confirm_input"] = { success: true };
    }

    //Attempt to create account
    if (proceed_creation == true) {
        let user_existence = await User.does_email_exist(email);
        if (user_existence) {//the user exists
            results["email_input"] = { success: false, reason: "" }
        }
        else {
            let create_result = await User.create_user(email, first_name, last_name, password, invite_code);
            console.log(create_result);

            if (create_result["success"] == true) {//registration has been completed
                let user = create_result["user"];
                //login user and redirect to homepage
                results["success"] = { success: true, redirect: "/" };
            }
            else {//registration failed
                //error messages not going to correct field
              //  results["invite_code_input"] = { success: false, reason: create_result["reason"] };
            }
        }
    }
    res.send(results);
});

//ensure that the user is logged in, and if the user is logged in let the user proceed
app.use(
    connect_ensure_login.ensureLoggedIn("/login"),
    function (req, res, next) {
        // app.locals.role = req.user.role ? req.user.role : "regular";
        // app.locals.usersName = `Hi, ${req.user.name}`;
        next();
    });

//Protected Routes
app.get("/", (req, res) => {
    res.render("homepage");
});

app.get("/watch", (req, res) => {
    res.render("watch_page");
});



var port = config.port;
var passphrase = config.security.passphrase;
var keyFile = "";
var certificateFile = "";
var useHttps = false;

if (config.security.keyLocation.length != 0 && config.security.certificateLocation.length != 0) {
    keyFile = fs.readFileSync(config.security.keyLocation);
    certificateFile = fs.readFileSync(config.security.certificateLocation);
    useHttps = true;
}
if (useHttps) {//if key and ceritificate location are found, then use HTTPS, else use HTTP
    https.createServer({
        key: keyFile,
        cert: certificateFile,
        passphrase: passphrase
    }, app).listen(port, () => {
        console.log(`Movie Buddy has successfully start using HTTPS on port : ${port}`);
    });
}
else {
    http.createServer(app).listen(port, () => {
        console.log(`Movie Buddy has successfully start using HTTP on port : ${port}`);
    });
}

