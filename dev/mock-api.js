var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { promises as fs } from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../src/lib/frontmatter";
var SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
var IMAGE_FILENAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,80}\.(png|jpe?g|gif|webp|svg)$/;
var MAX_FIELD_LENGTH = 300;
/** Stable fake identity used for every guide "published" through this mock. */
export var DEV_USER = { id: "dev-local-user", username: "Local Dev", avatar: null };
function readJsonBody(req) {
    return new Promise(function (resolve, reject) {
        var chunks = [];
        req.on("data", function (chunk) { return chunks.push(chunk); });
        req.on("end", function () {
            if (chunks.length === 0) {
                resolve({});
                return;
            }
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
            }
            catch (error) {
                reject(error);
            }
        });
        req.on("error", reject);
    });
}
function sendJson(res, status, body) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
}
function requireNonEmptyString(value, field) {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error("\"".concat(field, "\" is required."));
    }
    return value;
}
function sanitizeScalar(value) {
    return value.replace(/["\r\n]/g, "").trim().slice(0, MAX_FIELD_LENGTH);
}
function yamlString(value) {
    return "\"".concat(sanitizeScalar(value), "\"");
}
function pathExists(target) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs.access(target)];
                case 1:
                    _b.sent();
                    return [2 /*return*/, true];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function handlePublish(req, res, contentsRoot) {
    return __awaiter(this, void 0, void 0, function () {
        var payload, slug, title, description, game, section, body, postDir, images, _i, _a, item, filename, content, subtitle, date, cover, tags, frontmatterLines, markdown, _b, images_1, image;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, readJsonBody(req)];
                case 1:
                    payload = _c.sent();
                    try {
                        slug = requireNonEmptyString(payload.slug, "slug").trim().toLowerCase();
                        title = requireNonEmptyString(payload.title, "title");
                        description = requireNonEmptyString(payload.description, "description");
                        game = requireNonEmptyString(payload.game, "game");
                        section = requireNonEmptyString(payload.section, "section");
                        body = requireNonEmptyString(payload.body, "body");
                    }
                    catch (error) {
                        sendJson(res, 400, { error: error instanceof Error ? error.message : "Invalid request." });
                        return [2 /*return*/];
                    }
                    if (!SLUG_PATTERN.test(slug)) {
                        sendJson(res, 400, {
                            error: 'Slug must be lowercase letters, numbers and hyphens only (e.g. "my-new-guide").',
                        });
                        return [2 /*return*/];
                    }
                    postDir = path.join(contentsRoot, slug);
                    return [4 /*yield*/, pathExists(postDir)];
                case 2:
                    if (_c.sent()) {
                        sendJson(res, 409, { error: "A guide with slug \"".concat(slug, "\" already exists.") });
                        return [2 /*return*/];
                    }
                    images = [];
                    if (payload.images !== undefined) {
                        if (!Array.isArray(payload.images)) {
                            sendJson(res, 400, { error: "Images must be a list." });
                            return [2 /*return*/];
                        }
                        for (_i = 0, _a = payload.images; _i < _a.length; _i++) {
                            item = _a[_i];
                            filename = item === null || item === void 0 ? void 0 : item.filename;
                            content = item === null || item === void 0 ? void 0 : item.content;
                            if (typeof filename !== "string" || !IMAGE_FILENAME_PATTERN.test(filename)) {
                                sendJson(res, 400, { error: "Invalid image filename: \"".concat(String(filename), "\".") });
                                return [2 /*return*/];
                            }
                            if (typeof content !== "string" || !content) {
                                sendJson(res, 400, { error: "Missing image data for \"".concat(filename, "\".") });
                                return [2 /*return*/];
                            }
                            images.push({ filename: filename, base64: content.replace(/^data:[^,]*base64,/, "") });
                        }
                    }
                    subtitle = typeof payload.subtitle === "string" ? payload.subtitle : undefined;
                    date = typeof payload.date === "string" ? payload.date : undefined;
                    cover = typeof payload.cover === "string" ? payload.cover : undefined;
                    tags = Array.isArray(payload.tags)
                        ? payload.tags.filter(function (tag) { return typeof tag === "string"; }).map(function (tag) { return sanitizeScalar(tag).replace(/,/g, ""); })
                        : [];
                    frontmatterLines = [
                        "title: ".concat(yamlString(title)),
                        subtitle ? "subtitle: ".concat(yamlString(subtitle)) : null,
                        "description: ".concat(yamlString(description)),
                        "game: ".concat(yamlString(game)),
                        "section: ".concat(yamlString(section)),
                        tags.length ? "tags: [".concat(tags.join(", "), "]") : null,
                        date ? "date: ".concat(yamlString(date)) : null,
                        "author: ".concat(yamlString(DEV_USER.username)),
                        "authorId: ".concat(yamlString(DEV_USER.id)),
                        cover ? "cover: ".concat(yamlString(cover)) : null,
                    ].filter(function (line) { return line !== null; });
                    markdown = "---\n".concat(frontmatterLines.join("\n"), "\n---\n\n").concat(body.trim(), "\n");
                    return [4 /*yield*/, fs.mkdir(postDir, { recursive: true })];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, fs.writeFile(path.join(postDir, "index.md"), markdown, "utf-8")];
                case 4:
                    _c.sent();
                    _b = 0, images_1 = images;
                    _c.label = 5;
                case 5:
                    if (!(_b < images_1.length)) return [3 /*break*/, 8];
                    image = images_1[_b];
                    return [4 /*yield*/, fs.writeFile(path.join(postDir, image.filename), Buffer.from(image.base64, "base64"))];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7:
                    _b++;
                    return [3 /*break*/, 5];
                case 8:
                    sendJson(res, 200, { ok: true, slug: slug, url: "/guide/".concat(slug), commitUrl: "#" });
                    return [2 /*return*/];
            }
        });
    });
}
function handleDelete(req, res, contentsRoot) {
    return __awaiter(this, void 0, void 0, function () {
        var payload, slug, postDir, indexPath, raw, data, authorId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, readJsonBody(req)];
                case 1:
                    payload = _a.sent();
                    slug = typeof payload.slug === "string" ? payload.slug.trim().toLowerCase() : "";
                    if (!slug || !SLUG_PATTERN.test(slug)) {
                        sendJson(res, 400, { error: "Invalid slug." });
                        return [2 /*return*/];
                    }
                    postDir = path.join(contentsRoot, slug);
                    indexPath = path.join(postDir, "index.md");
                    return [4 /*yield*/, pathExists(indexPath)];
                case 2:
                    if (!(_a.sent())) {
                        sendJson(res, 404, { error: "No guide found with slug \"".concat(slug, "\".") });
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, fs.readFile(indexPath, "utf-8")];
                case 3:
                    raw = _a.sent();
                    data = parseFrontmatter(raw).data;
                    authorId = typeof data.authorId === "string" ? data.authorId : null;
                    if (!authorId || authorId !== DEV_USER.id) {
                        sendJson(res, 403, { error: "Only the guide's original publisher can delete it." });
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, fs.rm(postDir, { recursive: true, force: true })];
                case 4:
                    _a.sent();
                    sendJson(res, 200, { ok: true });
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Dev-only stand-in for the Vercel serverless functions under api/, so the whole
 * publish -> view -> delete lifecycle works with just `npm run dev` — no Vercel CLI,
 * Discord app or GitHub token needed. Writes real files into contents/, so the same
 * content.ts glob-loader Vite already watches picks guides up like any hand-written one.
 */
export function mockApiPlugin() {
    return {
        name: "quintessence-dev-mock-api",
        apply: "serve",
        configureServer: function (server) {
            var _this = this;
            var contentsRoot = path.join(server.config.root, "contents");
            server.middlewares.use(function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
                var url, error_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            url = (_a = req.url) === null || _a === void 0 ? void 0 : _a.split("?")[0];
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 6, , 7]);
                            if (url === "/api/auth/me" && req.method === "GET") {
                                sendJson(res, 200, { authenticated: true, authorized: true, user: DEV_USER });
                                return [2 /*return*/];
                            }
                            if (url === "/api/auth/logout" && req.method === "POST") {
                                sendJson(res, 200, { ok: true });
                                return [2 /*return*/];
                            }
                            if (!(url === "/api/publish" && req.method === "POST")) return [3 /*break*/, 3];
                            return [4 /*yield*/, handlePublish(req, res, contentsRoot)];
                        case 2:
                            _b.sent();
                            return [2 /*return*/];
                        case 3:
                            if (!(url === "/api/delete" && req.method === "DELETE")) return [3 /*break*/, 5];
                            return [4 /*yield*/, handleDelete(req, res, contentsRoot)];
                        case 4:
                            _b.sent();
                            return [2 /*return*/];
                        case 5: return [3 /*break*/, 7];
                        case 6:
                            error_1 = _b.sent();
                            sendJson(res, 500, { error: error_1 instanceof Error ? error_1.message : "Dev mock API error." });
                            return [2 /*return*/];
                        case 7:
                            next();
                            return [2 /*return*/];
                    }
                });
            }); });
            console.log("\n  [dev-mock-api] /api/publish, /api/delete and /api/auth/* are mocked locally.\n" +
                "  Guides are written for real to contents/<slug>/, but nothing touches GitHub or Discord.\n");
        },
    };
}
