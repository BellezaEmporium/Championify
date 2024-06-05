const { execSync } = require('child_process');

function compileWin() {
  execSync('electron-packager . Championify --platform=win32 --arch=ia32 --out=dist --overwrite');
  console.log('Windows build complete');
}

compileWin();