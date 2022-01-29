export let moduleMap = new Map();

if (import.meta.hot) {
  import.meta.hot.data.moduleMap = moduleMap;
  const data = import.meta.hot.data;

  import.meta.hot.accept(() => {
    console.log(data);
  });
}
