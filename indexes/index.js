const documentStore = require("../helper/documentStoreHolder");

const User_ForAuthentication = require("../indexes/userForAuthentication");
const Room_ForSearch = require("../indexes/roomForSearch");
const Game_ForSearch = require("../indexes/gameForSearch");

exports.CreateIndexes = function () {
    const UserForAuthentication = new User_ForAuthentication();
    const RoomForSearch = new Room_ForSearch();
    const GameForSearch = new Game_ForSearch();

    UserForAuthentication.execute(documentStore);
    RoomForSearch.execute(documentStore);
    GameForSearch.execute(documentStore);
};