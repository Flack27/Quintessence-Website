export function parseFrontmatter(raw) {
    var normalized = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
    var match = normalized.match(/^---\n([\s\S]*?)\n---\r?\n?([\s\S]*)$/);
    if (!match) {
        return { data: {}, content: normalized.trim() };
    }
    var block = match[1], body = match[2];
    var data = {};
    var lines = block.split("\n");
    var currentListKey = null;
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        if (!line.trim() || line.trim().startsWith("#"))
            continue;
        var listItemMatch = line.match(/^\s+-\s+(.*)$/);
        if (listItemMatch && currentListKey) {
            data[currentListKey].push(parseScalar(listItemMatch[1]));
            continue;
        }
        var kvMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
        if (!kvMatch)
            continue;
        var key = kvMatch[1], rawValue = kvMatch[2];
        currentListKey = null;
        if (rawValue === "") {
            data[key] = [];
            currentListKey = key;
            continue;
        }
        if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
            var inner = rawValue.slice(1, -1).trim();
            data[key] = inner ? inner.split(",").map(function (item) { return parseScalar(item.trim()); }) : [];
            continue;
        }
        data[key] = parseScalar(rawValue);
    }
    return { data: data, content: body.replace(/^\n+/, "") };
}
function parseScalar(value) {
    var trimmed = value.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
    }
    if (trimmed === "true")
        return true;
    if (trimmed === "false")
        return false;
    if (trimmed !== "" && !Number.isNaN(Number(trimmed)))
        return Number(trimmed);
    return trimmed;
}
