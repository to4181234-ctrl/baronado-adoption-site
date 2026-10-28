# Card completion sound

`public/go-card-woof.mp3` is derived from **Tiny Dog Bark** by **qubodup** (source: https://freesound.org/people/qubodup/sounds/813120/), licensed CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/). The source itself credits Glitchedtones' CC0 Dog Shih Tzu Bark Single 06.wav.

Changes: mono at 22.05 kHz, low pass at 2.8 kHz, reduced amplitude, short fade and two barks separated by silence, MP3 48 kbps. Only fetched when completion sound is enabled (on by default) in the camera. No third-party audio request at runtime.

Sound is on by default, a visitor can turn it off and the preference is stored on the device, and playback is attempted only after a successful save. It never delays the completion UI. Browsers or device audio settings may prevent playback. Reduced motion removes the success animation.
