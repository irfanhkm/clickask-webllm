async function dumpAllObjectStores(dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onerror = event => reject(event.target.error);
    request.onsuccess = event => {
      const db = event.target.result;
      const allData = {};
      const storeNames = [...db.objectStoreNames];
      let completed = 0;

      storeNames.forEach(storeName => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const data = [];
        const cursorRequest = store.openCursor();

        cursorRequest.onerror = event => reject(event.target.error);
        cursorRequest.onsuccess = event => {
          const cursor = event.target.result;
          if (cursor) {
            data.push(cursor.value);
            cursor.continue();
          } else {
            allData[storeName] = data;
            completed++;
            if (completed === storeNames.length) {
              resolve(allData);
            }
          }
        };
      });
    };
  });
}

// Usage example:
dumpAllObjectStores('chatStorage')
  .then(data => {
    console.log('Complete IndexedDB Dump:', JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error('Error dumping IndexedDB:', err);
  });