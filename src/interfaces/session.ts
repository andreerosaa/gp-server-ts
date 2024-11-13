import { ObjectId } from 'mongoose';
import { BaseModel } from './baseModel';

export interface ISession extends BaseModel {
	date: Date;
	therapistId: ObjectId;
	patientId: ObjectId;
	durationInMinutes: number;
	vacancies: number;
	status: SessionStatusEnum;
	createdAt: Date;
	updatedAt: Date;
}

export enum SessionStatusEnum {
	PENDING,
	CONFIRMED,
	COMPLETED,
	CANCELED
}
