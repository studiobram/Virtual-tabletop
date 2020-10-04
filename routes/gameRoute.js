const express = require('express');
const router = express.Router();
const gameController = require("../controllers/gameController");
const routeHelper = require("../helper/routeHelper");
const { query, body, validationResult } = require('express-validator');

router.get('/games', routeHelper.mustBeloggedin, function (req, res, next) {
    return gameController.GetByUserId(req.session.userId)
        .then((games) => {
            for (var i = 0; i < games.length; i++) {
                games[i].id = gameController.CleanId(games[i].id);
            }
            routeHelper.renderView(req, res, "games", { games: games, errors: [] });
        });
});

router.post('/game/create', routeHelper.mustBeloggedin, [body('name').exists().not().isEmpty()], function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return gameController.GetAll()
            .then((games) => {
                for (var i = 0; i < games.length; i++) {
                    games[i].id = gameController.CleanId(games[i].id);
                }
                routeHelper.renderView(req, res, "games", { games: games, errors: [] });
            });
    }

    req.body.name = routeHelper.removeXSS(req.body.name);

    return gameController.create(req.body.name, req.session.userId)
        .then((gameId) => {
            routeHelper.Redirect(res, '/game/edit/' + gameId);
        });
});

router.post('/game/save', routeHelper.mustBeloggedin, [body('gameId').exists().not().isEmpty(), body('items').exists().not().isEmpty(), body('name').exists().not().isEmpty(), body('isPublic').exists().not().isEmpty()], function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array().map(e => e.msg + ": " + e.param) });
    }

    gameController.GetById(req.body.gameId)
        .then((game) => {
            if (game.userId == req.session.userId) {
                gameController.update(req.body.gameId, JSON.parse(req.body.items), req.body.isPublic, req.body.name)
                    .then(() => {
                        res.json({ message: "Game successfully saved" });
                    });
            }
            else {
                routeHelper.Redirect(res, '/back');
            }
        });
});

router.get('/game/edit/:id', routeHelper.mustBeloggedinAndHasGame, function (req, res, next) {
    gameController.GetById("games/" + req.params.id)
        .then((game) => {
            if (game == undefined || game == null) {
                return routeHelper.Redirect(res, '/');
            }
            else {
                routeHelper.renderView(req, res, "game-editor", { game: game, baseUrl: "http://" + process.env.URL + ":" + process.env.HTTP_PORT });
            }
        });
});

router.get('/game/delete/:id', routeHelper.mustBeloggedinAndHasGame, function (req, res, next) {
    gameController.delete("games/" + req.params.id)
        .then(() => {
            routeHelper.Redirect(res, '/games');
        });
});

module.exports = router;
