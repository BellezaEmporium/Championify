import Promise from 'bluebird';
import { Octokit } from '@octokit/rest';
import { glob } from 'glob';
import gulp from 'gulp';
import path from 'path';
import fsExtra from 'fs-extra';
import request from 'request';
import pkg from '../package.json' with { type: "json" };

const fs = Promise.promisifyAll(fsExtra);
const requestAsync = Promise.promisify(request);

global.vtReports = {};

gulp.task('virustotal', function() {
  return requestAsync({url: `https://www.virustotal.com/vtapi/v2/file/scan/upload_url?apikey=${process.env.VIRUSTOTAL}`, json: true})
    .then(response => response.body.upload_url)
    .then(upload_url => {
      return Promise.resolve(glob.sync('./releases/*'))
        .each(file_path => {
          if (file_path.includes('RELEASE')) return;
          console.log('[VIRUSTOTAL] Uploading: ' + file_path);
          const options = {
            method: 'POST',
            formData: {file: fs.createReadStream(file_path)},
            url: upload_url
          };

          return requestAsync(options)
            .then(response => JSON.parse(response.body))
            .then(data => {
              global.vtReports[path.basename(file_path)] = data.permalink;
            });
        });
    })
    .tap(() => console.log(global.vtReports));
});

gulp.task('github-release', function(cb) {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
    userAgent: 'Championify-Gulp-Release',
    timeZone: 'America/Los_Angeles',
    baseUrl: 'https://api.github.com',
    log: {
      debug: () => {},
      info: () => {},
      warn: console.warn,
      error: console.error
    },
    request: {
      agent: undefined,
      fetch: undefined,
      timeout: 5000
    }
  });

  const changelog = fs.readFileSync('./CHANGELOG.md', 'utf8');
  const download_path = `https://github.com/BellezaEmporium/Championify/releases/download/${pkg.version}`;
  let body = `## Quick Downloads

Windows: [Setup.exe](${download_path}/Championify-Windows-Setup-${pkg.version}.exe) | [ZIP](${download_path}/Championify-WIN-${pkg.version}.zip)
macOS: [DMG](${download_path}/Championify-OSX-${pkg.version}.dmg) | [ZIP](${download_path}/Championify-OSX-${pkg.version}.zip)`;
  body += `\n\n## Changelog ${changelog.split(/<a name="*.*.*" \/>/g)[1]}`;
  body += '\n\n## Virus Total Reports\n';

  function formatTitle(name, link) {
    return `- [${name}](${link})\n`;
  }

  Object.keys(global.vtReports).forEach(item => {
    if (item.includes('Windows_Setup')) body += formatTitle('Windows Setup', global.vtReports[item]);
    if (item.includes('-WIN-')) body += formatTitle('Windows ZIP', global.vtReports[item]);
    if (item.includes('OSX') && item.includes('dmg')) body += formatTitle('Mac/OSX DMG', global.vtReports[item]);
    if (item.includes('OSX') && item.includes('zip')) body += formatTitle('Mac/OSX ZIP', global.vtReports[item]);
    if (item.includes('nupkg')) body += formatTitle('nupkg', global.vtReports[item]);
  });

  const create_release = {
    owner: 'dustinblackman',
    repo: 'Championify',
    tag_name: pkg.version,
    draft: true,
    name: `Championify ${pkg.version}`,
    body
  };

  octokit.repos.createRelease(create_release)
    .then(response => {
      const release_id = response.data.id;
      return Promise.resolve(glob.sync('./releases/*'))
        .each(file_path => {
          console.log(`[GITHUB] Uploading: ${file_path}`);
          const upload_file = {
            owner: 'BellezaEmporium',
            repo: 'Championify',
            release_id,
            name: path.basename(file_path),
            data: fs.readFileSync(file_path)
          };
          return octokit.repos.uploadReleaseAsset(upload_file);
        });
    })
    .then(() => cb())
    .catch(err => cb(err));
});
