var fs = require('fs');
var path = require('path');
var hljs = require('./highlight.js/lib/index.js');
var marked = require('./marked/index.js');
marked.setOptions({
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, code).value;
      } catch (err) {
        console.error(err);
      }
    }
    try {
      return hljs.highlightAuto(code).value;
    } catch (__) {}
    return ''; // use external default escaping
  }
});

var globalSlideModel = [];
var selectedSlide = -1;
var openedPath = null;
var openedDir = null;

exports.getSelectedSlide = function(){
  return this.selectedSlide;
}

exports.setCurrentSelected = function(index){
    this.selectedSlide = index;
}

exports.addSlideBefore = function(window){
  if(this.selectedSlide != undefined && this.selectedSlide != -1){
    var newSlideModel = [];
    var begin = this.globalSlideModel.slice(0,this.selectedSlide);
    for(var i=0;i<begin.length;i++){
      newSlideModel.push(begin[i]);
    }
    this.selectedSlide = newSlideModel.length;
    var newSlide = {raw: '## New Slide\n - your content here...\n'};
    newSlide.content = marked(newSlide.raw);
    newSlideModel.push(newSlide);
    var end = this.globalSlideModel.slice(this.selectedSlide);
    for(var i=0;i<end.length;i++){
      newSlideModel.push(end[i]);
    }
    this.globalSlideModel = newSlideModel;
    var newHtmlModel = this.renderSlides();
    window.webContents.send('slideModel',newHtmlModel);
  }
}

exports.addSlideAfter = function(window){
  if(this.selectedSlide != undefined && this.selectedSlide != -1){
    var newSlideModel = [];
    var begin = this.globalSlideModel.slice(0,this.selectedSlide+1);
    for(var i=0;i<begin.length;i++){
      newSlideModel.push(begin[i]);
    }
    this.selectedSlide = newSlideModel.length;
    var newSlide = {raw: '## New Slide\n - your content here...\n'};
    newSlide.content = marked(newSlide.raw);
    newSlideModel.push(newSlide);
    var end = this.globalSlideModel.slice(this.selectedSlide+1);
    for(var i=0;i<end.length;i++){
      newSlideModel.push(end[i]);
    }
    this.globalSlideModel = newSlideModel;
    var newHtmlModel = this.renderSlides();
    window.webContents.send('slideModel',newHtmlModel);
  }
}

exports.deleteSlide = function(window){
  if(this.selectedSlide != undefined && this.selectedSlide != -1){
    var newSlideModel = [];
    var begin = this.globalSlideModel.slice(0,this.selectedSlide);
    for(var i=0;i<begin.length;i++){
      newSlideModel.push(begin[i]);
    }
    var end = this.globalSlideModel.slice(this.selectedSlide+1);
    this.selectedSlide = newSlideModel.length-1;
    for(var i=0;i<end.length;i++){
      newSlideModel.push(end[i]);
    }
    this.globalSlideModel = newSlideModel;
    var newHtmlModel = this.renderSlides();
    window.webContents.send('slideModel',newHtmlModel);
  }
}

exports.slideRaw = function(index){
  if(index <= this.globalSlideModel.length){
    return this.globalSlideModel[index].raw;
  }
}

exports.slideModel = function(){
  return this.globalSlideModel;
}

exports.slideDeclaration = "[slide]";
exports.coverDeclaration = "[slide cover]";
exports.shoutDeclaration = "[slide shout]";

exports.initModel = function(window){
  this.globalSlideModel = [{raw: '## New Slide\n - your content here...\n'}];
  this.globalSlideModel[0].content = marked(this.globalSlideModel[0].raw);
  var newHtmlModel = this.renderSlides();
  this.selectedSlide = 0;
  window.webContents.send('slideModel',newHtmlModel);
}

var previousWatcher = null;

