const roomController = require("./controllers/roomController");
const userController = require("./controllers/userController");
const routeHelper = require("./helper/routeHelper");
const { v4: uuidv4 } = require('uuid');

const MakeShureRoomExist = async (roomID) => {
    let room = rooms.find(x => x.id == roomID);

    if (room != undefined && room != null) {
        return room;
    }

    return roomController.GetById(roomID)
        .then((room) => {
            if (
                room != null &&
                room.game != undefined && room.game != null &&
                room.game.items != undefined && room.game.items != null
            ) {
                for (var i = 0; i < room.game.items.length; i++) {
                    if (room.game.items[i].stackItems != undefined && room.game.items[i].stackItems != null) {
                        room.game.items[i].stackItemCount = room.game.items[i].stackItems.length;
                    }                    
                }
            }

            rooms.push(room);
            return room;
        });
}

const ChanegItem = (item, change) => {
    switch (change) {
        case "pin":
            item.canBeDragged = item.canBeDragged === true ? false : true;
            break;
        case "turn":
            if (item.canBeTurned === true) {
                item.isTurned = item.isTurned === true ? false : true;
            }
            break;
        case "rotate":
            if (item.canBeRotated === true) {
                if (item.rotation == undefined) {
                    item.rotation = 0;
                }

                let rotation = +item.rotation + +item.rotationSteps;
                if (rotation > 360) {
                    rotation = rotation - 360;
                }

                item.rotation = rotation;
            }
            break;
        case "shuffle":
            if (item.isStack === true && item.stackItems.length > 0) {
                item.stackItems = Shuffle(item.stackItems);
            }
            break;
    }

    if (item.isStack) {
        item.stackItem = [];
    }

    return item;
}

const GetRoom = (roomID) => {
    return rooms.find(x => x.id == roomID);
}

const UpdateGameUsers = (socket, roomID, includingSelf) => {
    let room = GetRoom(roomID);

    let users = [];
    for (var i = 0; i < room.users.length; i++) {
        users.push({
            id: room.users[i].id,
            name: room.users[i].name,
            isConnected: room.users[i].isConnected,
            handLength: room.users[i].hand.length,
        });
    }

    if (includingSelf) {
        socket.emit('usersUpdate', users);
    }

    socket.to(roomID).emit('usersUpdate', users);
}

const SendChat = (message, room, socket, currentRoomId) => {
    let date = new Date(Date.now());
    let hours = date.getHours();
    let minutes = date.getMinutes();

    let chatMessage = "[" + TimeConverter(hours) + ":" + TimeConverter(minutes) + "] " + message;

    room.chat.push(chatMessage);
    socket.emit('receiveChatMessage', chatMessage);
    socket.in(currentRoomId).emit('receiveChatMessage', chatMessage);
}

const TimeConverter = (i) => {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}

