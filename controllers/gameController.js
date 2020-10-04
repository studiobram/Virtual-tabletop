const documentStore = require("../helper/documentStoreHolder");
const Game = require("../models/game");
const { v4: uuidv4 } = require('uuid');

exports.GetAll = async function () {
    const session = documentStore.openSession();
    const results = await session
        .query({ indexName: "Game/ForSearch" })
        .all();

    return results;
};

exports.GetByUserId = async function (userId) {
    const session = documentStore.openSession();
    const results = await session
        .query({ indexName: "Game/ForSearch" })
        .whereEquals('userId', userId)
        .all();

    return results;
};

exports.GetByUserIdOrPublic = async function (userId) {
    const session = documentStore.openSession();
    const results = await session
        .query({ indexName: "Game/ForSearch" })
        .whereEquals('userId', userId)
        .orElse()
        .whereEquals('isPublic', true)
        .all();

    return results;
};

exports.GetById = async function (id) {
    const session = documentStore.openSession();
    const results = await session.load(id);

    return results;
};

exports.create = async function (name, userId) {
    const session = documentStore.openSession();
    let game = new Game(name, userId);
    await session.store(game, 'games/' + uuidv4());
    await session.saveChanges();

    return CleanId(game.id);
};

exports.update = async function (gameId, items, isPublic, name) {
    const session = documentStore.openSession();
    let game = await session.load(gameId);
    game.name = name;
    game.isPublic = isPublic;
    game.items = items;
    await session.saveChanges();
}

exports.delete = async function (gameId) {
    const session = documentStore.openSession();
    let game = await session.load(gameId);
    if (game != undefined && game != null) {
        await session.delete(game);
        await session.saveChanges();
    }    
};

const CleanId = function (id) {
    let data = id.split("/");
    return data[data.length - 1];
}

exports.CleanId = CleanId;