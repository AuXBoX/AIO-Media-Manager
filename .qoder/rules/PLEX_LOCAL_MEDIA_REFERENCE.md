---
inclusion: auto
description: Complete reference for Plex local media assets, NFO metadata files, and naming conventions for movies, TV shows, and music
---

# Plex Local Media Assets - Complete Reference

This steering document provides comprehensive reference for Plex local media asset structure, NFO metadata files, and naming conventions. Use this when implementing or working with local metadata save/load functionality.

## Quick Reference Table

| Media Type | Poster | Background | Logo | Subtitles | Metadata | Trailers/Extras | Theme |
|------------|--------|------------|------|-----------|----------|-----------------|-------|
| **Movies** | `Movie (Year)-poster.jpg` | `Movie (Year)-fanart.jpg` | `Movie (Year)-clearlogo.png` | `Movie (Year).[lang].srt` | `Movie (Year).nfo` | `Name-trailer.mp4`<br>`/Trailers/Name.mp4` | N/A |
| **TV Shows** | `show.jpg` | `fanart.jpg` | `clearlogo.png` | `Show - s01e01.[lang].srt` | `tvshow.nfo` | `Name-trailer.mp4`<br>`/Trailers/Name.mp4` | `theme.mp3` |
| **Music** | `cover.jpg` (album)<br>`artist-poster.jpg` (artist) | `background.jpg` | N/A | N/A | ID3 tags | `Name-video.mp4` | N/A |

## Folder Structure

```
/Media
   /Movies
      /Movie Name (Year)
         Movie Name (Year).mkv
         Movie Name (Year).nfo
         Movie Name (Year)-poster.jpg
         Movie Name (Year)-fanart.jpg
         Movie Name (Year)-clearlogo.png
         Movie Name (Year).en.srt
         Movie Name (Year)-trailer.mp4
         Movie Name (Year)-trailer2.mp4
   /TV Shows
      /Show Name (Year)
         tvshow.nfo
         show.jpg
         fanart.jpg
         clearlogo.png
         theme.mp3
         Show Name-trailer.mp4
         /Season 01
            Show Name - s01e01 - Episode.mkv
            Show Name - s01e01 - Episode.nfo
            Show Name - s01e01 - Episode.jpg
            Season01.jpg
   /Music
      /Artist Name
         artist-poster.jpg
         artist-background.jpg
         /Album Name
            cover.jpg
            01 - Track Name.mp3
            01 - Track Name.lrc
```

**Note**: Trailers saved by this application use the inline method, placing them directly in the movie/show folder with the naming format `MovieName-trailer.ext` for the first trailer, and `MovieName-trailer2.ext`, `MovieName-trailer3.ext` for additional trailers.

## Movies

### Naming Patterns

**Poster** (1:1.5 portrait):
- `MovieName (Year)-poster.jpg` (recommended - matches video filename)
- `poster.jpg`, `cover.jpg`, `folder.jpg`, `movie.jpg`, `default.jpg` (alternative)
- Multiple: `poster-2.jpg`, `poster-3.jpg`

**Background** (16:9 landscape):
- `MovieName (Year)-fanart.jpg` (recommended - matches video filename)
- `fanart.jpg`, `art.jpg`, `backdrop.jpg`, `background.jpg` (alternative)
- Multiple: `fanart-2.jpg`, `fanart-3.jpg`

**Clear Logo** (PNG with transparency):
- `MovieName (Year)-clearlogo.png` (recommended - matches video filename)
- `clearlogo.png`, `logo.png` (alternative)
- Multiple: `clearlogo-2.png`, `clearlogo-3.png`

**Square Art** (1:1 square):
- `square.jpg`, `squareArt.jpg`, `backgroundSquare.jpg`

**Subtitles**:
- `MovieName (Year).[lang].srt` - Standard subtitle
- `MovieName (Year).[lang].forced.srt` - Forced subtitle (for foreign language parts)
- `MovieName (Year).[lang].default.srt` - Default subtitle (auto-selected)
- `MovieName (Year).[lang].sdh.srt` - SDH/Hearing Impaired subtitle

