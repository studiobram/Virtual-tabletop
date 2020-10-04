const express = require('express');
const router = express.Router();
const userController = require("../controllers/UserController");
const roomController = require("../controllers/roomController");
const gameController = require("../controllers/gameController");
const routeHelper = require("../helper/routeHelper");

const { query, body, validationResult } = require('express-validator');

/* GET home page. */
router.get('/', routeHelper.mustBeloggedin, function (req, res, next) {
    return roomController.GetAll()
        .then((rooms) => {
            for (var i = 0; i < rooms.length; i++) {
                rooms[i].id = roomController.CleanId(rooms[i].id);
                rooms[i].isMyRoom = rooms[i].adminUserId == req.session.userId;
            }

            gameController.GetByUserIdOrPublic(req.session.userId)
                .then((games) => {
                    for (var i = 0; i < games.length; i++) {
                        games[i].id = gameController.CleanId(games[i].id);                        
                    }

                    routeHelper.renderView(req, res, "index", {
                        rooms: rooms,
                        games: games.map(function (g) {
                            return {
                                id: g.id,
                                name: g.name
                            };
                        }),
                        errors: []
                    });
                });
        });    
});

router.get('/login', routeHelper.mustBeloggedout, function (req, res, next) {
    routeHelper.renderView(req, res, "login", { errors: [] });
});

router.post('/login', routeHelper.mustBeloggedout, [body('username').exists().not().isEmpty(), body('password').exists().not().isEmpty()], function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return routeHelper.renderView(req, res, "login", { errors: errors.array().map(e => e.msg + ": " + e.param) });
    }
    return userController.authenticate(req.body.username, req.body.password)
        .then((userId) => {
            if (userId == null) {
                routeHelper.renderView(req, res, "login", { errors: ["Username and or username and/or password is incorrect"] });
            }
            else {
                req.session.userId = userId;
                routeHelper.Redirect(res, '/');
            }
        });
});

router.get('/logout', routeHelper.mustBeloggedin, function (req, res, next) {
    req.session.destroy();
    routeHelper.Redirect(res, '/');
});

router.get('/register', routeHelper.mustBeloggedout, function (req, res, next) {
    routeHelper.renderView(req, res, "register", {errors:[]});
});

router.post('/register', routeHelper.mustBeloggedout, [body('username').exists().not().isEmpty(), body('password').exists().not().isEmpty()], function (req, res) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return routeHelper.renderView(req, res, "register", { errors: errors.array().map(e => e.msg + ": " + e.param) });
    }

    req.body.username = routeHelper.removeXSS(req.body.username);

    return userController.doesUserAlreadyExist(req.body.username)
        .then((doesUserAlreadyExist) => {
            if (doesUserAlreadyExist) {
                routeHelper.renderView(req, res, "register", { errors: ["User: " + req.body.username + " already exists"] });
            }
            else {
                userController.register(req.body.username, req.body.password)
                    .then((userId) => {
                        req.session.userId = userId;
                        routeHelper.Redirect(res, '/');
                    });                
            }
        });
});

router.use("/", require("./roomRoute"));
router.use("/", require("./gameRoute"));
router.use("/", require("./fileRoute"));

module.exports = router;
