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

**Header Clock**:
A compact Full Clock countdown fixed in the top-left that appears after the opening Full Clock Countdown View has been shown, then keeps ticking through later Countdown Views; it is hidden in the Retired State.
_Avoid_: mini clock, corner clock, sticky countdown

**Fun Measure**:
A Countdown View that expresses remaining time in a humorous or alternate unit (astronomical, sci‑fi, or workplace gag), shown as a large primary value plus a funny sentence. Most use live unit math from the Retirement Instant; a few are special-cased gags that are not straight conversions.
_Avoid_: easter egg, joke unit, novelty metric


**Primary Number**:
The whole integer used for Number Facts for the current Countdown View. For Full Clock and Days it is remaining whole days; for other real totals it is that total; for Fun Measures it is the floored/rounded whole value of the headline number.
_Avoid_: display value, headline count

**Countdown Unit**:
The unit that accompanies the Primary Number when asking for a Number Fact. For Full Clock it is days (matching the Primary Number). For Days, Hours, Minutes, Seconds, and Weeks it is that calendar unit. For Fun Measures it is a fixed short gag unit phrase per measure (for example Martian days, meetings), not derived from the sentence or the measure id. A Number Fact is identified by Primary Number plus Countdown Unit.
_Avoid_: unit label, time unit, measure name, until retirement

**Number Fact**:
A short retirement joke for the Primary Number of the current Countdown View: the Worker pulls a random Useless Fact, then Workers AI rewrites it to weave in both that number and its Countdown Unit. The joke text must include the Primary Number digits and the Countdown Unit wording (unit match is case-insensitive).
_Avoid_: trivia blurb, fun fact, API text

**Retired State**:
The post–Retirement Instant experience: a celebratory “retired” presentation instead of the countdown rotation.
_Avoid_: end screen, after party, zero mode
