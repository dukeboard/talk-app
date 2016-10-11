rm -Rf dist
electron-packager --overwrite --out=dist --icon="icon.icns" . Talk --platform=darwin --arch=x64 --version=1.4.3
