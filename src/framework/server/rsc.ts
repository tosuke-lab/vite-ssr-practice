import { WritableStream } from "web-streams-polyfill/ponyfill/es2018";

export class RSCStore {
  private unreleasedRows: string[] = [];
  private partialRow: string = "";
  private textDecoder = new TextDecoder();

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
    this.unreleasedRows.push(...rows);
  }
}
