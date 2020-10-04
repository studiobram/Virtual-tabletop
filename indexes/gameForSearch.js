const { AbstractIndexCreationTask } = require("ravendb");

class Game_ForSearch extends AbstractIndexCreationTask {
    constructor() {
        super();
        this.map = "docs.Games.Select(Games => new {" +
            "    id = Games.id," +
            "    name = Games.name," +
            "    userId = Games.userId," +
            "    isPublic = Games.isPublic," +
            "})";
    }
}

module.exports = Game_ForSearch;