**Subtitle Language Codes**: Use ISO 639-1 (2-letter) or ISO 639-2/B (3-letter) codes
- Examples: `en`, `eng` (English), `es`, `spa` (Spanish), `fr`, `fra` (French)
- Unknown language: `und`

**NFO**:
- `MovieName (Year).nfo`

**Trailers and Extras**:
See "Local Trailers and Extras" section below for complete details.

### Movie NFO Structure

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<movie>
    <title>Movie Title</title>
    <originaltitle>Original Title</originaltitle>
    <sorttitle>Sort Title</sorttitle>
    <year>2009</year>
    <rating>7.8</rating>
    <plot>Movie plot summary...</plot>
    <tagline>Movie tagline</tagline>
    <runtime>162</runtime>
    <mpaa>PG-13</mpaa>
    <studio>Studio Name</studio>
    <genre>Action</genre>
    <genre>Adventure</genre>
    <director>Director Name</director>
    <actor>
        <name>Actor Name</name>
        <role>Character Name</role>
        <thumb>https://...</thumb>
    </actor>
    <writer>Writer Name</writer>
    <producer>Producer Name</producer>
</movie>
```

## TV Shows

### Naming Patterns

**Series Poster** (1:1.5 portrait):
- `show.jpg`, `poster.jpg`, `folder.jpg`
- Multiple: `show-2.jpg`, `show-3.jpg`

**Season Poster** (1:1.5 portrait):
- `Season01.jpg`, `Season02.jpg`
- `season-specials-poster.jpg` (for specials)
- Multiple: `Season01a.jpg`, `Season01b.jpg`, `Season01c.jpg`

**Episode Artwork** (16:9 or 4:3):
- Same name as episode file: `ShowName - s01e01 - Episode.jpg`

**Background** (16:9 landscape):
- `fanart.jpg`, `art.jpg`, `backdrop.jpg`, `background.jpg`
- Multiple: `fanart-2.jpg`, `fanart-3.jpg`

**Clear Logo** (PNG with transparency):
- `clearlogo.png`, `logo.png`
- Multiple: `clearlogo-2.png`, `clearlogo-3.png`

**Banner** (5.4:1 wide):
- Series: `banner.jpg`, `banner-2.jpg`
- Season: `Season01-banner.jpg`, `Season01-bannera.jpg`

**Square Art** (1:1 square):
- `square.jpg`, `squareArt.jpg`, `backgroundSquare.jpg`

**Theme Song**:
- `theme.mp3` (in show root folder)

**Subtitles**:
- `ShowName - s01e01.[lang].srt` - Standard subtitle
- `ShowName - s01e01.[lang].forced.srt` - Forced subtitle (for foreign language parts)
- `ShowName - s01e01.[lang].default.srt` - Default subtitle (auto-selected)
- `ShowName - s01e01.[lang].sdh.srt` - SDH/Hearing Impaired subtitle

**Subtitle Language Codes**: Use ISO 639-1 (2-letter) or ISO 639-2/B (3-letter) codes
- Examples: `en`, `eng` (English), `ja`, `jpn` (Japanese), `de`, `deu` (German)
- Unknown language: `und`

**NFO**:
- Show: `tvshow.nfo` (in show root folder)
- Episode: `ShowName - s01e01 - Episode.nfo`

### TV Show NFO Structure

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<tvshow>
    <title>Show Title</title>
    <originaltitle>Original Title</originaltitle>
    <showtitle>Show Title</showtitle>
    <sorttitle>Sort Title</sorttitle>
    <year>2006</year>
    <rating>7.6</rating>
    <plot>Show plot summary...</plot>
    <mpaa>TV-14</mpaa>
    <studio>Network Name</studio>
    <genre>Drama</genre>
    <genre>Fantasy</genre>
    <actor>
        <name>Actor Name</name>
        <role>Character Name</role>
        <thumb>https://...</thumb>
    </actor>
</tvshow>
```

