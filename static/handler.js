var fs = require('fs');
var hljs = require('./highlight.js/lib/index.js');
var md = require('./markdown/markdown-it.min.js')({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, str).value;
      } catch (__) {}
    }

    try {
      return hljs.highlightAuto(str).value;
    } catch (__) {}
    return ''; // use external default escaping
  }
});

var globalSlideModel = [];
var selectedSlide = -1;
var openedPath = null;

exports.slideModel = function(){
  return this.globalSlideModel;
}

exports.selectSlide = function(index){
  this.selectedSlide = index;
  bus.dispatch("slide.selected",index);
}

exports.openModel = function(window,filePath){
  this.openedPath = filePath;
  var payload = fs.readFileSync(filePath,'utf-8');
  var lines = payload.split('\n');
  var slideObj = {};
  var slides = [];
  for(var i=0;i<lines.length;i++){
    if(lines[i].indexOf('#slide') > -1){
      if(slideObj.content != undefined){
        slides.push(slideObj);
      }
      var newTitle = lines[i].slice(lines[i].indexOf('#slide')+'#slide'.length).trim();
      slideObj = {title:newTitle,content:''}
    } else {
      if(slideObj.content != undefined){
        slideObj.content = slideObj.content + lines[i]+"\n";
      }
    }
  }
  if(slideObj.content != undefined){
    slides.push(slideObj);
  }
  //render markdown
  for(var i=0;i<slides.length;i++){
    if(slides[i].content != undefined){
      slides[i].content = md.render(slides[i].content);
    }
  }
  this.globalSlideModel = slides;
  var newHtmlModel = this.renderSlides();
  window.webContents.send('newSlideModel',newHtmlModel);
}

exports.renderSlide = function(index){
  var slideResolved = this.globalSlideModel[index];
  if(slideResolved==undefined || slideResolved.content ==undefined){ return "";}
  var titleBloc='';
  if(slideResolved.title!=undefined){
    titleBloc = '<h2>'+slideResolved.title+'</h2>';
  }
  return '<section class="slide"><div>'+titleBloc+slideResolved.content+'</div></section>';
}

exports.renderSlides = function(){
  var buffer = '';
  for(var i=0;i<this.globalSlideModel.length;i++){
    buffer = buffer + this.renderSlide(i);
  }
  return buffer;
}
