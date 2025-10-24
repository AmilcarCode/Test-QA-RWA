import * as fs from 'fs';
import * as path from 'path';

export interface User {
  id: string;
  uuid: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  email: string;
  phoneNumber: string;
  avatar: string;
  defaultPrivacyLevel: string;
  balance: number;
  createdAt: string;
  modifiedAt: string;
}

export interface Contact {
  id: string;
  uuid: string;
  userId: string;
  contactUserId: string;
  createdAt: string;
  modifiedAt: string;
}

export interface Transaction {
  id: string;
  uuid: string;
  source: string;
  amount: number;
  description: string;
  privacyLevel: string;
  receiverId: string;
  senderId: string;
  balanceAtCompletion: number;
  status: string;
  requestStatus: string;
  requestResolvedAt: string;
  createdAt: string;
  modifiedAt: string;
}

export interface DatabaseData {
  users: User[];
  contacts: Contact[];
  transactions: Transaction[];
  bankAccounts: any[];
  bankTransfers: any[];
  likes: any[];
  comments: any[];
  notifications: any[];
}

export class DatabaseHelper {
  private static databasePath = path.join(process.cwd(), '.rwa', 'data', 'database.json');
  private static data: DatabaseData | null = null;

  static loadDatabase(): DatabaseData {
    if (!this.data) {
      try {
        const rawData = fs.readFileSync(this.databasePath, 'utf8');
        this.data = JSON.parse(rawData);
      } catch (error) {
        console.warn('No se pudo cargar database.json, usando datos por defecto');
        this.data = this.getDefaultData();
      }
    }
    // this.data will always be set here
    return this.data as DatabaseData;
  }

  static getValidUsers(): User[] {
    const db = this.loadDatabase();
    return db.users.filter(user => 
      user.username && 
      user.balance > 1000 && // Usuarios con suficiente balance para pruebas
      user.defaultPrivacyLevel !== 'private'
    ).slice(0, 5); // Tomar los primeros 5 usuarios válidos
  }

  static getUserByUsername(username: string): User | undefined {
    const db = this.loadDatabase();
    return db.users.find(user => user.username === username);
  }

  static getUserContacts(userId: string): Contact[] {
    const db = this.loadDatabase();
    return db.contacts.filter(contact => contact.userId === userId);
  }

  static getContactUser(contact: Contact): User | undefined {
    const db = this.loadDatabase();
    return db.users.find(user => user.id === contact.contactUserId);
  }

  static getUserTransactions(userId: string): Transaction[] {
    const db = this.loadDatabase();
    return db.transactions.filter(transaction => 
      transaction.senderId === userId || transaction.receiverId === userId
    );
  }

  static getRecentTransactions(limit: number = 10): Transaction[] {
    const db = this.loadDatabase();
    return db.transactions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  private static getDefaultData(): DatabaseData {
    return {
      users: [
        {
          id: "uBmeaz5pX",
          uuid: "3b63b436-cacc-457a-a3e8-c962ef9838ac",
          firstName: "Ted",
          lastName: "Parisian",
          username: "Heath93",
          password: "$2a$10$nSaCsTPTtbbPTnFXBH0GZu0ExpNMud3d1IuKOC/6a9gwAHkdhppeu",
          email: "Santos.Runte65@gmail.com",
          phoneNumber: "398-225-9900",
          avatar: "https://avatars.dicebear.com/api/human/uBmeaz5pX.svg",
          defaultPrivacyLevel: "public",
          balance: 150953,
          createdAt: "2023-03-09T22:26:40.101Z",
          modifiedAt: "2024-03-07T10:07:57.580Z"
        }
      ],
      contacts: [],
      transactions: [],
      bankAccounts: [],
      bankTransfers: [],
      likes: [],
      comments: [],
      notifications: []
    };
  }
}