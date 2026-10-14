# Countdown Unit via `/api/fact` query param

The browser sends Countdown Unit as a `unit` query parameter beside `n` (`GET /api/fact?n=42&unit=hours`). Path segments and POST JSON were rejected so the existing GET query style stays intact.