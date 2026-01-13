This folder contains a plain HTML/CSS/JS version of the React app.

Preview locally:

Using Python 3:

python -m http.server 8000 --directory plain

Then open http://localhost:8000 in your browser.

Or with Node (http-server):

npx http-server plain -p 8000

Notes:
- The TMDB API key is embedded in `app.js` (copied from the original project).
- Images are loaded from TMDB image service.
