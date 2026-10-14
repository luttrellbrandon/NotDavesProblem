# Countdown Unit match is case-insensitive

When validating a Number Fact, the Worker treats Countdown Unit presence as a case-insensitive substring check on the joke text. Exact case matching and singular/plural flexibility were rejected so capitalization noise does not fail rewrites while the chosen unit wording still must appear.