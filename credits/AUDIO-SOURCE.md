# Button sound source

## Ciallo character greeting

- Local file: `public/audio/ciallo.mp3`
- Download source: [soyobat/callio — cialloMp3.mp3](https://github.com/soyobat/callio/blob/main/cialloMp3.mp3)
- Download URL: https://raw.githubusercontent.com/soyobat/callio/main/cialloMp3.mp3
- Upstream Git blob: `37712ddbffc062abb05dc03ea6b01a66a1ce6e18`
- SHA-256: `ec592031726e4e9dfc28373f73dc5b95bf0fa0a85df11c70b5d817bf9d1eb40f`
- Downloaded 2026-09-20; 20,589 bytes, MP3, 48 kHz stereo, 1.272 seconds. Unmodified.
- The upstream repository's MIT notice is retained in `CIALLO-REPOSITORY-LICENSE.txt`.
  The clip is third-party media, not original project code. The repository's software
  license is not independent confirmation of rights in the underlying voice recording;
  no claim is made that the project code license covers it.

Served from the same origin, only with sounds enabled. Ciallo and other character
sounds replace each other instead of overlapping. Muting stops ongoing playback.

## Button click

- Local file: `public/audio/minecraft-click.ogg`
- Original asset: `minecraft/sounds/random/click_stereo.ogg`
- Sound event: `ui.button.click` → `random/click_stereo`
- Official asset index: [26.2](https://piston-meta.mojang.com/v1/packages/e6ac246e2a151ff254110f4ddb1a944ed184d140/32.json)
- Official download: [Mojang resource CDN](https://resources.download.minecraft.net/f0/f0ca66561f832bf2f60b393837297c2692367cd5)
- SHA-1: `f0ca66561f832bf2f60b393837297c2692367cd5` (verified after download)
- Size: 7188 bytes

The audio is an unmodified Minecraft asset from Mojang/Microsoft. It is not original project code and is not covered by the project's code license.

The interface defaults to muted (an explicit enabled preference is retained), stores only the on/off preference locally, and preloads and decodes the same-origin sounds when enabled. Playback uses a short-lived Web Audio source per interaction, with preloaded audio elements as a fallback. Pointer input and keyboard activation are deduplicated; touch scrolling does not trigger a click sound. No third-party audio requests are made at runtime.

## Selection feedback

- Local file: `public/audio/minecraft-select.ogg`
- Original asset: `minecraft/sounds/note/hat.ogg`
- Sound event: `block.note_block.hat`
- Official asset index: [26.2](https://piston-meta.mojang.com/v1/packages/e6ac246e2a151ff254110f4ddb1a944ed184d140/32.json)
- Official download: [Mojang resource CDN](https://resources.download.minecraft.net/db/db3b85662c0000733a04d5087d7d835771a70cc5)
- SHA-1: `db3b85662c0000733a04d5087d7d835771a70cc5` (verified after download)
- Size: 4531 bytes

The unmodified note-block hi-hat plays when a dropdown value or header language/theme preference actually changes, or a selection checkbox is toggled. Opening a menu keeps the ordinary click sound, and choosing the current value stays silent.

## Verification parameters toggle

- Local file: `public/audio/minecraft-parameters.ogg`
- Original asset: `minecraft/sounds/item/spyglass/stop.ogg`
- Official download: [Mojang resource CDN](https://resources.download.minecraft.net/e6/e6ee4114f1db6bba8ae04d24fe8313b5a8095bcf)
- SHA-1: `e6ee4114f1db6bba8ae04d24fe8313b5a8095bcf` (verified after download)
- Size: 6015 bytes

The unmodified spyglass stop sound plays when the sun/moon control opens or closes the verification parameters.

## Expanded code view

- Local file: `public/audio/minecraft-expand.ogg`
- Original asset: `minecraft/sounds/item/spyglass/use.ogg`
- Official download: [Mojang resource CDN](https://resources.download.minecraft.net/43/433026dc9ff0946ef52622316550aef5fcf9fb46)
- SHA-1: `433026dc9ff0946ef52622316550aef5fcf9fb46` (verified after download)
- Size: 8669 bytes

The unmodified spyglass-use sound plays when opening the expanded code view. Returning to the full tool uses the corresponding spyglass-stop sound.

## Demo start

- Local file: `public/audio/minecraft-demo.ogg`
- Original asset: `minecraft/sounds/ui/loom/take_result.ogg`
- Sound event: `ui.loom.take_result`
- Official download: [Mojang resource CDN](https://resources.download.minecraft.net/2f/2f19ae244c92e4ed7fa8c205c0341f1f3a4cc67e)
- SHA-1: `2f19ae244c92e4ed7fa8c205c0341f1f3a4cc67e` (verified after download)
- Size: 10029 bytes

The unmodified loom result sound plays when a single or batch demonstration starts.

## Character hover

- Local file: `public/audio/minecraft-character.ogg`
- Original asset: `minecraft/sounds/note/bell.ogg`
- Sound event: `block.note_block.bell`
- Official download: [Mojang resource CDN](https://resources.download.minecraft.net/a1/a1e833dec61595dc79d0c672fcd7838579ca4b14)
- SHA-1: `a1e833dec61595dc79d0c672fcd7838579ca4b14` (verified after download)
- Size: 6087 bytes

The unmodified note-block bell accompanies ordinary desert-character greetings.
The angry reaction uses the same sample at 0.8x speed, with replay throttled to once
per 1.2 seconds. Moving between parts of the character does not count as another
hover entry, and touch input does not play a hover sound. Ciallo uses the dedicated
voice clip above instead of the bell.

## Successful code generation

The short experience-pickup sound documented below plays at reduced volume when a valid configuration first produces a code. It does not repeat when the same configuration rotates to its next code.

## Tip entrance

- Local file: `public/audio/minecraft-toast.ogg`
- Official asset: `minecraft/sounds/ui/toast/in.ogg` (`ui.toast.in`)
- Download: https://resources.download.minecraft.net/50/506f2fdb1b7530df66134aa04c71e66513df0c93
- SHA-1: `506f2fdb1b7530df66134aa04c71e66513df0c93` (verified)
- Size: 21392 bytes. Unmodified Mojang/Microsoft asset, not covered by the project code license.
- Plays once when a tip mounts, only when the user has enabled sounds.

- Tip playback volume: 75%; ordinary clicks and experience sounds remain at 35%, for both Web Audio and media-element fallback.

## Experience pickup sound

Minecraft Java 1.20.1 `minecraft/sounds/random/orb.ogg`, from Mojang’s official asset index.

Source: https://resources.download.minecraft.net/e9/e9833a1512b57bcf88ac4fdcc8df4e5a7e9d701d

Owned by Mojang/Microsoft; excluded from the project code license.