### Episode NFO Structure

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<episodedetails>
    <title>Episode Title</title>
    <showtitle>Show Title</showtitle>
    <season>1</season>
    <episode>1</episode>
    <aired>2006-09-25</aired>
    <plot>Episode plot summary...</plot>
    <runtime>43</runtime>
    <director>Director Name</director>
    <credits>Writer Name</credits>
    <rating>8.2</rating>
</episodedetails>
```

## Local Trailers and Extras

### Movies - Trailers and Extras

Plex supports local trailers, behind-the-scenes videos, deleted scenes, interviews, and other extras for movies. These can be organized in two ways:

#### Method 1: Inline (Alongside Movie File)

Place extras in the same directory as the movie file, using specific suffixes:

**Format**: `Movies/MovieName (Release Date)/Descriptive_Name-Extra_Type.ext`

**Extra Types** (must end with exactly these, including hyphen):
- `-trailer` - Movie trailers
- `-behindthescenes` - Behind the scenes footage
- `-deleted` - Deleted scenes
- `-featurette` - Featurettes
- `-interview` - Interviews
- `-scene` - Scenes
- `-short` - Short films
- `-other` - Other extras

**Important Rules**:
- The hyphen is required (no spaces)
- Must end exactly with the extra type
- Provide descriptive name before the type
- Only movie file and local assets allowed in directory (no multiple movie versions)

**Example**:
```
/Movies
   /Avatar (2009)
      Avatar (2009).mkv
      Avatar (2009).nfo
      poster.jpg
      fanart.jpg
      Arrival-scene.mp4
      Bar Fight-deleted.mp4
      Performance Capture-behindthescenes.mkv
      Sigourney Weaver-interview.mp4
      Stephen Lang-interview.mp4
      Avatar-trailer.mp4
      Avatar-trailer2.mp4
      Avatar-trailer3.avi
```

**Note**: When saving trailers via this application, they are placed directly in the movie folder (inline method) and named in the format `MovieName-trailer.ext` for the first trailer, and `MovieName-trailer2.ext`, `MovieName-trailer3.ext` for additional trailers.

#### Method 2: Organized in Subdirectories

Place extras in specific subdirectories inside the movie folder:

**Format**: `Movies/MovieName (Release Date)/Extra_Directory_Type/Descriptive_name.ext`

**Extra Directory Types** (exact names, case-sensitive):
- `Behind The Scenes`
- `Deleted Scenes`
- `Featurettes`
- `Interviews`
- `Scenes`
- `Shorts`
- `Trailers`
- `Other`

**Example**:
```
/Movies
   /Avatar (2009)
      Avatar (2009).mkv
      Avatar (2009).nfo
      poster.jpg
      fanart.jpg
      /Behind The Scenes
         Performance Capture.mkv
      /Deleted Scenes
         Bar Fight.mp4
         Lost Sister.mkv
      /Interviews
         Sigourney Weaver.mp4
         Stephen Lang.mp4
      /Scenes
         Arrival.mp4
      /Trailers
          Avatar-trailer.mp4
          Avatar-trailer2.mp4
          Avatar-trailer3.mp4
```

**Note**: When saving trailers via this application, they are named in the format `MovieName-trailer.ext` for the first trailer, and `MovieName-trailer2.ext`, `MovieName-trailer3.ext` for additional trailers.

#### Multiple Movie Editions

When using multiple editions for movies, each edition must be in its own named directory. Local trailers and extras go inside the specific edition folder:

```
/Movies
   /Avatar (2009)
      /Avatar (2009) - Extended Edition
         Avatar (2009) - Extended Edition.mkv
         /Trailers
            Extended Trailer.mp4
      /Avatar (2009) - Theatrical
         Avatar (2009) - Theatrical.mkv
         /Trailers
            Theatrical Trailer.mp4
