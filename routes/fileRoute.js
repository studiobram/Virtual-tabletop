const express = require('express');
const router = express.Router();
const fileController = require("../controllers/fileController");
const routeHelper = require("../helper/routeHelper");

const { query, body, validationResult } = require('express-validator');

const upload = require('express-fileupload');
router.use(upload({
    limits: {
        fileSize: 1000000 * 60 // 1mb * 60
    },
    abortOnLimit: true
}));

router.get('/files/:gameId', routeHelper.mustBeloggedinAndHasGame, function (req, res, next) {
    fileController.GetAll("games/" + req.params.gameId)
        .then((files) => {
            res.json({ files: files });
        });
});

router.post('/file/add/:gameId', routeHelper.mustBeloggedinAndHasGame, [], function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array().map(e => e.msg + ": " + e.param) });
    }

    if (req.files == null || req.files.length <= 0) {
        return res.json({ message: "No file was send" });
    }

    let fileHasBeenRemoved = false;
    if (Array.isArray(req.files.files)) {
        for (var i = 0; i < req.files.files.length; i++) {
            if (req.files.files[i].mimetype != "image/gif" && req.files.files[i].mimetype != "image/jpeg" && req.files.files[i].mimetype != "image/png") {
                req.files.files.splice(i, 1);
            }
        }
    }
    else if (req.files.files.mimetype != "image/gif" && req.files.files.mimetype != "image/jpeg" && req.files.files.mimetype != "image/png") {
        return res.json({ message: "File type not supported" });
    }

    return fileController.Store("games/" + req.params.gameId, req.files)
        .then(() => {
            res.json({
                message: "Files successfully saved" + (fileHasBeenRemoved ? ", some of the files have file types that weren't supported. These files haven't been stored" : "")
            });
        });
});

router.get('/file/delete/:gameId/:name', routeHelper.mustBeloggedinAndHasGame, function (req, res, next) {
    fileController.delete("games/" + req.params.gameId, req.params.name)
        .then((wasDeleted) => {
            res.json({ message: "File " + req.params.name + (wasDeleted == true ? " successfully deleted" : " couldn't be deleted") });
        });
});

router.get('/file/:gameId/:name', function (req, res, next) {
    fileController.GetFile("games/" + req.params.gameId, req.params.name, res)
        .then((stream) => {
            if (stream == null) {
                res.status(404).json({ message: "File not found" });
            }
        });
});

module.exports = router;
