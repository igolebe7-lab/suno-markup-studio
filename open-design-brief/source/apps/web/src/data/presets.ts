import type { GenrePreset } from '../domain/types';

const preset = (
  id: string,
  name: string,
  stylePrompt: string,
  structureTemplate: string,
  quickTags: string[],
  bpmRange: [number, number]
): GenrePreset => ({
  id,
  name,
  stylePrompt,
  structureTemplate,
  quickTags,
  bpmRange,
  recommendedTagIds: [],
  avoidTagIds: []
});

const presetRows: Array<[string, string, string, string, string[], [number, number]]> = [
  ['pop-dance', 'Pop / Dance Pop', 'dance-pop, upbeat, 118 BPM, female lead vocal, bright synths, punchy electronic drums, catchy chorus, polished radio-ready mix', '[Intro]\n[Verse 1]\n[Pre-Chorus]\n[Chorus]\n[Verse 2]\n[Pre-Chorus]\n[Chorus]\n[Bridge]\n[Final Chorus]\n[Outro]\n[End]', ['[Chorus: full production, catchy hook]', '[Post-Chorus: vocal chops]', '[Bridge: stripped down]'], [110, 124]],
  ['indie-rock', 'Indie Rock', 'indie rock, bittersweet, 126 BPM, male vocal, jangly electric guitars, live drums, warm analog texture, anthemic chorus', '[Intro]\n[Verse 1]\n[Chorus]\n[Verse 2]\n[Chorus]\n[Bridge]\n[Final Chorus]\n[Outro]', ['[Guitar Solo]', '[Chorus: full band]', '[Bridge: half-time]'], [116, 134]],
  ['trap', 'Hip-Hop / Trap', 'trap, dark, 140 BPM, aggressive rap vocals, 808 bass, trap hi-hats, sparse synth lead, polished modern mix', '[Intro]\n[Verse 1: rap]\n[Hook]\n[Verse 2: double-time rap]\n[Hook]\n[Bridge: ad-libs]\n[Final Hook]\n[End]', ['[Rap]', '[Ad-lib]', '[Drop]', '[Double-Time]'], [130, 150]],
  ['neo-soul', 'R&B / Neo-Soul', 'neo-soul, intimate, 92 BPM, smooth soulful vocals, electric piano, warm bass, mellow drums, stacked harmonies, tape saturation', '[Intro]\n[Verse 1]\n[Pre-Chorus]\n[Chorus]\n[Verse 2]\n[Chorus]\n[Bridge: piano only]\n[Final Chorus]\n[Outro]', ['[Harmony]', '[Melismatic]', '[Call and Response]', '[Backing Vocals]'], [84, 102]],
  ['festival-house', 'EDM / Festival House', 'festival house, euphoric, 128 BPM, vocal chops, four-on-the-floor kick, supersaw lead, sidechain compression, huge drop, polished club mix', '[Intro]\n[Verse]\n[Build-Up]\n[Drop]\n[Breakdown]\n[Build-Up]\n[Final Drop]\n[Outro]', ['[Build-Up]', '[Drop]', '[Bass Drop]', '[Riser]', '[Instrumental Break]'], [124, 132]],
  ['minimal-techno', 'Techno / Minimal', 'minimal techno, hypnotic, 130 BPM, deep kick, rolling bassline, sparse percussion, dark synth stabs, club-ready mix', '[Intro]\n[Build]\n[Break]\n[Drop]\n[Interlude]\n[Build]\n[Final Drop]\n[Outro]', ['[Percussion Break]', '[Build]', '[Drop]', '[Filter Sweep]'], [126, 134]],
  ['synthwave', 'Synthwave', '1980s synthwave, nostalgic, 100 BPM, analog synths, gated drums, arpeggiated bass, dreamy male vocal, wide reverb, neon night drive mood', '[Intro: analog synth arpeggio]\n[Verse 1]\n[Chorus]\n[Verse 2]\n[Chorus]\n[Synth Solo]\n[Final Chorus]\n[Outro: fade out]', ['[Synth Solo]', '[Fade Out]', '[Chorus: wide harmonies]'], [92, 108]],
  ['metalcore', 'Metal / Metalcore', 'metalcore, aggressive, 160 BPM, screamed verses, clean sung chorus, heavy distorted guitars, double kick drums, breakdown, polished heavy mix', '[Intro]\n[Verse 1: scream]\n[Pre-Chorus]\n[Chorus: clean vocals]\n[Verse 2: scream]\n[Breakdown]\n[Bridge]\n[Final Chorus]\n[End]', ['[Scream]', '[Breakdown]', '[Double-Time]', '[Guitar Solo]'], [150, 175]],
  ['pop-punk', 'Punk / Pop Punk', 'pop punk, energetic, 170 BPM, nasal male vocal, power chords, fast live drums, gang vocals, raw but polished mix', '[Intro]\n[Verse 1]\n[Chorus]\n[Verse 2]\n[Chorus]\n[Bridge: gang vocals]\n[Final Chorus]\n[End]', ['[Crowd Chant]', '[Break]', '[Chorus: gang vocals]'], [155, 180]],
  ['country', 'Country / Americana', 'modern country, heartfelt, 90 BPM, warm male vocal, acoustic guitar, pedal steel, fiddle, soft drums, storytelling lyrics, natural mix', '[Intro]\n[Verse 1]\n[Chorus]\n[Verse 2]\n[Chorus]\n[Bridge]\n[Final Chorus]\n[Outro]', ['[Fingerstyle Guitar Solo]', '[Harmony]', '[Outro: acoustic reprise]'], [82, 100]],
  ['folk', 'Folk / Acoustic Ballad', 'indie folk, melancholic, 76 BPM, soft intimate vocals, fingerpicked acoustic guitar, light strings, minimal percussion, lo-fi warmth', '[Intro]\n[Verse 1]\n[Verse 2]\n[Chorus]\n[Bridge: strings rise]\n[Final Chorus]\n[Outro]', ['[Whisper]', '[Strings Rise]', '[Instrumental Interlude]'], [68, 84]],
  ['vocal-jazz', 'Jazz / Vocal Jazz', 'vocal jazz, smoky, 105 BPM, smooth female vocal, walking bass, brushed drums, piano trio, saxophone solo, warm room reverb', '[Intro]\n[Verse 1]\n[Chorus]\n[Saxophone Solo]\n[Verse 2]\n[Chorus]\n[Outro]', ['[Saxophone Solo]', '[Scat]', '[Piano Solo]', '[Call and Response]'], [96, 116]],
  ['reggae-dub', 'Reggae / Dub', 'reggae dub, relaxed, 82 BPM, offbeat guitar skank, deep bass, warm organ, echo delay, laid-back male vocal, sunny groove', '[Intro]\n[Verse 1]\n[Chorus]\n[Verse 2]\n[Chorus]\n[Dub Interlude]\n[Final Chorus]\n[Outro]', ['[Syncopated Bass]', '[Instrumental Break]', '[Delay Echo]'], [76, 90]],
  ['cinematic', 'Cinematic / Orchestral', 'cinematic orchestral, epic, 72 BPM, strings, brass, choir, orchestral percussion, gradual crescendo, trailer-style climax, wide hall reverb', '[Intro: soft strings]\n[Build]\n[Choir]\n[Crescendo]\n[Climax]\n[Decrescendo]\n[Outro]', ['[Strings Rise]', '[Choir]', '[Crescendo]', '[Impact]', '[Outro: soft reprise]'], [64, 84]],
  ['ambient-lofi', 'Ambient / Lo-Fi', 'ambient lo-fi, calm, 70 BPM, soft synth pads, vinyl crackle, warm tape saturation, sparse piano, no drums, meditative texture', '[Intro]\n[Instrumental]\n[Interlude]\n[Outro: fade out]', ['[Instrumental]', '[Pad Atmosphere]', '[Fade In]', '[Fade Out]'], [60, 78]]
];

export const presets: GenrePreset[] = presetRows.map((args) => preset(...args));