```

### TV Shows - Trailers and Extras

TV show extras can be organized inline (alongside episodes) or in subdirectories.

#### Method 1: Inline (Alongside Episodes)

Place extras in the same season directory as episodes:

**Format**: `TV Shows/ShowName (Year)/Season XX/Descriptive_Name-Extra_Type.ext`

**Extra Types** (same as movies):
- `-trailer`, `-behindthescenes`, `-deleted`, `-featurette`, `-interview`, `-scene`, `-short`, `-other`

**Example**:
```
/TV Shows
   /Game of Thrones (2011)
      tvshow.nfo
      show.jpg
      /Season 01
         Game of Thrones - s01e01 - Winter Is Coming.mkv
         Game of Thrones - s01e01 - Winter Is Coming.nfo
         Making of Episode 1-behindthescenes.mp4
         Cast Interview-interview.mp4
         Season 1 Trailer-trailer.mp4
```

#### Method 2: Subdirectories of Show Root

Place extras in subdirectories of the main TV show directory:

**Format**: `TV Shows/ShowName (Year)/Extra_Directory_Type/Descriptive_name.ext`

**Extra Directory Types** (same as movies):
- `Behind The Scenes`, `Deleted Scenes`, `Featurettes`, `Interviews`, `Scenes`, `Shorts`, `Trailers`, `Other`

**Example**:
```
/TV Shows
   /Game of Thrones (2011)
      tvshow.nfo
      show.jpg
      /Trailers
         Season 1 Trailer.mp4
         Season 2 Trailer.mp4
      /Behind The Scenes
         Making of Season 1.mp4
      /Interviews
         Cast Roundtable.mp4
      /Season 01
         Game of Thrones - s01e01.mkv
      /Season 02
         Game of Thrones - s02e01.mkv
