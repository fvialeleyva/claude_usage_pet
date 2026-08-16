// Server estático solo para inspeccionar visualmente src/renderer en el
// navegador durante desarrollo. La app real no usa esto (Electron carga
// el HTML directo con loadFile).
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "src", "renderer");
const PORT = 3004;
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript" };

http
  .createServer((req, res) => {
    const file = req.url === "/" ? "/index.html" : req.url;
    const filePath = path.join(ROOT, file);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(filePath)] || "text/plain" });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log(`preview server on http://localhost:${PORT}`));
