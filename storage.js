/**
 * Adattárolásért felelős modul
 * LocalStorage műveletek és adatkezelés
 */

export const Storage = {
    // Kulcs a LocalStorage-hoz
    DB_KEY: 'lostItems',

    // Összes elem betöltése
    getItems: () => {
        const data = localStorage.getItem(Storage.DB_KEY);
        return data ? JSON.parse(data) : [];
    },

    // Új elem mentése a lista elejére
    saveItem: (item) => {
        const items = Storage.getItems();
        items.unshift(item); // Az új elem kerül legfelülre
        localStorage.setItem(Storage.DB_KEY, JSON.stringify(items));
        return items;
    },

    // Elemek szűrése név és helyszín alapján
    filterItems: (nameQuery, locationQuery) => {
        const items = Storage.getItems();
        const n = nameQuery.toLowerCase();
        const l = locationQuery.toLowerCase();

        return items.filter(item => 
            item.name.toLowerCase().includes(n) && 
            item.location.toLowerCase().includes(l)
        );
    },

    // Egy elem törlése ID alapján (opcionális bővítés)
    deleteItem: (id) => {
        let items = Storage.getItems();
        items = items.filter(item => item.id !== id);
        localStorage.setItem(Storage.DB_KEY, JSON.stringify(items));
        return items;
    }
};