```

### Enabling Local Assets

#### For Plex Movie Agent (Current)

1. Go to library settings
2. Navigate to Advanced settings
3. Enable "Use local Assets"
4. Enable "Find extras" to automatically find trailers and extras

#### For Legacy Agents

1. Launch Plex Web App
2. Choose Settings → Server → Agents
3. Select Library Type and Agent
4. Ensure "Local Media Assets" is checked
5. Ensure "Local Media Assets" is topmost in the list

### Refreshing Metadata

After adding extras to existing library items:

1. Select the movie/show in Plex
2. Click the "..." menu
3. Choose "Refresh Metadata"
4. Plex will scan for new extras

### Supported Video Formats for Extras

All video formats supported by Plex can be used for extras:
- `.mp4`, `.mkv`, `.avi`, `.mov`, `.wmv`, `.flv`, `.m4v`, `.mpg`, `.mpeg`, `.ts`, `.m2ts`, `.webm`

### Best Practices for Trailers and Extras

1. **Use descriptive names** - Makes it easier to identify content
2. **Organize by type** - Use subdirectories for better organization
3. **Match video quality** - Use similar quality to main content
4. **Include multiple trailers** - Teaser, theatrical, international versions
5. **Add behind-the-scenes** - Enhances the viewing experience
6. **Refresh metadata** - Always refresh after adding new extras
7. **Test playback** - Verify extras play correctly in Plex clients

## Music

### Folder Structure

```
Music/ArtistName/AlbumName/TrackNumber - TrackName.ext
```

**Multi-disc albums**:
```
Music/ArtistName/AlbumName/DiscNumberTrackNumber - TrackName.ext
```
Example: `101 - Track.mp3`, `102 - Track.mp3`, `201 - Track.mp3`

**Various Artists**:
```
Music/Various Artists/AlbumName/TrackNumber - TrackName.ext
```

### Naming Patterns

**Artist Poster** (1:1 square):
- `artist-poster.jpg`, `artist-cover.jpg`, `artist.jpg`, `poster.jpg`, `cover.jpg`

**Artist Background** (16:9 landscape):
- `artist-background.jpg`, `artist-fanart.jpg`, `artist-art.jpg`, `fanart.jpg`, `background.jpg`

**Album Cover** (1:1 square):
- `cover.jpg`, `album.jpg`, `poster.jpg`, `folder.jpg`

**Album Background** (16:9 landscape):
- `background.jpg`, `fanart.jpg`, `art.jpg`, `backdrop.jpg`

**Lyrics**:
- Timed: `TrackNumber - TrackName.lrc`
- Plain: `TrackNumber - TrackName.txt`

### LRC Format Example

```lrc
[ti:Track Title]
[ar:Artist Name]
[al:Album Name]
[00:12.00]Line 1 lyrics
[00:17.20]Line 2 lyrics
[00:21.10]Line 3 lyrics
```

### Music Videos

**Inline** (alongside tracks):
```
Music/Artist/Album/TrackFilename - Description-video.mp4
Music/Artist/Album/Description-interview.mp4
```

**Video Types**:
- `-video` - Regular music video
- `-lyrics` - Lyrics video
- `-live` - Live performance
- `-concert` - Concert footage
- `-interview` - Interview
- `-behindthescenes` - Behind the scenes

**Global Folder** (Settings → Server → Extras → Global music video path):
```
GlobalFolder/ArtistName - Description-video.mp4
GlobalFolder/ArtistName/Description-video.mp4
```

### Embedded Metadata (ID3 Tags)

**Required Tags**:
- Title - Track title
- Artist - Track artist
- Album - Album name
- Album Artist - Album artist (use "Various Artists" for compilations)
- Track Number - Track number
- Disc Number - Disc number (for multi-disc)
- Year - Release year
- Genre - Music genre

**Important**: For compilations:
- Album Artist = `Various Artists`
- Artist = Individual track artist

## Supported File Formats

### Images
- `.jpg` / `.jpeg`
- `.png`
- `.tbn`

### Subtitles
- `.srt` (SubRip)
- `.smi` (SAMI)
- `.ssa` / `.ass` (SubStation Alpha)

### Subtitle Naming Conventions (Detailed)

Plex automatically detects subtitle files that match the video filename with specific language codes and flags.

#### Basic Format

**Movies**:
```
MovieName (Year).[language].[flags].srt
```

**TV Shows**:
```
ShowName - s01e01.[language].[flags].srt
```

#### Language Codes

Use ISO 639-1 (2-letter) or ISO 639-2/B (3-letter) language codes:
- `en` or `eng` - English
- `es` or `spa` - Spanish
- `fr` or `fra` - French
- `de` or `deu` - German
- `ja` or `jpn` - Japanese
- `zh` or `chi` - Chinese
- `und` - Unknown/Undefined language

#### Subtitle Flags

Flags are optional modifiers that control subtitle behavior:

**`forced`** - Forced subtitles (for foreign language parts only)
- Example: `Movie (2020).en.forced.srt`
- Used when only parts of the video are in a foreign language
- Automatically displayed when needed

**`default`** - Default subtitle track
- Example: `Movie (2020).en.default.srt`
- Automatically selected when language matches user preference
- Only one subtitle should be marked as default per language

**`sdh`** - Subtitles for Deaf and Hard of Hearing
- Example: `Movie (2020).en.sdh.srt`
- Includes sound effects and speaker identification
- Alternative to standard subtitles

#### Multiple Flags

Flags can be combined in any order:
- `Movie (2020).en.forced.default.srt`
- `Movie (2020).en.sdh.default.srt`
- `Show - s01e01.ja.forced.srt`

#### Examples

**Movies**:
```
/Movies
   /2 Guns (2013)
      2 Guns (2013).mkv
      2 Guns (2013).en.srt          # English subtitles
      2 Guns (2013).en.sdh.srt      # English SDH
      2 Guns (2013).es.srt          # Spanish subtitles
      2 Guns (2013).es.forced.srt   # Spanish forced (for English parts)
      2 Guns (2013).fr.srt          # French subtitles
```

**TV Shows**:
```
/TV Shows
   /Breaking Bad (2008)
      /Season 01
         Breaking Bad - s01e01.mkv
         Breaking Bad - s01e01.en.srt
         Breaking Bad - s01e01.en.sdh.srt
         Breaking Bad - s01e01.es.srt
         Breaking Bad - s01e01.es.forced.srt
