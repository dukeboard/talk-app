var app = require('app');
var BrowserWindow = require('browser-window');
var ipc = require('ipc');
var handler = require('./static/handler.js');
global.handler = handler;
var Menu = require('menu');
var mainWindow = null;
var editMode = false;
app.on('window-all-closed', function() {
  //if (process.platform != 'darwin') {
    app.quit();
  //}
});
app.on('ready', function() {
  mainWindow = new BrowserWindow({width: 800, height: 600});
  mainWindow.loadUrl('file://' + __dirname + '/split.html');
  //mainWindow.openDevTools();
  global.mainWindow = mainWindow;

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
ipc.on('requestSlideModel',function(event){
      if(handler.openedFile()){
          event.sender.send('slideModel',handler.renderSlides());
      } else {
          event.sender.send('slideModel',null);
      }
});
  var dialog = require('dialog');
  var template = [
   {
     label: 'File',
     submenu: [
       {
         label: 'New',
         accelerator: 'Command+N',
         click: function() {
           handler.initModel(mainWindow);
         }
       },
       {
         label: 'Open',
         accelerator: 'Command+O',
         click: function() {
           dialog.showOpenDialog(mainWindow,{ properties: [ 'openFile'], filters: [{ name: 'TALK', extensions: ['talk'] }]},function(links){
             if(links){
               for(var j=0;j<links.length;j++){
                handler.openModel(mainWindow,links[j]);
               }
             }
           });
         }
       },
       {
         label: 'Save',
         accelerator: 'Command+S',
         click: function(){
           if(handler.openedFile()){
             handler.saveModel(mainWindow,null,function(){});
           } else {
             dialog.showSaveDialog(mainWindow,{ properties: [ 'saveFile'], filters: [{ name: 'TALK', extensions: ['talk'] }]},function(link){
               if(link){
                 handler.saveModel(mainWindow,link);
               }
             });
           }
         }
       },
       {
         label: 'Quit',
         accelerator: 'Command+Q',
         click: function(){
           app.quit();
         }
       }
     ]
   },
   {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'Command+Z',
          selector: 'undo:'
        },
        {
          label: 'Redo',
          accelerator: 'Shift+Command+Z',
          selector: 'redo:'
        },
        {
          type: 'separator'
        },
        {
          label: 'Cut',
          accelerator: 'Command+X',
          selector: 'cut:'
        },
        {
          label: 'Copy',
          accelerator: 'Command+C',
          selector: 'copy:'
        },
        {
          label: 'Paste',
          accelerator: 'Command+V',
          selector: 'paste:'
        },
        {
          label: 'Select All',
          accelerator: 'Command+A',
          selector: 'selectAll:'
        },
      ]
    },
   {
     label: 'Slide',
     submenu: [
             {
               label: 'Edit Current Slide',
               accelerator: 'Command+E',
               click: function() {
                  mainWindow.webContents.send('toggleEdit');
               }
             },
             {
               label: 'Add Slide Down',
               accelerator: 'Command+DOWN',
               click: function() {
                 handler.addSlideAfter(mainWindow);
               }
             },
             {
               label: 'Add Slide Up',
               accelerator: 'Command+UP',
               click: function() {
                 handler.addSlideBefore(mainWindow);
               }
             },
             {
               label: 'Delete Current Slide',
               accelerator: 'Command+BACKSPACE',
               click: function() {
                 handler.deleteSlide(mainWindow);
               }
             }
             /*,
            {
              label: 'embedImages',
              click: function() {

              }
            },
            {
              label: 'un-inline image',
              click: function() {

              }
            }*/
          ]
   },
   {
     label: 'Presentation',
     submenu: [
       {
         label: 'Toggle Fullscreen',
         accelerator: 'Command+F',
         click: function() {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
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
