export const Storage = {
    DB_KEY: 'lostItems',
    
    getItems: () => JSON.parse(localStorage.getItem(Storage.DB_KEY)) || [],
    
    saveItem: (item) => {
        const items = Storage.getItems();
        items.unshift(item);
        localStorage.setItem(Storage.DB_KEY, JSON.stringify(items));
        return items;
    }
};