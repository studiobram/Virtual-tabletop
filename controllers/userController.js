const sha256 = require('js-sha256').sha256;
const documentStore = require("../helper/documentStoreHolder");
const User = require("../models/User");
const { v4: uuidv4 } = require('uuid');

exports.doesUserAlreadyExist = async function (username) {
    const session = documentStore.openSession();
    const results = await session
        .query({ indexName: "User/ForAuthentication" })
        .whereEquals("username", username)
        .all();

    return results.length != 0;
};

exports.register = async function (username, password) {
    const session = documentStore.openSession();
    let user = new User(username, sha256(password));
    await session.store(user, 'users/' + uuidv4());
    await session.saveChanges();

    return user.id;
};

exports.authenticate = async function (username, password) {
    const session = documentStore.openSession();
    const results = await session
        .query({ indexName: "User/ForAuthentication" })
        .whereEquals("username", username)
        .whereEquals("password", sha256(password))
        .all();

    return results.length == 1 ? results[0].id : null;
};

exports.GetById = async function (id) {
    const session = documentStore.openSession();
    const results = await session.load(id);

    return results;
};