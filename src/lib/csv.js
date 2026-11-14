/** Parse CSV text, including quoted commas, escaped quotes, and embedded newlines. */
export function parseCSV(input) {
  const text = String(input ?? "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      if (field.length > 0) {
        throw new Error(`Unexpected quote near character ${index + 1}.`);
      }
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      row.push(field);
      if (!(row.length === 1 && row[0] === "")) rows.push(row);
      row = [];
      field = "";
      if (char === "\r" && text[index + 1] === "\n") index += 1;
    } else {
      field += char;
    }
  }

  if (inQuotes) throw new Error("This CSV has an unclosed quoted field.");
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
  }

  if (rows.length === 0) throw new Error("The CSV file is empty.");

  const headers = rows[0].map((value) => value.trim());
  if (headers.every((header) => !header)) {
    throw new Error("The CSV header row is empty.");
  }

  const seen = new Set();
  headers.forEach((header, index) => {
    if (!header) throw new Error(`Column ${index + 1} has no header name.`);
    const key = header.toLocaleLowerCase();
    if (seen.has(key)) throw new Error(`The CSV contains a duplicate column: "${header}".`);
    seen.add(key);
  });

  const dataRows = rows.slice(1).map((values, index) => {
    if (values.length > headers.length) {
      throw new Error(`Row ${index + 2} has more values than the header row.`);
    }
    return [...values, ...Array(Math.max(0, headers.length - values.length)).fill("")];
  });

  return { headers, rows: dataRows };
}

/** Merge CSV files by appending records and taking the union of their columns. */
export function mergeCSVFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("Choose at least one CSV file.");
  }

  const parsed = files.map((file) => ({
    name: String(file.name || "unnamed.csv"),
    ...parseCSV(file.content),
  }));

  const headers = [];
  const headerKeys = new Map();
  for (const file of parsed) {
    for (const header of file.headers) {
      const key = header.toLocaleLowerCase();
      if (!headerKeys.has(key)) {
        headerKeys.set(key, headers.length);
        headers.push(header);
      }
    }
  }

  const rows = [];
  for (const file of parsed) {
    const positions = file.headers.map((header) => headerKeys.get(header.toLocaleLowerCase()));
    for (const sourceRow of file.rows) {
      const mergedRow = Array(headers.length).fill("");
      sourceRow.forEach((value, index) => {
        mergedRow[positions[index]] = value;
      });
      rows.push(mergedRow);
    }
  }

  return {
    headers,
    rows,
    sourceFiles: parsed.map((file) => file.name),
  };
}

/** Serialize a header + records matrix into a standards-friendly CSV string. */
export function serializeCSV(headers, rows) {
  const encode = (value) => {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) || /^\s|\s$/.test(text)
      ? `"${text.replace(/"/g, '""')}"`
      : text;
  };

  return [headers, ...rows].map((row) => row.map(encode).join(",")).join("\r\n") + "\r\n";
}
