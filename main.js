var app = require('app');
var BrowserWindow = require('browser-window');
var ipc = require('ipc');
var fs = require('fs');
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
  mainWindow = new BrowserWindow({width: 1024, height: 768});
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
           if(handler.edited()){
             var choice = dialog.showMessageBox(mainWindow,{
                             type: 'question',
                             buttons: ['Yes', 'No'],
                             title: 'Confirm',
                             message: 'Current talk is unsaved! Are you sure to override by a new talk?'
              });
              if(choice === 0){
                handler.initModel(mainWindow);
              }
           } else {
             handler.initModel(mainWindow);
           }
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
         label: 'Generate HTML',
         accelerator: 'Command+H',
         click: function(){
           if(handler.openedFile()){
             var viewerPayload = fs.readFileSync(__dirname+'/viewer.html','utf-8');
             var showerJS = fs.readFileSync(__dirname+'/static/shower/shower.js','utf-8');
             var showerCSS = fs.readFileSync(__dirname+'/static/shower/themes/kevoree/styles/screenInline.css','utf-8');
             var codeCSS = fs.readFileSync(__dirname+'/static/highlight.js/styles/tomorrow.css','utf-8');

             var dynamicPayload = viewerPayload.replace('{{content}}',handler.renderSlides());
             dynamicPayload = dynamicPayload.replace('{{selected}}',0);
             dynamicPayload = dynamicPayload.replace('<script src="./static/shower/shower.js"></script>','<script>'+showerJS+'</script>');
             dynamicPayload = dynamicPayload.replace('<link rel="stylesheet" href="./static/shower/themes/kevoree/styles/screen.css">','<style>'+showerCSS+'</style>');
             dynamicPayload = dynamicPayload.replace('<link rel="stylesheet" href="./static/highlight.js/styles/tomorrow.css">','<style>'+codeCSS+'</style>');

             var htmlOutput = handler.openedFile().replace('.talk','.html');
             fs.writeFile(htmlOutput, dynamicPayload, function(error) {
               if (error){
                 throw error;
               }
             });
           }
         }
       },
       /*
       {
         label: 'Generate PDF',
         accelerator: 'Command+P',
         click: function(){
            if(handler.openedFile()){
              mainWindow.print();
              var pdfOutput = handler.openedFile().replace('.talk','.pdf');
              mainWindow.printToPDF({landscape:true,marginType:0,printBackground:false,printSelectionOnly:false}, function (err, data) {
                if (err) {
                   console.error(err)
                 }
                 fs.writeFile(pdfOutput, data, function (err) {
                   if (err) {
                     console.error(err)
                   }
                 });
               });
            }
         }
       },*/
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
        }/*,
        {
          label: 'Find',
          accelerator: 'Command+F',
          click: function () {
            //window.find();
          }
        }*/
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
               label: 'Move Slide Up',
               accelerator: 'Command+UP',
               click: function() {
                 handler.moveSlideUp(mainWindow);
               }
             },
             {
               label: 'Move Slide Down',
               accelerator: 'Command+DOWN',
               click: function() {
                 handler.moveSlideDown(mainWindow);
               }
             },
             {
               label: 'Add Slide Down',
               accelerator: 'Shift+Command+DOWN',
               click: function() {
                 handler.addSlideAfter(mainWindow);
               }
             },
             {
               label: 'Add Slide Up',
               accelerator: 'Shift+Command+UP',
               click: function() {
                 handler.addSlideBefore(mainWindow);
               }
             },
             {
               label: 'Delete Current Slide',
               accelerator: 'Command+BACKSPACE',
               click: function() {
                 var choice = dialog.showMessageBox(mainWindow,{
                                 type: 'question',
                                 buttons: ['Yes', 'No'],
                                 title: 'Confirm',
                                 message: 'Are you sure to delete the selected slide?'
                  });
                  if(choice === 0){
                    handler.deleteSlide(mainWindow);
                  }
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
         accelerator: 'Shift+Command+F',
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