exports.openModel = function(window,filePath){
  if(previousWatcher != null){
    previousWatcher.close();
  }
  this.openedPath = filePath;
  this.openedDir = path.dirname(filePath);
  var self = this;
  //window.setRepresentedFilename(filePath);
  var callback = function(event, filename){
    var payload = fs.readFileSync(filePath,'utf-8');
    var lines = payload.split('\n');
    var slideObj = {};
    var slides = [];
    for(var i=0;i<lines.length;i++){
      if(lines[i].trim().indexOf(self.coverDeclaration) == 0){
        if(slideObj.content != undefined){
          slides.push(slideObj);
        }
        slideObj = {content:'',style:'cover'}
      } else if(lines[i].trim().indexOf(self.shoutDeclaration) == 0){
        if(slideObj.content != undefined){
          slides.push(slideObj);
        }
        slideObj = {content:'',style:'shout'}
      } else if(lines[i].trim().indexOf(self.slideDeclaration) == 0){
        if(slideObj.content != undefined){
          slides.push(slideObj);
        }
        slideObj = {content:''}
      } else {
        if(slideObj.content != undefined){
          slideObj.content += lines[i]+'\n';
        }
      }
    }
    if(slideObj.content != undefined){
      slides.push(slideObj);
    }
    //render markdown
    for(var i=0;i<slides.length;i++){
      if(slides[i].content != undefined){
        slides[i].raw = slides[i].content;
        slides[i].content = marked(slides[i].content.replace('$ROOT',self.openedDir));
      }
    }
    self.globalSlideModel = slides;
    var newHtmlModel = self.renderSlides();
    window.setRepresentedFilename(filePath);
    window.webContents.send('slideModel',newHtmlModel);
  }
  fs.watch(filePath, callback);
  callback(null,null);
}

exports.openedFile = function(){
  return this.openedPath;
}

exports.saveModel = function(window,targetFile){
  if(targetFile != undefined && targetFile != null){
      this.openedPath = targetFile;
  }
  if(this.openedPath){
    /*var pdfPath = this.openedPath.replace('.talk','.pdf');
    window.webContents.printToPDF({marginsType: 0}, function(error, data) {
      if (error) throw error;
      fs.writeFile(pdfPath, data, function(error) {
        if (error){
          throw error;
        }
        callback();
      });
    });*/
    var flattedContent = '';
    if(this.globalSlideModel){
      for(var i=0;i<this.globalSlideModel.length;i++){
        var loopSlide = this.globalSlideModel[i];
        if(loopSlide.style == 'shout'){
          flattedContent = flattedContent + this.shoutDeclaration+'\n';
        } else if(loopSlide.style == 'cover'){
          flattedContent = flattedContent + this.coverDeclaration+'\n';
        } else {
          flattedContent = flattedContent + this.slideDeclaration+'\n';
        }
        flattedContent = flattedContent + loopSlide.raw.trim()+'\n\n';
      }
    }
    fs.writeFile(this.openedPath, flattedContent.slice(0,flattedContent.length-1), function(error) {
      if (error){
        throw error;
      }
    });
  }
}

exports.renderSlide = function(index){
  var slideResolved = this.globalSlideModel[index];
  if(slideResolved==undefined || slideResolved.content ==undefined){ return "";}
  var classStyle = 'slide';
  if(slideResolved.style == 'shout'){
    classStyle = classStyle + ' shout';
  }
  if(slideResolved.style == 'cover'){
    classStyle = classStyle + ' cover';
  }
  return '<section id="slide_'+index+'" class="'+classStyle+'"><div id="slide_'+index+'_wrap">'+slideResolved.content+'</div></section>';
}

exports.updateSlide = function(index,rawContent){
  if(index > -1){
    var slideResolved = this.globalSlideModel[index];
    slideResolved.raw = rawContent;
    slideResolved.content = marked(rawContent.replace('$ROOT',this.openedDir));
    return slideResolved.content;
  }
}

exports.renderSlides = function(){
  var buffer = '';
  for(var i=0;i<this.globalSlideModel.length;i++){
    buffer = buffer + this.renderSlide(i);
  }
  return buffer;
}

exports.importModel = function(window,filePath){
  /*
  var payload = fs.readFileSync(filePath,'utf-8');
  var dirName = path.dirname(filePath);
  var und = new upndown();
  var parsed = cheerio.load(payload);
  parsed('img').each(function(i,elem){
    var imgSrcPath = path.join(dirName,parsed(this).attr('src'));
    var imgRawPayload = fs.readFileSync(imgSrcPath,'binary');
    var base64Image = new Buffer(imgRawPayload, 'binary').toString('base64');
    var prefix = 'data:image/'+path.extname(imgSrcPath).slice(1)+';base64,'
    parsed(this).attr('src',prefix+base64Image);
  });
  var slides = [];
  parsed('section').each(function(i,elem){
    var htmlPayload = parsed(this).html();
    var slideObj = {};
    slideObj.raw = htmlPayload;
    slideObj.content = htmlPayload;
    if(parsed(this).hasClass('shout') ){
        slideObj.style='shout';
    } else if(parsed(this).hasClass('cover') ){
        slideObj.style='cover';
    }
    slides.push(slideObj);
  });
  this.globalSlideModel = slides;
  var newHtmlModel = this.renderSlides();
  window.setRepresentedFilename(filePath);
  window.webContents.send('slideModel',newHtmlModel);
  */
}
