![Championify](resources/github_banner.jpg)

# Championify

_Champion-If-Ayyy_

[![Donate to the original creator](https://img.shields.io/badge/Donate-Patreon-5cb85c.svg)](https://patreon.com/dustinblackman)
[![Translations](https://img.shields.io/badge/Translations-Transifex-135d91.svg)](https://www.transifex.com/dustinblackman/championify)

Championify is a little program that downloads all the recent item sets from popular websites like Champion.gg and imports them in to your League of Legends to use within game! No hassle. Championify supports 39 languages and with plenty of new features planned and in the works!

Windows and OSX are both supported, tested on Windows 10 and OSX 10.12.1.

![Championify](resources/screenshots/readme_screenshot.png)

Check out screenshots [here](https://imgur.com/a/vgS3I)!

There's also [Championify for Android](https://github.com/OmerValentine/Championify-Android)!

[Code Sponsor](https://app.codesponsor.io/link/owV5qUw9JoSRvTBFtixp6Xui/dustinblackman/Championify)

---

## Features

- Summoners Rift and ARAM Item Sets
- 7 Sources (U.gg (WIP), Leagueofgraphs (WIP), KoreanBuilds, op.gg, Probuilds, and Lolmasters)
- Skill Priorities lists (Q.W.E.Q.E.R) or Q>E>W
- 41 Languages
- Bunch of preferences to display item sets in the way you prefer
- Automation using command line preferences (simpler system coming soon)
- Automatically save preference settings
- Garena support
- Does not touch other item sets that you or other applications create

## Downloads

Found [here](https://github.com/dustinblackman/Championify/releases/latest)

## [Change Log](CHANGELOG.md)

## Idea/Suggestions

I'm completely open to new ideas and suggestions! Put up an [Issue](https://github.com/BellezaEmporium/Championify/issues) if you think something is worth having on the program !

## Contribute

Please see [CONTRIBUTING.md](./.github/CONTRIBUTING.md)

## [FAQ](FAQ.md)

See [FAQ.md](FAQ.md)

## Command Line Parameters

Championify supports a few command line parameters for those who would like to automate a few tasks before it's official supported within the app. Params work on both Windows and OSX, and uses the last saved preferences made on the app (preferences are saved each time you hit import). The command line prefs do need improvement and can be tracked [here](https://github.com/dustinblackman/Championify/issues/165).

__Params__

- `--import` Imports item sets
- `--delete` Deletes item sets
- `--autorun` Silently (without loading the UI) imports item sets
- `--close` Closes Championify when finished
- `--start-league` Starts League of Legends after import

__Example__

Silently imports and starts League afterwards after installing Championify with the Windows Installer. As Squirrels
generates the main `championify.exe`, `--processStartArgs` must be used before all other command line options.

```cmd
C:\Users\YOURNAME\AppData\Local\Championify\championify.exe --processStartArgs --autorun --start-league
```

## Build From Source

_THIS IS CURRENTLY NOT COMPILABLE, AS I'M REFACTORING THE WHOLE PROCESS._
You must have Node 18 and npm 9 installed on your system (thats what Electron is using), git clone the repo and run the following in the root folder.

__OSX:__

```bash
npm i
npm run build
```

__Windows:__

```bash
npm i --arch=ia32
npm run build
```

You'll find a Championify.exe/Championify.app in the releases folder.

Wine is required if building on Mac for Windows.

```bash
brew install wine
```

## Backers

See [BACKERS.md](BACKERS.md)

## Credits

- [The Node.js community](https://nodejs.org/) and all the library creators for their awesome programs.
- [Dustin Blackman](https://github.com/DustinBlackman) for this program.
- Icon by [Omer Levy](http://github.com/OmerValentine)
- Package icon by [Becris](http://www.flaticon.com/free-icon/new-product_166913#term=new&page=2&position=96)
- [Joeldo](https://www.reddit.com/user/joeldo) of [Champion.gg](http://champion.gg)
- [Lolflavor](http://www.lolflavor.com/)
- [KoreanBuilds](http://koreanbuilds.net)
- [Probuilds](http://probuilds.net)
- [Lolalytics](http://lolalytics.com)
- [op.gg](http://op.gg)
- [Lolmasters](http://lolmasters.net/)

## Thank yous

- [@sargonas](https://github.com/sargonas) and the rest of the Riot API team for unlocking item sets
- All the wonderful people on Dustin's [Transifex team](https://www.transifex.com/dustinblackman/championify/) (all 180 of you) for helping translate Championify!

## [License](LICENSE)

Championify is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