```

#### Important Notes

1. **Exact filename match required** - Subtitle filename must exactly match video filename (except extension)
2. **Language code is required** - Always include a language code (use `und` if unknown)
3. **Case sensitivity** - Some systems are case-sensitive, use lowercase for language codes
4. **No spaces** - Use dots (.) as separators, not spaces or underscores
5. **Order matters for flags** - While any order works, convention is: `[language].[flag1].[flag2].srt`
6. **Embedded vs External** - External subtitle files take precedence over embedded subtitles
7. **Refresh metadata** - After adding subtitle files, refresh metadata in Plex

#### Extracting Subtitles

When extracting embedded subtitles from video files:
1. Use the correct language code from the video stream metadata
2. Add `.forced` flag if the subtitle stream has the forced flag set
3. Add `.sdh` flag if the subtitle is for hearing impaired
4. Follow the exact naming convention for Plex to detect it automatically

#### Common Mistakes

- ❌ `Movie.0.srt` - Missing language code
- ❌ `Movie.English.srt` - Use language code, not full name
- ❌ `Movie.en_forced.srt` - Use dot separator, not underscore
- ❌ `Movie.EN.srt` - Use lowercase language codes
- ✅ `Movie.en.srt` - Correct format
- ✅ `Movie.en.forced.srt` - Correct with forced flag
- ✅ `Movie.en.sdh.srt` - Correct with SDH flag

### Lyrics
- `.lrc` (Timed lyrics)
- `.txt` (Plain text)

### Audio
- `.mp3` (Theme songs)

## Language Codes (ISO-639)

Use 2-letter (ISO-639-1) or 3-letter (ISO-639-2/B) codes:

| Language | 2-Letter | 3-Letter |
|----------|----------|----------|
| English | `en` | `eng` |
| Spanish | `es` | `spa` |
| French | `fr` | `fra` |
| German | `de` | `deu` |
| Italian | `it` | `ita` |
| Japanese | `ja` | `jpn` |
| Chinese | `zh` | `chi` |
| Korean | `ko` | `kor` |
| Portuguese | `pt` | `por` |
| Russian | `ru` | `rus` |
| Arabic | `ar` | `ara` |
| Dutch | `nl` | `nld` |
| Polish | `pl` | `pol` |
| Swedish | `sv` | `swe` |
| Turkish | `tr` | `tur` |

**Forced Subtitles**: Add `.forced` before extension
- `Movie (Year).en.forced.srt`
- `Show - s01e01.ja.forced.srt`

## Aspect Ratios & Resolutions

| Asset Type | Aspect Ratio | Recommended Resolution |
|------------|--------------|----------------------|
| Poster | 1:1.5 (portrait) | 1000x1500 |
| Background/Fanart | 16:9 (landscape) | 1920x1080 |
| Square Art | 1:1 (square) | 1000x1000 |
| Banner | 5.4:1 (wide) | 1000x185 |
| Album Cover | 1:1 (square) | 1000x1000 |
| Artist Poster | 1:1 (square) | 1000x1000 |
| Episode Thumb | 16:9 or 4:3 | 1920x1080 or 1440x1080 |
| Clear Logo | Variable | 800x310 (typical) |

## Implementation Guidelines

### When Saving Metadata Locally

1. **Detect media type** from library section type
2. **Get media file path** from Plex metadata
3. **Extract directory** from media file path
4. **Use appropriate naming** based on media type:
   - Movies: Use movie name with year
   - TV Shows: Use show name, season, episode
   - Music: Use track filename
5. **Handle multiple assets** with proper suffixing (-2, -3, etc.)
6. **Create NFO files** with proper XML structure
7. **Save images** with correct naming conventions
8. **Save trailers and extras** using subdirectory method (recommended) or inline method
9. **Validate paths** before writing
10. **Create backups** of existing files
11. **Log all operations** for debugging
12. **Trigger metadata refresh** after saving new assets

### When Loading Metadata from Local Files

1. **Get media file path** from Plex
2. **Scan directory** for matching files
3. **Check all naming variations**:
   - Primary names (poster.jpg, cover.jpg, etc.)
   - Numbered variants (poster-2.jpg, etc.)
4. **Parse NFO files** if present
5. **Merge with Plex data** (local takes precedence if "Prefer local metadata" enabled)
6. **Return complete metadata** object

### File Path Handling

```typescript
// Example: Get directory from media file path
const mediaFilePath = metadata.Media[0].Part[0].file;
const lastSlash = Math.max(
  mediaFilePath.lastIndexOf('/'),
  mediaFilePath.lastIndexOf('\\')
);
const directory = mediaFilePath.substring(0, lastSlash);
const filename = mediaFilePath.substring(lastSlash + 1);
const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
```

### NFO Generation

```typescript
// Example: Generate movie NFO
function generateMovieNFO(metadata: MovieMetadata): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<movie>
    <title>${escapeXml(metadata.title)}</title>
    <originaltitle>${escapeXml(metadata.originalTitle || '')}</originaltitle>
    <year>${metadata.year}</year>
    <rating>${metadata.rating || 0}</rating>
    <plot>${escapeXml(metadata.summary || '')}</plot>
    <tagline>${escapeXml(metadata.tagline || '')}</tagline>
    <runtime>${Math.floor((metadata.duration || 0) / 60000)}</runtime>
    <mpaa>${escapeXml(metadata.contentRating || '')}</mpaa>
    <studio>${escapeXml(metadata.studio || '')}</studio>
    ${metadata.genres?.map(g => `<genre>${escapeXml(g)}</genre>`).join('\n    ') || ''}
    ${metadata.directors?.map(d => `<director>${escapeXml(d)}</director>`).join('\n    ') || ''}
    ${metadata.actors?.map(a => `
    <actor>
        <name>${escapeXml(a.name)}</name>
        <role>${escapeXml(a.role || '')}</role>
        ${a.thumb ? `<thumb>${escapeXml(a.thumb)}</thumb>` : ''}
    </actor>`).join('\n') || ''}
