import { ObjectId } from 'mongoose';
import { BaseModel } from './baseModel';

export interface ISession extends BaseModel {
	date: Date;
	therapistId: ObjectId;
	patientId: ObjectId;
	durationInMinutes: number;
	vacancies: number;
	status: SessionStatusEnum;
	confirmationToken: string;
	cancelationToken: string;
}

export interface ISessionByDate extends BaseModel {
	date: Date;
	therapist: { id: ObjectId; name: string };
	patientId: ObjectId;
	durationInMinutes: number;
	vacancies: number;
	status: SessionStatusEnum;
	confirmationToken: string;
	cancelationToken: string;
}

export interface IBookSessionRequest {
	email: string;
	patientName: string;
}

export interface ISearchSessionByDate {
	date: Date;
}

export enum SessionStatusEnum {
	AVAILABLE,
	PENDING,
	CONFIRMED,
	COMPLETED,
	CANCELED
}
