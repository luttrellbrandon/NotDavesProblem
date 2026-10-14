# Number Facts cached by Primary Number and Countdown Unit

Number Facts are rewritten with both the Primary Number and its Countdown Unit, so the browser cache key is the pair `(n, unit)` (and the cache prefix is bumped so old `n`-only entries are dropped). Caching by `n` alone was rejected because a joke written for one unit could later appear under another.
