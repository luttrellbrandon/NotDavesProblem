# Retirement Countdown

A single-page static tribute site that counts down to a teammate's retirement and surfaces number trivia for the values on screen.

## Language

**Retiree**:
David Mangicaro — the teammate whose retirement the site celebrates.
_Avoid_: employee, honoree, subject

**Brand**:
Not Dave's Problem — the public site name, hosted at notdavesproblem.party.
_Avoid_: site title, product name

**Retirement Instant**:
The moment the countdown reaches zero: the start of January 1, 2027 in America/New_York (end of December 31, 2026 Eastern Time).
_Avoid_: retirement date, zero time, target datetime

**Countdown View**:
One presentation of remaining time in the hero. The rotation order is Full Clock, then total Days, Hours, Minutes, Seconds, Weeks, then the Fun Measures in a fixed list order.
_Avoid_: mode, screen, slide, unit panel

**Full Clock**:
The Countdown View that shows remaining days, hours, minutes, and seconds together.
_Avoid_: detailed countdown, DHMS view

**Fun Measure**:
A Countdown View that expresses remaining time in a humorous or alternate unit (astronomical, sci‑fi, or workplace gag), shown as a large primary value plus a funny sentence. Most use live unit math from the Retirement Instant; a few are special-cased gags that are not straight conversions.
_Avoid_: easter egg, joke unit, novelty metric


**Primary Number**:
The whole integer used for Number Facts and fact caching for the current Countdown View. For Full Clock and Days it is remaining whole days; for other real totals it is that total; for Fun Measures it is the floored/rounded whole value of the headline number.
_Avoid_: display value, headline count

**Number Fact**:
A short trivia statement about the Primary Number (or Fun Measure headline value) of the current Countdown View, sourced from the Numbers API via the site’s Worker proxy.
_Avoid_: trivia blurb, fun fact, API text

**Retired State**:
The post–Retirement Instant experience: a celebratory “retired” presentation instead of the countdown rotation.
_Avoid_: end screen, after party, zero mode
