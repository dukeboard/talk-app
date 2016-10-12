const electron = require('electron');
const Menu = electron.Menu;
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const dialog = electron.dialog;
const fs = require('fs');
const ipc = require('electron').ipcMain;
const portFinder = require('find-port');
const http = require('http');
const url = require('url');
const path = require('path');

var models = {};
var ports = {};

const mimeType = {
	'.ico': 'image/x-icon',
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.css': 'text/css',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.wav': 'audio/wav',
	'.mp3': 'audio/mpeg',
	'.svg': 'image/svg+xml',
	'.pdf': 'application/pdf',
	'.doc': 'application/msword',
	'.eot': 'appliaction/vnd.ms-fontobject',
	'.ttf': 'aplication/font-sfnt'
};

function createWindow () {
	portFinder('127.0.0.1', 8500, 8600,function(foundPorts) {
		let port = foundPorts[0];//take first
		var newWindow = new BrowserWindow({
			width: 1024,
			height: 768,
			show: false,
			icon: 'icon.icns',
			webPreferences: {
    		nodeIntegration: false,
    		preload: `${__dirname}/preload.js`
			}
		});
		var filename = "unamed";
		newWindow.setTitle(filename + " | TalkApp");
		newWindow.setRepresentedFilename(filename);
		newWindow.setDocumentEdited(true);
		ports[newWindow.id] = port;
		models[port] = {};
		models[port].window = newWindow;
		function handleRequest(request, response){
			const parsedUrl = url.parse(request.url);
			let pathname = `.${parsedUrl.pathname}`;
			const ext = path.parse(pathname).ext;
			fs.readFile(`${__dirname}${request.url}`, function(err, data){
				if(err){
					var currentRoot = models[port].root;
					if(currentRoot){
						fs.readFile(`${currentRoot}${request.url}`, function(err2, data2){
							if(err2){
								response.statusCode = 500;
								response.end(`Error getting the file: ${err}.`);
							} else {
								response.setHeader('Content-type', mimeType[ext] || 'text/plain' );
								response.end(data2);
							}
						});
					} else {
						response.statusCode = 500;
						response.end(`Error getting the file: ${err}.`);
					}
				} else {
					if(request.url == '/full.html'||request.url == '/print.html'){
						var dataString = data.toString();
						dataString = dataString.replace('{content}',models[port].content);
						response.setHeader('Content-type', mimeType[ext] || 'text/plain' );
						response.end(dataString);
					} else {
						response.setHeader('Content-type', mimeType[ext] || 'text/plain' );
						response.end(data);
					}
				}
			});
		}
		models[port].server = http.createServer(handleRequest);;
		models[port].server.listen(port,'127.0.0.1', function(){
			newWindow.loadURL(`http://127.0.0.1:${port}/index.html`);
		});
		newWindow.on('closed', function () {
			var model = models[port];
			if(model.server){
				try {
					model.server.close();
				} catch(e){
				}
			}
			delete models[port];
		});

		newWindow.on('close', function(e){
			if(newWindow.isDocumentEdited()){
				var choice = dialog.showMessageBox(newWindow,{
												type: 'question',
												buttons: ['Yes', 'No'],
												title: 'Confirm',
												message: 'Your talk is unsaved, do you really want to quit ?'});
				if(choice !== 0){ e.preventDefault(); }
			}
		});

		newWindow.once('ready-to-show', () => {
		        newWindow.maximize();
		        newWindow.show();
		});
	});
}

ipc.on('resp-save', function(event, eventData) {
	  if(models[eventData.port]){
			var savedPath = models[eventData.port].path;
			if(savedPath){
				writeFile(savedPath, eventData.content,models[eventData.port].window);
			}
		}
});

ipc.on('edited',function(){
	BrowserWindow.getFocusedWindow().setDocumentEdited(true);
});

ipc.on('resp-content',function(event,eventData){
	if(models[eventData.port]){
		models[eventData.port].content = eventData.content;
		var previewWindow = models[eventData.port].preview;
		if(previewWindow){
			previewWindow.loadURL(`http://127.0.0.1:${eventData.port}/full.html`);
			previewWindow.once('ready-to-show', () => {
							previewWindow.setFullScreen(true);
							previewWindow.maximize();
							previewWindow.show();
			});
		}
	}
});

