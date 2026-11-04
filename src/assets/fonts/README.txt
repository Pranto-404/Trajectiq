Vendored fonts (SIL Open Font License 1.1, see the LICENSE-* files here)

InterVariable-latin-subset.woff2       Inter (Inter Project Authors, https://github.com/rsms/inter), variable wght axis
JetBrainsMono-latin-subset.woff2       JetBrains Mono (JetBrains Mono Project Authors, https://github.com/JetBrains/JetBrainsMono), variable wght axis

Source files: the Latin variable woff2 files from the npm packages @fontsource-variable/inter 5.3.0 and
@fontsource-variable/jetbrains-mono 5.3.0 (OFL-1.1, repackaged upstream releases; licence texts copied unchanged).
Neither upstream licence declares a Reserved Font Name, so the subset keeps the original family names.

They were then reduced with fontTools (pyftsubset) to printable ASCII plus the symbols the UI uses:
  U+0020-007E U+00A0 U+00B0 U+00B1 U+00B5 U+00B7 U+00D7 U+00E9 U+2013 U+2014 U+2018 U+2019 U+201C U+201D
  U+2022 U+2026 U+2032 U+2033 U+2190-2193 U+2212 U+2264 U+2265
  features: kern liga calt tnum case ccmp locl mark mkmk zero (+ cv11 for Inter)
Total payload 57.8 KB (budget 80 KB). Bengali and other scripts fall back to the system font stack.
Nothing is fetched at runtime; the CSP font-src 'self' covers them.
