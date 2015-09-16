var app = require('app');
var BrowserWindow = require('browser-window');
var handler = require('./static/handler.js');
var Menu = require('menu');
var mainWindow = null;
app.on('window-all-closed', function() {
  if (process.platform != 'darwin') {
    app.quit();
  }
});
app.on('ready', function() {
  mainWindow = new BrowserWindow({width: 800, height: 600});
  mainWindow.loadUrl('file://' + __dirname + '/index.html');
  mainWindow.openDevTools();
  mainWindow.on('closed', function() {
    mainWindow = null;
  });
  var dialog = require('dialog');
  var showOpen = function() {
 	  dialog.showOpenDialog(mainWindow,{ properties: [ 'openFile'], filters: [{ name: 'TALK', extensions: ['talk'] }]},function(links){
      for(var j=0;j<links.length;j++){
        handler.openModel(mainWindow,links[j]);
      }
    });
  };
  var template = [
   {
     label: 'File',
     submenu: [
       {
         label: 'Open',
         click: function() { showOpen(); }
       }
     ]
   }
 ];
 menu = Menu.buildFromTemplate(template);
 Menu.setApplicationMenu(menu);

//temp
handler.openModel(mainWindow,"./example/sample.talk");

});

var onopen = function (e, lnk) {
  e.preventDefault()
  handler.openModel(mainWindow,lnk);
}
app.on('open-file', onopen)
app.on('open-url', onopen)
