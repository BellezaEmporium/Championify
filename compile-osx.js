const { execSync } = require('child_process');

function compileOsx() {
  execSync('electron-packager . Championify --platform=darwin --arch=x64 --out=dist --overwrite');
  console.log('OSX build complete');
}

compileOsx();
