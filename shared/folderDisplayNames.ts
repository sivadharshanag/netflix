// Maps each real on-disk folder name to an attractive display name for the UI.
// Both spellings of folders that have an on-disk typo are included, so this
// keeps working regardless of which spelling actually exists on disk.
// These are display names only — the real folder name on disk is never changed.
export const FOLDER_DISPLAY_NAMES: Record<string, string> = {
  "Random college snap": "College Diaries",
  "Dance": "Dance & Performances",
  "Hackathon": "The Genius Squad",
  "Funny": "Comedy Collection",
  "Fuuny": "Comedy Collection",
  "Akka Marriage": "Wedding Memories",
  "Akka Marraige": "Wedding Memories",
  "Moments to cherish": "Our Favourite Memories",
  "Birthday - 2025": "Birthday 2025",
  "IV Kerala": "Kerala Adventures",
  "Funny calls": "Unfiltered Moments",
  "childhood": "Childhood Chronicles",
  "Birthday - 2024": "Birthday 2024",
  "Pongal": "Festival Diaries",
  "inplant cbe": "Internship Diaries",
  "Movie diesel": "Movie Night",
  "Movie - Jailer2": "Movie Night 2",
  "IV kodaikkanal": "Kodaikanal Adventures",
};

export function displayNameForFolder(folder: string): string {
  return FOLDER_DISPLAY_NAMES[folder] ?? folder;
}
