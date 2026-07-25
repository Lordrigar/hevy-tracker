# API testing

Import [`hevy-tracker.postman_collection.json`](hevy-tracker.postman_collection.json) into Postman and use its collection variables. The default `baseUrl` targets the local NestJS API.

Never commit a populated `hevyApiKey` or any other credential. The local application reads `HEVY_API_KEY` only from `.env`.

Whenever a task adds or changes a REST endpoint, update the collection in the same change. Each request must include its method, URL, safe example body, expected status tests, and a note when it has a manual-trigger/cost boundary.
