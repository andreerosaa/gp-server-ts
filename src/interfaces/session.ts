import { ObjectId } from 'mongoose';
import { BaseModel } from './baseModel';

export interface ISession extends BaseModel {
	date: Date;
	therapistId: ObjectId;
	patientId: ObjectId;
	durationInMinutes: number;
	vacancies: number;
	confirmed: boolean;
}
