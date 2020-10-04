const documentStore = require("../helper/documentStoreHolder");
const Room = require("../models/room");
const { v4: uuidv4 } = require('uuid');

exports.GetAll = async function () {
    const session = documentStore.openSession();
    const results = await session
        .query({ indexName: "Room/ForSearch" })
        .all();

    return results;
};

exports.GetById = async function (id) {
    const session = documentStore.openSession();
    const results = await session.load(id);

    return results;
};

const GetGameRoom = async function (gameId) {
    const session = documentStore.openSession();
    var game = await session.load(gameId);

    if (game != undefined && game != null && game.items != undefined && game.items != null) {
        for (var i = 0; i < game.items.length; i++) {
            if (game.items[i].isStack === true) {
                var stackItems = [];
                for (var a = 0; a < game.items[i].stackItems.length; a++) {
                    for (var s = 0; s < game.items[i].stackItems[a].amount; s++) {
                        stackItems.push({
                            id: uuidv4(),
                            src: game.items[i].stackItems[a].src,
                        });
                    }
                }

                game.items[i].stackItems = stackItems.sort((a, b) => 0.5 - Math.random());
            }
        }
    }

    return game;
}

exports.GetGameRoom = GetGameRoom;

const shuffle = function (a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

exports.create = async function (name, adminUserId, gameId) {
    const session = documentStore.openSession();
    let room = new Room(name, adminUserId, await GetGameRoom(gameId));
    await session.store(room, 'rooms/' + uuidv4());
    await session.saveChanges();

    return CleanId(room.id);
};

exports.UpdateRoom = async function (id, updatedRoom) {
    const session = documentStore.openSession();
    let room = await session.load(id)

    if (room != undefined && room != null) {
        room.game = updatedRoom.game;
        room.users = updatedRoom.users;
        await session.saveChanges();
    }
};

exports.delete = async function (roomId) {
    const session = documentStore.openSession();
    let room = await session.load(roomId);
    if (room != undefined && room != null) {
        await session.delete(room);
        await session.saveChanges();
    }
};

const CleanId = function (id) {
    let data = id.split("/");
    return data[data.length - 1];
}

exports.CleanId = CleanId;