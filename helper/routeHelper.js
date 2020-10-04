const gameController = require("../controllers/gameController");

const es6Renderer = require('express-es6-template-engine');

const Redirect = (res, url) => {
    let baseUrl = "http://" + process.env.URL + ":" + process.env.HTTP_PORT;
    res.redirect(baseUrl + url);
}

exports.Redirect = Redirect;

exports.renderView = (req, res, viewName, localData) => {
    es6Renderer(__dirname + '/../views/' + viewName + ".html", {
        locals: localData
    },
        (err, content) => {
            res.render('master.html',
                {
                    locals: {
                        partial: content,
                        loggedIn: req.session.userId != undefined && req.session.userId != null,
                    }
                })
        });
};

exports.mustBeloggedin = (req, res, next) => {
    if (req.session.userId != undefined) {
        next();
    }
    else {
        Redirect(res, '/login');
    }
};

exports.mustBeloggedout = (req, res, next) => {
    if (req.session.userId != undefined) {
        Redirect(res, '/');
    }
    else {
        next();
    }
};

exports.mustBeloggedinAndHasGame = (req, res, next) => {
    if (req.session.userId) {//id
        let gameId;
        if (req.params.gameId != undefined) {
            gameId = req.params.gameId;
        }
        else if (req.params.id != undefined) {
            gameId = req.params.id;
        }
        else {
            Redirect(res, '/back');
        }

        gameController.GetById("games/" + gameId)
            .then((game) => {
                if (game != undefined && game != null && game.userId == req.session.userId) {
                    next();
                }
                else {
                    Redirect(res, '/back');
                }
            });
    }
    else {
        Redirect(res, '/login');
    }
};

exports.removeXSS = (value) => {
    var lt = /</g,
        gt = />/g,
        ap = /'/g,
        ic = /"/g;
    return value.toString().replace(lt, "&lt;").replace(gt, "&gt;").replace(ap, "&#39;").replace(ic, "&#34;");
}

exports.CleanId = (id) => {
    let data = id.split("/");
    return data[data.length - 1];
}