class GameBoard {
    socket;
    canvas = document.getElementById("canvas");
    ctx = this.canvas.getContext("2d");

    BB = this.canvas.getBoundingClientRect();

    offsetX = this.BB.left;
    offsetY = this.BB.top;
    Width = this.canvas.width;
    Height = this.canvas.height;

    zoom = 100;

    isDragingMap = false;
    boardOffsetX = 0;
    boardOffsetY = 0;

    isDragingItem = false;
    select = {
        x: 0,
        y: 0,
        width: 0,
        hight: 0,
        itemCount: 0,
        stackCount: 0,
        isSelecting: false,
    }

    startX;
    startY;

    canvasImages = [];
    canvasItems = [];
    handItems = [];

    isHandOpen = false;
    isDragingHand = false;
    isDragingHandItem = false;
    handHeight = (this.canvas.height / 5) * 2;
    handOffsetX = 0;
    handOffsetY = 0;

    baseUrl;

    constructor(socket, baseUrl) {
        this.socket = socket;
        this.baseUrl = baseUrl;

        this.ctx.strokeStyle = '#f00';
        this.ctx.lineWidth = 2; 

        this.canvas.width = document.getElementById('canvas-container').clientWidth;
        this.canvas.height = document.getElementById('canvas-container').clientHeight;

        window.onresize = this.onresize(this);

        this.canvas.onmousedown = this.mouseDown(this);
        this.canvas.onmouseup = this.mouseUp(this);
        this.canvas.oncontextmenu = this.contextmenu(this);
        this.canvas.onmousemove = this.mouseMove(this);
        this.canvas.onclick = this.mouseClick(this);

        this.startX = 0;
        this.startY = 0;

        this.draw();
    }

    addItems(items) {
        for (var i = 0; i < items.length; i++) {
            this.canvasItems.push(items[i]);
        }

        this.draw();
    }

    addItem(items) {
        this.canvasItems.push(items);
        this.draw();
    }

    removeItem(id) {
        var item = this.canvasItems.find(x => x.id == id);
        if (item == undefined || item == null) {
            return;
        }

        this.canvasItems.splice(this.canvasItems.indexOf(item), 1);
        this.draw();
    }

    updateItem(updateData) {
        for (var i = 0; i < this.canvasItems.length; i++) {
            if (this.canvasItems[i].id == updateData.id) {
                if (updateData.x != undefined && updateData.x != null) {
                    this.canvasItems[i].x = updateData.x;
                }

                if (updateData.y != undefined && updateData.y != null) {
                    this.canvasItems[i].y = updateData.y;
                }

                if (updateData.stackItemCount != undefined && updateData.stackItemCount != null) {
                    this.canvasItems[i].stackItemCount = updateData.stackItemCount;
                }

                this.canvasItems[i].isDragging = false;

                if (updateData.canBeDragged != undefined && updateData.canBeDragged != null) {
                    this.canvasItems[i].canBeDragged = updateData.canBeDragged;
                }                

                if (this.canvasItems[i].canBeTurned === true && updateData.isTurned != undefined && updateData.isTurned != null) {
                    this.canvasItems[i].isTurned = updateData.isTurned;
                }

                if (updateData.rotation != undefined && updateData.rotation != null) {
                    this.canvasItems[i].rotation = updateData.rotation;
                }

                if ((updateData.x != undefined && updateData.x != null) || (updateData.y != undefined && updateData.y != null)) {
                    this.canvasItems.push(this.canvasItems[i]);
                    this.canvasItems.splice(i, 1);
                }

                break;
            }
        }

        this.draw();
    }

    addHandItems(items) {
        for (var i = 0; i < items.length; i++) {
            this.handItems.push(items[i]);
        }

        this.draw();
    }

    addHandItem(items) {
        this.handItems.push(items);
        this.draw();
    }

    removeHandItem(id) {
        var item = this.handItems.find(x => x.id == id);
        if (item == undefined || item == null) {
            return;
        }

        this.handItems.splice(this.handItems.indexOf(item), 1);
        this.draw();
    }

    updateHandItem(updateData) {
        for (var i = 0; i < this.handItems.length; i++) {
            if (this.handItems[i].id == updateData.id) {
                if (updateData.x != undefined && updateData.x != null) {
                    this.handItems[i].x = updateData.x;
                }

                if (updateData.y != undefined && updateData.y != null) {
                    this.handItems[i].y = updateData.y;
                }

                if (updateData.stackItemCount != undefined && updateData.stackItemCount != null) {
                    this.handItems[i].stackItemCount = updateData.stackItemCount;
                }

                this.handItems[i].isDragging = false;

                if (updateData.canBeDragged != undefined && updateData.canBeDragged != null) {
                    this.handItems[i].canBeDragged = updateData.canBeDragged;
                }

                if (this.handItems[i].canBeTurned === true) {
                    this.handItems[i].isTurned = updateData.isTurned;
                }

                if (updateData.rotation != undefined && updateData.rotation != null) {
                    this.handItems[i].rotation = updateData.rotation;
                }

                break;
            }
        }

        this.draw();
    }

