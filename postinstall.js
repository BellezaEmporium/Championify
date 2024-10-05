import { execSync } from 'child_process'
import os from 'os'

if (os.platform() === 'darwin') {
  console.log('Replacing signtool.exe')
  execSync('curl -Ls "https://github.com/dustinblackman/mono-signtool/releases/download/0.0.2/mono-signtool.tar.gz" | tar xz -C ./node_modules/electron-winstaller/vendor/')
}

if (os.platform() === 'win32') {
  execSync('.\\node_modules\\.bin\\electron-rebuild.cmd -f -a ia32 -w runas')
}
