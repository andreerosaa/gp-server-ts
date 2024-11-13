import { ObjectId } from 'mongoose';

export interface IBookSession {
	phoneNumber: string;
	patientName: string;
	sessionId: ObjectId;
}
