const { AbstractIndexCreationTask } = require("ravendb");

class User_ForAuthentication extends AbstractIndexCreationTask {
    constructor() {
        super();
        this.map = "docs.Users.Select(User => new {" +
            "    username = User.username," +
            "    password = User.password" +
            "})";
    }
}

module.exports = User_ForAuthentication;