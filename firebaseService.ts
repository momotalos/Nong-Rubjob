import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Message, User, Role } from '../types';

export async function createUserProfile(user: User) {
  await setDoc(doc(db, 'users', user.id), {
    uid: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  });
}

export async function getUserProfile(uid: string) {
  const docSnap = await getDoc(doc(db, 'users', uid));
  if (docSnap.exists()) {
    return docSnap.data() as User;
  }
  return null;
}

export async function createSession(userId: string) {
  const sessionRef = await addDoc(collection(db, 'sessions'), {
    userId,
    createdAt: serverTimestamp(),
    summary: '',
    riskLevel: 1,
    primaryEmotion: 'neutral',
    topicTags: []
  });
  return sessionRef.id;
}

export async function saveMessage(sessionId: string, message: Message) {
  const messagesRef = collection(db, 'sessions', sessionId, 'messages');
  await addDoc(messagesRef, {
    role: message.role === 'assistant' ? 'model' : 'user', // Firestore schema uses 'model'
    content: message.content,
    timestamp: serverTimestamp()
  });
}

export async function getSessions(userId: string) {
  const q = query(
    collection(db, 'sessions'), 
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function getMessages(sessionId: string) {
  const q = query(
    collection(db, 'sessions', sessionId, 'messages'),
    orderBy('timestamp', 'asc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      role: data.role === 'model' ? 'assistant' : 'user',
      content: data.content
    } as Message;
  });
}

export async function updateSessionMetadata(sessionId: string, metadata: {
  summary?: string;
  riskLevel?: number;
  primaryEmotion?: string;
  topicTags?: string[];
}) {
  const sessionRef = doc(db, 'sessions', sessionId);
  await setDoc(sessionRef, { ...metadata }, { merge: true });
}
