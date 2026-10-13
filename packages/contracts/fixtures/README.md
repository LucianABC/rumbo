# Recorded payloads

Responses the web relies on, recorded from the API. `test/fixtures.test.ts` parses each one with its schema,
so a schema change that would reject a payload clients already receive fails CI (#27).

Change a fixture only when the API change is meant to be breaking, in the same PR that updates the web.
