class Room {
    name;
    adminUserId;
    users = [];
    chat = [];
    game;
    lastLeft;
    settings = { useTurns: false, currentTurn: null, turnsAreReversed: false };

    constructor(name, adminUserId, game) {
        this.name = name;
        this.adminUserId = adminUserId;
        this.game = game;
    }
}

module.exports = Room;