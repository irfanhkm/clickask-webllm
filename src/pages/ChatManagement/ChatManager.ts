import { ChatRoom } from './types/chat';
import browser from 'webextension-polyfill';

export class ChatManager {
  private static DB_NAME = 'chatStorage';
  private static DB_VERSION = 1;
  private static STORE_NAME = 'chatRooms';

  private static async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  static async getChatRooms(): Promise<ChatRoom[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting chat rooms:', error);
      return [];
    }
  }

  static async getChatRoom(id: string): Promise<ChatRoom | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting chat room:', error);
      return null;
    }
  }

  static async createChatRoom(name: string, modelId: string): Promise<ChatRoom> {
    const newRoom: ChatRoom = {
      id: Date.now().toString(),
      name: name.trim(),
      modelId,
      messages: [],
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };

    try {
      const db = await this.getDB();
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.put(newRoom);

        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error saving chat room:', error);
    }

    return newRoom;
  }

  static async updateChat(id: string, updates: Partial<ChatRoom>): Promise<ChatRoom | null> {
    try {
      const room = await this.getChatRoom(id);
      if (!room) return null;

      const updatedRoom = {
        ...room,
        ...updates,
        lastUpdated: Date.now()
      };

      const db = await this.getDB();
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.put(updatedRoom);

        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });

      // Sync with browser.storage.local
      try {
        const result = await browser.storage.local.get('chats');
        const chats = result.chats || {};
        chats[id] = updatedRoom;
        await browser.storage.local.set({ chats });
      } catch (error) {
        console.error('Error syncing with browser.storage.local:', error);
      }

      return updatedRoom;
    } catch (error) {
      console.error('Error updating chat room:', error);
      return null;
    }
  }
} 