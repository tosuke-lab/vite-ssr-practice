// async script にしても Refresh Runtime が async で読まれなくて壊れるので，ワークアラウンド
import RefreshRuntime from "/@react-refresh";
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
window.__vite_plugin_react_preamble_installed__ = true;
import("./entry-client");
