const express = require('express');
const router = express.Router();
const roomController = require("../controllers/roomController");
const gameController = require("../controllers/gameController");
const routeHelper = require("../helper/routeHelper");
const { query, body, validationResult } = require('express-validator');

router.post('/room/create', routeHelper.mustBeloggedin, [body('name').exists().not().isEmpty(), body('gameId').exists().not().isEmpty()], function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
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
                            errors: errors.array().map(e => e.msg + ": " + e.param)
                        });
                    });
            });
    }

    req.body.name = routeHelper.removeXSS(req.body.name);

    return roomController.create(req.body.name, req.session.userId, "games/" + req.body.gameId)
        .then((roomId) => {
            routeHelper.Redirect(res, '/room/' + roomId);
        });
});

router.get('/room/GetAllGames', routeHelper.mustBeloggedin, function (req, res, next) {
    gameController.GetByUserIdOrPublic(req.session.userId)
        .then((games) => {
            for (var i = 0; i < games.length; i++) {
                games[i].id = gameController.CleanId(games[i].id);
            }

            res.json({
                games: games.map(function (g) {
                    return {
                        id: g.id,
                        name: g.name
                    };
                })
            });
        });
});

router.get('/room/:id', routeHelper.mustBeloggedin, function (req, res, next) {
    roomController.GetById("rooms/" + req.params.id)
        .then((room) => {
            if (room == undefined || room == null) {
                return routeHelper.Redirect(res, '/');
            }
            else {
                routeHelper.renderView(req, res, "room", {
                    roomId: room.id,
                    roomName: room.name,
                    userId: req.session.userId,
                    isMyRoom: room.adminUserId === req.session.userId,
                    baseUrl: "http://" + process.env.URL + ":" + process.env.HTTP_PORT
                });
            }
        });
});

router.get('/room/delete/:id', routeHelper.mustBeloggedin, function (req, res, next) {
    roomController.GetById("rooms/" + req.params.id)
        .then((room) => {
            if (room != undefined && room != null && room.adminUserId == req.session.userId) {
                roomController.delete("rooms/" + req.params.id)
                    .then(() => {
                        routeHelper.Redirect(res, '/');
                    });
            }
            else {
                routeHelper.Redirect(res, '/back');
            }
        });    
});

module.exports = router;
