const { DocumentStore } = require("ravendb");

const documentStore = new DocumentStore(process.env.RAVENDB_URL, process.env.RAVENDB_DATABASE);

documentStore.initialize();

module.exports = documentStore; 