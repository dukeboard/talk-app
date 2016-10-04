const electron = require('electron');
const Menu = electron.Menu;
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const dialog = electron.dialog;
const fs = require('fs');
const ipc = require('electron').ipcMain;

var windows = [];
var paths = [];

function windowIndex(window){
	for(var i=0;i<windows.length;i++){
		if(windows[i] === window){
			return i;
		}
	}
}

function createWindow () {
	var newWindow = new BrowserWindow({width: 800, height: 600,show: false,icon: 'icon.icns'});
	windows.push(newWindow);
	newWindow.loadURL(`file://${__dirname}/index.html`)
	newWindow.webContents.openDevTools()
	newWindow.on('closed', function () {
		var winIndex = windowIndex(newWindow);
		delete windows[winIndex];
		delete paths[winIndex];
	});
	newWindow.once('ready-to-show', () => {
	        newWindow.maximize();
	        newWindow.show();
	});
}

ipc.on('resp-save', function(event, eventData) {
    writeFile(eventData.path, eventData.content,windows[eventData.index]);
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
		if(windows.length == 0){
			createWindow();
		}
});

app.on('ready', function(){
	const menu = Menu.buildFromTemplate(menuTemplate);
	Menu.setApplicationMenu(menu);
	createWindow();
})

app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', function () {
	//if (mainWindow === null) {
		createWindow()
	//}
})

let menuTemplate = [{
    label: 'File',
    submenu: [{
        label: 'New',
        accelerator: 'CmdOrCtrl+N',
        click: function(item, focusedWindow) {
            createWindow()
        }
    }, {
        label: 'Open',
        accelerator: 'CmdOrCtrl+O',
        click: function(item, focusedWindow) {
            // Open a new file and either put it in the same window
            // or put it in a new window
            selectFileDialog((files) => {
                if (files != undefined) {
                    globalFilePath = files;
										var foundIndex = windowIndex(focusedWindow);
										paths[foundIndex] = globalFilePath;
                    // extract the filename
                    var array = globalFilePath.split("/");
                    filename = array[array.length - 1];
										focusedWindow.setTitle(filename + " | TalkApp");
                    readFile(files, (content) => {
                        focusedWindow.webContents.send('file-contents', content);
                    },focusedWindow);
                }
            });
        }
    }, {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click: function(item, focusedWindow) {
					  var foundIndex = windowIndex(focusedWindow);
						var foundPath = paths[foundIndex];
						if(foundPath == undefined){
							saveFileDialog(function(path){
								var array = path.split("/");
								filename = array[array.length - 1];
								focusedWindow.setTitle(filename + " | TalkApp");
								paths[foundIndex] = path;
								var saveQuery = {path:path,content:"",index:foundIndex};
								focusedWindow.webContents.send('req-save',saveQuery);
							});
						} else {
							var saveQuery = {path:paths[foundIndex],content:"",index:foundIndex};
							focusedWindow.webContents.send('req-save',saveQuery);
						}
        }
    }, {
        label: 'Save As',
        accelerator: 'CmdOrCtrl+Shift+S',
        click: function(item, focusedWindow) {
            saveFileDialog(function(path){
							var foundIndex = windowIndex(focusedWindow);
							paths[foundIndex] = path;
							var saveQuery = {path:path,content:"",index:foundIndex};
							focusedWindow.webContents.send('req-save',saveQuery);
						});
        }
    }, {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: function(item, focusedWindow) {
            app.quit();
        }
    }]
}, {
    label: 'Edit',
    submenu: [{
        label: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        role: 'undo'
    }, {
        label: 'Redo',
        accelerator: 'Shift+CmdOrCtrl+Z',
        role: 'redo'
    }, {
        type: 'separator'
    }, {
        label: 'Cut',
        accelerator: 'CmdOrCtrl+X',
        role: 'cut'
    }, {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        role: 'copy'
    }, {
        label: 'Paste',
        accelerator: 'CmdOrCtrl+V',
        role: 'paste'
    }, {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        role: 'selectall'
    }]
}, {
    label: 'View',
    submenu: [{
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: function(item, focusedWindow) {
            if (focusedWindow) {
                // on reload, start fresh and close any old
                // open secondary windows
                if (focusedWindow.id === 1) {
                    BrowserWindow.getAllWindows().forEach(function(win) {
                        if (focusedWindow.id > 1) {
                            focusedWindow.close();
                        }
                    });
                }
                focusedWindow.reload();
            }
        }
    }, {
        label: 'Toggle Full Screen',
        accelerator: (function() {
            if (process.platform === 'darwin') {
                return 'Ctrl+Command+F';
            } else {
                return 'F11';
            }
        })(),
        click: function(item, focusedWindow) {
            if (focusedWindow) {
                focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
            }
        }
    }, {
        label: 'Toggle Developer Tools',
        accelerator: (function() {
            if (process.platform === 'darwin') {
                return 'Alt+Command+I'
            } else {
                return 'Ctrl+Shift+I'
            }
        })(),
        click: function(item, focusedWindow) {
            if (focusedWindow) {
                focusedWindow.toggleDevTools();
            }
        }
    }]
}, {
    label: 'Window',
    role: 'window',
    submenu: [{
        label: 'Minimize',
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize'
    }, {
        label: 'Close',
        accelerator: 'CmdOrCtrl+W',
        role: 'close'
    }, {
        type: 'separator'
    }]
}, {
    label: 'Help',
    role: 'help',
    submenu: [{
        label: 'GitHub',
        click: function() {
            electron.shell.openExternal('https://github.com/dukeboard/talk-app');
        }
    }, {
        label: 'Issues',
        click: function() {
            electron.shell.openExternal('https://github.com/dukeboard/talk-app/issues');
        }
    }]
}];

function selectFileDialog(callback) {
    dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{
            name: 'Markdown',
            extensions: ['md']
        }]
    }, function(file) {
        if (file != undefined) {
            callback(file[0]);
        } else {
            callback(undefined);
        }
    });
}

function saveFileDialog(callback) {
    dialog.showSaveDialog({
        filters: [{
            name: 'Markdown',
            extensions: ['md']
        }]
    }, callback);
}

function readFile(filePath, callback,focusedWindow) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            error('danger', '<strong>Uh-Oh!</strong> There was an error reading the file. Error: ' + err,focusedWindow);
            callback();
        } else {
            callback(data);
        }
    });
}

function writeFile(filePath, contents, currentWindow) {
    if (filePath != undefined) {
        fs.writeFile(filePath, contents, (err) => {
            if (err) {
                error('danger', "<strong>Uh-Oh!</strong> There was an error saving the file.",currentWindow);
            }
        });
    }
}

function error(type, message, currentWindow) {
		console.log("ERROR",type,message);
    var data = {
        type: type,
        message: message
    };
    currentWindow.webContents.send('error', data);
}