</movie>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
```

### Image Download

```typescript
// Example: Download and save poster
async function savePoster(
  imageUrl: string,
  directory: string,
  filename: string
): Promise<void> {
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();
  const filepath = path.join(directory, filename);
  
  // Create backup if file exists
  if (fs.existsSync(filepath)) {
    fs.copyFileSync(filepath, `${filepath}.backup`);
  }
  
  fs.writeFileSync(filepath, Buffer.from(buffer));
}
```

## Best Practices

### General
1. **Always include year** for movies and TV shows
2. **Use subfolders** for each movie/show/album
3. **High-quality images** (1920x1080 for backgrounds, 1000x1500 for posters)
4. **PNG for logos** to support transparency
5. **UTF-8 encoding** for all text files (NFO, subtitles, lyrics)
6. **Validate XML** before saving NFO files
7. **Create backups** before overwriting existing files
8. **Log operations** for debugging and user feedback

### Movies
1. Use subfolder per movie
2. Include year in parentheses
3. Multiple assets: use `-X` suffix
4. Always specify subtitle language codes

### TV Shows
1. Use year in show name
2. Use English keywords ("Season", "Specials")
3. Episode format: `ShowName - s01e01 - Episode Title.mkv`
4. Add theme.mp3 for enhanced experience
5. Use episode screenshots for episode artwork

### Music
1. Structure: Artist → Album → Tracks
2. Multi-disc: Prepend disc number (101, 102, 201)
3. Various Artists: Use literal "Various Artists"
4. Accurate ID3 tags are essential
5. Timed lyrics: Use LRC format

## Common Pitfalls

1. **Missing language codes** on subtitles → Won't be detected properly
2. **Wrong aspect ratio** → Images look stretched or cropped
3. **Incorrect folder structure** → Assets won't be found
4. **Hidden file extensions** → Files named incorrectly (poster.jpg.jpg)
5. **Special characters** in filenames → Can cause issues on some systems
6. **Mixed separators** → Use consistent path separators (/ or \\)
7. **Case sensitivity** → Some systems are case-sensitive
8. **Invalid XML** in NFO files → Won't parse correctly
9. **Missing Album Artist** for compilations → Tracks won't group properly
10. **Embedded metadata conflicts** → Local files may be ignored if "Prefer local metadata" not enabled
11. **Incorrect extra type suffix** → Must use exact format with hyphen (e.g., `-trailer` not `_trailer` or ` trailer`)
12. **Multiple movie versions inline** → Use subdirectory method for multiple editions
13. **Forgetting to refresh metadata** → New extras won't appear until refresh
14. **Wrong directory names for extras** → Must use exact names (e.g., `Behind The Scenes` not `BehindTheScenes`)

## Testing Checklist

When implementing local metadata functionality:

- [ ] Movies: Save/load poster, fanart, clear logo, square art
- [ ] Movies: Save/load NFO with all fields
- [ ] Movies: Save/load subtitles with language codes
- [ ] Movies: Handle multiple posters/fanart
- [ ] Movies: Save/load trailers (inline and subdirectory methods)
- [ ] Movies: Save/load extras (behind-the-scenes, deleted scenes, interviews, etc.)
- [ ] Movies: Handle multiple editions with separate extras
- [ ] TV Shows: Save/load series poster, fanart, clear logo
- [ ] TV Shows: Save/load season posters
- [ ] TV Shows: Save/load episode artwork
- [ ] TV Shows: Save/load tvshow.nfo and episode NFO
- [ ] TV Shows: Save/load theme.mp3
- [ ] TV Shows: Save/load subtitles
- [ ] TV Shows: Save/load trailers and extras (inline and subdirectory methods)
- [ ] Music: Save/load artist poster and background
- [ ] Music: Save/load album cover and background
- [ ] Music: Save/load lyrics (LRC and TXT)
- [ ] Music: Handle multi-disc albums
- [ ] Music: Handle Various Artists compilations
- [ ] All: Validate XML structure
- [ ] All: Handle special characters in filenames
- [ ] All: Create backups before overwriting
- [ ] All: Proper error handling and logging
- [ ] All: Cross-platform path handling (Windows/Mac/Linux)
- [ ] All: Trigger metadata refresh after adding new assets

## References

- [Plex: Local Media Assets – Movies](https://support.plex.tv/articles/200220677-local-media-assets-movies/)
- [Plex: Local Files for Movie Trailers and Extras](https://support.plex.tv/articles/local-files-for-trailers-and-extras/)
- [Plex: Local Media Assets – TV Shows](https://support.plex.tv/articles/200220717-local-media-assets-tv-shows/)
- [Plex: Local Files for TV Show Trailers and Extras](https://support.plex.tv/articles/local-files-for-tv-show-trailers-and-extras/)
- [Plex: Adding Local Subtitles to Your Media](https://support.plex.tv/articles/200471133-adding-local-subtitles-to-your-media/)
- [Plex: Adding Music Media From Folders](https://support.plex.tv/articles/200265296-adding-music-media-from-folders/)
- [Plex: Adding Local Lyrics](https://support.plex.tv/articles/215916117-adding-local-lyrics/)
- [Plex: Adding Local Artist and Music Videos](https://support.plex.tv/articles/205568377-adding-local-artist-and-music-videos/)
- [Plex: Cinema Trailers, Extras, & Related Albums](https://support.plex.tv/articles/202934883-cinema-trailers-extras/)
- [ISO-639-1 Codes](http://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)
- [ISO-639-2/B Codes](http://en.wikipedia.org/wiki/List_of_ISO_639-2_codes)
- [LRC Format](https://en.wikipedia.org/wiki/LRC_%28file_format%29)


## NFO Metadata Files

For complete NFO metadata file documentation, see:

#[[file:docs/NFO_METADATA_COMPLETE_GUIDE.md]]

Key points:
- NFO files store metadata locally in XML format
- Plex supports Kodi/XBMC NFO format for movies and TV shows
- Requires Plex Media Server 1.43.1+ with NFO agent enabled
- Movies: Use \movie.nfo\ or match video filename
- TV Shows: Use \	vshow.nfo\ (show), match filename (episodes)
- Always include \<uniqueid>\ tags for stable GUIDs
- Use UTF-8 encoding and validate XML structure