const Shuffle = (a) => {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

const MostFrequent = (data) => {
    var mf = 1;
    var m = 0;
    var item;

    if (data.length > 0) {
        item = data[0];
    }

    for (var i = 0; i < data.length; i++) {
        for (var j = i; j < data.length; j++) {
            if (data[i] == data[j])
                m++;
            if (mf < m) {
                mf = m;
                item = data[i];
            }
        }
        m = 0;
    }

    return item;
}

const GetCurrentUser = (socket) => {
    for (var i = 0; i < clients.length; i++) {
        if (clients[i].id == socket.id) {
            return clients[i];
        }
    }

    return null;
}

let rooms = [];

module.exports = function (ioHttps) {
    return {
        load: function () {
            const io = require('socket.io')(ioHttps, { path: '/game-board' });
            console.log("Start a http socket.io server on Start https server on http://" + process.env.URL + ":" + process.env.SOCKETIO_PORT);
            
            // Remove rooms from memory if the don't exist or havent been used for a while
            setInterval(function () {
                roomController.GetAll()
                    .then((allRooms) => {
                        for (var i = 0; i < rooms.length; i++) {
                            // Check of room still exists in database
                            let currentRoom = allRooms.find(x => x.id === rooms[i].id);
                            if (currentRoom == undefined || currentRoom == null) {
                                rooms.splice(i, 1);
                                i--;
                                continue;
                            }

                            let activeUser = rooms[i].users.find(x => x.isConnected === true);
                            if (activeUser != undefined && activeUser != null) {
                                continue;
                            }

                            // Check for last active, otherwise remover room from memory
                            if (rooms[i].lastLeft instanceof Date && rooms[i].lastLeft.getTime() < new Date(Date.now()).getTime() + (6 * 60 * 1000)) {
                                rooms.splice(i, 1);
                                i--;
                                continue;
                            }
                        }
                    }).catch((err) => {
                        console.error(err);
                    });
            }, 2 * 60 * 1000);

            io.on('connection', function (socket) {
                socket.on("roomJoin", function (joinData) {
                    let currentRoomId = joinData.roomId;

                    MakeShureRoomExist(joinData.roomId)
                    .then(async (room) => {
                            let user = room.users.find(x => x.id == joinData.userId);
                            if (user != undefined && user != null) {
                                user.socketId = socket.id;
                                user.isConnected = true;
                            }
                            else {
                                let dbUser = await userController.GetById(joinData.userId);
                                room.users.push({
                                    id: joinData.userId,
                                    socketId: socket.id,
                                    name: dbUser.username,
                                    isConnected: true,
                                    hand: [],
                                });
                            }

                            return room;
                    })
                    .then((room) => {

                        socket.join(currentRoomId);

                        function GetRoomData() {
                            let gameId = routeHelper.CleanId(room.game.id);

                            let joinData = {
                                Images: room.game.files.map(e => gameId + "/" + e.fileName),
                                Items: room.game.items.map(el => {
                                    if (el.isStack === true)
                                        return Object.assign({}, el, { stackItems: [], stackItemCount: el.stackItems.length })
                                    return el
                                }),
                                hand: room.users.find(x => x.socketId == socket.id).hand,
                                settings: room.settings,
                            };

                            return joinData;
                        }

                        socket.emit('roomJoined');
                        socket.emit('gameLoad', GetRoomData());

                        UpdateGameUsers(socket, currentRoomId, true);

                        socket.emit('receiveChatMessages', GetRoom(currentRoomId).chat);
                        SendChat("The user " + room.users.find(x => x.socketId == socket.id).name + " has joind the room", GetRoom(currentRoomId), socket, currentRoomId);

                        // Room
                        socket.on("roomReset", function () {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);

                            if (user != null && room.adminUserId === user.id) {
                                roomController.GetGameRoom(room.game.id).then((game) =>
                                {
                                    if (game != undefined && game != null) {
                                        room.game = game;

                                        for (var i = 0; i < game.items.length; i++) {
                                            if (game.items[i].isStack === true) {
                                                game.items[i].stackItemCount = game.items[i].stackItems.length;
                                            }
                                        }

                                        for (var i = 0; i < room.users.length; i++) {
                                            room.users[i].hand = [];
                                        }

                                        if (room.settings.useTurns === true) {
                                            let nextUser = room.users[0];
                                            room.settings.currentTurn = nextUser.id;
                                            io.to(nextUser.socketId).emit('roomNextTurn');
                                            SendChat("It is " + nextUser.name + " turn", room, socket, currentRoomId);
                                        }
                                        else {
                                            room.settings.currentTurn = null;
                                        }

                                        let roomData = GetRoomData();
                                        socket.emit('gameLoad', roomData);
                                        socket.to(currentRoomId).emit('gameLoad', roomData);

                                        SendChat("The room has been reset", room, socket, currentRoomId);
                                    }
                                });                                
                            }
                        });

                        socket.on("roomLoadGame", function (gameId) {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);

                            if (user != null && room.adminUserId === user.id) {
                                roomController.GetGameRoom("games/" + gameId).then((game) => {
                                    if (game != undefined && game != null) {
                                        room.game = game;

                                        for (var i = 0; i < game.items.length; i++) {
                                            if (game.items[i].isStack === true) {
                                                game.items[i].stackItemCount = game.items[i].stackItems.length;
                                            }
                                        }

                                        for (var i = 0; i < room.users.length; i++) {
                                            room.users[i].hand = [];
                                        }

                                        if (room.settings.useTurns === true) {
                                            let nextUser = room.users[0];
                                            room.settings.currentTurn = nextUser.id;
                                            io.to(nextUser.socketId).emit('roomNextTurn');
                                            SendChat("It is " + nextUser.name + " turn", room, socket, currentRoomId);
                                        }
                                        else {
                                            room.settings.currentTurn = null;
                                        }

                                        let roomData = GetRoomData();
                                        socket.emit('gameLoad', roomData);
                                        socket.to(currentRoomId).emit('gameLoad', roomData);

                                        SendChat(' The game "' + game.name + '" has been loaded', room, socket, currentRoomId);
                                    }
                                });
                            }
                        });

                        socket.on("roomSaveState", function () {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);

                            if (user != null && room.adminUserId === user.id) {
                                roomController.UpdateRoom(room.id, room).then(() => {
                                    socket.emit('savedRoomState');
                                    SendChat("The room state hase been saved", room, socket, currentRoomId);
                                });
                            }
                        });

                        socket.on("roomReorderUsers", function () {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);

                            if (user != null && room.adminUserId === user.id) {
                                room.users = Shuffle(room.users);

                                UpdateGameUsers(socket, currentRoomId, true);
                                SendChat("Randomize the user order", room, socket, currentRoomId);

                                if (room.settings.useTurns === true) {
                                    let nextUser = room.users[0];
                                    room.settings.currentTurn = nextUser.id;
                                    io.to(nextUser.socketId).emit('roomNextTurn');
                                    SendChat("It is " + nextUser.name + " turn", room, socket, currentRoomId);
                                }
                                else {
                                    room.settings.currentTurn = null;
                                }
                            }
                        });

                        socket.on("roomUpdateSettings", function (settings) {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);

                            if (user != null && room.adminUserId === user.id) {
                                room.settings.useTurns = settings.useTurns;

                                if (room.settings.useTurns === true) {
                                    let nextUser = room.users[0];
                                    room.settings.currentTurn = nextUser.id;
                                    io.to(nextUser.socketId).emit('roomNextTurn');
                                    SendChat("It is " + nextUser.name + " turn", room, socket, currentRoomId);
                                }
                                else {
                                    room.settings.currentTurn = null;
                                }
                            }
                        });

                        socket.on("roomClose", function () {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);

                            if (user != null && room.adminUserId === user.id) {
                                roomController.delete(room.id).then(() => {
                                    socket.emit('disconnectFromRoom', "The room hase been closed");
                                    socket.to(currentRoomId).emit('disconnectFromRoom', "The room hase been closed");

                                    let index = rooms.indexOf(room);
                                    rooms.splice(index, 1);

                                    SendChat("The room has been closed", room, socket, currentRoomId);
                                });
                            }
                        });

                        socket.on("roomKickUser", function (userId) {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);
                            let userToKick = room.users.find(x => x.id == userId);

                            if (user != null && userToKick != null && room.adminUserId === user.id) {
                                socket.to(userToKick.socketId).emit('disconnectFromRoom', "You have been kickt from the room");

                                for (var i = 0; i < userToKick.hand.length; i++) {
                                    var handItem = userToKick.hand[i];
                                    handItem.x = 10;
                                    handItem.y = 10;

                                    room.game.items.push(handItem);

                                    socket.emit('addItem', { item: handItem });
                                    socket.in(currentRoomId).emit('addItem', { item: handItem });
                                }

                                let index = room.users.indexOf(userToKick);
                                room.users.splice(index, 1);
                                UpdateGameUsers(socket, currentRoomId, true);
                                SendChat("The user " + userToKick.name + " has been kicked", room, socket, currentRoomId);
                            }
                        });

                        socket.on("roomReverseTurnOrder", function () {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);

                            if (room.settings.useTurns === true && user != null && room.adminUserId === user.id) {
                                room.settings.turnsAreReversed = room.settings.turnsAreReversed === true ? false : true;
                                SendChat("The turn order has been reversed", room, socket, currentRoomId);
                            }
                        });

                        socket.on("roomEndTurn", function () {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);

                            if (room.settings.useTurns === true && user != null && room.settings.currentTurn === user.id) {
                                let index = room.users.indexOf(user);
                                let nextUsernumber = room.settings.turnsAreReversed === true ? index == 0 ? room.users.length - 1 : index - 1 : room.users.length - 1 == index ? 0 : index + 1;
                                let nextUser = room.users[nextUsernumber];
                                room.settings.currentTurn = nextUser.id;
                                io.to(nextUser.socketId).emit('roomNextTurn');
                                SendChat("It is " + nextUser.name + " turn", room, socket, currentRoomId);
                            }
                        });

                        // Items
                        socket.on("onMove", function (data) {
                            let room = GetRoom(currentRoomId);

                            let item = room.game.items.find(x => x.id == data.id);
                            if (item == undefined || item == null) {
                                return;
                            }
                            item.x = data.x;
                            item.y = data.y;

                            // Move the item to the top
                            let index = room.game.items.indexOf(item);
                            if (index != room.game.items.length - 1) {
                                room.game.items.push(item);
                                room.game.items.splice(index, 1);
                            }

                            socket.to(currentRoomId).emit('itemUpdate', data);
                        });

                        socket.on("onChange", function (data) {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);

                            let item = room.game.items.find(x => x.id == data.id);
                            if (item == undefined || item == null) {
                                return;
                            }

                            ChanegItem(item, data.change);

                            if (data.change == "shuffle" && item.isStack === true && item.stackItems.length > 0) {
                                SendChat(user.name + " shuffled a stack", room, socket, currentRoomId);
                            }

                            socket.emit('itemUpdate', item);
                            socket.to(currentRoomId).emit('itemUpdate', item);
                        });

                        socket.on("insertAtPosition", function (data) {
                            let room = GetRoom(currentRoomId);

                            let item = room.game.items.find(x => x.id == data.itemId);
                            let stack = room.game.items.find(x => x.id == data.stackId);
                            if (item == undefined || item == null || stack == undefined || stack == null) {
                                return;
                            }

                            let position = data.position >= stack.stackItems.length ? stack.stackItems.length : data.position;
                            stack.stackItems.splice(position, 0, { id: item.id, src: item.src });
                            stack.stackItemCount = stack.stackItems.length;

                            let index = room.game.items.indexOf(item);
                            room.game.items.splice(index, 1);

                            // resend all items to client
                            socket.emit('itemUpdate', { id: stack.id, stackItemCount: stack.stackItemCount });
                            socket.in(currentRoomId).emit('itemUpdate', { id: stack.id, stackItemCount: stack.stackItemCount });

                            socket.emit('removeItem', { id: item.id });
                            socket.in(currentRoomId).emit('removeItem', { id: item.id });
                        });

                        socket.on("groupItems", function (data) {
                            let room = GetRoom(currentRoomId);

                            // Create stack
                            let stackItem = {
                                "id": uuidv4(),
                                "isDragging": false,
                                "canBeDragged": true,
                                "isStack": true,
                                "showStackCount": false,
                                "stackItems": [],
                                "stackItemCount": 0,
                                "isSelected": false,
                            };

                            var items = room.game.items.filter(a => data.ids.indexOf(a.id) != -1);

                            var stacks = room.game.items.filter(a => data.ids.indexOf(a.id) != -1).filter(a => a.isStack === true);

                            stackItem.src = stacks != undefined && stacks != null && stacks.length == 1 ? stacks[0].src : MostFrequent(items.map(a => a.src));
                            stackItem.backsrc = MostFrequent(items.map(a => a.backsrc));
                            stackItem.canBeTurned = MostFrequent(items.map(a => a.canBeTurned));
                            stackItem.canBeRotated = MostFrequent(items.map(a => a.canBeRotated));
                            stackItem.rotationSteps = MostFrequent(items.map(a => a.rotationSteps));
                            stackItem.rotation = MostFrequent(items.map(a => a.rotation));

                            stackItem.drawClosed = data.faceUp === false;
                            if (stackItem.canBeTurned === true) {
                                stackItem.isTurned = data.faceUp === false;
                            }

                            for (var i = 0; i < data.ids.length; i++) {
                                let item = room.game.items.find(x => x.id == data.ids[i]);
                                if (item == undefined || item == null) {
                                    break;
                                }

                                // Get some settings form first item
                                if (i == 0) {
                                    stackItem.width = item.width;
                                    stackItem.height = item.height;
                                    stackItem.x = item.x;
                                    stackItem.y = item.y;
                                    stackItem.order = Math.trunc(item.order);
                                }

                                // If is stack the merge
                                if (item.isStack === true) {
                                    stackItem.stackItems = stackItem.stackItems.concat(item.stackItems);
                                    stackItem.showStackCount = stackItem.showStackCount === false && item.showStackCount === false ? false : true;
                                }
                                else {
                                    // Add item to stack
                                    stackItem.stackItems.push({
                                        "id": uuidv4(),
                                        "src": item.src,
                                    });
                                }                                

                                // Delete item and send immediately to the clients
                                let index = room.game.items.indexOf(item);
                                room.game.items.splice(index, 1);

                                socket.emit('removeItem', { id: item.id });
                                socket.in(currentRoomId).emit('removeItem', { id: item.id });
                            }

                            stackItem.stackItems = Shuffle(stackItem.stackItems);
                            stackItem.stackItemCount = stackItem.stackItems.length;

                            // Add stack item
                            room.game.items.push(stackItem);

                            socket.emit('addItem', { item: stackItem });
                            socket.in(currentRoomId).emit('addItem', { item: stackItem });
                        });

                        socket.on("takeFromStack", function (data) {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);
                            let item = room.game.items.find(x => x.id == data.id && x.isStack === true && x.stackItems.length > 0);

                            if (user == null || item === null) {
                                return;
                            }

                            let index = room.game.items.indexOf(item);

                            let stackItemNumber = 0;
                            if (data.position != undefined && data.position != null) {
                                stackItemNumber = data.position >= item.stackItems.length ? item.stackItems.length - 1 : data.position;
                                SendChat(user.name + " took an item from a stack at position " + (stackItemNumber + 1), room, socket, currentRoomId);
                            }
                            else if (data.takeToHand === false) {
                                SendChat(user.name + " took an item from a stack", room, socket, currentRoomId);
                            }

                            let stackItem = item.stackItems[stackItemNumber];

                            stackItem.parentStackId = item.id;
                            stackItem.width = item.width;
                            stackItem.height = item.height;
                            stackItem.x = item.x;
                            stackItem.y = item.y;
                            stackItem.isDragging = false;
                            stackItem.canBeDragged = true;
                            stackItem.canBeTurned = item.canBeTurned;
                            stackItem.backsrc = item.backsrc;
                            stackItem.isTurned = item.drawClosed === true;
                            stackItem.canBeRotated = item.canBeRotated;
                            stackItem.rotationSteps = item.rotationSteps;
                            stackItem.rotation = 0;
                            stackItem.isStack = false;

                            stackItem.order = item.order + ((room.game.items.filter((obj) => obj.parentStackId === item.id).length + 1) * 0.1);

                            if (data.takeToHand === true)
                            {
                                user.hand.push(stackItem);

                                stackItem.x = 10;
                                stackItem.y = 10;

                                socket.emit('addHandItem', { item: stackItem, postion: index + 1 });
                                SendChat(user.name + " took an item from a stack to hand ", room, socket, currentRoomId);
                            }
                            else
                            {
                                room.game.items.splice(index + 1, 0, stackItem);

                                socket.emit('addItem', { item: stackItem, postion: index + 1 });
                                socket.in(currentRoomId).emit('addItem', { item: stackItem, postion: index + 1 });
                            }

                            item.stackItems.splice(stackItemNumber, 1);
                            item.stackItemCount = item.stackItems.length;

                            // resend all items to client
                            socket.emit('itemUpdate', { id: item.id, stackItemCount: item.stackItemCount });
                            socket.in(currentRoomId).emit('itemUpdate', { id: item.id, stackItemCount: item.stackItemCount });

                            if (item.stackItemCount <= 0) {
                                let id = item.id;
                                room.game.items.splice(index, 1);
                                socket.emit('removeItem', { id: id });
                                socket.in(currentRoomId).emit('removeItem', { id: id });
                            }                      
                        });

                        // Hand
                        socket.on("addToHand", function (data) {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);

                            if (user == null) {
                                return;
                            }

                            let item = room.game.items.find(x => x.id == data.id);
                            item.x = data.x;
                            item.y = data.y;

                            let index = room.game.items.indexOf(item);
                            room.game.items.splice(index, 1);

                            socket.emit('removeItem', { id: item.id });
                            socket.in(currentRoomId).emit('removeItem', { id: item.id });

                            user.hand.push(item);

                            socket.emit('addHandItem', { item: item });

                            UpdateGameUsers(socket, currentRoomId, true);
                        });

                        socket.on("addToBoard", function (data) {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);

                            if (user == null) {
                                return;
                            }

                            let item = user.hand.find(x => x.id == data.id);
                            if (item == null) {
                                return;
                            }

                            item.x = data.x;
                            item.y = data.y;

                            let index = user.hand.indexOf(item);
                            user.hand.splice(index, 1);

                            socket.emit('removeHandItem', { id: item.id });

                            room.game.items.push(item);

                            socket.emit('addItem', { item: item });
                            socket.in(currentRoomId).emit('addItem', { item: item });

                            UpdateGameUsers(socket, currentRoomId, true);
                        });

                        socket.on("onChangeHandItem", function (data) {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);

                            if (user == null) {
                                return;
                            }

                            let item = user.hand.find(x => x.id == data.id);
                            if (item == null) {
                                return;
                            }
                            
                            ChanegItem(item, data.change);
                            
                            socket.emit('handItemUpdate', item);
                        });

                        socket.on("onMoveHandItem", function (data) {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);

                            if (user == null) {
                                return;
                            }

                            let item = user.hand.find(x => x.id == data.id);
                            if (item == null) {
                                return;
                            }

                            item.x = data.x;
                            item.y = data.y;

                            // Move the item to the top
                            let index = user.hand.indexOf(item);
                            if (index != user.hand.length - 1) {
                                user.hand.push(item);
                                user.hand.splice(index, 1);
                            }
                        });
                        
                        socket.on('takeFromStackInHand', function (data) {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);

                            if (user == null) {
                                return;
                            }

                            let item = user.hand.find(x => x.id == data.id && x.isStack === true && x.stackItems.length > 0);
                            if (item === null) {
                                return;
                            }

                            let index = user.hand.indexOf(item);

                            let stackItemNumber = 0;
                            if (data.position != undefined && data.position != null) {
                                stackItemNumber = data.position >= item.stackItems.length ? item.stackItems.length - 1 : data.position;
                            }

                            let stackItem = item.stackItems[stackItemNumber];

                            stackItem.parentStackId = item.id;
                            stackItem.width = item.width;
                            stackItem.height = item.height;
                            stackItem.x = item.x;
                            stackItem.y = item.y;
                            stackItem.isDragging = false;
                            stackItem.canBeDragged = true;
                            stackItem.canBeTurned = item.drawClosed !== true;
                            stackItem.backsrc = item.backsrc;
                            stackItem.isTurned = item.isTurned;
                            stackItem.canBeRotated = item.canBeRotated;
                            stackItem.rotationSteps = item.rotationSteps;
                            stackItem.rotation = 0;
                            stackItem.isStack = false;

                            stackItem.order = item.order + ((user.hand.filter((obj) => obj.parentStackId === item.id).length + 1) * 0.1);

                            user.hand.splice(index + 1, 0, stackItem);
                            item.stackItems.splice(stackItemNumber, 1);
                            item.stackItemCount = item.stackItems.length;

                            // resend all items to client
                            socket.emit('addHandItem', { item: stackItem, postion: index + 1 });
                            socket.emit('handItemUpdate', { id: item.id, stackItemCount: item.stackItemCount });

                            if (item.stackItemCount <= 0) {
                                let id = item.id;
                                user.hand.splice(index, 1);
                                socket.emit('removeHandItem', { id: id });
                            }     
                        });

                        socket.on('resetHand', function () {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);

                            if (user == null) {
                                return;
                            }

                            let lastItemsX = 0;
                            let lastItemsWidth = 0;
                            for (let i = 0; i < user.hand.length; i++) {
                                let item = user.hand[i];                                
                                item.x = lastItemsX + lastItemsWidth + 10;
                                item.y = 10;

                                lastItemsX = parseInt(item.x);
                                lastItemsWidth = parseInt(item.width);

                                socket.emit('removeHandItem', { id: item.id });
                            }

                            socket.emit('addHandItems', { items: user.hand });
                        });

                        socket.on('chatSend', function (data) {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);

                            if (user == null) {
                                return;
                            }

                            let message = user.name + ": " + data.message;

                            SendChat(message, room, socket, currentRoomId);
                        });

                        socket.on('throwDice', function () {
                            let room = GetRoom(currentRoomId);
                            let user = room.users.find(x => x.socketId == socket.id);

                            if (user == null) {
                                return;
                            }

                            let message = user.name + " threw a " + (Math.floor(Math.random() * 6) + 1);

                            SendChat(message, room, socket, currentRoomId);
                        });

                        socket.on('disconnect', function () {
                            let room = GetRoom(currentRoomId);
                            if (room == undefined || room == null) {
                                return;
                            }
                            let user = room.users.find(x => x.socketId == socket.id);

                            if (user != null) {
                                user.isConnected = false;
                                user.socketId = "";
                                room.lastLeft = new Date(Date.now());

                                UpdateGameUsers(socket, currentRoomId, false);
                                SendChat("The user " + user.name + " has left the room", GetRoom(currentRoomId), socket, currentRoomId);
                            }
                        });
                    });
                });
            });
        }
    }
};