    resetHand() {
        this.socket.emit("resetHand");
        this.handOffsetX = 0;
        this.handOffsetY = 0;
        this.draw();
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw() {
        var imageSrcs = this.canvasItems.reduce(function (acc, obj) {
            acc.push(obj.src);

            if (obj.backsrc != undefined && obj.backsrc != null) {
                acc.push(obj.backsrc);
            }            

            return acc;
        }, []);

        Promise
            .all(imageSrcs.map(i => this.loadImage(i)))
            .then((image) => {
                this.clear();

                var dragging;

                for (var i = 0; i < this.canvasItems.length; i++) {
                    if (this.canvasItems[i].isDragging === true) {
                        dragging = this.canvasItems[i];
                    }
                    else {
                        this.DrawCanvasItems(this.canvasItems[i], function (e, that) { return that.ToLocalCoordinate(e); }, this.boardOffsetX, this.boardOffsetY, this.zoom, 0, 0);
                    }
                }

                if (this.select.isSelecting === true) {
                    this.ctx.fillStyle = 'rgba(225,225,225, 0.25)';
                    this.ctx.fillRect(this.select.x, this.select.y, this.select.width, this.select.height);
                }
                else if (this.isDragingMap === false && (this.select.itemCount > 0 || this.select.stackCount > 0)) {
                    var x = this.select.width > 0 ? this.select.x : this.select.x + this.select.width;
                    var y = this.select.height > 0 ? this.select.y : this.select.y + this.select.height;
                    var width = this.select.width > 0 ? this.select.width : Math.abs(this.select.width);
                    var height = this.select.height > 0 ? this.select.height : Math.abs(this.select.height);

                    this.buttons = {
                        x: this.ToLocalCoordinate(x),
                        y: this.ToLocalCoordinate(y),
                        width: (width / 100) * this.zoom,
                        height: (height / 100) * this.zoom,
                        count: 0
                    };

                    this.drawButton("Group face down");
                    this.drawButton("Group face up");

                    if (this.select.itemCount == 1 && this.select.stackCount == 1) {
                        this.drawButton("Insert at position");
                    }

                    this.buttons = null;
                }

                // Show offset
                var boardOffsetText = this.boardOffsetX * -1 + ", " + this.boardOffsetY * -1;
                var textMeasure = this.ctx.measureText(boardOffsetText);
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.fillStyle = 'rgba(225,225,225, 0.7)';
                this.ctx.fillRect(this.Width - (textMeasure.width + 20), 0, textMeasure.width + 20, 20);
                this.ctx.fillStyle = 'black';
                this.ctx.font = "10px Arial";
                this.ctx.fillText(boardOffsetText, (this.Width - (textMeasure.width + 10)), 13);

                // Hand
                var handHeight = 0;
                var handButtonText = "Show hand";

                if (this.isHandOpen === true) {
                    handButtonText = "Hide hand";
                    handHeight = this.handHeight;
                }

                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.fillStyle = 'rgba(225,225,225, 1)';
                this.ctx.fillRect((this.Width / 2) - (75 + 20), this.Height - 30 - handHeight, 75 + 20, 30);
                this.ctx.fillStyle = 'black';
                this.ctx.font = "10px Arial";
                this.ctx.fillText(handButtonText, (this.Width / 2) - 75, this.Height - 10 - handHeight);

                if (this.isHandOpen === true) { 
                    this.ctx.fillStyle = 'rgba(208, 231, 247, 1)';
                    this.ctx.fillRect(0, this.Height - this.handHeight, this.Width, this.handHeight);

                    var boardOffsetText = this.handOffsetX * -1 + ", " + this.handOffsetY * -1;
                    var textMeasure = this.ctx.measureText(boardOffsetText);
                    this.ctx.fillStyle = '#FFFFFF';
                    this.ctx.fillStyle = 'rgba(208, 231, 247, 0.7)';
                    this.ctx.fillRect(this.Width - (textMeasure.width + 20), this.Height - this.handHeight, textMeasure.width + 20, 20);
                    this.ctx.fillStyle = 'black';
                    this.ctx.font = "10px Arial";
                    this.ctx.fillText(boardOffsetText, (this.Width - (textMeasure.width + 10)), (this.Height - this.handHeight) + 13);

                    // Draw hand items
                    for (var i = 0; i < this.handItems.length; i++) {
                        this.DrawCanvasItems(this.handItems[i], function (e) { return e; }, this.handOffsetX, this.handOffsetY, 100, 0, this.Height - handHeight);
                    }
                }

                // Draging item last
                if (dragging != undefined && dragging != null) {
                    this.DrawCanvasItems(dragging, function (e, that) { return that.ToLocalCoordinate(e); }, this.boardOffsetX, this.boardOffsetY, this.zoom, 0, 0);
                }
            }).catch((err) => {
                console.error(err);
            });

        // Don't add the to the callback because it might draw them a few times in wrong places because draw was called multiple times
    }

    DrawCanvasItems(canvasItems, ToLocalCoordinate, boardOffsetX, boardOffsetY, zoom, screenOffsetX, screenOffsetY) {
        if (canvasItems.isHidden != true) {
            this.drawItem(canvasItems, ToLocalCoordinate, boardOffsetX, boardOffsetY, zoom, screenOffsetX, screenOffsetY);

            if (canvasItems.isSelected === true || canvasItems.multiselect === true) {
                var width = (canvasItems.width / 100) * zoom;
                var height = (canvasItems.height / 100) * zoom;
                var x = ToLocalCoordinate(canvasItems.x, this) + boardOffsetX + screenOffsetX;
                var y = ToLocalCoordinate(canvasItems.y, this) + boardOffsetY + screenOffsetY;

                if (canvasItems.rotation != undefined && canvasItems.rotation != null && canvasItems.rotation !== 0 && canvasItems.rotation !== 360) {
                    this.ctx.save();
                    this.ctx.translate(x + width / 2, y + height / 2);
                    this.ctx.rotate(Math.PI / 180 * canvasItems.rotation);

                    x = -width / 2;
                    y = -height / 2;
                }    

                this.ctx.strokeRect(x, y, width, height);

                if (canvasItems.rotation != undefined && canvasItems.rotation != null) {
                    this.ctx.restore();
                } 
            }

            if (canvasItems.isSelected === true && this.buttons != null) {
                this.drawButton((this.buttons.data.canBeDragged === true ? "Pin" : "Unpin"));

                if (this.buttons.data.canBeTurned === true) {
                    this.drawButton("Turn");
                }

                if (this.buttons.data.canBeRotated === true) {
                    this.drawButton("Rotate");
                }

                if (this.buttons.data.isStack === true && this.buttons.data.stackItemCount > 0) {
                    this.drawButton("Take");
                    this.drawButton("Take from position");
                    this.drawButton("Take to hand");
                    this.drawButton("Shuffle");
                }

                this.buttons = null;
            }
        }
    }

    PreLoadImages(images) {
        for (var i = 0; i < images.length; i++) {
            this.loadImage(images[i]);
        }
    }

    loadImage(imagePath) {
        return new Promise((resolve, reject) => {
            var exists = false;
            for (var i = 0; i < this.canvasImages.length; i++) {
                if (this.canvasImages[i].src == imagePath) {
                    resolve();
                    exists = true;
                    break;
                }
            }

            if (exists == false) {
                let image = new Image();
                image.addEventListener("load", () => {
                    image.width = image.naturalWidth;
                    image.height = image.naturalHeight;
                    resolve(image);
                });
                image.addEventListener("error", (err) => {
                    reject(err);
                });
                image.src = this.baseUrl + "/file/" + imagePath;
                this.canvasImages.push({ src: imagePath, image: image });
            }
        });
    }

    buttons = null;

    drawItem(data, ToLocalCoordinate, boardOffsetX, boardOffsetY, zoom, screenOffsetX, screenOffsetY) {
        var src = data.isTurned === true ? data.backsrc : data.src;

        for (var i = 0; i < this.canvasImages.length; i++) {
            if (this.canvasImages[i].src == src) {
                var width = (data.width / 100) * zoom;
                var height = (data.height / 100) * zoom;
                var x = ToLocalCoordinate(data.x, this) + boardOffsetX + screenOffsetX;
                var y = ToLocalCoordinate(data.y, this) + boardOffsetY + screenOffsetY;

                var imageX = x;
                var imageY = y;

                if (data.rotation != undefined && data.rotation != null && data.rotation !== 0 && data.rotation !== 360) {
                    this.ctx.save();
                    this.ctx.translate(x + width / 2, y + height / 2);
                    this.ctx.rotate(Math.PI / 180 * data.rotation);

                    imageX = -width / 2;
                    imageY = -height / 2;
                }                

                var imageOffsetX = data.isDragging === false && screenOffsetX > x ? screenOffsetX - imageX : 0;
                var imageOffsetY = data.isDragging === false && screenOffsetY > y ? screenOffsetY - imageY : 0;

                var imageOffsetPercentageX = ((this.canvasImages[i].image.width / 100) * (imageOffsetX / (width / 100)));
                var imageOffsetPercentageY = ((this.canvasImages[i].image.height / 100) * (imageOffsetY / (height / 100)));

                var imageWidth = width - imageOffsetX;
                var imageHeight = height - imageOffsetY;

                if (imageWidth > 0 && imageHeight > 0) {
                    this.ctx.drawImage(
                        this.canvasImages[i].image,
                        imageOffsetPercentageX,
                        imageOffsetPercentageY,
                        this.canvasImages[i].image.width - imageOffsetPercentageX,
                        this.canvasImages[i].image.height - imageOffsetPercentageY,
                        imageX + imageOffsetX,
                        imageY + imageOffsetY,
                        imageWidth,
                        imageHeight,
                    );
                }

                if (data.rotation != undefined && data.rotation != null) {
                    this.ctx.restore();
                } 

                if (data.isSelected === true) {
                    this.buttons = { x: x, y: y, width: width, height: height, data: data, count: 0 };
                }

                if (imageWidth > 0 && imageHeight > 0 && data.isStack === true /*&& data.showStackCount == true*/) {// Always show it for now because of insert at position
                    this.ctx.fillStyle = '#FFFFFF';
                    this.ctx.fillStyle = 'rgba(225,225,225, 1)';
                    this.ctx.fillRect(x, y + height + 3, width, 20);
                    this.ctx.fillStyle = 'black';
                    this.ctx.font = "10px Arial";
                    this.ctx.fillText(data.stackItemCount, x + ((width - this.ctx.measureText(data.stackItemCount).width) / 2), y + height + 3 + ((20 / 2) + 3));
                }
                break;
            }
        }
    }

    drawButton(text) {        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillStyle = 'rgba(225,225,225, 1)';
        this.ctx.fillRect(this.buttons.x + this.buttons.width + 5, this.buttons.y + ((this.buttons.count * 25) + (this.buttons.count * 3)), 90, 25);
        this.ctx.fillStyle = 'black';
        this.ctx.font = "10px Arial";
        this.ctx.fillText(text, this.buttons.x + this.buttons.width + 5 + 5, this.buttons.y + ((this.buttons.count * 25) + (this.buttons.count * 3)) + ((24 / 2) + 5), this.buttons.x + this.buttons.width + 10 + 5 + (30 / 2));

        this.buttons.count++;
    }

    ToLocalCoordinate(e) {
        return (e / 100) * this.zoom;
    }

    // Events
    onresize(boardGame) {
        return function (event) {
            boardGame.canvas.width = document.getElementById('canvas-container').clientWidth;
            boardGame.canvas.height = document.getElementById('canvas-container').clientHeight;
            boardGame.Width = boardGame.canvas.width;
            boardGame.Height = boardGame.canvas.height;
            boardGame.draw();
        }
    }

    mouseDown(boardGame) {
        return function (e) {
            e.preventDefault();
            e.stopPropagation();

            // Left click
            if (e.buttons === 1) {
                var mx;
                var my;

                boardGame.isDragingItem = false;
                boardGame.isDragingHand = false;

                if (
                    boardGame.isHandOpen === true &&
                    e.clientX > 0 &&
                    e.clientX < boardGame.Width &&
                    e.clientY > boardGame.Height - boardGame.handHeight + 50 &&
                    e.clientY < boardGame.Height + 50
                ) {
                    mx = parseInt(e.clientX - boardGame.offsetX);
                    my = parseInt(e.clientY - boardGame.offsetY);

                    for (var i = boardGame.handItems.length; i--;) {
                        var r = boardGame.handItems[i];
                        var width = r.width;
                        var height = r.height;

                        if (
                            r.canBeDragged &&
                            mx > r.x + boardGame.handOffsetX &&
                            mx < r.x + parseInt(boardGame.handOffsetX + parseInt(width)) &&
                            my > r.y + boardGame.handOffsetY + parseInt(boardGame.Height - boardGame.handHeight) &&
                            my < r.y + parseInt(boardGame.handOffsetY + parseInt(boardGame.Height - boardGame.handHeight) + parseInt(height))
                        ) {
                            boardGame.isDragingHandItem = true;
                            r.isDragging = true;

                            boardGame.handDragStartX = r.x;
                            boardGame.handDragStartY = r.y;
                            break;
                        }
                    }
                    
                    if (boardGame.isDragingHandItem == false) {
                        boardGame.isDragingHand = true;
                    }
                }
                else {
                    mx = parseInt(e.clientX - boardGame.offsetX);
                    my = parseInt(e.clientY - boardGame.offsetY);

                    for (var i = boardGame.canvasItems.length; i--;) {
                        var r = boardGame.canvasItems[i];
                        var width = (r.width / 100) * boardGame.zoom;
                        var height = (r.height / 100) * boardGame.zoom;

                        if (
                            r.canBeDragged &&
                            mx > boardGame.ToLocalCoordinate(r.x) + boardGame.boardOffsetX &&
                            mx < boardGame.ToLocalCoordinate(r.x) + boardGame.boardOffsetX + width &&
                            my > boardGame.ToLocalCoordinate(r.y) + boardGame.boardOffsetY &&
                            my < boardGame.ToLocalCoordinate(r.y) + boardGame.boardOffsetY + height
                        ) {
                            boardGame.isDragingItem = true;
                            r.isDragging = true;                            
                            break;
                        }
                    }

                    if (boardGame.isDragingItem == false) {
                        boardGame.isDragingMap = true;
                    }
                }                

                boardGame.startX = mx;
                boardGame.startY = my;
            }// Right click
            else if (e.buttons === 2) {
                boardGame.select.isSelecting = true;

                boardGame.select.x = 0;
                boardGame.select.y = 0;
                boardGame.select.width = 0;
                boardGame.select.height = 0;
                boardGame.select.itemCount = 0;
                boardGame.select.stackCount = 0;

                //multiselect
                for (var i = 0; i < boardGame.canvasItems.length; i++) {
                    if (boardGame.canvasItems[i].multiselect === true) {
                        boardGame.canvasItems[i].multiselect = false;
                    }
                }

                boardGame.startX = parseInt(e.clientX - boardGame.offsetX);
                boardGame.startY = parseInt(e.clientY - boardGame.offsetY);
            }            
        }
    }

    // Left click
    mouseUp(boardGame) {
        return function (e) {
            e.preventDefault();
            e.stopPropagation();
            
            boardGame.isDragingItem = false;
            boardGame.isDragingMap = false;
            boardGame.isDragingHand = false;
            boardGame.isDragingHandItem = false;

            for (var i = 0; i < boardGame.canvasItems.length; i++) {
                var canvasItems = boardGame.canvasItems[i];
                // Move to hand
                if (
                    canvasItems.isDragging === true &&
                    boardGame.isHandOpen === true &&
                    boardGame.ToLocalCoordinate(canvasItems.x) + boardGame.boardOffsetX > 0 &&
                    boardGame.ToLocalCoordinate(canvasItems.x) + boardGame.boardOffsetX < boardGame.Width &&
                    boardGame.ToLocalCoordinate(canvasItems.y) + boardGame.boardOffsetY > boardGame.Height - boardGame.handHeight &&
                    boardGame.ToLocalCoordinate(canvasItems.y) + boardGame.boardOffsetY < boardGame.Height
                ) {                    
                    canvasItems.isDragging = false;

                    canvasItems.x = boardGame.ToLocalCoordinate(canvasItems.x) + boardGame.boardOffsetX - boardGame.handOffsetX;
                    canvasItems.y = boardGame.ToLocalCoordinate(canvasItems.y) + boardGame.boardOffsetY - boardGame.handOffsetY - (boardGame.Height - boardGame.handHeight);

                    boardGame.socket.emit('addToHand', { id: canvasItems.id, x: canvasItems.x, y: canvasItems.y });
                }

                canvasItems.isDragging = false;
            }

            for (var i = 0; i < boardGame.handItems.length; i++) {
                var handItems = boardGame.handItems[i];

                // Move to board
                if (
                    handItems.isDragging === true &&
                    boardGame.isHandOpen === true &&
                    handItems.x != boardGame.handDragStartX && // Only move to board if it has actually moved
                    handItems.y != boardGame.handDragStartY &&
                    handItems.x + boardGame.handOffsetX > 0 &&
                    handItems.x + boardGame.handOffsetX < boardGame.Width &&
                    handItems.y + boardGame.handOffsetY + (boardGame.Height - boardGame.handHeight) > 0 &&
                    handItems.y + boardGame.handOffsetY + (boardGame.Height - boardGame.handHeight) < boardGame.Height - boardGame.handHeight
                ) {
                    handItems.isDragging = false;
                    handItems.x = (((handItems.x - boardGame.boardOffsetX + boardGame.handOffsetX) / boardGame.zoom) * 100);
                    handItems.y = (((handItems.y - boardGame.boardOffsetY + boardGame.handOffsetY + (boardGame.Height - boardGame.handHeight)) / boardGame.zoom) * 100)  ;

                    boardGame.socket.emit('addToBoard', { id: handItems.id, x: handItems.x, y: handItems.y });
                }

                handItems.isDragging = false;
            }

            boardGame.handDragStartX = null;
            boardGame.handDragStartY = null;
        }
    }

    // Right click
    contextmenu(boardGame) {
        return function (e) {
            e.preventDefault();
            e.stopPropagation();

            boardGame.select.isSelecting = false;

            boardGame.draw();
        }
    }

    mouseMove(boardGame) {
        return function (e) {
            if (e.buttons === 1 && boardGame.isHandOpen === true && (boardGame.isDragingHand === true || boardGame.isDragingHandItem === true)) {
                e.preventDefault();
                e.stopPropagation();

                var mx = parseInt(e.clientX - boardGame.offsetX);
                var my = parseInt(e.clientY - boardGame.offsetY);

                var dx = mx - boardGame.startX;
                var dy = my - boardGame.startY;

                if (boardGame.isDragingHandItem === true) {
                    for (var i = 0; i < boardGame.handItems.length; i++) {
                        var r = boardGame.handItems[i];
                        if (r.isDragging) {
                            r.x += dx;
                            r.y += dy;

                            boardGame.socket.emit('onMoveHandItem', { id: r.id, x: r.x, y: r.y });
                            if (i != boardGame.handItems.length - 1) {
                                boardGame.handItems.push(boardGame.handItems[i]);
                                boardGame.handItems.splice(i, 1);
                            }
                            break;
                        }
                    }
                }

                if (boardGame.isDragingHand === true) {
                    boardGame.handOffsetX += mx - boardGame.startX;
                    boardGame.handOffsetY += my - boardGame.startY;
                } 

                boardGame.draw();

                boardGame.startX = mx;
                boardGame.startY = my;
            }
            else if (e.buttons === 1 && (boardGame.isDragingItem || boardGame.isDragingMap)) {
                e.preventDefault();
                e.stopPropagation();

                var mx = parseInt(e.clientX - boardGame.offsetX);
                var my = parseInt(e.clientY - boardGame.offsetY);

                var dx = ((mx - boardGame.startX) * 100) / boardGame.zoom;
                var dy = ((my - boardGame.startY) * 100) / boardGame.zoom;

                if (boardGame.isDragingItem === true) {
                    for (var i = 0; i < boardGame.canvasItems.length; i++) {
                        var r = boardGame.canvasItems[i];
                        if (r.isDragging) {
                            r.x += dx;
                            r.y += dy;

                            boardGame.socket.emit('onMove', { id: r.id, x: r.x, y: r.y });
                            if (i != boardGame.canvasItems.length - 1) {
                                boardGame.canvasItems.push(boardGame.canvasItems[i]);
                                boardGame.canvasItems.splice(i, 1);
                            }
                            break;
                        }                        
                    }
                }

                if (boardGame.isDragingMap === true) {
                    boardGame.boardOffsetX += mx - boardGame.startX;
                    boardGame.boardOffsetY += my - boardGame.startY;
                }                

                boardGame.draw();

                boardGame.startX = mx;
                boardGame.startY = my;
            }// Right click
            else if (e.buttons === 2) {
                e.preventDefault();
                e.stopPropagation();

                var mx = parseInt(e.clientX - boardGame.offsetX);
                var my = parseInt(e.clientY - boardGame.offsetY);

                boardGame.select.x = boardGame.startX;
                boardGame.select.y = boardGame.startY;
                boardGame.select.width = parseInt(mx - boardGame.startX);
                boardGame.select.height = parseInt(my - boardGame.startY);

                var minX = boardGame.startX < mx ? boardGame.startX : mx;
                var maxX = boardGame.startX > mx ? boardGame.startX : mx;
                var minY = boardGame.startY < my ? boardGame.startY : my;
                var maxY = boardGame.startY > my ? boardGame.startY : my;

                for (var i = 0; i < boardGame.canvasItems.length; i++) {
                    var r = boardGame.canvasItems[i];

                    if (
                        minX <= boardGame.ToLocalCoordinate(r.x + parseInt(r.width)) + boardGame.boardOffsetX &&
                        boardGame.ToLocalCoordinate(r.x) + boardGame.boardOffsetX <= maxX &&
                        minY <= boardGame.ToLocalCoordinate(r.y + parseInt(r.height)) + boardGame.boardOffsetY &&
                        boardGame.ToLocalCoordinate(r.y) + boardGame.boardOffsetY <= maxY
                    ) {
                        if (r.multiselect !== true) {
                            if (r.isStack === true) {
                                boardGame.select.stackCount += 1;
                            }
                            else {
                                boardGame.select.itemCount += 1;
                            }
                        }
                        
                        r.multiselect = true;
                    }
                    else {
                        if (r.multiselect === true) {
                            if (r.isStack === true) {
                                boardGame.select.stackCount -= 1;
                            }
                            else {
                                boardGame.select.itemCount -= 1;
                            }
                        }
                        r.multiselect = false;
                    }
                    r.isSelected = false;
                }

                boardGame.draw();
            } 
        }
    }

    isBetween(n, a, b) {
        return (n - a) * (n - b) <= 0;
    }

    mouseClick(boardGame) {
        return function (e) {
            e.preventDefault();
            e.stopPropagation();
            
            var mx = parseInt(e.clientX - boardGame.offsetX);
            var my = parseInt(e.clientY - boardGame.offsetY);
            var anItemHasBeenSelected = false;
            var anActionHasBeenPerformed = false;

            // Hand
            var handButtonY = boardGame.Height - 30;
            if (boardGame.isHandOpen === true) {
                handButtonY -= boardGame.handHeight;
            }
            
            if (
                e.clientX > (boardGame.Width / 2) - (75 + 20) &&
                e.clientX < ((boardGame.Width / 2) - (75 + 20)) + 75 + 20 &&
                e.clientY - 50 > handButtonY && // For some reason y is 50 px off
                e.clientY - 50 < handButtonY + 30
            ) {
                boardGame.isHandOpen = boardGame.isHandOpen === false ? true : false;
                anActionHasBeenPerformed = true;
            }

            // Hand items
            if (boardGame.isHandOpen === true) {
                for (var i = boardGame.handItems.length; i--;) {
                    var r = boardGame.handItems[i];
                    var width = parseInt(r.width);
                    var height = parseInt(r.height);

                    if (r.isSelected == true) {
                        var clickedButton = false;

                        for (var a = 0; a < 7; a++) {
                            if (
                                mx > r.x + boardGame.handOffsetX + width + 5 &&
                                mx < r.x + boardGame.handOffsetX + width + 5 + 90 &&
                                my > r.y + boardGame.handOffsetY + (boardGame.Height - boardGame.handHeight)  + ((a * 25) + (a * 3)) &&
                                my < r.y + boardGame.handOffsetY + (boardGame.Height - boardGame.handHeight)  + ((a * 25) + (a * 3)) + 25
                            ) {
                                if (boardGame.ClickButton(r, a, false, true, boardGame) === true) {
                                    clickedButton = true;
                                    anActionHasBeenPerformed = true;
                                }
                                break;
                            }
                        }

                        if (clickedButton === true) {
                            continue;
                        }
                    }

                    r.isSelected = false;
                    r.multiselect = false;

                    if (
                        anItemHasBeenSelected == false &&
                        anActionHasBeenPerformed == false &&
                        mx > r.x + boardGame.handOffsetX &&
                        mx < r.x + boardGame.handOffsetX + width &&
                        my > r.y + boardGame.handOffsetY + (boardGame.Height - boardGame.handHeight) &&
                        my < r.y + boardGame.handOffsetY + height + (boardGame.Height - boardGame.handHeight)
                    ) {
                        r.isSelected = true;
                        anItemHasBeenSelected = true;
                        anActionHasBeenPerformed = true;
                    }
                }
            }

            // Multiselect
            if (boardGame.select.isSelecting === false && (boardGame.select.itemCount > 0 || boardGame.select.stackCount > 0) && anActionHasBeenPerformed == false) {
                var clickedButton = false;

                var x = boardGame.select.width > 0 ? boardGame.select.x : Math.abs(boardGame.select.x)
                var y = boardGame.select.height > 0 ? boardGame.select.y : boardGame.select.y + boardGame.select.height;
                var width = boardGame.select.width > 0 ? boardGame.select.width : Math.abs(boardGame.select.width) / 100;
                var height = boardGame.select.height > 0 ? boardGame.select.height : Math.abs(boardGame.select.height) / 100;

                for (var a = 0; a < 3; a++) {
                    if (
                        mx > boardGame.ToLocalCoordinate(x) + width + 5 &&
                        mx < boardGame.ToLocalCoordinate(x) + width + 5 + 90 &&
                        my > boardGame.ToLocalCoordinate(y) + ((a * 25) + (a * 3)) &&
                        my < boardGame.ToLocalCoordinate(y) + ((a * 25) + (a * 3)) + 25
                    ) {
                        // get all selected items
                        if (boardGame.ClickButton(boardGame.canvasItems.filter(e => e.multiselect === true).map(e => e.id), a, true, false, boardGame) === true) {
                            clickedButton = true;
                            anActionHasBeenPerformed = true;
                        }
                        break;
                    }
                }
            }

            boardGame.select.x = 0;
            boardGame.select.y = 0;
            boardGame.select.width = 0;
            boardGame.select.height = 0;
            boardGame.select.itemCount = 0;
            boardGame.select.stackCount = 0;

            if (
                boardGame.isHandOpen === true &&
                mx > 0 &&
                mx < boardGame.Width &&
                my > boardGame.Height - boardGame.handHeight &&
                my < boardGame.Height
            ) {
                anActionHasBeenPerformed = true;
            }
            
            // Items
            for (var i = boardGame.canvasItems.length; i--;) {
                var r = boardGame.canvasItems[i];
                var width = (r.width / 100) * boardGame.zoom;
                var height = (r.height / 100) * boardGame.zoom;

                if (r.isSelected == true && anActionHasBeenPerformed !== true) {
                    var clickedButton = false;

                    for (var a = 0; a < 7; a++) {
                        if (
                            mx > boardGame.ToLocalCoordinate(r.x) + boardGame.boardOffsetX + width + 5 &&
                            mx < boardGame.ToLocalCoordinate(r.x) + boardGame.boardOffsetX + width + 5 + 90 &&
                            my > boardGame.ToLocalCoordinate(r.y) + boardGame.boardOffsetY + ((a * 25) + (a * 3)) &&
                            my < boardGame.ToLocalCoordinate(r.y) + boardGame.boardOffsetY + ((a * 25) + (a * 3)) + 25
                        ) {
                            if (boardGame.ClickButton(r, a, false, false, boardGame) === true) {
                                clickedButton = true;
                                anActionHasBeenPerformed = true;
                            }
                            break;
                        }
                    }

                    if (clickedButton === true) {
                        continue;
                    }
                }

                r.isSelected = false;
                r.multiselect = false;

                if (
                    anItemHasBeenSelected == false &&
                    anActionHasBeenPerformed == false &&
                    mx > boardGame.ToLocalCoordinate(r.x) + boardGame.boardOffsetX &&
                    mx < boardGame.ToLocalCoordinate(r.x) + boardGame.boardOffsetX + width &&
                    my > boardGame.ToLocalCoordinate(r.y) + boardGame.boardOffsetY &&
                    my < boardGame.ToLocalCoordinate(r.y) + boardGame.boardOffsetY + height
                ) {
                    r.isSelected = true;
                    anItemHasBeenSelected = true;
                    anActionHasBeenPerformed = true;
                }             
            }

            boardGame.draw();
        }
    }

    ClickButton(item, number, multiselect, isHand, boardGame) {
        var actions = [];

        if (multiselect !== true) {
            var onChangeName = isHand === true ? 'onChangeHandItem' : 'onChange';
            var takeFromStack = isHand === true ? 'takeFromStackInHand' : 'takeFromStack';

            actions[0] = function (socket, item) {
                socket.emit(onChangeName, { id: item.id, change: "pin" })
            }

            if (item.canBeTurned === true) {
                actions[actions.length] = function (socket, item) {
                    socket.emit(onChangeName, { id: item.id, change: "turn" })
                }
            }

            if (item.canBeRotated === true) {
                actions[actions.length] = function (socket, item) {
                    socket.emit(onChangeName, { id: item.id, change: "rotate" })
                }
            }

            if (item.isStack === true && item.stackItemCount > 0) {
                actions[actions.length] = function (socket, item) {
                    socket.emit(takeFromStack, { id: item.id, takeToHand: false })
                }
            }

            if (item.isStack === true && item.stackItemCount > 0) {
                actions[actions.length] = function (socket, item) {
                    var value = prompt("Take from position x in stack (1 is the top of the stack)")
                    var position = parseInt(value);

                    if (value == undefined || value == null) {
                        return;
                    }

                    if (Number.isInteger(position) == false || position < 1) {
                        alert("Incorrect value");
                        return;
                    }

                    socket.emit(takeFromStack, { id: item.id, takeToHand: false, position: value - 1 })
                }
            }

            if (item.isStack === true && item.stackItemCount > 0) {
                actions[actions.length] = function (socket, item) {
                    socket.emit(takeFromStack, { id: item.id, takeToHand: true })
                }
            }

            if (item.isStack === true && item.stackItemCount > 0) {
                actions[actions.length] = function (socket, item) {
                    socket.emit(onChangeName, { id: item.id, change: "shuffle" })
                }
            }
        }
        else {
            actions[0] = function (socket, item) {
                socket.emit('groupItems', { ids: item, faceUp: false })
            };
            actions[1] = function (socket, item) {
                socket.emit('groupItems', { ids: item, faceUp: true })
            };

            if (boardGame.select.itemCount == 1 && boardGame.select.stackCount == 1) {
                actions[actions.length] = function (socket, item) {
                    var value = prompt("Insert after item x in stack (0 is the top of the stack)")
                    var position = parseInt(value);

                    if (value == undefined || value == null) {
                        return;
                    }

                    if (Number.isInteger(position) == false || position < 0) {
                        alert("Incorrect value");
                        return;
                    }

                    var boardgameItem = boardGame.canvasItems.find(e => e.multiselect === true && e.isStack === false);
                    var boardgameStack = boardGame.canvasItems.find(e => e.multiselect === true && e.isStack === true);

                    if (boardgameItem != undefined && boardgameItem != null && boardgameStack != undefined && boardgameStack != null) {
                        socket.emit("insertAtPosition", { id: item.id, position: position, itemId: boardgameItem.id, stackId: boardgameStack.id })
                    }
                }
            }
        }
        
        if ((actions.length - 1) >= number) {
            actions[number](this.socket, item);
            return true;
        }
        else {
            return false;
        }
    }
}