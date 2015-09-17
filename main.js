var app = require('app');
var BrowserWindow = require('browser-window');
var ipc = require('ipc');
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
  //mainWindow.openDevTools();
  mainWindow.on('closed', function() {
    mainWindow = null;
  });

ipc.on('toggleFullScreen',function(){
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
});
ipc.on('showOpen',function(){
  dialog.showOpenDialog(mainWindow,{ properties: [ 'openFile'], filters: [{ name: 'TALK', extensions: ['talk'] }]},function(links){
    for(var j=0;j<links.length;j++){
      handler.openModel(mainWindow,links[j]);
    }
  });
});

  var dialog = require('dialog');
  var template = [
   {
     label: 'File',
     submenu: [
       {
         label: 'Open',
         click: function() {
           dialog.showOpenDialog(mainWindow,{ properties: [ 'openFile'], filters: [{ name: 'TALK', extensions: ['talk'] }]},function(links){
             for(var j=0;j<links.length;j++){
               handler.openModel(mainWindow,links[j]);
             }
           });
         }
       },
       {
         label: 'Save',
         click: function(){
           handler.saveModel(mainWindow,function(){

           });
         }
       }
     ]
   }
 ];
 menu = Menu.buildFromTemplate(template);
 Menu.setApplicationMenu(menu);

});

var onopen = function (e, lnk) {
  e.preventDefault()
  handler.openModel(mainWindow,lnk);
}
app.on('open-file', onopen)
app.on('open-url', onopen)