ipc.on('resp-print-content',function(event,eventData){
	if(models[eventData.port]){
		models[eventData.port].content = eventData.content;
		var previewWindow = models[eventData.port].preview;
		if(previewWindow){
			previewWindow.loadURL(`http://127.0.0.1:${eventData.port}/print.html`);
			previewWindow.once('ready-to-show', () => {
					previewWindow.webContents.printToPDF({
			      landscape: true
			    }, function(err, data) {
			      fs.writeFile(eventData.path, data, function(err) {
			        if(err) alert('genearte pdf error', err);
							models[eventData.port].preview = undefined;
			      });
			    });
			});
		}
	}
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
		if(models.length == 0){
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
	if(models.length == 0){
		createWindow()
	}
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
									var port = ports[focusedWindow.id];
									if(models[port]){
										models[port].path = files;
										var array = files.split("/");
										filename = array[array.length - 1];
										focusedWindow.setTitle(filename + " | TalkApp");
										focusedWindow.setRepresentedFilename(filename);
										focusedWindow.setDocumentEdited(false);
										models[port].root = files.slice(0,files.length - (filename.length+1));
										readFile(files, (content) => {
												focusedWindow.webContents.send('file-contents', content);
										},focusedWindow);
									}
                }
            });
        }
    }, {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click: function(item, focusedWindow) {
					  var port = ports[focusedWindow.id];
						if(models[port]){
							var foundPath = models[port].path;
							if(foundPath == undefined){
								saveFileDialog(function(path){
									if(path){
										var array = path.split("/");
										var filename = array[array.length - 1];
										focusedWindow.setTitle(filename + " | TalkApp");
										focusedWindow.setRepresentedFilename(filename);
										models[port].path = path;
										focusedWindow.webContents.send('req-save',{port:port,content:""});
									}
								});
							} else {
								focusedWindow.webContents.send('req-save',{port:port,content:""});
							}
						}
        }
    }, {
        label: 'Save As',
        accelerator: 'CmdOrCtrl+Shift+S',
        click: function(item, focusedWindow) {
          saveFileDialog(function(path){
						if(path){
							var array = path.split("/");
							var filename = array[array.length - 1];
							var port = ports[focusedWindow.id];
							if(models[port]){
								models[port].path = path;
								focusedWindow.setRepresentedFilename(filename);
								focusedWindow.setTitle(filename + " | TalkApp");
								focusedWindow.webContents.send('req-save',{port:port,content:""});
							}
						}
					});
        }
    }, {
        label: 'Print As PDF',
        accelerator: 'CmdOrCtrl+P',
        click: function(item, focusedWindow) {
            savePDFFileDialog(function(path){
							if (focusedWindow) {
									var port = ports[focusedWindow.id];
									if(port){
										models[port].preview = new BrowserWindow({
											width: 800,
											height: 600,
											show: false,
											icon: 'icon.icns',
											webPreferences: {
												nodeIntegration: false,
												offscreen: true
											}
										});
										focusedWindow.webContents.send('req-print-content',{port:port, path: path});
									}
	            }
						});
        }
    }, {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: function(item, focusedWindow) {
						var shouldAsk = false;
						for(var i=0;i<models.length;i++){
							if(models[i].window){
								if(models[i].window.isDocumentEdited()){
									shouldAsk = true;
								}
							}
						}
						if(shouldAsk){
							var choice = dialog.showMessageBox(newWindow,{
															type: 'question',
															buttons: ['Yes', 'No'],
															title: 'Confirm',
															message: 'One talk is unsaved, do you really want to quit all ?'});
							if(choice !== 1){
								app.quit();
							}
						} else {
							app.quit();
						}
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
        label: 'Toggle Presentation Mode',
        accelerator: (function() {
            if (process.platform === 'darwin') {
                return 'Ctrl+Command+P';
            } else {
                return 'F10';
            }
        })(),
        click: function(item, focusedWindow) {
            if (focusedWindow) {
								var port = ports[focusedWindow.id];
								if(port){
									var newWindow = new BrowserWindow({
										width: 800,
										height: 600,
										show: false,
										icon: 'icon.icns',
										webPreferences: {
											nodeIntegration: false
										}
									});
									models[port].preview = newWindow;
									newWindow.on('closed', function () {
										focusedWindow.focus();
									});
									focusedWindow.webContents.send('req-content',{port:port});
								}
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

function savePDFFileDialog(callback) {
    dialog.showSaveDialog({
        filters: [{
            name: 'PDF',
            extensions: ['pdf']
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
						currentWindow.setDocumentEdited(false);
        });
    }
}

function error(type, message, currentWindow) {
		console.log("ERROR",type,message);
}

//drag and drop management

/*
process.argv.forEach(onOpen);
app.on('open-file', onOpen)
app.on('open-url', onOpen)

function onOpen(file){
	console.log(">",file);
}
*/
