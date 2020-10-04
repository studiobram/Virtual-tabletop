const documentStore = require("../helper/documentStoreHolder");
const FileItem = require("../models/FileItem");
const { v4: uuidv4 } = require('uuid');
const path = require('path');

exports.GetAll = async function (gameId) {
    const session = documentStore.openSession();
    const result = await session.load(gameId);
    if (result == null) {
        return [];
    }

    let fileIdArray = result.id.split("/");
    var fileId = fileIdArray[fileIdArray.length - 1];

    for (var i = 0; i < result.files.length; i++) {
        result.files[i].src = fileId + "/" + result.files[i].fileName;
    }

    return result.files;
};

exports.Store = async function (gameId, formFiles) {
    const session = documentStore.openSession();
    let document = await session.load(gameId);

    if (document == null) {
        return;
    }

    // Make shure it's an array
    if (!Array.isArray(formFiles.files)) {
        formFiles.files = [formFiles.files];
    }

    if (document.files == undefined) {
        document.files = [];
    }

    for (var i = 0; i < formFiles.files.length; i++) {
        let filename = formFiles.files[i].name;
        let filePath = path.parse(filename);

        if (document.files.some(e => e.Name === formFiles.files[i].name)) {
            let date = new Date()
            filename = filePath.name + "_" + date.toISOString().substring(0, 10) + filePath.ext;
        }

        // convert
        let fileItem = new FileItem();
        fileItem.name = filename;
        fileItem.fileName = uuidv4() + filePath.ext;

        // attetc
        session.advanced.attachments.store(document.id, fileItem.fileName, formFiles.files[i].data, "image/png");

        document.files.push(fileItem);
    }

    await session.saveChanges();
}

exports.delete = async function (gameId, fileName) {
    const session = documentStore.openSession();
    let file = await session.load(gameId);
    
    if (file != null && await session.advanced.attachments.exists(file.id, fileName)) {
        file = await session.load(file.id);

        var fileLocation = file.files.find(x => x.fileName == fileName);
        if (fileLocation != undefined && fileLocation != null) {
            file.files.splice(file.files.indexOf(fileLocation), 1);
        }

        session.advanced.attachments.delete(file.id, fileName);

        await session.saveChanges();

        return true;
    }

    return false;
};

exports.GetFile = async function (gameId, fileName, res) {
    const session = documentStore.openSession();
    let document = await session.load(gameId);

    if (document == undefined || document == null) {
        return null;
    }

    var doesExits = await session.advanced.attachments.exists(document.id, fileName);

    if (doesExits == false) {
        return null;
    }

    let attachment = await session.advanced.attachments.get(document.id, fileName);

    return attachment.data.pipe(res);
};