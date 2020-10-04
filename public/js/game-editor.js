class GameEditor extends GameBoard {
    itemModal;
    itemMenu;

    editableProperties = [
        {
            name: "id",
            type: "text",
        },
        {
            name: "name",
            type: "text",
        },
        {
            name: "src",
            type: "file",
        },
        {
            name: "width",
            type: "number",
        },
        {
            name: "height",
            type: "number",
        },
        {
            name: "order",
            type: "number",
        },
        {
            name: "backsrc",
            type: "file",
        },
        {
            name: "canBeTurned",
            type: "bool",
        },
        {
            name: "canBeRotated",
            type: "bool",
        },
        {
            name: "rotationSteps",
            type: "number",
        },
        {
            name: "isStack",
            type: "bool",
        },
        {
            name: "showStackCount",
            type: "bool",
        },
        {
            name: "drawClosed",
            type: "bool",
        },
        {
            name: "stackItems",
            type: "stackItem",
        }
    ];

    constructor(itemModal, game, itemMenu, baseUrl) {
        super({ emit: function (a, b) { /* fake the socket connection and do nothing */ } }, baseUrl);

        this.itemModal = itemModal;
        this.itemMenu = itemMenu;

        this.addItems(game.items);

        this.loadAllItemsIntoMenu();

        this.canvas.width = document.getElementById('canvas-container').clientWidth;
        this.canvas.height = document.getElementById('canvas-container').clientHeight;
        this.Width = this.canvas.width;
        this.Height = this.canvas.height;
        this.draw();
    }

    createItem() {
        var item = new Item();
        item.order = this.canvasItems.length;

        this.setItem(item);
        this.itemModal.modal('show');
    }

    editItem(itemId) {
        var item = this.canvasItems.find(x => x.id == itemId);
        if (item != undefined && item != null) {
            this.setItem(item);
            this.itemModal.modal('show');
        }        
    }

    deleteItem(itemId) {
        var item = this.canvasItems.find(x => x.id == itemId);
        if (item != undefined && item != null) {
            this.canvasItems.splice(this.canvasItems.indexOf(item), 1);

            this.loadAllItemsIntoMenu();
            this.draw();
        }
    }

    setItem(item) {
        this.itemModal.find("#item-errors").html("");
        for (var i = 0; i < this.editableProperties.length; i++) {
            switch (this.editableProperties[i].type) {
                case "text":
                case "number":
                    this.itemModal.find("input#item-" + this.editableProperties[i].name).val(item[this.editableProperties[i].name]);
                    break;
                case "bool":
                    this.itemModal.find("input#item-" + this.editableProperties[i].name).prop("checked", item[this.editableProperties[i].name]);
                    break;
                case "file":
                    var fileFieldContainer = this.itemModal.find("#item-" + this.editableProperties[i].name + "-container")

                    fileFieldContainer.find(".item-files").html("");
                    fileFieldContainer.find(".item-" + this.editableProperties[i].name).remove();

                    if (item[this.editableProperties[i].name] != null) {
                        $(fileFieldContainer.find(".item-files")).append($("<li>").html('<img src="' + this.baseUrl + '/file/' + item[this.editableProperties[i].name] + '" width="60" height="60">'));
                        fileFieldContainer.append('<input type="hidden" class="item-' + this.editableProperties[i].name + '" id="item-' + this.editableProperties[i].name + '" name="item-' + this.editableProperties[i].name + '" value="' + item[this.editableProperties[i].name] + '">');
                    }                    
                    break;                
                case "stackItem":
                    var fileFieldContainer = this.itemModal.find("#item-" + this.editableProperties[i].name + "-container")

                    fileFieldContainer.find(".item-stackItems-table").html("");

                    for (var a = 0; a < item[this.editableProperties[i].name].length; a++) {
                        var property = item[this.editableProperties[i].name][a];
                        $(fileFieldContainer.find(".item-stackItems-table")).append($("<tr/>").html('<td><img src="' + this.baseUrl + '/file/' + property.src + '" width="60" height="60"><input type="hidden" class="item-' + this.editableProperties[i].name + '-src" id="item-' + this.editableProperties[i].name + '-src" name="item-' + this.editableProperties[i].name + '-src" value="' + property.src + '"></td><td><input type="number" class="item-' + this.editableProperties[i].name + '-amount" id="item-' + this.editableProperties[i].name + '-amount" name="item-' + this.editableProperties[i].name + '-amount" value="' + property.amount + '"></td><td><button class="stackItem-delete btn btn-default">Delete</button></td>'));
                    }
                    break;
            } 
            
        }
    }

    saveItem() {
        var properties = [];
        var errors = [];

        for (var i = 0; i < this.editableProperties.length; i++) {
            var property = {
                name: this.editableProperties[i].name,
            };

            switch (this.editableProperties[i].type) {
                case "text":
                case "number":
                case "file":
                    property.value = this.itemModal.find("#item-" + this.editableProperties[i].name).val();

                    if (property.value == undefined || property.value === null || property.value.match(/^ *$/) !== null) {
                        errors.push("The field: " + property.name + " is required");
                    }
                    break;
                case "bool":
                    property.value = this.itemModal.find("#item-" + this.editableProperties[i].name + ":checked").length > 0 ? true : false;

                    if (property.value == undefined || property.value === null) {
                        errors.push("The field: " + property.name + " is required");
                    }
                    break;
                case "stackItem":
                    property.value = [];
                    var emptyItems = 0;

                    var value = this.itemModal.find(".item-" + this.editableProperties[i].name + "-table tr");

                    for (var a = 0; a < value.length; a++) {
                        var stackItem = new StackItem();
                        var item = $(value[a]);

                        stackItem.src = item.find(".item-" + this.editableProperties[i].name + "-src").val();
                        stackItem.amount = item.find(".item-" + this.editableProperties[i].name + "-amount").val();

                        

                        if (property.value.src == undefined || property.value.src === null || property.value.src.match(/^ *$/) !== null ||
                            property.value.amount == undefined || property.value.amount === null || property.value.amount.match(/^ *$/) !== null) {
                            property.value.push(stackItem);
                        }
                    }

                    if (emptyItems > 0) {
                        errors.push("The field: " + property.name + " cannot have an empty item. " + emptyItems + " items are empty");
                    }
                    break;
            }

            properties.push(property);
        }

        if (errors.length > 0) {
            this.itemModal.find("#item-errors").html("");
            for (var i = 0; i < errors.length; i++) {
                this.itemModal.find("#item-errors").append($("<div/>").addClass("alert alert-danger").attr("role", "alert").html(errors[i]));
            }
        }
        else
        {
            var itemId = this.itemModal.find("#item-id").val();
            var item = this.canvasItems.find(x => x.id == itemId);

            var isNew = false;
            if (item == undefined || item == null) {
                item = new Item();
                isNew = true;
            }

            for (var i = 0; i < properties.length; i++) {
                item[properties[i].name] = properties[i].value;
            }

            if (isNew == true) {
                this.canvasItems.push(item);
            }

            this.loadAllItemsIntoMenu();
            this.draw();

            this.itemModal.modal('hide');            
        }        
    }

    loadAllItemsIntoMenu() {
        this.itemMenu.html("");
        for (var i = 0; i < this.canvasItems.length; i++) {
            $('<tr/>').html('<td>' + this.canvasItems[i].name + '</td><td>' /*+'<button class="btn btn-light item-up" itemId="' + this.canvasItems[i].id + '"><i class="fa fa-angle-up"></i></button><button class="btn btn-light item-down" itemId="' + this.canvasItems[i].id + '"><i class="fa fa-angle-down"></i></button>' */ + '<button class="btn btn-light item-edit" itemId="' + this.canvasItems[i].id + '"><i class="fa fa-pencil-alt"></i></button><button class="btn btn-light item-delete" itemId="' + this.canvasItems[i].id + '"><i class="fa fa-trash-alt"></i></button></td>').appendTo(this.itemMenu);
        }
    }

    //updateOrder(itemId, up) {
    //    var item = this.canvasItems.find(x => x.id == itemId);
    //    if (item == undefined || item == null) {
    //        return;
    //    }

    //    var order = parseInt(item.order) + (up ? -1 : 1);

    //    if (order < 0 || order > this.canvasItems.length - 1) {
    //        return;
    //    }

    //    this.updateOriginalOrder(order, up, itemId);

    //    item.order = order;

    //    this.loadAllItemsIntoMenu();
    //    this.draw();
    //}

    //updateOriginalOrder(order, up, itemId) {
    //    var item = this.canvasItems.find(x => x.order == order);

    //    if (item == undefined || item == null) {
    //        return;
    //    }
    //    else if (item.id == itemId) {
    //        return;
    //    }

    //    var order = parseInt(item.order) + (up ? 1 : -1);
    //    if ((parseInt(item.order) - (order + (up ? 1 : -1))) > 1) {
    //        item.order = order;
    //        return;
    //    }

    //    this.updateOriginalOrder(order, up, itemId);
    //    item.order = order;
    //}
}

class Item {
    id;
    name = "";
    src = null;
    width = 60;
    height = 60;
    x = 0;
    y = 0;
    isDragging = false;
    canBeDragged = true;
    order = 0;
        
    canBeTurned = false;
    backsrc = null;
    isTurned = false;

    canBeRotated = false;
    rotationSteps = 90;
    rotation = 0;

    isStack = false;
    showStackCount = false;
    stackItems = [];// {src,amount}
    stackItemCount = 0;
    drawClosed = false;

    constructor(id) {
        if (id == undefined || id == null) {
            id = CreateId();
        }

        this.id = id;
    }
}

class StackItem {
    src;
    amount = 1;
}

function CreateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}