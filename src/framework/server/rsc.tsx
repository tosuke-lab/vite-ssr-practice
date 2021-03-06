import { escape } from "html-escaper";
import { WritableStream } from "web-streams-polyfill/ponyfill/es2018";

const html = (
  template: TemplateStringsArray,
  ...placeholders: string[]
): string =>
  template.reduce((acc, str, i) => {
    const p = placeholders[i];
    return acc + str + (p ? escape(p) : "");
  }, "");

export interface ViteManifest {
  [id: string]: {
    file: string;
    isEntry?: boolean;
    imports?: string[];
  };
}

export class RSCStore {
  private unreleasedRows: string[] = [];
  private partialRow: string = "";
  private textDecoder = new TextDecoder();
  private _deps = new Set<string>();

  constructor(private manifest: ViteManifest) {}

  get sink(): WritableStream<ArrayBuffer> {
    return new WritableStream<ArrayBuffer>({
      write: (chunk) => {
        this.processBinaryChunk(chunk);
      },
    });
  }

  get hasUnreleasedRow() {
    return this.unreleasedRows.length > 0;
  }

  dependencies(entryFile: string) {
    const seen = new Set<string>();
    let elements: string[] = [];

    const collect = (id: string) => {
      if (seen.has(id)) return;
      seen.add(id);

      const entry = { isEntry: false, imports: [], ...this.manifest[id] };
      if (entry == null) return;

      const src = "/" + entry.file;

      if (entry.isEntry) {
        elements.push(
          // prettier-ignore
          html`<script async crossorigin type="module" src="${src}"></script>`
        );
      } else {
        elements.push(
          // prettier-ignore
          html`<link rel="modulepreload" as="script" crossorigin href="${src}"/>`
        );
      }

      if (entry.imports) {
        entry.imports.forEach(collect);
      }
    };

    collect(entryFile);
    this._deps.forEach(collect);

    return elements.join("");
  }

  releaseRows() {
    const rows = this.unreleasedRows;
    this.unreleasedRows = [];
    return rows;
  }

  private processBinaryChunk(chunk: ArrayBuffer) {
    const row =
      this.partialRow + this.textDecoder.decode(chunk, { stream: true });
    const rows = row.split("\n");
    this.partialRow = rows.pop() ?? "";
    rows.forEach((row) => this.processRow(row));
  }

  private processRow(row: string) {
    this.unreleasedRows.push(row);

    // Module model
    if (row.startsWith("M")) {
      const jsonStart = row.indexOf("{");
      const json = JSON.parse(row.slice(jsonStart)) as Record<string, unknown>;
      const { id } = json;
      if (id != null && typeof id === "string") {
        this._deps.add(id);
      }
    }
  }
}
