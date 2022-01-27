if (!("Buffer" in globalThis)) {
  const textEncoder = new TextEncoder();
  globalThis.Buffer = {
    from(chunk) {
      return textEncoder.encode(chunk);
    },
  };
}

if (!("setImmediate" in globalThis)) {
  globalThis.setImmediate = (cb) => setTimeout(cb, 0);
}
