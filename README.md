# Virtual tabletop

Virtual tabletop is an online site that you can use to create and play board games using the browser.

![preview](https://i.imgur.com/1M71J9f.png)

It is made using: 
  - [Node.js](https://nodejs.org/en/)
  - [Express](https://github.com/expressjs/express)
  - Socket.io 
  - [Ravendb](https://ravendb.net/)

### Installation

Virtual tabletop requires [Node.js](https://nodejs.org/en/) and [Ravendb](https://ravendb.net/) to run.
After installing and setting up Node.js and Ravendb we can start setting up the server. Begin by creating a database in ravendb and creating a .env file for the configuration. The project contains an example .env file that you can use and an example database with an example card game that you can import in your database.

```sh
NODE_ENV=production
HTTP_PORT=3001
SOCKETIO_PORT=3001
URL=localhost
RAVENDB_URL=http://localhost:8080 // Add the url that you have configured ravendb to
RAVENDB_DATABASE=Virtual-tabletop // The name of the database you have created in ravendb
SECRET=qwe123ewq321 // Try to make at least some changes to this string
```

After setting up the configuration you need to run the following command in the project folder
```sh
$ npm install
```

After that is done you can start the server by running 
```sh
$ npm start
```

### Troubleshooting

If something goes wrong while starting the server check the following things

- Has the ravendb server been started?
- Does the database that you have configured exist in the ravendb server?

## License

  [MIT](LICENSE)