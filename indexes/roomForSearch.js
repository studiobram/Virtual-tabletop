const { AbstractIndexCreationTask } = require("ravendb");

class Room_ForSearch extends AbstractIndexCreationTask {
    constructor() {
        super();
        this.map = "docs.Rooms.Select(Rooms => new {" +
            "    name = Rooms.name," +
            "})";
    }
}

module.exports = Room_ForSearch;