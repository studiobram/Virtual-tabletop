class Game {
    name;
    userId;
    isPublic = false;
    items = [];
    files = [];

    constructor(name, userId) {
        this.name = name;
        this.userId = userId;
    }
}

module.exports = Game;